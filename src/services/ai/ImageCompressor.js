const sharp = require("sharp");
const log = require("../../core/logger.js");
const ErrorHandler = require("../../utils/errorHandler.js");

/**
 * 画像を圧縮してトークン使用量を削減するクラス
 */
class ImageCompressor {
    constructor() {
        this.maxFileSize = 100 * 1024; // 100KB
        this.maxWidth = 800;
        this.maxHeight = 600;
        this.quality = 0.7;
    }

    /**
     * 画像ファイルかどうかを判定
     * @param {string} mimeType - MIMEタイプ
     * @returns {boolean} 画像ファイルかどうか
     */
    isImageFile(mimeType) {
        return mimeType && mimeType.startsWith("image/");
    }

    /**
     * 圧縮が必要かどうかを判定
     * @param {number} fileSize - ファイルサイズ（バイト）
     * @returns {boolean} 圧縮が必要かどうか
     */
    needsCompression(fileSize) {
        return fileSize > this.maxFileSize;
    }

    /**
     * 画像を圧縮
     * @param {Buffer} imageBuffer - 画像データ
     * @param {string} mimeType - MIMEタイプ
     * @returns {Promise<Object>} 圧縮結果
     */
    async compressImage(imageBuffer, mimeType = "image/jpeg") {
        return await ErrorHandler.standardTryCatch(async () => {
            const originalSize = imageBuffer.length;

            // 既に小さい場合はそのまま返す
            if (!this.needsCompression(originalSize)) {
                return {
                    buffer: imageBuffer,
                    compressed: false,
                    originalSize,
                    compressedSize: originalSize,
                    compressionRatio: 1.0
                };
            }

            try {
                // Sharpインスタンスを作成
                let sharpInstance = sharp(imageBuffer);
                
                // 画像のメタデータを取得
                const metadata = await sharpInstance.metadata();
                log.debug(`Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}, size: ${originalSize} bytes`);

                // リサイズが必要かチェック
                const needsResize = metadata.width > this.maxWidth || metadata.height > this.maxHeight;
                
                if (needsResize) {
                    sharpInstance = sharpInstance.resize(this.maxWidth, this.maxHeight, {
                        fit: 'inside',
                        withoutEnlargement: true
                    });
                }

                // フォーマットと品質を設定
                let compressedBuffer;
                if (mimeType === "image/png" || metadata.format === "png") {
                    // PNGの場合
                    compressedBuffer = await sharpInstance
                        .png({
                            quality: 80,
                            compressionLevel: 9,
                            palette: true
                        })
                        .toBuffer();
                } else {
                    // JPEG/WebPなど、その他の場合はJPEGに変換
                    compressedBuffer = await sharpInstance
                        .jpeg({
                            quality: Math.round(this.quality * 100),
                            progressive: true,
                            mozjpeg: true
                        })
                        .toBuffer();
                }

                const compressedSize = compressedBuffer.length;
                const compressionRatio = compressedSize / originalSize;

                log.debug(`Compressed image: size: ${compressedSize} bytes, ratio: ${(compressionRatio * 100).toFixed(1)}%`);

                return {
                    buffer: compressedBuffer,
                    compressed: true,
                    originalSize,
                    compressedSize,
                    compressionRatio,
                    metadata: {
                        originalFormat: metadata.format,
                        originalDimensions: `${metadata.width}x${metadata.height}`,
                        resized: needsResize
                    }
                };

            } catch (error) {
                log.warn(`Image compression failed: ${error.message}. Returning original image.`);
                
                return {
                    buffer: imageBuffer,
                    compressed: false,
                    originalSize,
                    compressedSize: originalSize,
                    compressionRatio: 1.0,
                    error: error.message
                };
            }

        }, "画像圧縮", log);
    }

    /**
     * 複数の画像を圧縮
     * @param {Array} images - 画像配列 [{buffer, mimeType, filename}]
     * @returns {Promise<Array>} 圧縮結果配列
     */
    async compressImages(images) {
        const results = [];

        for (const image of images) {
            try {
                const result = await this.compressImage(image.buffer, image.mimeType);
                results.push({
                    ...result,
                    filename: image.filename,
                    mimeType: image.mimeType
                });
            } catch (error) {
                log.error(`Failed to compress image ${image.filename}: ${error.message}`);
                results.push({
                    buffer: image.buffer,
                    compressed: false,
                    originalSize: image.buffer.length,
                    compressedSize: image.buffer.length,
                    compressionRatio: 1.0,
                    filename: image.filename,
                    mimeType: image.mimeType,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * 圧縮統計を計算
     * @param {Array} compressionResults - 圧縮結果配列
     * @returns {Object} 統計情報
     */
    calculateStats(compressionResults) {
        const totalOriginalSize = compressionResults.reduce((sum, result) => sum + result.originalSize, 0);
        const totalCompressedSize = compressionResults.reduce((sum, result) => sum + result.compressedSize, 0);
        const compressedCount = compressionResults.filter(result => result.compressed).length;

        return {
            totalFiles: compressionResults.length,
            compressedFiles: compressedCount,
            totalOriginalSize,
            totalCompressedSize,
            totalSavings: totalOriginalSize - totalCompressedSize,
            averageCompressionRatio: totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 1.0
        };
    }

    /**
     * 圧縮結果をログ出力
     * @param {Array} compressionResults - 圧縮結果配列
     */
    logCompressionResults(compressionResults) {
        const stats = this.calculateStats(compressionResults);
        
        log.info(`Image compression completed: ${stats.compressedFiles}/${stats.totalFiles} files compressed`);
        
        if (stats.totalSavings > 0) {
            const savingsKB = (stats.totalSavings / 1024).toFixed(1);
            const compressionPercent = ((1 - stats.averageCompressionRatio) * 100).toFixed(1);
            log.info(`Total size reduction: ${savingsKB}KB (${compressionPercent}% compression)`);
        }

        compressionResults.forEach(result => {
            if (result.error) {
                log.warn(`${result.filename}: Compression failed - ${result.error}`);
            } else if (result.warning) {
                log.warn(`${result.filename}: ${result.warning}`);
            } else if (result.compressed) {
                const savingsKB = ((result.originalSize - result.compressedSize) / 1024).toFixed(1);
                log.debug(`${result.filename}: Compressed by ${savingsKB}KB`);
            }
        });
    }
}

module.exports = ImageCompressor;