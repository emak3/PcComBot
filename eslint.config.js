const js = require("@eslint/js");

module.exports = [
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                console: "readonly",
                process: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                module: "readonly",
                require: "readonly",
                exports: "readonly",
                global: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                setImmediate: "readonly",
                clearImmediate: "readonly"
            }
        },
        rules: {
            "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            "no-console": "off",
            "prefer-const": "error",
            "no-var": "error",
            "semi": ["error", "always"],
            "quotes": ["error", "double", { avoidEscape: true }],
            "indent": ["error", 4],
            "comma-dangle": ["error", "never"],
            "object-curly-spacing": ["error", "always"],
            "array-bracket-spacing": ["error", "never"],
            "space-before-function-paren": ["error", "always"],
            "keyword-spacing": "error",
            "space-infix-ops": "error",
            "no-trailing-spaces": "error",
            "eol-last": "error"
        }
    },
    {
        files: ["web/public/js/**/*.js"],
        languageOptions: {
            globals: {
                window: "readonly",
                document: "readonly",
                localStorage: "readonly",
                sessionStorage: "readonly",
                navigator: "readonly",
                location: "readonly",
                history: "readonly",
                fetch: "readonly",
                Headers: "readonly",
                Request: "readonly",
                Response: "readonly",
                URL: "readonly",
                URLSearchParams: "readonly",
                FormData: "readonly",
                Blob: "readonly",
                File: "readonly",
                FileReader: "readonly",
                Worker: "readonly",
                SharedWorker: "readonly",
                ServiceWorker: "readonly",
                Notification: "readonly",
                addEventListener: "readonly",
                removeEventListener: "readonly",
                dispatchEvent: "readonly",
                CustomEvent: "readonly",
                MutationObserver: "readonly",
                IntersectionObserver: "readonly",
                ResizeObserver: "readonly",
                PerformanceObserver: "readonly",
                requestAnimationFrame: "readonly",
                cancelAnimationFrame: "readonly",
                requestIdleCallback: "readonly",
                cancelIdleCallback: "readonly",
                crypto: "readonly",
                performance: "readonly",
                alert: "readonly",
                confirm: "readonly",
                prompt: "readonly"
            }
        }
    }
];
