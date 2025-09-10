const config = require("../app/config.js");
const log4js = require("log4js");

log4js.configure({
    appenders: {
        stdout: { type: "stdout" },
        app: { type: "file", filename: "application.log" }
    },
    categories: {
        default: { appenders: ["stdout"], level: "info" },
        release: { appenders: ["stdout", "app"], level: "info" },
        develop: { appenders: ["stdout"], level: "debug" }
    }
});

const log = log4js.getLogger(config.profile);

// 拡張logger - データ付きログ機能を追加
const enhancedLogger = {
    // 基本のlog4js機能をそのまま提供
    debug: log.debug.bind(log),
    info: log.info.bind(log),
    warn: log.warn.bind(log),
    error: log.error.bind(log),
    trace: log.trace.bind(log),
    fatal: log.fatal.bind(log),

    // データ付きログ機能
    debugWithData: (message, data = null) => {
        if (data !== null) {
            if (data instanceof Error) {
                log.debug(`${message} - Error: ${data.message}`);
                if (data.stack) {
                    log.debug(`Stack: ${data.stack}`);
                }
            } else if (typeof data === "object") {
                try {
                    log.debug(`${message} - Data: ${JSON.stringify(data, null, 2)}`);
                } catch (err) {
                    log.debug(`${message} - Data: [Circular or Invalid JSON]`);
                }
            } else {
                log.debug(`${message} - Data: ${data}`);
            }
        } else {
            log.debug(message);
        }
    },

    infoWithData: (message, data = null) => {
        if (data !== null) {
            if (data instanceof Error) {
                log.info(`${message} - Error: ${data.message}`);
            } else if (typeof data === "object") {
                try {
                    log.info(`${message} - Data: ${JSON.stringify(data, null, 2)}`);
                } catch (err) {
                    log.info(`${message} - Data: [Circular or Invalid JSON]`);
                }
            } else {
                log.info(`${message} - Data: ${data}`);
            }
        } else {
            log.info(message);
        }
    },

    warnWithData: (message, data = null) => {
        if (data !== null) {
            if (data instanceof Error) {
                log.warn(`${message} - Error: ${data.message}`);
            } else if (typeof data === "object") {
                try {
                    log.warn(`${message} - Data: ${JSON.stringify(data, null, 2)}`);
                } catch (err) {
                    log.warn(`${message} - Data: [Circular or Invalid JSON]`);
                }
            } else {
                log.warn(`${message} - Data: ${data}`);
            }
        } else {
            log.warn(message);
        }
    },

    errorWithData: (message, data = null) => {
        if (data !== null) {
            if (data instanceof Error) {
                log.error(`${message} - Error: ${data.message}`);
                if (data.stack) {
                    log.error(`Stack: ${data.stack}`);
                }
            } else if (typeof data === "object") {
                try {
                    log.error(`${message} - Data: ${JSON.stringify(data, null, 2)}`);
                } catch (err) {
                    log.error(`${message} - Data: [Circular or Invalid JSON]`);
                }
            } else {
                log.error(`${message} - Data: ${data}`);
            }
        } else {
            log.error(message);
        }
    }
};

module.exports = enhancedLogger;

