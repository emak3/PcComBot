const path = require("path");
const config = require("../../config.js");

class PageController {
    static getHome(req, res) {
        res.sendFile(path.join(__dirname, "..", "public", "home.html"));
    }

    static getRules(req, res) {
        res.sendFile(path.join(__dirname, "..", "public", "rules.html"));
    }

    static getGuidelines(req, res) {
        res.sendFile(path.join(__dirname, "..", "public", "guidelines.html"));
    }

    static getSupport(req, res) {
        res.sendFile(path.join(__dirname, "..", "public", "support.html"));
    }

    static getRobotsTxt(req, res) {
        const robotsTxt = `User-agent: *
Allow: /
Allow: /rules
Allow: /guidelines  
Allow: /support

Disallow: /api/
Disallow: /auth/
Disallow: /form/

Sitemap: ${req.protocol}://${req.get("host")}/sitemap.xml`;

        res.set("Content-Type", "text/plain");
        res.send(robotsTxt);
    }

    static getSiteMap(req, res) {
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}/</loc>
        <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/rules</loc>
        <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/guidelines</loc>
        <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/support</loc>
        <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>
</urlset>`;

        res.set("Content-Type", "application/xml");
        res.send(sitemap);
    }

    static handle404(req, res) {
        res.status(404).sendFile(path.join(__dirname, "..", "public", "404.html"));
    }

    static handleError(err, req, res, next) {
        console.error("サーバーエラー:", err);
        res.status(500).json({
            success: false,
            error: "内部サーバーエラーが発生しました"
        });
    }
}

module.exports = PageController;