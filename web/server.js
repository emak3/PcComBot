const express = require("express");
const config = require("../config.js");
const log = require("../logger.js");

// ミドルウェア設定
const setupMiddleware = require("./middleware/setup.js");

// ルート
const authRoutes = require("./routes/auth.js");
const formRoutes = require("./routes/form.js");
const apiRoutes = require("./routes/api.js");
const pageRoutes = require("./routes/pages.js");

// コントローラー
const PageController = require("./controllers/pageController.js");

class WebServer {
    constructor(client) {
        this.client = client;
        this.app = express();
        this.setupServer();
    }

    setupServer() {
        // ミドルウェア設定
        setupMiddleware(this.app, this.client);

        // ルート設定
        this.setupRoutes();

        // エラーハンドリング
        this.app.use(PageController.handleError);
    }

    setupRoutes() {
        // API ルート
        this.app.use("/api", apiRoutes);

        // 認証・フォームルート
        this.app.use("/auth", authRoutes);
        this.app.use("/form", formRoutes);

        // ページルート（最後に設定）
        this.app.use("/", pageRoutes);
    }

    start(port = 3000) {
        this.app.listen(port, () => {
            log.info(`Web server started on port ${port}`);
        });
    }
}

module.exports = WebServer;