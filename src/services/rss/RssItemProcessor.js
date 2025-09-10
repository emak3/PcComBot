// services/RssItemProcessor.js
const { URL } = require("url");
const { getFavicon } = require("../../utils/faviconUtils.js");
const getWebhookInChannel = require("../../utils/webhookGet.js");
const ErrorHandler = require("../../utils/errorHandler.js");
const logger = require("../../core/logger.js");

class RssItemProcessor {
    constructor (client, webhookSender, rssDatabase) {
        this.client = client;
        this.webhookSender = webhookSender;
        this.rssDatabase = rssDatabase;
    }

    /**
     * URLからドメインを抽出する
     * @param {string} url URL
     * @returns {string|null} ドメイン
     */
    extractDomain (url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return null;
        }
    }

    /**
     * 新しいアイテムを抽出する
     * @param {Array} items フィードアイテム配列
     * @param {string} feedUrl フィードURL
     * @returns {Array} 新しいアイテム配列
     */
    async extractNewItems (items, feedUrl) {
        const newItems = [];

        for (const item of items) {
            const itemId = this.getItemId(item);
            if (!itemId) continue;

            const isAlreadySent = await this.rssDatabase.isItemSent(feedUrl, itemId);
            if (!isAlreadySent) {
                newItems.push(item);
            }
        }

        return newItems;
    }

    /**
     * 初回実行時のアイテム制限処理
     * @param {Array} newItems 新しいアイテム配列
     * @param {string} feedUrl フィードURL
     * @returns {Array} 処理対象アイテム配列
     */
    async limitItemsForInitialRun (newItems, feedUrl) {
        if (newItems.length <= 10) {
            return newItems;
        }

        // 日付順でソート（新しい順）
        newItems.sort((a, b) => {
            const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
            const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
            return dateB - dateA;
        });

        // 最新3件のみに制限
        const limitedItems = newItems.slice(0, 3);
        logger.info(`初回実行のため、${feedUrl} の新着アイテムを最新3件に制限しました (${newItems.length}件 → ${limitedItems.length}件)`);

        // 残りのアイテムは送信済みとしてマーク
        for (const item of newItems.slice(3)) {
            const itemId = this.getItemId(item);
            if (itemId) {
                await this.rssDatabase.markItemAsSent(feedUrl, itemId, item.title);
            }
        }

        return limitedItems;
    }

    /**
     * アイテムを日付順でソートする（古い順）
     * @param {Array} items アイテム配列
     */
    sortItemsByDate (items) {
        items.sort((a, b) => {
            try {
                const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
                const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;

                if (isNaN(dateA) || isNaN(dateB)) {
                    return 0;
                }

                return dateA - dateB; // 古い順
            } catch (e) {
                ErrorHandler.logError(e, "日付ソート");
                return 0;
            }
        });
    }

    /**
     * フィードのファビコンを取得する
     * @param {string} feedUrl フィードURL
     * @param {string} feedLink フィードリンク
     * @returns {string|null} ファビコンURL
     */
    async getFaviconForFeed (feedUrl, feedLink) {
        const domain = this.extractDomain(feedUrl) || this.extractDomain(feedLink);
        if (!domain) return null;

        return await ErrorHandler.safeAsyncOperation(async () => {
            const faviconUrl = await getFavicon(domain);
            logger.debug(`ファビコン取得成功: ${faviconUrl}`);
            return faviconUrl;
        }, null, "ファビコン取得");
    }

    /**
     * アイテムをチャンネルに送信する
     * @param {Array} items アイテム配列
     * @param {Object} feed フィード設定
     * @param {string} faviconUrl ファビコンURL
     */
    async sendItemsToChannels (items, feed, faviconUrl) {
        for (const item of items) {
            logger.debug(`新しいアイテムを送信: ${item.title}`);

            const itemId = this.getItemId(item);
            let sendSuccess = false;

            // 設定されたすべてのチャンネルに送信
            for (const channelId of feed.channels) {
                const channelSendSuccess = await this.sendItemToChannel(
                    item, feed, faviconUrl, channelId
                );
                if (channelSendSuccess) {
                    sendSuccess = true;
                }
            }

            // 送信に成功した場合、送信済みとしてマーク
            if (sendSuccess && itemId) {
                await ErrorHandler.safeAsyncOperation(async () => {
                    await this.rssDatabase.markItemAsSent(feed.url, itemId, item.title);
                }, null, "送信済みマーク");
            }
        }
    }

    /**
     * アイテムを単一チャンネルに送信する
     * @param {Object} item RSSアイテム
     * @param {Object} feed フィード設定
     * @param {string} faviconUrl ファビコンURL
     * @param {string} channelId チャンネルID
     * @returns {boolean} 送信成功フラグ
     */
    async sendItemToChannel (item, feed, faviconUrl, channelId) {
        return await ErrorHandler.safeAsyncOperation(async () => {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel) {
                logger.error(`チャンネル ${channelId} が見つかりません`);
                return false;
            }

            const webhook = await getWebhookInChannel(channel);
            if (!webhook) {
                logger.error(`チャンネル ${channelId} のWebhook取得に失敗しました`);
                return false;
            }

            const success = await this.webhookSender.safeSendRssItem(
                webhook, item, feed, faviconUrl
            );

            if (success) {
                logger.info(`チャンネル ${channelId} にアイテム "${item.title}" を送信しました`);
            }

            return success;
        }, false, `チャンネル送信: ${channelId}`);
    }

    /**
     * アイテムの一意IDを取得する
     * @param {Object} item RSSアイテム
     * @returns {string|null} アイテムID
     */
    getItemId (item) {
        return item.guid || item.link || item.title || null;
    }
}

module.exports = RssItemProcessor;
