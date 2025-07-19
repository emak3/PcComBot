const session = require("express-session");
const path = require("path");
const express = require("express");
const config = require("../../config.js");

function setupMiddleware(app, client) {
    // セッション設定
    app.use(session({
        secret: config.sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false, // HTTPSを使用する場合はtrue
            maxAge: 24 * 60 * 60 * 1000 // 24時間
        }
    }));

    // 静的ファイル提供
    app.use(express.static(path.join(__dirname, "..", "public")));

    // JSON解析
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Discordクライアントをリクエストに添付
    app.use((req, res, next) => {
        req.client = client;
        next();
    });
}

module.exports = setupMiddleware;