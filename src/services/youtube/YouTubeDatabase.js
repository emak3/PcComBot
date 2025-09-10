const Database = require('../../core/database.js');
const log = require('../../core/logger.js');

class YouTubeDatabase {
    constructor() {
        this.database = new Database();
        this.collection = 'youtube_videos';
    }

    async saveVideoData(videoId, channelName, platform, videoData) {
        try {
            if (!this.database.isConnected()) {
                throw new Error('Firebaseデータベースが利用できません');
            }

            const db = this.database.getFirestore();
            const docRef = db.collection(this.collection).doc(videoId);

            const videoRecord = {
                id: videoId,
                channelName: channelName,
                platform: platform,
                title: videoData.title,
                publishedAt: videoData.publishedAt,
                url: videoData.url,
                isLive: videoData.isLive,
                isUpcoming: videoData.isUpcoming,
                duration: videoData.duration,
                viewCount: videoData.viewCount,
                lastNotified: new Date().toISOString(),
                lastStatus: this.getVideoStatus(videoData),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await docRef.set(videoRecord);
            log.debug(`動画データを保存しました: ${videoId}`);

        } catch (error) {
            log.error(`動画データ保存エラー (${videoId}):`, error.message);
            throw error;
        }
    }

    async getVideoData(videoId) {
        try {
            if (!this.database.isConnected()) {
                return null;
            }

            const db = this.database.getFirestore();
            const docRef = db.collection(this.collection).doc(videoId);
            const doc = await docRef.get();

            return doc.exists ? doc.data() : null;

        } catch (error) {
            log.error(`動画データ取得エラー (${videoId}):`, error.message);
            return null;
        }
    }

    async updateVideoStatus(videoId, newStatus, videoData) {
        try {
            if (!this.database.isConnected()) {
                throw new Error('Firebaseデータベースが利用できません');
            }

            const db = this.database.getFirestore();
            const docRef = db.collection(this.collection).doc(videoId);

            const updates = {
                lastStatus: newStatus,
                isLive: videoData.isLive,
                isUpcoming: videoData.isUpcoming,
                viewCount: videoData.viewCount,
                updatedAt: new Date().toISOString()
            };

            await docRef.update(updates);
            log.debug(`動画ステータスを更新しました: ${videoId} -> ${newStatus}`);

        } catch (error) {
            log.error(`動画ステータス更新エラー (${videoId}):`, error.message);
            throw error;
        }
    }

    async shouldNotifyVideo(videoId, videoData) {
        try {
            const existingData = await this.getVideoData(videoId);
            const currentStatus = this.getVideoStatus(videoData);

            if (!existingData) {
                const videoAge = Date.now() - new Date(videoData.publishedAt).getTime();
                const maxAge = 24 * 60 * 60 * 1000; // 24時間

                return {
                    shouldNotify: videoAge <= maxAge,
                    notificationType: 'new_video',
                    statusChanged: false
                };
            }

            const statusChanged = existingData.lastStatus !== currentStatus;
            
            if (statusChanged) {
                if (existingData.lastStatus === 'upcoming' && currentStatus === 'live') {
                    return {
                        shouldNotify: true,
                        notificationType: 'live_started',
                        statusChanged: true
                    };
                }

                if (existingData.lastStatus === 'live' && currentStatus === 'ended') {
                    return {
                        shouldNotify: false,
                        notificationType: 'live_ended',
                        statusChanged: true
                    };
                }
            }

            return {
                shouldNotify: false,
                notificationType: null,
                statusChanged: statusChanged
            };

        } catch (error) {
            log.error(`通知判定エラー (${videoId}):`, error.message);
            return {
                shouldNotify: false,
                notificationType: null,
                statusChanged: false
            };
        }
    }

    getVideoStatus(videoData) {
        if (videoData.isLive) return 'live';
        if (videoData.isUpcoming) return 'upcoming';
        return 'ended';
    }

    async cleanOldRecords(maxAgeHours = 168) { // デフォルト7日
        try {
            if (!this.database.isConnected()) {
                throw new Error('Firebaseデータベースが利用できません');
            }

            const db = this.database.getFirestore();
            const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
            
            const querySnapshot = await db.collection(this.collection)
                .where('updatedAt', '<', cutoffTime.toISOString())
                .get();

            let deletedCount = 0;
            const batch = db.batch();

            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
                deletedCount++;
            });

            if (deletedCount > 0) {
                await batch.commit();
                log.info(`古いYouTube記録を${deletedCount}件削除しました`);
            }

        } catch (error) {
            log.error('YouTube記録のクリーンアップエラー:', error.message);
        }
    }
}

module.exports = YouTubeDatabase;