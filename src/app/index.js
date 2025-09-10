const { Client, Partials, GatewayIntentBits } = require("discord.js");
const config = require("./config.js");
const log = require("../core/logger.js");
const { readdirSync } = require("node:fs");
const path = require("node:path");
const WebServer = require("../web/app.js");

// Firebase初期化
const Database = require("../core/database.js");

// RSS機能
const RssService = require("../services/rss/RssService.js");
const RssScheduler = require("../services/rss/RssScheduler.js");
const RssDatabase = require("../services/rss/RssDatabase.js");

// YouTube通知機能
const YouTubeService = require("../services/youtube/YouTubeService.js");
const YouTubeScheduler = require("../services/youtube/YouTubeScheduler.js");
const YouTubeDatabase = require("../services/youtube/YouTubeDatabase.js");

// フォーラム自動チェック機能
const ForumAutoChecker = require("../services/forum/ForumAutoChecker.js");

require("../utils/newUsernameSystem");


const client = new Client({
    intents: [
        ...Object.values(GatewayIntentBits),
        GatewayIntentBits.GuildWebhooks
    ],
    allowedMentions: { parse: ["users", "roles"] },
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Map();
client.interactions = [];
client.messages = [];
client.modals = [];
client.buttons = [];
client.menus = [];

process.on("uncaughtException", (error) => {
    log.error(error);
});

for (const file of readdirSync(path.join(__dirname, "../bot/events")).filter((file) =>
    file.endsWith(".js")
)) {
    const event = require(`../bot/events/${file}`);
    if (event.once) {
        client.once(event.name, async (...args) => await event.execute(...args));
    }
    else {
        client.on(event.name, async (...args) => await event.execute(...args));
    }
}
for (const file of readdirSync(path.join(__dirname, "../bot/commands")).filter((file) =>
    file.endsWith(".js")
)) {
    try {
        const command = require(`../bot/commands/${file}`);
        if (command.command && command.command.name) {
            client.commands.set(command.command.name, command);
        } else {
            log.error(`コマンドファイル ${file} の構造が正しくありません:`, command);
        }
    } catch (error) {
        log.error(`コマンドファイル ${file} の読み込みに失敗しました:`, error);
    }
}
for (const file of readdirSync(path.join(__dirname, "../bot/interactions")).filter((file) =>
    file.endsWith(".js")
)) {
    const interaction = require(`../bot/interactions/${file}`);
    client.interactions.push(interaction);
}
for (const file of readdirSync(path.join(__dirname, "../bot/interactions/modals")).filter((file) =>
    file.endsWith(".js")
)) {
    const modal = require(`../bot/interactions/modals/${file}`);
    client.modals.push(modal);
}
for (const file of readdirSync(path.join(__dirname, "../bot/interactions/buttons")).filter((file) =>
    file.endsWith(".js")
)) {
    const button = require(`../bot/interactions/buttons/${file}`);
    client.buttons.push(button);
}
for (const file of readdirSync(path.join(__dirname, "../bot/interactions/menus")).filter((file) =>
    file.endsWith(".js")
)) {
    const menu = require(`../bot/interactions/menus/${file}`);
    client.menus.push(menu);
}
for (const file of readdirSync(path.join(__dirname, "../messages")).filter((file) =>
    file.endsWith(".js")
)) {
    const message = require(`../messages/${file}`);
    client.messages.push(message);
}

client.login(config.token).then(async () => {
    //    log.info("Discord Bot config:", config);

    // Firebase初期化
    const database = new Database();

    // RSS機能の初期化
    if (config.rss?.enabled && database.isConnected()) {
        try {
            const rssService = new RssService(client);
            const rssDatabase = new RssDatabase();
            const rssScheduler = new RssScheduler(rssService, rssDatabase);

            // 有効なRSSフィードをフィルタリング
            const enabledFeeds = config.rss.feeds.filter(feed => feed.enabled !== false);

            if (enabledFeeds.length > 0) {
                await rssScheduler.startAllSchedules(enabledFeeds);
                log.info(`RSS機能を開始しました (${enabledFeeds.length}個のフィード)`);
            } else {
                log.info("有効なRSSフィードが設定されていません");
            }
        } catch (error) {
            log.error("RSS機能の初期化に失敗しました:", error);
        }
    } else {
        if (!config.rss?.enabled) {
            log.info("RSS機能は無効になっています");
        } else if (!database.isConnected()) {
            log.warn("Firebase接続が無効のため、RSS機能は利用できません");
        }
    }

    // YouTube通知機能の初期化
    if (config.youtube?.enabled && config.youtube?.apiKey && database.isConnected()) {
        try {
            const youtubeService = new YouTubeService(config.youtube.apiKey);
            const youtubeDatabase = new YouTubeDatabase();
            const youtubeScheduler = new YouTubeScheduler(youtubeService, youtubeDatabase, client);

            // 有効なYouTubeチャンネルをフィルタリング
            const enabledChannels = config.youtube.channels.filter(channel => channel.enabled !== false);

            if (enabledChannels.length > 0) {
                await youtubeScheduler.startAllSchedules(enabledChannels);
                log.info(`YouTube通知機能を開始しました (${enabledChannels.length}個のチャンネル)`);
                
                // Graceful shutdown時にスケジュールを停止するため、クライアントオブジェクトに追加
                client.youtubeScheduler = youtubeScheduler;
            } else {
                log.info("有効なYouTubeチャンネルが設定されていません");
            }
        } catch (error) {
            log.error("YouTube通知機能の初期化に失敗しました:", error);
        }
    } else {
        if (!config.youtube?.enabled) {
            log.info("YouTube通知機能は無効になっています");
        } else if (!config.youtube?.apiKey) {
            log.warn("YouTube API キーが設定されていません");
        } else if (!database.isConnected()) {
            log.warn("Firebase接続が無効のため、YouTube通知機能は利用できません");
        }
    }

    // フォーラム自動チェック機能の初期化
    try {
        const forumAutoChecker = new ForumAutoChecker(client);
        client.forumAutoChecker = forumAutoChecker; // クライアントオブジェクトに追加
        forumAutoChecker.start();
        log.info("フォーラム自動チェック機能を開始しました");
    } catch (error) {
        log.error("フォーラム自動チェック機能の初期化に失敗しました:", error);
    }

    // Webサーバー起動
    const webServer = new WebServer(client);
    webServer.start();

    // Graceful shutdown処理
    const shutdown = async () => {
        log.info('シャットダウン処理を開始します...');

        try {
            // YouTubeスケジュールを停止
            if (client.youtubeScheduler) {
                client.youtubeScheduler.stopAllSchedules();
            }
        } catch (error) {
            log.error('YouTubeスケジュール停止エラー:', error);
        }

        try {
            // フォーラム自動チェックを停止
            if (client.forumAutoChecker) {
                if (typeof client.forumAutoChecker.stop === 'function') {
                    client.forumAutoChecker.stop();
                } else {
                    log.warn('ForumAutoChecker.stopメソッドが存在しません');
                }
            }
        } catch (error) {
            log.error('フォーラム自動チェック停止エラー:', error);
        }

        // Discordクライアントを破棄
        client.destroy();
        log.info('ボットを正常に終了しました');
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
});
