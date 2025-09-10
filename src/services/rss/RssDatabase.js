// services/RssDatabase.js
const admin = require("firebase-admin");
const crypto = require("crypto");
const logger = require("../../core/logger.js");

class RssDatabase {
    constructor () {
        this.db = admin.firestore();
        this.collectionName = "rss_status";
        this.sentItemsCollection = "rss_sent_items";
    }

    /**
     * URLをハッシュ化してドキュメントIDにする
     * @param {string} url URL
     * @returns {string} ハッシュ化されたID
     */
    getSafeDocumentId (url) {
        return crypto.createHash("md5").update(url).digest("hex");
    }

    /**
     * 日付を標準化する
     * @param {string|Date} dateStr 日付文字列またはDateオブジェクト
     * @returns {Date|null} 標準化された日付
     */
    parseDate (dateStr) {
        if (!dateStr) return null;

        try {
            if (typeof dateStr === "string") {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                    logger.warn(`無効な日付文字列: ${dateStr}`);
                    return null;
                }
                return date;
            }

            if (dateStr instanceof Date) {
                if (isNaN(dateStr.getTime())) {
                    logger.warn("無効なDateオブジェクト");
                    return null;
                }
                return dateStr;
            }

            if (dateStr._seconds !== undefined) {
                return new Date(dateStr._seconds * 1000);
            }

            logger.warn(`サポートされていない日付形式: ${typeof dateStr}`);
            return null;
        } catch (e) {
            logger.error(`日付処理エラー: ${e.message}`);
            return null;
        }
    }

    /**
     * RSSステータスを更新する
     * @param {string} feedUrl フィードURL
     * @param {string} lastItemId 最後に処理したアイテムID
     * @param {string|Date} lastPublishDate 最後に処理したアイテムの公開日
     * @param {string} lastTitle 最後に処理したアイテムのタイトル
     * @returns {Promise<boolean>} 成功したかどうか
     */
    async updateRssStatus (feedUrl, lastItemId, lastPublishDate, lastTitle) {
        if (!feedUrl) {
            logger.error("更新エラー: フィードURLが指定されていません");
            return false;
        }

        try {
            const docId = this.getSafeDocumentId(feedUrl);
            const parsedDate = this.parseDate(lastPublishDate);

            const data = {
                feedUrl,
                lastItemId: lastItemId || null,
                lastPublishDate: parsedDate,
                lastTitle: lastTitle || null,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            const docRef = this.db.collection(this.collectionName).doc(docId);
            const doc = await docRef.get();

            if (doc.exists) {
                await docRef.update(data);
            } else {
                data.createdAt = admin.firestore.FieldValue.serverTimestamp();
                await docRef.set(data);
            }

            logger.info(`RSS ${feedUrl} のステータスを更新しました`);
            return true;
        } catch (error) {
            logger.error(`RSSステータス更新エラー (${feedUrl}): ${error.message}`);
            throw error;
        }
    }

    /**
     * フィードURLからRSSステータスを取得する
     * @param {string} feedUrl フィードURL
     * @returns {Promise<Object|null>} RSSステータスまたはnull
     */
    async getRssStatus (feedUrl) {
        if (!feedUrl) {
            logger.error("取得エラー: フィードURLが指定されていません");
            return null;
        }

        try {
            const docId = this.getSafeDocumentId(feedUrl);
            const docRef = this.db.collection(this.collectionName).doc(docId);
            const doc = await docRef.get();

            if (doc.exists) {
                const data = doc.data();
                const lastPublishDate = this.parseDate(data.lastPublishDate);

                return {
                    lastItemId: data.lastItemId || null,
                    lastPublishDate,
                    lastTitle: data.lastTitle || null
                };
            }
            return null;
        } catch (error) {
            logger.error(`RSSステータス取得エラー (${feedUrl}): ${error.message}`);
            return null;
        }
    }

    /**
     * すべてのRSSステータスを取得する
     * @returns {Promise<Object>} {feedUrl: statusObject}形式のオブジェクト
     */
    async getAllRssStatus () {
        try {
            const snapshot = await this.db.collection(this.collectionName).get();
            const statusObj = {};

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.feedUrl) {
                    statusObj[data.feedUrl] = {
                        lastItemId: data.lastItemId || null,
                        lastPublishDate: data.lastPublishDate,
                        lastTitle: data.lastTitle || null
                    };
                }
            });

            return statusObj;
        } catch (error) {
            logger.error(`全RSSステータス取得エラー: ${error.message}`);
            return {};
        }
    }

    /**
     * アイテムが送信済みかどうかをチェック
     * @param {string} feedUrl フィードURL
     * @param {string} itemId アイテムID（guid、title、またはリンク）
     * @returns {Promise<boolean>} 送信済みの場合true
     */
    async isItemSent (feedUrl, itemId) {
        if (!feedUrl || !itemId) return false;

        try {
            const feedHash = this.getSafeDocumentId(feedUrl);
            const itemHash = this.getSafeDocumentId(itemId);
            const docId = `${feedHash}_${itemHash}`;

            const doc = await this.db.collection(this.sentItemsCollection).doc(docId).get();
            return doc.exists;
        } catch (error) {
            logger.error(`送信済みチェックエラー (${feedUrl}, ${itemId}): ${error.message}`);
            return false;
        }
    }

    /**
     * アイテムを送信済みとしてマーク
     * @param {string} feedUrl フィードURL
     * @param {string} itemId アイテムID
     * @param {string} title アイテムタイトル
     * @returns {Promise<void>}
     */
    async markItemAsSent (feedUrl, itemId, title) {
        if (!feedUrl || !itemId) return;

        try {
            const feedHash = this.getSafeDocumentId(feedUrl);
            const itemHash = this.getSafeDocumentId(itemId);
            const docId = `${feedHash}_${itemHash}`;

            await this.db.collection(this.sentItemsCollection).doc(docId).set({
                feedUrl,
                itemId,
                title: title || "",
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            logger.debug(`送信済みマーク: ${title || itemId}`);
        } catch (error) {
            logger.error(`送信済みマークエラー (${feedUrl}, ${itemId}): ${error.message}`);
        }
    }

    /**
     * 古い送信済みアイテムを削除（30日以上古いもの）
     * @returns {Promise<void>}
     */
    async cleanupOldSentItems () {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const snapshot = await this.db.collection(this.sentItemsCollection)
                .where("createdAt", "<", thirtyDaysAgo)
                .get();

            if (snapshot.empty) return;

            const batch = this.db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            logger.info(`古い送信済みアイテム ${snapshot.size}件を削除しました`);
        } catch (error) {
            logger.error(`送信済みアイテムクリーンアップエラー: ${error.message}`);
        }
    }
}

module.exports = RssDatabase;
