const config = require("../../config.js");
const log = require("../../logger.js");

class ApiController {
    static getServerIcon(req, res) {
        try {
            const guild = req.client.guilds.cache.get(config.pccomId);

            if (!guild) {
                return res.json({
                    success: false,
                    error: "サーバーが見つかりません",
                    fallbackIcon: "fas fa-desktop"
                });
            }

            const iconURL = guild.iconURL({
                format: "png",
                size: 128,
                dynamic: true
            });

            res.json({
                success: true,
                iconURL: iconURL,
                serverName: guild.name,
                fallbackIcon: "fas fa-desktop"
            });
        } catch (error) {
            log.error("サーバーアイコン取得エラー:", error);
            res.json({
                success: false,
                error: "サーバーアイコンの取得に失敗しました",
                fallbackIcon: "fas fa-desktop"
            });
        }
    }

    static getUser(req, res) {
        if (req.session.user) {
            res.json({ user: req.session.user });
        } else {
            res.json({ user: null });
        }
    }

    static getStats(req, res) {
        try {
            const guild = req.client.guilds.cache.get(config.pccomId);

            if (!guild) {
                return res.json({
                    success: false,
                    error: "サーバーが見つかりません"
                });
            }

            // 統計情報を取得
            const stats = {
                members: guild.memberCount,
                todayMessages: ApiController.getTodayMessageCount(guild),
                solvedQuestions: ApiController.getSolvedQuestionCount(guild),
                onlineMembers: guild.members.cache.filter(member =>
                    member.presence?.status === "online" ||
                    member.presence?.status === "dnd" ||
                    member.presence?.status === "idle"
                ).size
            };

            res.json({
                success: true,
                stats: stats
            });
        } catch (error) {
            log.error("統計取得エラー:", error);
            res.json({
                success: false,
                error: "統計の取得に失敗しました"
            });
        }
    }

    static getServerInfo(req, res) {
        try {
            const guild = req.client.guilds.cache.get(config.pccomId);

            if (!guild) {
                return res.json({
                    success: false,
                    error: "サーバーが見つかりません"
                });
            }

            const serverInfo = {
                name: guild.name,
                description: guild.description || "PCコミュニティ - パソコンに関する質問・相談ができるDiscordサーバー",
                memberCount: guild.memberCount,
                createdAt: guild.createdAt,
                verificationLevel: guild.verificationLevel,
                premiumTier: guild.premiumTier,
                premiumSubscriptionCount: guild.premiumSubscriptionCount
            };

            res.json({
                success: true,
                serverInfo: serverInfo
            });
        } catch (error) {
            log.error("サーバー情報取得エラー:", error);
            res.json({
                success: false,
                error: "サーバー情報の取得に失敗しました"
            });
        }
    }

    static getRssFeeds(req, res) {
        try {
            // RSS設定を返す（実際の実装では適切なデータを取得）
            const rssFeeds = [
                {
                    title: "技術ニュース",
                    url: "https://example.com/rss",
                    description: "最新の技術情報をお届け"
                }
            ];

            res.json({
                success: true,
                feeds: rssFeeds
            });
        } catch (error) {
            log.error("RSS設定取得エラー:", error);
            res.json({
                success: false,
                error: "RSS設定の取得に失敗しました"
            });
        }
    }

    static getDiscordInvite(req, res) {
        try {
            const guild = req.client.guilds.cache.get(config.pccomId);

            if (!guild) {
                return res.json({
                    success: false,
                    error: "サーバーが見つかりません"
                });
            }

            res.json({
                success: true,
                inviteUrl: config.discordInviteUrl || "https://discord.gg/your-server"
            });
        } catch (error) {
            log.error("Discord招待リンク取得エラー:", error);
            res.json({
                success: false,
                error: "Discord招待リンクの取得に失敗しました"
            });
        }
    }

    static getHealth(req, res) {
        try {
            res.json({
                success: true,
                status: "healthy",
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            log.error("健康チェックエラー:", error);
            res.status(500).json({
                success: false,
                status: "error",
                error: "健康チェックに失敗しました"
            });
        }
    }

    static getTodayMessageCount(guild) {
        try {
            // 実際の実装では、今日のメッセージ数を計算する
            // 現在はプレースホルダー値を返す
            return Math.floor(Math.random() * 500) + 100;
        } catch (error) {
            log.error("本日のメッセージ数取得エラー:", error);
            return 0;
        }
    }

    static getSolvedQuestionCount(guild) {
        try {
            // 実際の実装では、解決済み質問数を計算する
            // フォーラムのクローズされたスレッド数などを集計
            const forumChannel = guild.channels.cache.get(config.questionChId);
            if (forumChannel && forumChannel.threads) {
                // 解決済みタグまたはクローズされたスレッドをカウント
                return forumChannel.threads.cache.filter(thread => 
                    thread.archived || thread.locked
                ).size;
            }
            return 0;
        } catch (error) {
            log.error("解決済み質問数取得エラー:", error);
            return 0;
        }
    }
}

module.exports = ApiController;