const { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../config.js");
const log = require("../logger.js");
const cron = require("node-cron");
const forumExclude = require("../commands/forumExclude.js");
const DiscordHelpers = require("../utils/discordHelpers.js");
const ErrorHandler = require("../utils/errorHandler.js");

/**
 * フォーラムの非アクティブスレッドを自動チェックし、管理するクラス
 * @class ForumAutoChecker
 */
class ForumAutoChecker {
    /**
     * コンストラクタ
     * @param {Client} client - Discord クライアント
     */
    constructor (client) {
        this.client = client;
        this.checkedThreads = new Set(); // 既にチェック済みのスレッドを記録
        this.pendingClosures = new Map(); // 24時間後の自動クローズ予定スレッド
        this.isRunning = false;
    }

    /**
     * 自動チェック機能を開始
     */
    start () {
        if (this.isRunning) {
            log.warn("ForumAutoChecker は既に実行中です");
            return;
        }

        // 毎日8,12,15,21時に実行
        cron.schedule("0 8,12,15,21 * * *", async () => {
            await this.checkInactiveThreads();
        });

        // 1時間ごとに自動クローズをチェック
        cron.schedule("0 * * * *", async () => {
            await this.processAutomaticClosures();
        });

        this.isRunning = true;
        log.info("ForumAutoChecker を開始しました (毎日8,12,15,21時に実行)");
    }

    /**
     * 非アクティブなスレッドをチェック
     */
    async checkInactiveThreads () {
        return await ErrorHandler.standardTryCatch(async () => {
            log.info("フォーラムの非アクティブスレッドチェックを開始します");

            const guild = this.client.guilds.cache.first();
            if (!guild) {
                log.error("ギルドが見つかりません");
                return;
            }

            // 質問フォーラムチャンネルを取得
            const forumChannel = guild.channels.cache.get(config.questionChId);
            if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
                log.error("質問フォーラムチャンネルが見つからないか、フォーラムチャンネルではありません");
                return;
            }

            // 除外チャンネルかどうかをチェック
            if (await forumExclude.isChannelExcluded(forumChannel.id)) {
                log.info(`フォーラムチャンネル ${forumChannel.name} (${forumChannel.id}) は除外設定されているためスキップします`);
                return;
            }

            // アクティブなスレッドを取得
            const threads = await forumChannel.threads.fetch({ archived: false });
            const inactiveThreads = [];
            const threeDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000); // 2日前

            for (const [threadId, thread] of threads.threads) {
                // 解決済みタグがついている場合はスキップ
                if (thread.appliedTags.includes(config.kaiketsuTag)) {
                    continue;
                }

                // 除外スレッドの場合はスキップ
                if (await forumExclude.isChannelExcluded(threadId)) {
                    log.info(`スレッド ${thread.name} (${threadId}) は除外設定されているためスキップします`);
                    continue;
                }

                // 既にチェック済みの場合はスキップ
                if (this.checkedThreads.has(threadId)) {
                    continue;
                }

                try {
                    // 最後のメッセージの時刻を取得
                    const messages = await thread.messages.fetch({ limit: 1 });
                    const lastMessage = messages.first();

                    if (lastMessage && lastMessage.createdTimestamp < threeDaysAgo) {
                        inactiveThreads.push({
                            thread: thread,
                            lastMessageTime: lastMessage.createdTimestamp,
                            ownerId: thread.ownerId
                        });
                    }
                } catch (error) {
                    ErrorHandler.logError(error, `スレッドメッセージ取得エラー (${threadId})`, log);
                }
            }

            if (inactiveThreads.length === 0) {
                log.info("新しい非アクティブスレッドは見つかりませんでした");
                return;
            }

            // 各非アクティブスレッドの作成者にメッセージを送信
            let processedCount = 0;
            let errorCount = 0;

            for (const inactiveThread of inactiveThreads) {
                try {
                    const { thread, ownerId, lastMessageTime } = inactiveThread;

                    // スレッドの作成者を取得
                    const owner = await guild.members.fetch(ownerId).catch(() => null);
                    if (!owner) {
                        // 作成者がサーバーから抜けている場合、スレッドを自動クローズ
                        log.info(`スレッド作成者 ${ownerId} がサーバーから抜けているため、スレッド ${thread.name} を自動クローズします`);
                        
                        try {
                            // スレッドにクローズ理由を投稿
                            const closeEmbed = DiscordHelpers.createInfoEmbed(
                                "🔒 スレッド自動クローズ",
                                "このスレッドの作成者がサーバーから退出したため、自動的にクローズされました。",
                                { color: "#ff6b6b" }
                            );
                            await DiscordHelpers.safeMessageSend(thread, { embeds: [closeEmbed] });
                            
                            // スレッドをアーカイブ（クローズ）
                            await thread.setArchived(true, "作成者がサーバーから退出したため自動クローズ");
                            
                            // チェック済みとしてマーク
                            this.checkedThreads.add(thread.id);
                            processedCount++;
                        } catch (closeError) {
                            ErrorHandler.logError(closeError, `スレッドクローズエラー (${thread.id})`, log);
                            errorCount++;
                        }
                        continue;
                    }

                    // 確認メッセージとボタンを作成
                    const embed = DiscordHelpers.createInfoEmbed(
                        "📋 質問スレッドの確認",
                        `あなたが作成した質問「**${thread.name}**」で2日以上発言がありません。\n\nこの質問は__解決__しましたか？それとも質問を__続けます__か？\n\n` + "質問が解決した場合は、解決に役立った質問を `右クリック` もしくは、`長押し` をして `アプリ` → `BestAnswer` の順にコマンドを実行してください。",
                        {
                            color: "#ff9900",
                            fields: [
                                { name: "スレッド", value: `<#${thread.id}>`, inline: true },
                                { name: "最終発言", value: `<t:${Math.floor(lastMessageTime / 1000)}:R>`, inline: true }
                            ],
                            image: "https://i.gyazo.com/49cf3736cde4f9ac4ee9bb929b995a36.png",
                            footer: { text: "24時間以内に回答がない場合、自動的にクローズされます" }
                        }
                    );

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`forum_continue_${thread.id}`)
                                .setLabel("質問を続ける")
                                .setStyle(ButtonStyle.Success)
                                .setEmoji("💬")
                        );

                    // スレッド内にメッセージを投稿
                    await DiscordHelpers.safeMessageSend(thread, {
                        content: `<@${ownerId}>`,
                        embeds: [embed],
                        components: [row]
                    });

                    // チェック済みとしてマーク
                    this.checkedThreads.add(thread.id);

                    // 24時間後の自動クローズを予約
                    const autoCloseTime = Date.now() + (24 * 60 * 60 * 1000);
                    this.pendingClosures.set(thread.id, {
                        threadId: thread.id,
                        closeTime: autoCloseTime,
                        notified: true
                    });

                    processedCount++;
                    log.info(`スレッド ${thread.name} (${thread.id}) に確認メッセージを送信しました`);

                    // レート制限を避けるため少し待機
                    await new Promise(resolve => setTimeout(resolve, 1000));

                } catch (error) {
                    ErrorHandler.logError(error, `スレッド処理エラー (${inactiveThread.thread.id})`, log);
                    errorCount++;
                }
            }

            log.info(`フォーラムチェック完了: 処理済み${processedCount}件, エラー${errorCount}件`);

        }, "フォーラム自動チェック", log);
    }

    /**
     * 24時間経過したスレッドを自動でクローズ
     */
    async processAutomaticClosures () {
        return await ErrorHandler.standardTryCatch(async () => {
            const now = Date.now();
            const toClose = [];

            // クローズ予定時刻を過ぎたスレッドを検索
            for (const [threadId, closureData] of this.pendingClosures) {
                if (now >= closureData.closeTime) {
                    toClose.push(threadId);
                }
            }

            if (toClose.length === 0) return;

            log.info(`${toClose.length}件のスレッドを自動クローズします`);

            const guild = this.client.guilds.cache.first();
            if (!guild) return;

            for (const threadId of toClose) {
                try {
                    const thread = guild.channels.cache.get(threadId);
                    if (!thread || thread.archived) {
                        // スレッドが既に削除されているか、アーカイブ済み
                        this.pendingClosures.delete(threadId);
                        this.checkedThreads.delete(threadId);
                        continue;
                    }

                    // スレッドをアーカイブ
                    await thread.setArchived(true);

                    // クリーンアップ
                    this.pendingClosures.delete(threadId);
                    this.checkedThreads.delete(threadId);

                    log.info(`スレッド ${thread.name} (${threadId}) を自動クローズしました`);

                } catch (error) {
                    ErrorHandler.logError(error, `スレッド自動クローズエラー (${threadId})`, log);
                    // エラーの場合も予定から削除
                    this.pendingClosures.delete(threadId);
                }
            }

        }, "自動クローズ処理", log);
    }

    /**
     * スレッドが手動で操作された場合の処理
     * @param {string} threadId - スレッドID
     */
    markThreadAsHandled (threadId) {
        this.pendingClosures.delete(threadId);
        // チェック済みマークは残す（再チェックを防ぐため）
    }

    /**
     * スレッドが継続された場合の処理
     * @param {string} threadId - スレッドID
     */
    markThreadAsContinued (threadId) {
        this.pendingClosures.delete(threadId);
        this.checkedThreads.delete(threadId); // 再チェック可能にする
    }

    /**
     * チェック済みスレッドリストをクリーンアップ（週1回実行推奨）
     */
    cleanupCheckedThreads () {
        const guild = this.client.guilds.cache.first();
        if (!guild) return;

        const existingThreadIds = new Set();

        // 現在存在するスレッドIDを収集
        guild.channels.cache.forEach(channel => {
            if (channel.type === ChannelType.PublicThread) {
                existingThreadIds.add(channel.id);
            }
        });

        // 存在しないスレッドIDを削除
        for (const threadId of this.checkedThreads) {
            if (!existingThreadIds.has(threadId)) {
                this.checkedThreads.delete(threadId);
            }
        }

        log.info("チェック済みスレッドリストをクリーンアップしました");
    }
}

module.exports = ForumAutoChecker;
