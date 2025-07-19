const express = require("express");
const ApiController = require("../controllers/apiController.js");

const router = express.Router();

// API エンドポイント
router.get("/server-icon", ApiController.getServerIcon);
router.get("/user", ApiController.getUser);
router.get("/stats", ApiController.getStats);
router.get("/server-info", ApiController.getServerInfo);
router.get("/rss-feeds", ApiController.getRssFeeds);
router.get("/discord-invite", ApiController.getDiscordInvite);
router.get("/health", ApiController.getHealth);

module.exports = router;