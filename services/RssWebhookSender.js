// services/RssWebhookSender.js
const { MessageFlags } = require("discord.js");
const { createRssEmbed } = require("./FeedFormatter.js");
const ErrorHandler = require("../utils/errorHandler.js");
const logger = require("../logger.js");

class RssWebhookSender {
    constructor () {
        // 特別な初期化は不要
    }

    /**
     * RSSアイテムをWebhookに送信する
     * @param {Webhook} webhook Webhook
     * @param {Object} item RSSアイテム
     * @param {Object} feed フィード情報
     * @param {string} faviconUrl ファビコンURL
     */
    async sendRssToWebhook (webhook, item, feed, faviconUrl) {
        return await ErrorHandler.standardTryCatch(async () => {
            // Embedを作成
            const container = await createRssEmbed(item, feed);

            // メッセージオプション
            const messageOptions = {
                username: feed.name,
                components: [container],
                flags: MessageFlags.IsComponentsV2
            };

            // アイコンURL設定
            if (faviconUrl) {
                messageOptions.avatarURL = faviconUrl;
            }

            // メッセージ送信
            try {
                await webhook.send(messageOptions);
                logger.info(`RSS送信成功: ${item.title}`);
            } catch (webhookError) {
                logger.error(`Webhook送信エラー: ${webhookError.message}`);

                // avatarURLが問題の場合、それを除いて再試行
                if (messageOptions.avatarURL) {
                    logger.info("avatarURLを削除して再試行します");
                    delete messageOptions.avatarURL;
                    await webhook.send(messageOptions);
                    logger.info(`avatarURLなしでの送信成功: ${item.title}`);
                } else {
                    throw webhookError;
                }
            }
        }, `RSS Webhook送信: ${item.title}`);
    }

    /**
     * 送信エラー時のフォールバック処理
     * @param {Webhook} webhook Webhook
     * @param {Object} item RSSアイテム
     * @param {Object} feed フィード情報
     */
    async sendFallbackMessage (webhook, item, feed) {
        return await ErrorHandler.safeAsyncOperation(async () => {
            await webhook.send({
                username: feed.name,
                content: `**${item.title}**\n${item.link || ""}`
            });
            logger.info(`フォールバック送信成功: ${item.title}`);
        }, null, `フォールバック送信: ${item.title}`);
    }

    /**
     * RSSアイテムの安全な送信（エラーハンドリング込み）
     * @param {Webhook} webhook Webhook
     * @param {Object} item RSSアイテム
     * @param {Object} feed フィード情報
     * @param {string} faviconUrl ファビコンURL
     * @returns {boolean} 送信成功フラグ
     */
    async safeSendRssItem (webhook, item, feed, faviconUrl) {
        try {
            await this.sendRssToWebhook(webhook, item, feed, faviconUrl);
            return true;
        } catch (error) {
            ErrorHandler.logError(error, `RSS送信エラー: ${item.title}`);

            // エラー時のフォールバック: シンプルなメッセージ
            const fallbackSuccess = await this.sendFallbackMessage(webhook, item, feed);
            if (fallbackSuccess !== null) {
                return true;
            } else {
                logger.error(`全ての送信方法が失敗しました: ${item.title}`);
                return false;
            }
        }
    }
}

module.exports = RssWebhookSender;
