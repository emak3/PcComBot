// utils/database.js - Firebase初期化
const admin = require("firebase-admin");
const config = require("../app/config.js");
const log = require("./logger.js");

let databaseInstance = null;

class Database {
    constructor () {
        if (databaseInstance) {
            return databaseInstance;
        }

        this.db = null;
        this.init();
        databaseInstance = this;
    }

    /**
     * Firebase Admin SDKを初期化
     */
    init () {
        try {
            // Firebase設定がない場合はスキップ
            if (!config.firebase || !config.firebase.serviceAccount) {
                log.warn("Firebase設定が見つかりません。RSS機能は利用できませんが、他の機能は利用可能です。");
                return;
            }

            // Firebase Admin SDKの初期化（既に初期化されている場合はスキップ）
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(config.firebase.serviceAccount),
                    databaseURL: config.firebase.databaseURL
                });

                log.info("Firebase Admin SDKを初期化しました");
            } else {
                log.debug("Firebase Admin SDKは既に初期化されています");
            }

            this.db = admin.firestore();

            // Firestoreの設定（まだ設定されていない場合のみ）
            try {
                this.db.settings({
                    timestampsInSnapshots: true
                });
                log.debug("Firestore設定を適用しました");
            } catch (settingsError) {
                // 既に設定されている場合は無視
                if (settingsError.message.includes("already been initialized")) {
                    log.debug("Firestore設定は既に適用されています");
                } else {
                    throw settingsError;
                }
            }

            log.info("Firebase Firestoreに接続しました");

        } catch (error) {
            log.error("Firebase初期化エラー:", error);
            log.warn("RSS機能は利用できませんが、他の機能は利用可能です。");
        }
    }

    /**
     * Firestoreインスタンスを取得
     * @returns {Firestore|null} Firestoreインスタンス
     */
    getFirestore () {
        return this.db;
    }

    /**
     * Firebase接続状態を確認
     * @returns {boolean} 接続状態
     */
    isConnected () {
        return this.db !== null;
    }
}

module.exports = Database;
