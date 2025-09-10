const log = require("../core/logger.js");

class ErrorHandler {
    static async standardTryCatch(operation, context = "操作", logger = log) {
        try {
            return await operation();
        } catch (error) {
            this.logError(error, context, logger);
            throw error;
        }
    }

    static logError(error, context = "エラー", logger = log) {
        const errorMessage = `${context}: ${error.message}`;
        const errorDetails = {
            message: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString()
        };
        
        if (logger && logger.error) {
            logger.error(errorMessage, errorDetails);
        } else {
            console.error(errorMessage, errorDetails);
        }
    }

    static async handleDiscordError(error, interaction = null, context = "Discord操作") {
        this.logError(error, context);
        
        if (interaction) {
            try {
                const errorMessage = "処理中にエラーが発生しました。しばらく時間をおいて再試行してください。";
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({
                        content: errorMessage,
                        embeds: [],
                        components: []
                    });
                } else {
                    await interaction.reply({
                        content: errorMessage,
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                this.logError(replyError, "エラー応答送信失敗");
            }
        }
        
        return error;
    }

    static async handleDatabaseError(error, context = "データベース操作") {
        this.logError(error, context);
        
        if (error.code) {
            switch (error.code) {
                case "permission-denied":
                    throw new Error("データベースへのアクセス権限がありません");
                case "unavailable":
                    throw new Error("データベースに接続できません");
                case "deadline-exceeded":
                    throw new Error("データベース操作がタイムアウトしました");
                default:
                    throw new Error(`データベースエラー: ${error.message}`);
            }
        }
        
        throw error;
    }

    static createErrorContext(functionName, fileName, additionalInfo = {}) {
        return {
            function: functionName,
            file: fileName,
            ...additionalInfo,
            timestamp: new Date().toISOString()
        };
    }

    static async safeAsyncOperation(operation, fallbackValue = null, context = "非同期操作") {
        try {
            return await operation();
        } catch (error) {
            this.logError(error, context);
            return fallbackValue;
        }
    }

    static wrapAsyncFunction(fn, context) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.logError(error, context);
                throw error;
            }
        };
    }
}

module.exports = ErrorHandler;