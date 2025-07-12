const express = require('express');
const session = require('express-session');
const path = require('path');
const config = require('../config.js');
const log = require('../logger.js');

// ルート
const authRoutes = require('./routes/auth.js');
const formRoutes = require('./routes/form.js');

class WebServer {
    constructor(client) {
        this.client = client;
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // セッション設定
        this.app.use(session({
            secret: config.sessionSecret,
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: false, // HTTPSを使用する場合はtrue
                maxAge: 24 * 60 * 60 * 1000 // 24時間
            }
        }));

        // 静的ファイル提供
        this.app.use(express.static(path.join(__dirname, 'public')));

        // JSON解析
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Discordクライアントをリクエストに添付
        this.app.use((req, res, next) => {
            req.client = this.client;
            next();
        });
    }

    setupRoutes() {
        // ルート設定
        this.app.use('/auth', authRoutes);
        this.app.use('/form', formRoutes);

        // ホームページ
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'home.html'));
        });

        // ルールページ
        this.app.get('/rules', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'rules.html'));
        });

        // 質問ガイドラインページ
        this.app.get('/guidelines', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'guidelines.html'));
        });

        // サポートページ
        this.app.get('/support', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'support.html'));
        });

        // APIエンドポイント - ユーザー情報取得
        this.app.get('/api/user', (req, res) => {
            if (req.session.user) {
                res.json({ user: req.session.user });
            } else {
                res.json({ user: null });
            }
        });

        // APIエンドポイント - コミュニティ統計取得
        this.app.get('/api/stats', (req, res) => {
            try {
                const guild = req.client.guilds.cache.get(config.pccomId);

                if (!guild) {
                    return res.json({
                        success: false,
                        error: 'サーバーが見つかりません'
                    });
                }

                // 統計情報を取得
                const stats = {
                    members: guild.memberCount,
                    todayMessages: this.getTodayMessageCount(guild),
                    solvedQuestions: this.getSolvedQuestionCount(guild),
                    onlineMembers: guild.members.cache.filter(member =>
                        member.presence?.status === 'online' ||
                        member.presence?.status === 'dnd' ||
                        member.presence?.status === 'idle'
                    ).size
                };

                res.json({
                    success: true,
                    stats: stats
                });
            } catch (error) {
                log.error('統計取得エラー:', error);
                res.json({
                    success: false,
                    error: '統計の取得に失敗しました'
                });
            }
        });

        // APIエンドポイント - サーバー情報取得
        this.app.get('/api/server-info', (req, res) => {
            try {
                const guild = req.client.guilds.cache.get(config.pccomId);

                if (!guild) {
                    return res.json({
                        success: false,
                        error: 'サーバーが見つかりません'
                    });
                }

                const serverInfo = {
                    name: guild.name,
                    description: guild.description,
                    memberCount: guild.memberCount,
                    channelCount: guild.channels.cache.size,
                    roleCount: guild.roles.cache.size,
                    createdAt: guild.createdAt,
                    iconURL: guild.iconURL(),
                    bannerURL: guild.bannerURL()
                };

                res.json({
                    success: true,
                    serverInfo: serverInfo
                });
            } catch (error) {
                log.error('サーバー情報取得エラー:', error);
                res.json({
                    success: false,
                    error: 'サーバー情報の取得に失敗しました'
                });
            }
        });

        // APIエンドポイント - RSS設定取得
        this.app.get('/api/rss-feeds', (req, res) => {
            try {
                const rssFeeds = config.rss?.feeds || [];
                const enabledFeeds = rssFeeds.filter(feed => feed.enabled !== false);

                res.json({
                    success: true,
                    feeds: enabledFeeds.map(feed => ({
                        name: feed.name,
                        url: feed.url,
                        channelCount: feed.channels.length
                    }))
                });
            } catch (error) {
                log.error('RSS設定取得エラー:', error);
                res.json({
                    success: false,
                    error: 'RSS設定の取得に失敗しました'
                });
            }
        });

        this.app.get('/api/discord-invite', (req, res) => {
            try {
                const inviteUrl = config.discordInviteUrl || 'https://discord.gg/your-server-link';

                res.json({
                    success: true,
                    inviteUrl: inviteUrl
                });
            } catch (error) {
                log.error('Discord招待リンク取得エラー:', error);
                res.json({
                    success: false,
                    error: 'Discord招待リンクの取得に失敗しました',
                    inviteUrl: 'https://discord.gg/your-server-link' // フォールバック
                });
            }
        });

        // 健康チェック
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0'
            });
        });

        // robots.txt
        this.app.get('/robots.txt', (req, res) => {
            res.type('text/plain');
            res.send(`User-agent: *
Disallow: /auth/
Disallow: /api/
Disallow: /form/
Allow: /
Allow: /rules
Allow: /guidelines
Allow: /support

Sitemap: ${config.webDomain}/sitemap.xml`);
        });

        // sitemap.xml
        this.app.get('/sitemap.xml', (req, res) => {
            res.type('application/xml');
            res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${config.webDomain}/</loc>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${config.webDomain}/rules</loc>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${config.webDomain}/guidelines</loc>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${config.webDomain}/support</loc>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>
</urlset>`);
        });

        // 404エラー
        this.app.use((req, res) => {
            res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        });

        // エラーハンドリング
        this.app.use((err, req, res, next) => {
            log.error('Webサーバーエラー:', err);
            res.status(500).json({
                error: '内部サーバーエラーが発生しました',
                timestamp: new Date().toISOString()
            });
        });
    }

    // 本日のメッセージ数を取得（推定）
    getTodayMessageCount(guild) {
        try {
            // 実際の実装では、メッセージ数を追跡するシステムが必要
            // ここでは推定値を返す
            const baseCount = Math.floor(guild.memberCount * 0.15);
            const randomFactor = Math.floor(Math.random() * 100);
            return baseCount + randomFactor;
        } catch (error) {
            log.error('本日のメッセージ数取得エラー:', error);
            return 0;
        }
    }

    // 解決済み質問数を取得（推定）
    getSolvedQuestionCount(guild) {
        try {
            // 実際の実装では、解決済みタグを持つスレッドの数を取得
            const questionChannel = guild.channels.cache.get(config.questionChId);
            if (!questionChannel) return 0;

            // スレッドから解決済みタグを持つものを数える
            const solvedCount = questionChannel.threads.cache.filter(thread =>
                thread.appliedTags.includes(config.kaiketsuTag)
            ).size;

            return solvedCount;
        } catch (error) {
            log.error('解決済み質問数取得エラー:', error);
            return 0;
        }
    }

    start() {
        this.app.listen(config.webPort, () => {
            log.info(`Webサーバーがポート ${config.webPort} で開始されました`);
            log.info(`アクセスURL: ${config.webDomain}`);
        });
    }
}

module.exports = WebServer;