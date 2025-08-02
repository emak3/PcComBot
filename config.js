const fs = require("fs");
const path = require("path");

/**
 * Firebase サービスアカウント設定を取得
 * @returns {Object} Firebase サービスアカウント設定
 */
function getFirebaseServiceAccount () {
    // 方法1: サービスアカウントファイルを使用
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

        if (fs.existsSync(serviceAccountPath)) {
            try {
                return require(serviceAccountPath);
            } catch (error) {
                log.error("Firebaseサービスアカウントファイルの読み込みに失敗しました:", error.message);
            }
        } else {
            log.warn(`Firebaseサービスアカウントファイルが見つかりません: ${serviceAccountPath}`);
            log.warn("環境変数からFirebase設定を読み込みます...");
        }
    }

    // 方法2: 環境変数から設定を読み込み
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        return {
            type: "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || null,
            private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID || null,
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || null
        };
    }

    // FirebaseなしでもRSS以外は動作するように警告のみ出力
    console.warn("Firebase設定が見つかりません。RSS機能は利用できませんが、他の機能は利用可能です。");
    return null;
}

module.exports = {
    "token": process.env.TOKEN,
    "clientId": process.env.CLIENT_ID,
    "pccomId": process.env.PCCOM_ID ?? "932529116400459786",
    "sanee": process.env.SIN_ID ?? "1294171228608659578",
    "profile": process.env.PROFILE,
    //質問チャンネルID
    "questionChId": "1019989168283197483",
    //解決済みタグ
    "kaiketsuTag": "1159827748148215928",
    //タイムアウトメンバーにつけるロール
    "timeoutMemberRoleId": "1142862037173669899",
    //PC紹介チャンネルID
    "pcsyokaiId": "933243864234459136",
    //ticketのアーカイブカテゴリーID
    "newCategoryId": "1385971327210487951",
    //ベストアンサーロール
    "bestAnswerRole": "1067445728542199828",
    //2週間未経過通知
    "timeoutNotice": "1385287795014242394",

    // Web関連設定
    "webPort": process.env.WEB_PORT ?? 3000,
    "webDomain": process.env.WEB_DOMAIN ?? "http://localhost:3000",
    "clientSecret": process.env.CLIENT_SECRET,
    "sessionSecret": process.env.SESSION_SECRET,

    // OAuth2設定を修正
    "authUrl": process.env.AUTH_URL,
    "redirectUri": process.env.REDIRECT_URI ?? `${process.env.WEB_DOMAIN ?? "http://localhost:3000"}/auth/callback`,

    // 問い合わせ関連チャンネル
    "inquiryChannelId": process.env.INQUIRY_CHANNEL_ID,
    "inquiryCategoryId": process.env.INQUIRY_CATEGORY_ID,

    // 管理者ロール
    "adminRoleId": process.env.ADMIN_ROLE_ID,
    "supportRoleId": process.env.SUP_ROLE_ID,

    // Discord招待リンク
    "discordInviteUrl": process.env.DISCORD_INVITE_URL ?? "https://discord.gg/your-server-link",

    // サイト設定
    "site": {
        "title": "PC Community",
        "description": "PCに関する質問、情報共有、雑談を楽しめるDiscordコミュニティ",
        "keywords": "PC,コンピューター,Discord,コミュニティ,質問,サポート,パソコン",
        "author": "PC Community",
        "language": "ja",
        "charset": "UTF-8",
        "viewport": "width=device-width, initial-scale=1.0",
        "themeColor": "#5865F2",
        "backgroundColor": "#36393F"
    },

    // OGP設定
    "ogp": {
        "siteName": "PC Community",
        "title": "PC Community - パソコミ",
        "description": "PCに関する質問、情報共有、雑談を楽しめるDiscordコミュニティです。初心者から上級者まで、みんなで学び合いましょう！",
        "type": "website",
        "url": process.env.WEB_DOMAIN ?? "http://localhost:3000",
        "image": `${process.env.WEB_DOMAIN ?? "http://localhost:3000"}/images/ogp.png`,
        "locale": "ja_JP",
        "twitterCard": "summary_large_image",
        "twitterSite": "@pccomm_official"
    },

    // Firebase設定
    firebase: {
        serviceAccount: getFirebaseServiceAccount(),
        databaseURL: process.env.FIREBASE_DATABASE_URL || (process.env.FIREBASE_PROJECT_ID ? `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com/` : null)
    },

    // RSS機能設定
    rss: {
        enabled: process.env.RSS_ENABLED !== "false" && getFirebaseServiceAccount() !== null,

        intervalMinutes: parseInt(process.env.RSS_INTERVAL_MINUTES) || 10,

        feeds: [
            {
                name: "PC/テクノロジーの総合情報サイト｜PC Watch",
                url: "https://pc.watch.impress.co.jp/data/rss/1.0/pcw/feed.rdf",
                channels: ["1392149286942281808"],
                enabled: true
            },
            {
                name: "ギャズログ｜GAZLOG",
                url: "https://gazlog.jp/feed/",
                channels: ["1392149451950391356"],
                enabled: true
            }
        ]
    },

    // ログレベル設定
    "logging": {
        "level": process.env.LOG_LEVEL || "info",
        "fileOutput": process.env.LOG_FILE_OUTPUT !== "false",
        "maxFileSize": process.env.LOG_MAX_FILE_SIZE || "10MB",
        "maxFiles": process.env.LOG_MAX_FILES || 5
    },

    // レート制限設定
    "rateLimit": {
        "enabled": process.env.RATE_LIMIT_ENABLED !== "false",
        "windowMs": parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分
        "maxRequests": parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        "message": "リクエストが多すぎます。しばらく待ってからやり直してください。"
    },

    // セキュリティ設定
    "security": {
        "enableCORS": process.env.ENABLE_CORS !== "false",
        "trustedOrigins": process.env.TRUSTED_ORIGINS?.split(",") || [],
        "enableCSP": process.env.ENABLE_CSP !== "false",
        "enableHSTS": process.env.ENABLE_HSTS !== "false"
    },

    // 開発者設定
    "development": {
        "enabled": process.env.NODE_ENV === "development",
        "debugMode": process.env.DEBUG_MODE === "true",
        "mockData": process.env.MOCK_DATA === "true"
    }
};
