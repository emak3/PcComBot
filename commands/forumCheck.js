const { SlashCommandBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionContextType, PermissionFlagsBits } = require("discord.js");
const config = require("../config.js");
const forumExclude = require("./forumExclude.js");
const DiscordHelpers = require("../utils/discordHelpers.js");
const ErrorHandler = require("../utils/errorHandler.js");
const log = require("../logger.js");

/**
 * フォーラムの非アクティブスレッドをチェックし、作成者に確認メッセージを送信するコマンド
 * @module ForumCheckCommand
 */
module.exports = {
    command: new SlashCommandBuilder()
        .setName("forum-check")
        .setNameLocalization("ja", "forum-check")
        .setDescription("Check for inactive forum threads and ask thread creators for closure confirmation")
        .setDescriptionLocalization("ja", "2日以上発言がないフォーラムスレッドをチェックし、作成者にクローズ確認を求める")
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    /**
     * コマンドを実行
     * @param {CommandInteraction} interaction - Discord インタラクション
     */
    async execute (interaction) {
        return await ErrorHandler.standardTryCatch(async () => {
            // 管理者権限チェック
            if (!DiscordHelpers.hasPermission(interaction.member, "ManageChannels")) {
                return await DiscordHelpers.handlePermissionError(interaction, "チャンネル管理");
            }

            // deferReplyを安全に実行
            await DiscordHelpers.safeDeferReply(interaction, { ephemeral: true });

            // 質問フォーラムチャンネルを取得
            const forumChannel = interaction.guild.channels.cache.get(config.questionChId);
            if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
                const errorEmbed = DiscordHelpers.createErrorEmbed(
                    "❌ チャンネルエラー",
                    "質問フォーラムチャンネルが見つからないか、フォーラムチャンネルではありません。"
                );
                return await DiscordHelpers.safeReply(interaction, { embeds: [errorEmbed] });
            }

            // 除外チャンネルかどうかをチェック
            if (await forumExclude.isChannelExcluded(forumChannel.id)) {
                const warningEmbed = DiscordHelpers.createWarningEmbed(
                    "⚠️ チェックスキップ",
                    `フォーラムチャンネル **${forumChannel.name}** は除外設定されているため、チェックをスキップします。`
                );
                return await DiscordHelpers.safeReply(interaction, { embeds: [warningEmbed] });
            }

            // アクティブなスレッドを取得
            const threads = await forumChannel.threads.fetch({ archived: false });
            const inactiveThreads = [];
            const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000); // 2日前

            for (const [, thread] of threads.threads) {
                // 解決済みタグがついている場合はスキップ
                if (thread.appliedTags.includes(config.kaiketsuTag)) { //config.kaiketsuTag
                    continue;
                }

                // 除外スレッドの場合はスキップ
                if (await forumExclude.isChannelExcluded(thread.id)) {
                    continue;
                }

                // 最後のメッセージの時刻を取得
                const messages = await thread.messages.fetch({ limit: 1 });
                const lastMessage = messages.first();

                if (lastMessage && lastMessage.createdTimestamp < twoDaysAgo) {
                    inactiveThreads.push({
                        thread: thread,
                        lastMessageTime: lastMessage.createdTimestamp,
                        ownerId: thread.ownerId,
                        lastMessageAuthor: lastMessage.author.username
                    });
                }
            }

            if (inactiveThreads.length === 0) {
                const infoEmbed = DiscordHelpers.createInfoEmbed(
                    "📊 チェック結果",
                    "2日以上発言がないスレッドは見つかりませんでした。",
                    { color: "#00ff00" }
                );
                return await DiscordHelpers.safeReply(interaction, { embeds: [infoEmbed] });
            }

            // 各非アクティブスレッドの作成者にメッセージを送信
            let processedCount = 0;
            let errorCount = 0;

            for (const inactiveThread of inactiveThreads) {
                try {
                    const { thread, ownerId, lastMessageTime } = inactiveThread;
                    const owner = await interaction.guild.members.fetch(ownerId);

                    if (!owner) {
                        errorCount++;
                        continue;
                    }

                    // 確認メッセージとボタンを作成
                    const embed = DiscordHelpers.createInfoEmbed(
                        "📋 質問スレッドの確認",
                        `あなたが作成した質問「**${thread.name}**」で2日以上発言がありません。\n\nこの質問は__解決__しましたか？それとも質問を__続けます__か？\n\n` + "質問が解決した場合は、解決に役立った質問を `右クリック` もしくは、`長押し` をして `アプリ` → `BestAnswer` の順にコマンドを実行してください。",
                        {
                            color: "#ff9900",
                            fields: [
                                { name: "スレッド", value: `<#${thread.id}>`, inline: true },
                                { name: "最終発言", value: `<t:${Math.floor(lastMessageTime / 1000)}:R>`, inline: true }
                            ],
                            image: "https://i.gyazo.com/49cf3736cde4f9ac4ee9bb929b995a36.png",
                            footer: { text: "24時間以内に回答がない場合、自動的にクローズされます" }
                        }
                    );

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`forum_continue_${thread.id}`)
                                .setLabel("質問を続ける")
                                .setStyle(ButtonStyle.Success)
                                .setEmoji("💬")
                        );

                    // スレッド内にメッセージを投稿
                    await thread.send({
                        content: `<@${ownerId}>`,
                        embeds: [embed],
                        components: [row]
                    });

                    processedCount++;
                } catch (error) {
                    ErrorHandler.logError(error, `スレッド処理エラー (${inactiveThread.thread.id})`, log);
                    errorCount++;
                }
            }

            // 結果を報告
            const resultEmbed = DiscordHelpers.createInfoEmbed(
                "📊 フォーラムチェック結果",
                null,
                {
                    color: processedCount > 0 ? "#00ff00" : "#ff0000",
                    fields: [
                        { name: "処理されたスレッド", value: `${processedCount}件`, inline: true },
                        { name: "エラー", value: `${errorCount}件`, inline: true },
                        { name: "合計非アクティブスレッド", value: `${inactiveThreads.length}件`, inline: true }
                    ]
                }
            );

            await DiscordHelpers.safeReply(interaction, { embeds: [resultEmbed] });

        }, "フォーラムチェックコマンド実行", log).catch(async (error) => {
            await ErrorHandler.handleDiscordError(error, interaction, "フォーラムチェックコマンド");
        });
    }
};
