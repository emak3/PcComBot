// services/RssService.js
const Parser = require("rss-parser");
const RssDatabase = require("./RssDatabase.js");
const RssWebhookSender = require("./RssWebhookSender.js");
const RssItemProcessor = require("./RssItemProcessor.js");
const ErrorHandler = require("../utils/errorHandler.js");
const logger = require("../logger.js");

class RssService {
    constructor (client) {
        this.client = client;
        this.parser = new Parser({
            customFields: {
                item: [
                    ["media:thumbnail", "mediaThumbnail"],
                    ["media:content", "mediaContent"],
                    ["enclosure", "enclosure"],
                    ["image", "image"]
                ]
            }
        });
        this.rssDatabase = new RssDatabase();
        this.webhookSender = new RssWebhookSender();
        this.itemProcessor = new RssItemProcessor(client, this.webhookSender, this.rssDatabase);
        this.isProcessing = false;
    }



    /**
     * RSSフィードを処理する
     * @param {Array} rssFeeds RSS設定配列
     */
    async processRssFeeds (rssFeeds) {
        if (this.isProcessing) {
            logger.warn("RSS処理が既に実行中です");
            return;
        }

        this.isProcessing = true;
        logger.info("RSSフィードの処理を開始します");

        try {
            if (!rssFeeds || rssFeeds.length === 0) {
                logger.info("RSSフィードが設定されていません");
                return;
            }

            // 各RSSフィードを処理
            for (const feed of rssFeeds) {
                await this.processSingleFeed(feed);
            }
        } catch (error) {
            ErrorHandler.logError(error, "RSSフィード処理");
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * 単一のRSSフィードを処理する
     * @param {Object} feed フィード設定
     */
    async processSingleFeed (feed) {
        return await ErrorHandler.standardTryCatch(async () => {
            logger.info(`フィード処理: ${feed.name} (${feed.url})`);

            // RSSフィードを取得・解析
            const feedData = await this.parser.parseURL(feed.url);
            logger.debug(`フィード ${feed.url} から ${feedData.items.length}件のアイテムを取得`);

            // 新しいアイテムを抽出
            const newItems = await this.itemProcessor.extractNewItems(feedData.items, feed.url);

            // 初回実行時の制限処理
            const processedItems = await this.itemProcessor.limitItemsForInitialRun(newItems, feed.url);

            // アイテムを時系列順にソート
            this.itemProcessor.sortItemsByDate(processedItems);

            logger.info(`フィード ${feed.url} の新しいアイテム数: ${processedItems.length}`);

            if (processedItems.length === 0) {
                return;
            }

            // ファビコンを取得
            const faviconUrl = await this.itemProcessor.getFaviconForFeed(feed.url, feedData.link);

            // アイテムを送信
            await this.itemProcessor.sendItemsToChannels(processedItems, feed, faviconUrl);

            logger.info(`フィード ${feed.url} の処理が完了しました`);
        }, `フィード処理: ${feed.name}`);
    }


}

module.exports = RssService;
