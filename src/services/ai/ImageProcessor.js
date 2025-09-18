const axios = require("axios");
const ImageCompressor = require("./ImageCompressor.js");
const log = require("../../core/logger.js");
const ErrorHandler = require("../../utils/errorHandler.js");

/**
 * Discord添付ファイルの画像処理を行うクラス
 */
class ImageProcessor {
    constructor() {
        this.compressor = new ImageCompressor();
    }

    /**
     * Discord添付ファイルから画像をダウンロードして圧縮
     * @param {Array} attachments - Discord添付ファイル配列
     * @returns {Promise<Array>} 処理結果配列
     */
    async processDiscordAttachments(attachments) {
        return await ErrorHandler.standardTryCatch(async () => {
            const imageAttachments = attachments.filter(att => 
                this.compressor.isImageFile(att.contentType)
            );

            if (imageAttachments.length === 0) {
                return [];
            }

            log.info(`Processing ${imageAttachments.length} image attachments`);

            const results = [];
            for (const attachment of imageAttachments) {
                try {
                    const result = await this.processSingleAttachment(attachment);
                    results.push(result);
                } catch (error) {
                    log.error(`Failed to process attachment ${attachment.name}: ${error.message}`);
                    results.push({
                        filename: attachment.name,
                        originalSize: attachment.size,
                        compressed: false,
                        error: error.message
                    });
                }
            }

            // 圧縮統計をログ出力
            this.compressor.logCompressionResults(results);

            return results;

        }, "Discord画像処理", log);
    }

    /**
     * 単一の添付ファイルを処理
     * @param {Object} attachment - Discord添付ファイル
     * @returns {Promise<Object>} 処理結果
     */
    async processSingleAttachment(attachment) {
        // ファイルをダウンロード
        const response = await axios.get(attachment.url, {
            responseType: "arraybuffer",
            timeout: 30000,
            headers: {
                "User-Agent": "DiscordBot (PCCommunity, 1.0)"
            }
        });

        const imageBuffer = Buffer.from(response.data);
        
        // 画像を圧縮
        const compressionResult = await this.compressor.compressImage(
            imageBuffer, 
            attachment.contentType
        );

        return {
            filename: attachment.name,
            originalSize: attachment.size,
            ...compressionResult
        };
    }

    /**
     * 圧縮された画像のサイズ情報を取得
     * @param {Array} processResults - 処理結果配列
     * @returns {Object} サイズ統計
     */
    getCompressionStats(processResults) {
        return this.compressor.calculateStats(processResults);
    }

    /**
     * 画像が圧縮対象かどうかを判定
     * @param {Array} attachments - Discord添付ファイル配列
     * @returns {boolean} 圧縮対象の画像があるかどうか
     */
    hasCompressibleImages(attachments) {
        return attachments.some(att => 
            this.compressor.isImageFile(att.contentType) &&
            this.compressor.needsCompression(att.size)
        );
    }

    /**
     * 圧縮アドバイスメッセージを生成
     * @param {Array} attachments - Discord添付ファイル配列
     * @returns {string|null} アドバイスメッセージ
     */
    generateCompressionAdvice(attachments) {
        const compressibleImages = attachments.filter(att => 
            this.compressor.isImageFile(att.contentType) &&
            this.compressor.needsCompression(att.size)
        );

        if (compressibleImages.length === 0) {
            return null;
        }

        const totalSize = compressibleImages.reduce((sum, att) => sum + att.size, 0);
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);

        if (compressibleImages.length === 1) {
            return `添付された画像(${totalSizeMB}MB)はサイズが大きいため、AIの回答生成時にトークンを多く消費する可能性があります。可能であれば800×600px以下、100KB未満に圧縮することをお勧めします。`;
        } else {
            return `添付された${compressibleImages.length}枚の画像(合計${totalSizeMB}MB)はサイズが大きいため、AIの回答生成時にトークンを多く消費する可能性があります。可能であれば各画像を800×600px以下、100KB未満に圧縮することをお勧めします。`;
        }
    }
}

module.exports = ImageProcessor;