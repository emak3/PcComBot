const { ChannelType, EmbedBuilder, MessageFlags } = require("discord.js");
const config = require("../../config.js");

module.exports = async function (interaction) {
    if (!interaction.customId.startsWith("forum_")) return;

    const [action, threadId] = interaction.customId.split("_").slice(1);

    try {
        // スレッドを取得
        const thread = interaction.guild.channels.cache.get(threadId);
        if (!thread || thread.type !== ChannelType.PublicThread) {
            return await interaction.reply({
                content: "スレッドが見つからないか、既に削除されています。",
                flags: MessageFlags.Ephemeral
            });
        }

        // スレッドの作成者のみが操作可能
        if (interaction.user.id !== thread.ownerId) {
            return await interaction.reply({
                content: "このボタンはスレッド作成者のみが使用できます。",
                flags: MessageFlags.Ephemeral
            });
        }
        /*
                if (action === "close") {
                    // スレッドをクローズ
                    // commands\bestans.js で行う
        
                } else
        */
        if (action === "continue") {
            // 質問を続ける
            const continueEmbed = new EmbedBuilder()
                .setColor("#00ff00")
                .setTitle("💬 質問を続けます")
                .setDescription(`スレッド「**${thread.name}**」は引き続きアクティブです。`)
                .setTimestamp()
                .setFooter({ text: "PC Community Bot" });

            await interaction.update({
                embeds: [continueEmbed],
                components: [] // ボタンを削除
            });

            // スレッドに新しいメッセージを投稿してアクティブにする
            const notificationEmbed = new EmbedBuilder()
                .setColor("#0099ff")
                .setTitle("📢 スレッド継続通知")
                .setDescription("このスレッドは質問者によって継続されました。")
                .setTimestamp();

            await thread.send({ embeds: [notificationEmbed] });

            // ForumAutoCheckerの状態を更新
            if (interaction.client.forumAutoChecker) {
                interaction.client.forumAutoChecker.markThreadAsContinued(threadId);
            }
        }

    } catch (error) {
        console.error("フォーラムアクション処理中にエラー:", error);

        // まだ応答していない場合のみ応答
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "処理中にエラーが発生しました。管理者にお問い合わせください。",
                flags: MessageFlags.Ephemeral
            });
        }
    }
};