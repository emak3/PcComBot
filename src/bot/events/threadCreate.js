const { Events, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../app/config.js");
const GuidelineChecker = require("../../services/ai/GuidelineChecker.js");
const ImageProcessor = require("../../services/ai/ImageProcessor.js");
const DiscordHelpers = require("../../utils/discordHelpers.js");
const ErrorHandler = require("../../utils/errorHandler.js");
const log = require("../../core/logger.js");

module.exports = {
    name: Events.ThreadCreate,
    /**
     * スレッド作成時の処理
     * @param {ThreadChannel} thread - 作成されたスレッド
     */
    async execute(thread) {
        return await ErrorHandler.standardTryCatch(async () => {
            // 質問チャンネル以外は処理しない
            if (thread.parentId !== config.questionChId) {
                return;
            }

            // フォーラムチャンネルでない場合は処理しない
            if (thread.parent?.type !== ChannelType.GuildForum) {
                return;
            }

            log.info(`新しい質問スレッド作成: ${thread.name} (${thread.id})`);

            // 少し待機してから処理（スレッド作成直後のメッセージを取得するため）
            await new Promise(resolve => setTimeout(resolve, 2000));

            // スレッドの最初のメッセージを取得
            const messages = await thread.messages.fetch({ limit: 1 });
            const firstMessage = messages.first();

            if (!firstMessage) {
                log.warn(`スレッド ${thread.id} の最初のメッセージが見つかりません`);
                return;
            }

            // 添付ファイルの情報を収集
            const attachments = firstMessage.attachments.map(attachment => ({
                name: attachment.name,
                size: attachment.size,
                contentType: attachment.contentType,
                url: attachment.url
            }));

            // ガイドラインチェックを実行
            const guidelineChecker = new GuidelineChecker();
            const imageProcessor = new ImageProcessor();

            let checkResult = null;
            let imageCompressionInfo = null;

            if (guidelineChecker.isConfigured()) {
                checkResult = await guidelineChecker.checkGuidelines(
                    thread.name,
                    firstMessage.content,
                    attachments
                );

                // 画像は内部で自動圧縮処理済み（ユーザーへの表示は不要）
            }

            // レスポンスメッセージを作成・送信
            await this.sendGuidelineResponse(thread, checkResult, null);

        }, "スレッド作成処理", log);
    },

    /**
     * ガイドラインチェック結果に基づいてレスポンスを送信
     * @param {ThreadChannel} thread - スレッド
     * @param {Object|null} checkResult - チェック結果
     * @param {string|null} imageCompressionInfo - 画像圧縮情報
     */
    async sendGuidelineResponse(thread, checkResult, imageCompressionInfo) {
        let embed, components = [];

        if (!checkResult) {
            // AIチェック無効時のデフォルトメッセージ
            embed = DiscordHelpers.createInfoEmbed(
                "📋 質問ガイドライン",
                "質問をありがとうございます！より良い回答を得るために、質問ガイドラインをご確認ください。",
                {
                    color: "#5865F2",
                    fields: [
                        {
                            name: "重要なポイント",
                            value: "• 事前に検索・調査を行う\n• 具体的なタイトルを付ける\n• 目的と現状を明確に記載\n• 使用環境の詳細を含める",
                            inline: false
                        }
                    ],
                    footer: {
                        text: "質問ガイドラインに従うことで、より早く正確な回答が得られます"
                    }
                }
            );

            // ボタンは不要

        } else if (checkResult.isCompliant) {
            // ガイドライン準拠時
            embed = DiscordHelpers.createInfoEmbed(
                "✅ 質問ガイドライン準拠",
                "この質問はガイドラインに沿って適切に書かれています。コミュニティメンバーからの回答をお待ちください。",
                {
                    color: "#00ff00",
                    fields: []
                }
            );

            // 簡潔な回答がある場合は追加
            if (checkResult.briefAnswer) {
                embed.data.fields.push({
                    name: "💡 ヒント",
                    value: checkResult.briefAnswer,
                    inline: false
                });
            }

        } else {
            // ガイドライン違反時
            const missingText = checkResult.missingElements.length > 0 
                ? "• " + checkResult.missingElements.join("\n• ")
                : "詳細な情報の追加をお勧めします";

            embed = DiscordHelpers.createInfoEmbed(
                "⚠️ 質問の改善をお勧めします",
                "より良い回答を得るために、以下の要素を追加してください。",
                {
                    color: "#ff9900",
                    fields: [
                        {
                            name: "不足している要素",
                            value: missingText,
                            inline: false
                        }
                    ]
                }
            );

            // 改善提案がある場合は追加
            if (checkResult.suggestions.length > 0) {
                embed.data.fields.push({
                    name: "💡 改善提案",
                    value: "• " + checkResult.suggestions.join("\n• "),
                    inline: false
                });
            }

            // 簡潔な回答がある場合は追加
            if (checkResult.briefAnswer) {
                embed.data.fields.push({
                    name: "💡 回答のヒント",
                    value: checkResult.briefAnswer,
                    inline: false
                });
            }

            // ボタンは不要
        }

        // 画像圧縮情報は内部処理のみで、ユーザーには表示しない

        // ガイドラインへのリンクを追加
        if (!embed.data.fields.some(field => field.name === "📖 参考資料")) {
            embed.data.fields.push({
                name: "📖 参考資料",
                value: "[質問ガイドライン](https://pcb.ouma3.org/guidelines) | [コミュニティルール](https://pcb.ouma3.org/rules)",
                inline: false
            });
        }

        // メッセージを送信（ボタンなし）
        const messageOptions = { embeds: [embed] };

        await DiscordHelpers.safeMessageSend(thread, messageOptions);

        log.info(`ガイドラインチェック完了: ${thread.name} - 準拠: ${checkResult?.isCompliant || "N/A"}`);
    }
};