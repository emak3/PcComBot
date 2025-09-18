const axios = require("axios");
const log = require("../../core/logger.js");
const ErrorHandler = require("../../utils/errorHandler.js");

/**
 * Claude AIを使用して質問がガイドラインに沿っているかチェックするクラス
 */
class GuidelineChecker {
    constructor() {
        this.apiKey = process.env.ANTHROPIC_API_KEY;
        this.apiUrl = "https://api.anthropic.com/v1/messages";
        this.maxTokens = 1024;

        // ガイドラインの内容を定義
        this.guidelines = `
質問ガイドライン:

1. 検索して調べる
- 質問前に必ずGoogleなどで検索する
- 調べた事や調べてわかったこと・実践した事について記載
- 役に立たなかった関連するサイトのリンクを含める

2. 一目で内容がわかるタイトルを書く
- フォーラム上で興味を抱かせるタイトル
- 具体的で明確なタイトル

3. 正しく伝わりやすい質問の本文を書く
- 抽象的でない質問
- 何を教えてほしいのかはっきりしている
- 目的と現状を明確に記載

4. 使用しているもの
パソコンの問題の場合:
- OS (Windows 10、Ubuntu 21.04 など)
- パーツ (問題の起きているパーツ)
- PC型番 (購入したPCならば型番)

プログラムの問題の場合:
- OS (Windows 10、Ubuntu 21.04 など)
- 言語 (Python 3.7、Node.js 14 など)
- ライブラリ (pipやnpmなどでインストールしたライブラリ群)
- コード (シンタックスハイライト付き)

5. 質問禁止事項
- スクレイピング関連の質問は禁止

6. コードの書き方
- エラーやコードはコピペで全文を貼り付け
- スクリーンショットではなくテキストで
`;
    }

    /**
     * APIキーが設定されているかチェック
     */
    isConfigured() {
        return !!this.apiKey;
    }

    /**
     * 質問がガイドラインに沿っているかチェック
     * @param {string} title - 質問のタイトル
     * @param {string} content - 質問の内容
     * @param {Array} attachments - 添付ファイル情報
     * @returns {Promise<Object>} チェック結果
     */
    async checkGuidelines(title, content, attachments = []) {
        if (!this.isConfigured()) {
            log.warn("Anthropic API key not configured. Skipping guideline check.");
            return {
                isCompliant: true,
                missingElements: [],
                suggestions: [],
                hasImages: false
            };
        }

        return await ErrorHandler.standardTryCatch(async () => {
            const hasImages = attachments.some(att =>
                att.contentType && att.contentType.startsWith("image/")
            );

            // 画像がある場合は圧縮処理を行う
            let processedAttachments = attachments;
            let compressionInfo = null;
            
            if (hasImages) {
                const ImageProcessor = require("./ImageProcessor.js");
                const imageProcessor = new ImageProcessor();
                
                const compressionResults = await imageProcessor.processDiscordAttachments(attachments);
                compressionInfo = this.generateCompressionSummary(compressionResults);
                
                log.info(`Image compression completed: ${compressionResults.length} images processed`);
                
                // 圧縮された画像情報を更新
                processedAttachments = attachments.map(att => {
                    const compressed = compressionResults.find(r => r.filename === att.name);
                    if (compressed && compressed.compressed) {
                        return {
                            ...att,
                            size: compressed.compressedSize,
                            compressed: true,
                            originalSize: compressed.originalSize
                        };
                    }
                    return att;
                });
            }

            const prompt = this.buildPrompt(title, content, hasImages, compressionInfo);
            const response = await this.callClaudeAPI(prompt);

            const result = this.parseResponse(response, hasImages);
            
            // 圧縮情報を結果に追加
            if (compressionInfo) {
                result.compressionInfo = compressionInfo;
            }
            
            return result;
        }, "ガイドラインチェック", log);
    }

    /**
     * Claude APIへのプロンプトを構築
     * @param {string} title - 質問のタイトル
     * @param {string} content - 質問の内容
     * @param {boolean} hasImages - 画像が含まれているか
     * @param {string} compressionInfo - 圧縮情報
     * @returns {string} プロンプト
     */
    buildPrompt(title, content, hasImages, compressionInfo = null) {
        let imageNote = "";
        if (hasImages) {
            imageNote = "\n\n※この質問には画像が添付されています。";
            if (compressionInfo) {
                imageNote += `\n${compressionInfo}`;
            }
        }

        return `以下の質問ガイドラインに基づいて、投稿された質問を評価してください。

${this.guidelines}

評価対象の質問:
タイトル: "${title}"
内容: "${content}"${imageNote}

以下の形式で評価結果をJSONで返してください:
{
  "isCompliant": boolean (ガイドラインに完全に準拠している場合true),
  "missingElements": [不足している要素のリスト],
  "suggestions": [改善提案のリスト],
  "briefAnswer": "質問に対する具体的で実用的な回答やヒント（100文字以内）"
}

特に以下の点を重点的にチェックしてください:
- 事前調査の有無
- タイトルの具体性
- 目的と現状の明確性
- 技術的な詳細情報（OS、言語、エラーメッセージなど）
- 禁止事項への該当

briefAnswerについて:
- 質問の内容から推測される問題に対する具体的なヒントや解決の方向性を提示
- 一般的な検索キーワードや確認すべき項目を含める
- 「ガイドラインを確認してください」のような一般的な回答は避ける
- 技術的な質問の場合は、調べるべき技術用語や設定項目を含める
- エラーが推測される場合は、よくある原因や確認点を提示

簡潔で建設的な評価をお願いします。`;
    }

