const { SlashCommandBuilder, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionContextType, MessageFlags, PermissionFlagsBits } = require("discord.js");
const config = require("../config.js");

module.exports = {
    command: new SlashCommandBuilder()
        .setName("forum-check")
        .setNameLocalization("ja", "フォーラムチェック")
        .setDescription("Check for inactive forum threads and ask thread creators for closure confirmation")
        .setDescriptionLocalization("ja", "2日以上発言がないフォーラムスレッドをチェックし、作成者にクローズ確認を求める")
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        // 管理者権限チェック
        if (!interaction.member.permissions.has("ManageChannels")) {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ 
                    content: "このコマンドを使用するには「チャンネル管理」権限が必要です。", 
                    flags: MessageFlags.Ephemeral 
                });
            }
            return;
        }

        // deferReplyを呼び出す前に再度チェック
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            } catch (error) {
                console.error("deferReply失敗:", error);
                return;
            }
        } else {
            return;
        }

        try {
            // 質問フォーラムチャンネルを取得
            const forumChannel = interaction.guild.channels.cache.get(config.questionChId); //config.questionChId
            if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
                return await interaction.editReply({
                    content: "質問フォーラムチャンネルが見つからないか、フォーラムチャンネルではありません。"
                });
            }

            // アクティブなスレッドを取得
            const threads = await forumChannel.threads.fetch({ archived: false });
            const inactiveThreads = [];
            const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000); // 2 * 24 * 60 * 60 * 1000　2日前

            for (const [threadId, thread] of threads.threads) {
                // 解決済みタグがついている場合はスキップ
                if (thread.appliedTags.includes(config.kaiketsuTag)) { //config.kaiketsuTag
                    continue;
                }

                // 最後のメッセージの時刻を取得
                const lastMessage = await thread.messages.fetch({ limit: 1 }).then(messages => messages.first());
                
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
                return await interaction.editReply({
                    content: "2日以上発言がないスレッドは見つかりませんでした。"
                });
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
                    const embed = new EmbedBuilder()
                        .setColor("#ff9900")
                        .setTitle("📋 質問スレッドの確認")
                        .setDescription(`あなたが作成した質問「**${thread.name}**」で2日以上発言がありません。\n\nこの質問は__解決__しましたか？それとも質問を__続けます__か？\n\n`+"質問が解決した場合は、解決に役立った質問を `右クリック` もしくは、`長押し` をして `アプリ` → `BestAnswer` の順にコマンドを実行してください。")
                        .addFields([
                            { name: "スレッド", value: `<#${thread.id}>`, inline: true },
                            { name: "最終発言", value: `<t:${Math.floor(lastMessageTime / 1000)}:R>`, inline: true }
                        ])
                        .setTimestamp()
                        .setImage('https://i.gyazo.com/49cf3736cde4f9ac4ee9bb929b995a36.png')
                        .setFooter({ text: "24時間以内に回答がない場合、自動的にクローズされます" });

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
                    console.error(`スレッド ${inactiveThread.thread.id} の処理中にエラー:`, error);
                    errorCount++;
                }
            }

            // 結果を報告
            const resultEmbed = new EmbedBuilder()
                .setColor(processedCount > 0 ? "#00ff00" : "#ff0000")
                .setTitle("📊 フォーラムチェック結果")
                .addFields([
                    { name: "処理されたスレッド", value: `${processedCount}件`, inline: true },
                    { name: "エラー", value: `${errorCount}件`, inline: true },
                    { name: "合計非アクティブスレッド", value: `${inactiveThreads.length}件`, inline: true }
                ])
                .setTimestamp();

            await interaction.editReply({ embeds: [resultEmbed] });

        } catch (error) {
            console.error("フォーラムチェック中にエラー:", error);
            
            // deferReplyが呼ばれているのでeditReplyを使用
            try {
                await interaction.editReply({
                    content: "フォーラムチェック中にエラーが発生しました。ログを確認してください。"
                });
            } catch (editError) {
                console.error("エラーレスポンスの送信に失敗しました:", editError);
            }
        }
    }
};