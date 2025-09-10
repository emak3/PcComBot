const { ContextMenuCommandBuilder, InteractionContextType, ApplicationCommandType } = require("discord.js");
const config = require("../../app/config.js");
const DiscordHelpers = require("../../utils/discordHelpers.js");
const ErrorHandler = require("../../utils/errorHandler.js");
const log = require("../../core/logger.js");
/**
 * フォーラムの質問にベストアンサーを設定し、スレッドを解決済みにするコマンド
 * @module BestAnswerCommand
 */
module.exports = {
    command: new ContextMenuCommandBuilder()
        .setName("BestAnswer")
        .setNameLocalization("ja", "BestAnswer")
        .setType(ApplicationCommandType.Message)
        .setContexts(InteractionContextType.Guild),
    /**
     * ベストアンサーコマンドを実行
     * @param {ChatInputCommandInteraction} interaction - Discord インタラクション
     */
    async execute (interaction) {
        return await ErrorHandler.standardTryCatch(async () => {
            if (interaction.channel.parentId === config.questionChId) {
                const thread = interaction.channel;

                // 権限チェック: スレッド作成者のみ使用可能
                if (interaction.user.id !== thread.ownerId) {
                    const errorEmbed = DiscordHelpers.createErrorEmbed(
                        "❌ 権限不足",
                        "投稿者以外使用できません。"
                    );
                    return await DiscordHelpers.safeReply(interaction, { embeds: [errorEmbed] }, { ephemeral: true });
                }

                // ForumAutoCheckerの状態を更新
                if (interaction.client.forumAutoChecker) {
                    interaction.client.forumAutoChecker.markThreadAsHandled(thread.id);
                }

                // 解決通知用のEmbedを作成
                const answerEmbed = DiscordHelpers.createSuccessEmbed(
                    "✅ 質問が解決しました",
                    `この質問は解決済みです。 \`@ 回答者\` 質問への回答ありがとうございました。\n[ 回答 ](https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${interaction.targetId})`
                );
                answerEmbed.setColor("#55b87d");

                await DiscordHelpers.safeReply(interaction, { embeds: [answerEmbed] });

                // 解決済みタグを追加してアーカイブ
                const tags = [...thread.appliedTags, config.kaiketsuTag];
                await thread.setAppliedTags(tags);
                await thread.setArchived(true);

                log.info(`ベストアンサー設定完了: ${thread.name} (${thread.id})`);
            } else {
                const errorEmbed = DiscordHelpers.createErrorEmbed(
                    "❌ 場所エラー",
                    "ここでは使用できません。"
                );
                await DiscordHelpers.safeReply(interaction, { embeds: [errorEmbed] }, { ephemeral: true });
            }
        }, "ベストアンサーコマンド実行", log).catch(async (error) => {
            await ErrorHandler.handleDiscordError(error, interaction, "ベストアンサーコマンド");
        });
    }
};
