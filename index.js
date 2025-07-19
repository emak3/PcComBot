const { Client, Partials, GatewayIntentBits } = require("discord.js");
const config = require("./config.js");
const log = require("./logger.js");
const { readdirSync } = require("node:fs");
const WebServer = require("./web/server.js");

// Firebase初期化
const Database = require("./utils/database.js");

// RSS機能
const RssService = require("./services/RssService.js");
const RssScheduler = require("./services/RssScheduler.js");
const RssDatabase = require("./services/RssDatabase.js");

// フォーラム自動チェック機能
const ForumAutoChecker = require("./services/ForumAutoChecker.js");

require("./utils/newUsernameSystem");


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

for (const file of readdirSync("./events").filter((file) =>
    file.endsWith(".js")
)) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, async (...args) => await event.execute(...args));
    }
    else {
        client.on(event.name, async (...args) => await event.execute(...args));
    }
}
for (const file of readdirSync("./commands").filter((file) =>
    file.endsWith(".js")
)) {
    try {
        const command = require(`./commands/${file}`);
        if (command.command && command.command.name) {
            client.commands.set(command.command.name, command);
        } else {
            log.error(`コマンドファイル ${file} の構造が正しくありません:`, command);
        }
    } catch (error) {
        log.error(`コマンドファイル ${file} の読み込みに失敗しました:`, error);
    }
}
for (const file of readdirSync("./interactions").filter((file) =>
    file.endsWith(".js")
)) {
    const interaction = require(`./interactions/${file}`);
    client.interactions.push(interaction);
}
for (const file of readdirSync("./interactions/modal").filter((file) =>
    file.endsWith(".js")
)) {
    const modal = require(`./interactions/modal/${file}`);
    client.modals.push(modal);
}
for (const file of readdirSync("./interactions/button").filter((file) =>
    file.endsWith(".js")
)) {
    const button = require(`./interactions/button/${file}`);
    client.buttons.push(button);
}
for (const file of readdirSync("./interactions/menu").filter((file) =>
    file.endsWith(".js")
)) {
    const menu = require(`./interactions/menu/${file}`);
    client.menus.push(menu);
}
for (const file of readdirSync("./messages").filter((file) =>
    file.endsWith(".js")
)) {
    const message = require(`./messages/${file}`);
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
});
