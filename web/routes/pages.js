const express = require("express");
const PageController = require("../controllers/pageController.js");

const router = express.Router();

// ページルート
router.get("/", PageController.getHome);
router.get("/rules", PageController.getRules);
router.get("/guidelines", PageController.getGuidelines);
router.get("/support", PageController.getSupport);
router.get("/robots.txt", PageController.getRobotsTxt);
router.get("/sitemap.xml", PageController.getSiteMap);

// 404ハンドラー（最後に設定）
router.use(PageController.handle404);

module.exports = router;