    /**
     * Claude APIを呼び出し
     * @param {string} prompt - 送信するプロンプト
     * @returns {Promise<string>} APIレスポンス
     */
    async callClaudeAPI(prompt) {
        const headers = {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
            "anthropic-version": "2023-06-01"
        };

        const data = {
            model: "claude-3-5-haiku-20241022",
            max_tokens: this.maxTokens,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        };

        try {
            const response = await axios.post(this.apiUrl, data, {
                headers,
                timeout: 30000 // 30秒タイムアウト
            });

            if (response.data && response.data.content && response.data.content[0]) {
                return response.data.content[0].text;
            }

            throw new Error("Invalid API response format");
        } catch (error) {
            if (error.response) {
                log.error(`Claude API error: ${error.response.status} - ${error.response.data?.error?.message || "Unknown error"}`);
            } else {
                log.error(`Claude API request failed: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Claude APIのレスポンスを解析
     * @param {string} response - APIレスポンス
     * @param {boolean} hasImages - 画像が含まれているか
     * @returns {Object} 解析結果
     */
    parseResponse(response, hasImages) {
        try {
            // JSONブロックを抽出（```json で囲まれている場合）
            const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                response.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

                return {
                    isCompliant: Boolean(parsed.isCompliant),
                    missingElements: Array.isArray(parsed.missingElements) ? parsed.missingElements : [],
                    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
                    briefAnswer: typeof parsed.briefAnswer === "string" ? parsed.briefAnswer : "",
                    hasImages
                };
            }

            // JSONパース失敗時のフォールバック
            log.warn("Failed to parse Claude response as JSON, using fallback");
            return this.createFallbackResponse(response, hasImages);

        } catch (error) {
            log.error(`Error parsing Claude response: ${error.message}`);
            return this.createFallbackResponse(response, hasImages);
        }
    }

    /**
     * パース失敗時のフォールバック応答を作成
     * @param {string} response - 元のレスポンス
     * @param {boolean} hasImages - 画像が含まれているか
     * @returns {Object} フォールバック応答
     */
    createFallbackResponse(response, hasImages) {
        const isCompliant = response.includes("準拠") || response.includes("適切");

        return {
            isCompliant,
            missingElements: isCompliant ? [] : ["詳細な分析ができませんでした"],
            suggestions: ["質問ガイドラインを再確認してください"],
            briefAnswer: "ガイドラインに従って質問を見直してください",
            hasImages
        };
    }

    /**
     * 画像を圧縮
     * @param {Buffer} imageBuffer - 画像データ
     * @param {number} maxSize - 最大サイズ（バイト）
     * @returns {Promise<Buffer>} 圧縮された画像データ
     */
    async compressImage(imageBuffer, maxSize = 100 * 1024) { // 100KB
        const ImageCompressor = require("./ImageCompressor.js");
        const compressor = new ImageCompressor();
        
        const result = await compressor.compressImage(imageBuffer);
        return result.buffer;
    }

    /**
     * 圧縮結果のサマリーを生成
     * @param {Array} compressionResults - 圧縮結果配列
     * @returns {string} 圧縮サマリー
     */
    generateCompressionSummary(compressionResults) {
        const compressedImages = compressionResults.filter(r => r.compressed);
        
        if (compressedImages.length === 0) {
            return "画像は既に適切なサイズです。";
        }

        const totalOriginalSize = compressionResults.reduce((sum, r) => sum + r.originalSize, 0);
        const totalCompressedSize = compressionResults.reduce((sum, r) => sum + r.compressedSize, 0);
        const totalSavings = totalOriginalSize - totalCompressedSize;
        const compressionRatio = ((1 - totalCompressedSize / totalOriginalSize) * 100).toFixed(1);
        
        const originalSizeMB = (totalOriginalSize / (1024 * 1024)).toFixed(1);
        const compressedSizeMB = (totalCompressedSize / (1024 * 1024)).toFixed(1);
        const savingsMB = (totalSavings / (1024 * 1024)).toFixed(1);

        return `画像を自動圧縮しました: ${originalSizeMB}MB → ${compressedSizeMB}MB (${savingsMB}MB削減, ${compressionRatio}%圧縮)`;
    }
}

module.exports = GuidelineChecker;