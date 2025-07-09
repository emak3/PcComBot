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

        // メインページ（別のページを表示）
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'home.html'));
        });

        // サポートページ
        this.app.get('/support', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // APIエンドポイント - ユーザー情報取得
        this.app.get('/api/user', (req, res) => {
            if (req.session.user) {
                res.json({ user: req.session.user });
            } else {
                res.json({ user: null });
            }
        });

        // 404エラー
        this.app.use((req, res) => {
            res.status(404).send('Page not found');
        });
    }

    start() {
        this.app.listen(config.webPort, () => {
            log.info(`Webサーバーがポート ${config.webPort} で開始されました`);
        });
    }
}

module.exports = WebServer;