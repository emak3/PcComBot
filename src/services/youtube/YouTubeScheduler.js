const cron = require('node-cron');
const log = require('../../core/logger.js');

class YouTubeScheduler {
    constructor(youtubeService, youtubeDatabase, client) {
        this.youtubeService = youtubeService;
        this.youtubeDatabase = youtubeDatabase;
        this.client = client;
        this.scheduledTasks = new Map();
        this.isProcessing = false;
    }

    async startAllSchedules(channels) {
        try {
            if (!channels || channels.length === 0) {
                log.info('監視対象のYouTubeチャンネルが設定されていません');
                return;
            }

            const intervalMinutes = require('../../app/config.js').youtube.intervalMinutes || 15;
            const cronPattern = `*/${intervalMinutes} * * * *`;

            const task = cron.schedule(cronPattern, async () => {
                if (this.isProcessing) {
                    log.debug('YouTube チェックが既に実行中です。スキップします。');
                    return;
                }

                this.isProcessing = true;
                try {
                    await this.processAllChannels(channels);
                } finally {
                    this.isProcessing = false;
                }
            }, {
                scheduled: false,
                timezone: 'Asia/Tokyo'
            });

            this.scheduledTasks.set('youtube_check', task);
            task.start();

            log.info(`YouTube通知スケジュールを開始しました (${intervalMinutes}分間隔)`);
            log.info(`監視チャンネル数: ${channels.filter(c => c.enabled !== false).length}`);

            // 初回実行（5秒後）
            setTimeout(async () => {
                if (!this.isProcessing) {
                    this.isProcessing = true;
                    try {
                        await this.processAllChannels(channels);
                    } finally {
                        this.isProcessing = false;
                    }
                }
            }, 5000);

        } catch (error) {
            log.error('YouTubeスケジュール開始エラー:', error);
        }
    }

    async processAllChannels(channels) {
        try {
            log.debug('YouTube チェックを開始します...');

            const enabledChannels = channels.filter(channel => channel.enabled !== false);

            if (enabledChannels.length === 0) {
                log.debug('有効なYouTubeチャンネルがありません');
                return;
            }

            for (const channel of enabledChannels) {
                try {
                    await this.processChannel(channel);
                } catch (error) {
                    log.error(`チャンネル処理エラー (${channel.name}):`, error);
                }
            }

            // 古い記録をクリーンアップ
            await this.youtubeDatabase.cleanOldRecords();

            log.debug('YouTube チェック完了');

        } catch (error) {
            log.error('YouTube全チャンネル処理エラー:', error);
        }
    }

    async processChannel(channel) {
        try {
            const videos = await this.youtubeService.getLatestVideos(channel.channelId, 5);

            for (const video of videos) {
                const notificationCheck = await this.youtubeDatabase.shouldNotifyVideo(video.id, video);

                if (notificationCheck.shouldNotify) {
                    await this.sendNotification(channel, video, notificationCheck.notificationType);
                    await this.youtubeDatabase.saveVideoData(
                        video.id,
                        channel.name,
                        'youtube',
                        video
                    );

                    let logMessage = `新しい動画を通知しました: ${video.title}`;
                    if (notificationCheck.notificationType === 'live_started') {
                        logMessage = `配信開始を通知しました: ${video.title}`;
                    }
                    log.info(logMessage);

                } else if (notificationCheck.statusChanged) {
                    await this.youtubeDatabase.updateVideoStatus(
                        video.id,
                        this.youtubeDatabase.getVideoStatus(video),
                        video
                    );
                    log.debug(`動画状態を更新しました: ${video.title} (${notificationCheck.notificationType})`);
                }
            }

        } catch (error) {
            log.error(`チャンネル処理エラー (${channel.name}):`, error);
        }
    }

    async sendNotification(channel, video, notificationType) {
        try {
            const discordChannel = await this.client.channels.fetch(channel.notificationChannelId);
            
            if (!discordChannel) {
                log.error(`通知チャンネルが見つかりません: ${channel.notificationChannelId}`);
                return;
            }

            const embed = this.createNotificationEmbed(video, notificationType);
            
            let content = '';
            if (notificationType === 'live_started') {
                content = '🔴 **配信が開始されました！**';
            } else if (notificationType === 'new_video') {
                content = '📺 **新しい動画が投稿されました！**';
            }

            await discordChannel.send({
                content: content,
                embeds: [embed]
            });

        } catch (error) {
            log.error(`通知送信エラー (${video.title}):`, error);
        }
    }

    createNotificationEmbed(video, notificationType) {
        const { EmbedBuilder } = require('discord.js');

        let color = 0x1DB954; // 通常の緑
        let title = video.title;

        if (notificationType === 'live_started') {
            color = 0xFF0000; // ライブ配信の赤
            title = `🔴 ${video.title}`;
        } else if (video.isUpcoming) {
            color = 0xFFFF00; // 予定配信の黄色
            title = `⏰ ${video.title}`;
        }

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setURL(video.url)
            .setDescription(video.description.length > 200 
                ? video.description.substring(0, 200) + '...' 
                : video.description)
            .setColor(color)
            .setAuthor({
                name: video.channelTitle
            })
            .setThumbnail(video.thumbnailUrl)
            .setTimestamp(new Date(video.publishedAt))
            .addFields([
                {
                    name: '再生時間',
                    value: video.duration,
                    inline: true
                },
                {
                    name: '視聴回数',
                    value: video.viewCount.toLocaleString(),
                    inline: true
                }
            ]);

        if (video.isLive) {
            embed.addFields([{
                name: 'ステータス',
                value: '🔴 **ライブ配信中**',
                inline: true
            }]);
        } else if (video.isUpcoming) {
            embed.addFields([{
                name: 'ステータス',
                value: '⏰ **配信予定**',
                inline: true
            }]);
        }

        return embed;
    }

    stopAllSchedules() {
        try {
            for (const [key, task] of this.scheduledTasks) {
                if (task) {
                    task.stop();
                    log.info(`YouTubeスケジュール '${key}' を停止しました`);
                }
            }
            this.scheduledTasks.clear();

        } catch (error) {
            log.error('YouTubeスケジュール停止エラー:', error);
        }
    }
}

module.exports = YouTubeScheduler;