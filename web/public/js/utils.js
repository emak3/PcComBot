// utils.js - 共通ユーティリティ関数

/**
 * 共通ユーティリティクラス
 */
class Utils {
    /**
     * APIリクエストを実行
     * @param {string} url - リクエストURL
     * @param {Object} options - リクエストオプション
     * @returns {Promise<Object>} レスポンス
     */
    static async apiRequest (url, options = {}) {
        try {
            const defaultOptions = {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                },
                ...options
            };

            const response = await fetch(url, defaultOptions);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Request Error:", error);
            throw error;
        }
    }

    /**
     * 日付をフォーマット
     * @param {Date|string} date - 日付
     * @param {string} format - フォーマット形式
     * @returns {string} フォーマットされた日付
     */
    static formatDate (date, format = "YYYY-MM-DD") {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        const seconds = String(d.getSeconds()).padStart(2, "0");

        return format
            .replace("YYYY", year)
            .replace("MM", month)
            .replace("DD", day)
            .replace("HH", hours)
            .replace("mm", minutes)
            .replace("ss", seconds);
    }

    /**
     * 数値を日本語形式でフォーマット
     * @param {number} num - 数値
     * @returns {string} フォーマットされた数値
     */
    static formatNumber (num) {
        if (typeof num !== "number") return "0";

        if (num >= 10000) {
            return Math.floor(num / 1000) / 10 + "万";
        } else if (num >= 1000) {
            return Math.floor(num / 100) / 10 + "k";
        }

        return num.toLocaleString("ja-JP");
    }

    /**
     * 文字列をサニタイズ
     * @param {string} str - サニタイズする文字列
     * @returns {string} サニタイズされた文字列
     */
    static sanitize (str) {
        if (typeof str !== "string") return "";

        const map = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#x27;",
            "/": "&#x2F;"
        };

        return str.replace(/[&<>"'/]/g, (s) => map[s]);
    }

    /**
     * デバウンス関数
     * @param {Function} func - 実行する関数
     * @param {number} wait - 待機時間（ミリ秒）
     * @returns {Function} デバウンスされた関数
     */
    static debounce (func, wait) {
        let timeout;
        return function executedFunction (...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * スロットル関数
     * @param {Function} func - 実行する関数
     * @param {number} limit - 制限時間（ミリ秒）
     * @returns {Function} スロットルされた関数
     */
    static throttle (func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * ランダムな整数を生成
     * @param {number} min - 最小値
     * @param {number} max - 最大値
     * @returns {number} ランダムな整数
     */
    static randomInt (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 配列をシャッフル
     * @param {Array} array - シャッフルする配列
     * @returns {Array} シャッフルされた配列
     */
    static shuffle (array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * ローカルストレージに保存
     * @param {string} key - キー
     * @param {*} value - 値
     */
    static setStorage (key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error("Storage save error:", error);
        }
    }

    /**
     * ローカルストレージから取得
     * @param {string} key - キー
     * @param {*} defaultValue - デフォルト値
     * @returns {*} 取得した値
     */
    static getStorage (key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error("Storage get error:", error);
            return defaultValue;
        }
    }

    /**
     * ローカルストレージから削除
     * @param {string} key - キー
     */
    static removeStorage (key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error("Storage remove error:", error);
        }
    }

    /**
     * URLパラメータを取得
     * @param {string} name - パラメータ名
     * @returns {string|null} パラメータ値
     */
    static getUrlParam (name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    /**
     * URLパラメータを設定
     * @param {string} name - パラメータ名
     * @param {string} value - パラメータ値
     */
    static setUrlParam (name, value) {
        const url = new URL(window.location.href);
        url.searchParams.set(name, value);
        window.history.replaceState({}, "", url.toString());
    }

    /**
     * デバイスタイプを判定
     * @returns {string} デバイスタイプ
     */
    static getDeviceType () {
        const userAgent = navigator.userAgent.toLowerCase();

        if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
            return "tablet";
        } else if (/mobile|phone|android|touch|webos|hpwos/i.test(userAgent)) {
            return "mobile";
        } else {
            return "desktop";
        }
    }

    /**
     * ブラウザを判定
     * @returns {string} ブラウザ名
     */
    static getBrowser () {
        const userAgent = navigator.userAgent.toLowerCase();

        if (userAgent.includes("firefox")) return "firefox";
        if (userAgent.includes("chrome")) return "chrome";
        if (userAgent.includes("safari")) return "safari";
        if (userAgent.includes("edge")) return "edge";
        if (userAgent.includes("opera")) return "opera";

        return "unknown";
    }

    /**
     * クリップボードにコピー
     * @param {string} text - コピーするテキスト
     * @returns {Promise<boolean>} コピー成功かどうか
     */
    static async copyToClipboard (text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // フォールバック
                const textarea = document.createElement("textarea");
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                const success = document.execCommand("copy");
                document.body.removeChild(textarea);
                return success;
            }
        } catch (error) {
            console.error("Clipboard copy error:", error);
            return false;
        }
    }

    /**
     * 画像をプリロード
     * @param {string|Array} urls - 画像URL
     * @returns {Promise<void>}
     */
    static preloadImages (urls) {
        const imageUrls = Array.isArray(urls) ? urls : [urls];

        return Promise.all(
            imageUrls.map(url => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = url;
                });
            })
        );
    }

    /**
     * スクロール位置を取得
     * @returns {Object} スクロール位置
     */
    static getScrollPosition () {
        return {
            x: window.pageXOffset || document.documentElement.scrollLeft,
            y: window.pageYOffset || document.documentElement.scrollTop
        };
    }

    /**
     * スムーズスクロール
     * @param {number} to - スクロール先の位置
     * @param {number} duration - アニメーション時間
     */
    static smoothScroll (to, duration = 500) {
        const start = window.pageYOffset;
        const change = to - start;
        const startTime = performance.now();

        function animateScroll (currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // イージング関数
            const easeInOutQuad = progress => {
                return progress < 0.5
                    ? 2 * progress * progress
                    : -1 + (4 - 2 * progress) * progress;
            };

            window.scrollTo(0, start + change * easeInOutQuad(progress));

            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            }
        }

        requestAnimationFrame(animateScroll);
    }

    /**
     * 要素が表示されているかチェック
     * @param {Element} element - チェックする要素
     * @returns {boolean} 表示されているかどうか
     */
    static isElementVisible (element) {
        if (!element) return false;

        const rect = element.getBoundingClientRect();
        const viewHeight = Math.max(
            document.documentElement.clientHeight,
            window.innerHeight
        );

        return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
    }

    /**
     * パフォーマンスメトリクスを取得
     * @returns {Object} パフォーマンス情報
     */
    static getPerformanceMetrics () {
        if (!window.performance || !window.performance.getEntriesByType) {
            return null;
        }

        const navigation = window.performance.getEntriesByType("navigation")[0];
        if (!navigation) return null;

        return {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            totalTime: navigation.loadEventEnd - navigation.navigationStart,
            redirectTime: navigation.redirectEnd - navigation.redirectStart,
            dnsTime: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcpTime: navigation.connectEnd - navigation.connectStart,
            requestTime: navigation.responseStart - navigation.requestStart,
            responseTime: navigation.responseEnd - navigation.responseStart,
            domProcessingTime: navigation.domContentLoadedEventStart - navigation.responseEnd
        };
    }

    /**
     * エラーログを送信
     * @param {Error} error - エラーオブジェクト
     * @param {Object} context - コンテキスト情報
     */
    static logError (error, context = {}) {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            context: context
        };

        console.error("Error logged:", errorInfo);

        // 実際のアプリケーションでは、ここでエラーログサービスに送信
        // 例: Analytics.track('error', errorInfo);
    }
}

// グローバルに公開
window.Utils = Utils;

// エラーハンドリングの設定
window.addEventListener("error", (event) => {
    Utils.logError(event.error || new Error(event.message), {
        type: "javascript",
        source: event.filename,
        line: event.lineno,
        column: event.colno
    });
});

window.addEventListener("unhandledrejection", (event) => {
    Utils.logError(new Error(event.reason), {
        type: "promise",
        reason: event.reason
    });
});

// パフォーマンス監視
window.addEventListener("load", () => {
    // 少し遅延させてメトリクスを取得
    setTimeout(() => {
        const metrics = Utils.getPerformanceMetrics();
        if (metrics) {
            console.log("Performance Metrics:", metrics);
        }
    }, 100);
});

// エクスポート
if (typeof module !== "undefined" && module.exports) {
    module.exports = Utils;
}
