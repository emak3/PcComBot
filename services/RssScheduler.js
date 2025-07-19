// services/RssScheduler.js
const cron = require("node-cron");
const ErrorHandler = require("../utils/errorHandler.js");
const logger = require("../logger.js");

class RssScheduler {
    constructor (rssService, rssDatabase) {
        this.rssService = rssService;
        this.rssDatabase = rssDatabase;
        this.scheduledTasks = [];
        this.isInitialProcessingComplete = false;
    }

    /**
     * 初回実行を開始する
     * @param {Array} rssFeeds RSS設定配列
     * @param {number} delayMs 初回実行の遅延時間（ミリ秒）
     */
    async startInitialProcessing (rssFeeds, delayMs = 5000) {
        return new Promise((resolve) => {
            setTimeout(async () => {
                await ErrorHandler.standardTryCatch(async () => {
                    logger.info("初回実行: RSSフィードの処理を開始します");
                    await this.rssService.processRssFeeds(rssFeeds);
                    this.isInitialProcessingComplete = true;
                    logger.info("初回実行が完了しました");
                    resolve();
                }, "RSS初回実行処理");
            }, delayMs);
        });
    }

    /**
     * 定期実行スケジュールを設定する
     * @param {Array} rssFeeds RSS設定配列
     * @param {string} cronPattern cronパターン（デフォルト: 10分ごと）
     */
    scheduleRegularProcessing (rssFeeds, cronPattern = "*/10 * * * *") {
        const task = cron.schedule(cronPattern, async () => {
            await ErrorHandler.standardTryCatch(async () => {
                logger.info("定期実行: RSSフィードを処理します");
                await this.rssService.processRssFeeds(rssFeeds);
            }, "RSS定期実行処理");
        });

        this.scheduledTasks.push({
            name: "regular_processing",
            task: task,
            pattern: cronPattern
        });

        logger.info(`RSS定期実行が開始されました (${cronPattern})`);
        return task;
    }

    /**
     * クリーンアップスケジュールを設定する
     * @param {string} cronPattern cronパターン（デフォルト: 毎日午前3時）
     */
    scheduleCleanup (cronPattern = "0 3 * * *") {
        const task = cron.schedule(cronPattern, async () => {
            await ErrorHandler.standardTryCatch(async () => {
                logger.info("定期クリーンアップ: 古い送信済みアイテムを削除します");
                await this.rssDatabase.cleanupOldSentItems();
                logger.info("クリーンアップが完了しました");
            }, "RSSデータクリーンアップ");
        });

        this.scheduledTasks.push({
            name: "cleanup",
            task: task,
            pattern: cronPattern
        });

        logger.info(`RSSクリーンアップが開始されました (${cronPattern})`);
        return task;
    }

    /**
     * 全スケジュールを開始する
     * @param {Array} rssFeeds RSS設定配列
     * @param {Object} options スケジュール設定オプション
     */
    async startAllSchedules (rssFeeds, options = {}) {
        const {
            initialDelayMs = 5000,
            processingCron = "*/10 * * * *",
            cleanupCron = "0 3 * * *"
        } = options;

        try {
            // 初回実行
            await this.startInitialProcessing(rssFeeds, initialDelayMs);

            // 定期実行の設定
            this.scheduleRegularProcessing(rssFeeds, processingCron);

            // クリーンアップの設定
            this.scheduleCleanup(cleanupCron);

            logger.info("すべてのRSSスケジュールが正常に開始されました");

        } catch (error) {
            ErrorHandler.logError(error, "RSSスケジューラー開始エラー");
            throw error;
        }
    }

    /**
     * 特定のスケジュールを停止する
     * @param {string} scheduleName スケジュール名
     */
    stopSchedule (scheduleName) {
        const scheduleIndex = this.scheduledTasks.findIndex(
            schedule => schedule.name === scheduleName
        );

        if (scheduleIndex !== -1) {
            const schedule = this.scheduledTasks[scheduleIndex];
            schedule.task.stop();
            this.scheduledTasks.splice(scheduleIndex, 1);
            logger.info(`スケジュール "${scheduleName}" を停止しました`);
            return true;
        } else {
            logger.warn(`スケジュール "${scheduleName}" が見つかりません`);
            return false;
        }
    }

    /**
     * すべてのスケジュールを停止する
     */
    stopAllSchedules () {
        let stoppedCount = 0;

        for (const schedule of this.scheduledTasks) {
            try {
                schedule.task.stop();
                stoppedCount++;
                logger.info(`スケジュール "${schedule.name}" を停止しました`);
            } catch (error) {
                ErrorHandler.logError(error, `スケジュール "${schedule.name}" 停止エラー`);
            }
        }

        this.scheduledTasks = [];
        logger.info(`${stoppedCount}個のスケジュールを停止しました`);
        return stoppedCount;
    }

    /**
     * 現在のスケジュール状態を取得する
     */
    getScheduleStatus () {
        return {
            isInitialProcessingComplete: this.isInitialProcessingComplete,
            activeSchedules: this.scheduledTasks.map(schedule => ({
                name: schedule.name,
                pattern: schedule.pattern,
                isRunning: schedule.task.running
            }))
        };
    }

    /**
     * 手動でRSSフィード処理を実行する
     * @param {Array} rssFeeds RSS設定配列
     */
    async manualProcessing (rssFeeds) {
        return await ErrorHandler.standardTryCatch(async () => {
            logger.info("手動実行: RSSフィードの処理を開始します");
            await this.rssService.processRssFeeds(rssFeeds);
            logger.info("手動実行が完了しました");
        }, "RSS手動実行処理");
    }
}

module.exports = RssScheduler;
