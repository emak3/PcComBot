// utils/logger.js - RSS機能用のloggerアダプター
const log = require("../logger.js");

// shikeoのlogger形式をPcComBotのlog4jsに変換するアダプター
const logger = {
    debug: (message, data = null) => {
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

    info: (message, data = null) => {
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

    warn: (message, data = null) => {
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

    error: (message, data = null) => {
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

module.exports = logger;
