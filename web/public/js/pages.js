// web/public/js/pages.js の修正版

// Discord参加リンクを初期化（デフォルト値）
let DISCORD_INVITE_URL = "https://discord.gg/your-server-link";

// ページ読み込み時の初期化
document.addEventListener("DOMContentLoaded", async () => {
    // ユーザー情報の取得
    await loadUserInfo();

    // Discord招待リンクの取得
    await loadDiscordInvite();

    // サーバーアイコンの取得と設定
    await loadServerIcon();

    // ページ固有の初期化
    const currentPage = getCurrentPage();

    if (currentPage === "home") {
        await loadCommunityStats();
        startStatsAnimation();
    }

    // スムーズスクロール設定
    setupSmoothScroll();
});

// サーバーアイコンを取得して設定
async function loadServerIcon () {
    try {
        // ローディング状態を表示
        showLoadingIcon();

        const response = await fetch("/api/server-icon");
        const data = await response.json();

        if (data.success && data.iconURL) {
            updateHeaderIcon(data.iconURL, data.serverName);
            console.log("サーバーアイコンを取得しました:", data.iconURL);
        } else {
            console.warn("サーバーアイコンの取得に失敗、フォールバックアイコンを使用");
            updateHeaderIcon(null, "PC Community");
        }
    } catch (error) {
        console.error("サーバーアイコンの取得に失敗しました:", error);
        console.warn("デフォルトアイコンを使用します");
        updateHeaderIcon(null, "PC Community");
    }
}

// ローディングアイコンを表示
function showLoadingIcon () {
    const headerIcons = document.querySelectorAll(".header-icon");
    const heroIcon = document.querySelector(".pc-icon");

    // ヘッダーアイコンのローディング
    headerIcons.forEach(iconElement => {
        iconElement.className = "header-icon";
        iconElement.innerHTML = '<div class="server-icon-loading"></div>';
    });

    // ヒーローセクションアイコンのローディング
    if (heroIcon) {
        heroIcon.innerHTML = '<div class="hero-icon-loading"></div>';
    }
}

// ヘッダーアイコンを更新
function updateHeaderIcon (iconURL, serverName) {
    const headerIcons = document.querySelectorAll(".header-icon");
    const heroIcon = document.querySelector(".pc-icon");

    // ヘッダーアイコンの更新
    headerIcons.forEach(iconElement => {
        if (iconURL) {
            // サーバーアイコンが取得できた場合
            const imgElement = document.createElement("img");
            imgElement.src = iconURL;
            imgElement.alt = serverName || "Server Icon";
            imgElement.className = "server-icon";
            imgElement.style.width = "32px";
            imgElement.style.height = "32px";
            imgElement.style.borderRadius = "50%";
            imgElement.style.objectFit = "cover";

            // エラー時のフォールバック
            imgElement.onerror = function () {
                console.warn("サーバーアイコンの読み込みに失敗、FontAwesomeアイコンにフォールバック");
                this.style.display = "none";
                iconElement.className = "fas fa-desktop header-icon";
                iconElement.style.fontSize = "32px";
            };

            // 既存のクラスをクリアして画像に置換
            iconElement.className = "header-icon";
            iconElement.style.fontSize = "";
            iconElement.innerHTML = "";
            iconElement.appendChild(imgElement);
        } else {
            // フォールバック：FontAwesome アイコン
            iconElement.className = "fas fa-desktop header-icon";
            iconElement.style.fontSize = "32px";
            iconElement.innerHTML = "";
        }
    });

    // ヒーローセクションのアイコンも更新
    if (heroIcon) {
        if (iconURL) {
            // サーバーアイコンが取得できた場合
            const imgElement = document.createElement("img");
            imgElement.src = iconURL;
            imgElement.alt = serverName || "Server Icon";
            imgElement.className = "hero-server-icon";
            imgElement.style.width = "120px";
            imgElement.style.height = "120px";
            imgElement.style.borderRadius = "50%";
            imgElement.style.objectFit = "cover";

            // エラー時のフォールバック
            imgElement.onerror = function () {
                console.warn("ヒーローアイコンの読み込みに失敗、FontAwesomeアイコンにフォールバック");
                this.style.display = "none";
                heroIcon.innerHTML = '<i class="fas fa-desktop"></i>';
            };

            // 既存の内容をクリアして画像に置換
            heroIcon.innerHTML = "";
            heroIcon.appendChild(imgElement);
        } else {
            // フォールバック：FontAwesome アイコン
            heroIcon.innerHTML = '<i class="fas fa-desktop"></i>';
        }
    }
}

// Discord招待リンクを取得
async function loadDiscordInvite () {
    try {
        const response = await fetch("/api/discord-invite");
        const data = await response.json();

        if (data.success && data.inviteUrl) {
            DISCORD_INVITE_URL = data.inviteUrl;
            console.log("Discord招待リンクを取得しました:", DISCORD_INVITE_URL);
        } else {
            console.warn("Discord招待リンクの取得に失敗、フォールバックを使用:", data.inviteUrl);
            DISCORD_INVITE_URL = data.inviteUrl || "https://discord.gg/your-server-link";
        }
    } catch (error) {
        console.error("Discord招待リンクの取得に失敗しました:", error);
        console.warn("デフォルトのDiscord招待リンクを使用します");
    }
}

// Discord参加
function joinDiscord () {
    console.log("joinDiscord関数が呼び出されました");
    console.log("使用するDiscord招待リンク:", DISCORD_INVITE_URL);

    if (!DISCORD_INVITE_URL || DISCORD_INVITE_URL === "https://discord.gg/your-server-link") {
        console.warn("Discord招待リンクが設定されていません");
        showToast("Discord招待リンクが設定されていません。管理者にお問い合わせください。", "error");
        return;
    }

    try {
        window.open(DISCORD_INVITE_URL, "_blank");
        showToast("Discordサーバーを開きました！", "success");
    } catch (error) {
        console.error("Discord招待リンクの開放に失敗:", error);
        showToast("Discordサーバーを開けませんでした。", "error");
    }
}

// 現在のページを取得
function getCurrentPage () {
    const path = window.location.pathname;

    if (path === "/" || path === "/home") return "home";
    if (path === "/rules") return "rules";
    if (path === "/guidelines") return "guidelines";
    if (path === "/support") return "support";

    return "unknown";
}

// ユーザー情報を読み込み
async function loadUserInfo () {
    try {
        const response = await fetch("/api/user");
        const data = await response.json();

        if (data.user) {
            updateUserSection(data.user);
        }
    } catch (error) {
        console.error("ユーザー情報の取得に失敗しました:", error);
    }
}

// ユーザーセクションの更新
function updateUserSection (user) {
    const userSection = document.getElementById("userSection");
    if (!userSection) return;

    userSection.innerHTML = `
        <div class="user-info">
            <img src="${user.avatarURL}" alt="Avatar" class="user-avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
            <span class="user-name">${escapeHtml(user.displayName || user.globalName || user.username)}</span>
        </div>
        <div class="auth-buttons">
            <button class="btn btn-secondary" onclick="logoutUser()">
                <i class="fas fa-sign-out-alt"></i> ログアウト
            </button>
        </div>
    `;
}

// コミュニティ統計を読み込み
async function loadCommunityStats () {
    try {
        const response = await fetch("/api/stats");
        const data = await response.json();

        if (data.success) {
            updateStatsDisplay(data.stats);
        } else {
            updateStatsDisplay({
                members: 1500,
                todayMessages: 234,
                solvedQuestions: 89
            });
        }
    } catch (error) {
        console.error("統計の取得に失敗しました:", error);
        updateStatsDisplay({
            members: 1500,
            todayMessages: 234,
            solvedQuestions: 89
        });
    }
}

// 統計表示の更新
function updateStatsDisplay (stats) {
    const memberCount = document.getElementById("memberCount");
    const messageCount = document.getElementById("messageCount");
    const questionCount = document.getElementById("questionCount");

    if (memberCount) memberCount.textContent = formatNumber(stats.members);
    if (messageCount) messageCount.textContent = formatNumber(stats.todayMessages);
    if (questionCount) questionCount.textContent = formatNumber(stats.solvedQuestions);
}

// 数値のフォーマット
function formatNumber (num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
}

// 統計のアニメーション開始
function startStatsAnimation () {
    const statNumbers = document.querySelectorAll(".stat-number");

    statNumbers.forEach(element => {
        const target = parseInt(element.textContent.replace(/[^0-9]/g, ""));
        if (isNaN(target)) return;

        animateNumber(element, 0, target, 2000);
    });
}

// 数値のアニメーション
function animateNumber (element, start, end, duration) {
    const startTime = performance.now();
    const suffix = element.textContent.includes("k") ? "k" : "";
    const actualEnd = suffix ? Math.floor(end / 1000) : end;

    function updateNumber (currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const current = Math.floor(progress * actualEnd);
        element.textContent = current + suffix;

        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }

    requestAnimationFrame(updateNumber);
}

// Discordログイン
function loginDiscord () {
    const btn = event.target;
    const originalText = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ログイン中...';
    btn.disabled = true;

    const currentPath = window.location.pathname;
    const returnTo = currentPath === "/" ? "/home" : currentPath;

    setTimeout(() => {
        window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
    }, 500);
}

// ログアウト
async function logoutUser () {
    try {
        const btn = event.target;
        const originalText = btn.innerHTML;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ログアウト中...';
        btn.disabled = true;

        const response = await fetch("/auth/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (response.ok) {
            showToast("ログアウトしました", "success");
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            throw new Error("ログアウト失敗");
        }
    } catch (error) {
        console.error("ログアウトエラー:", error);
        showToast("ログアウトに失敗しました", "error");

        const btn = event.target;
        btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> ログアウト';
        btn.disabled = false;
    }
}

// スムーズスクロールの設定
function setupSmoothScroll () {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", function (e) {
            e.preventDefault();

            const target = document.querySelector(this.getAttribute("href"));
            if (target) {
                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    });
}

// トーストの表示
function showToast (message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.classList.remove("show");

    setTimeout(() => {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 4000);
    }, 100);
}

// HTMLエスケープ
function escapeHtml (text) {
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// エラーハンドリング
window.addEventListener("error", (e) => {
    console.error("JavaScript エラー:", e.error);
});

window.addEventListener("unhandledrejection", (e) => {
    console.error("未処理のPromise拒否:", e.reason);
});

window.addEventListener("beforeunload", () => {
    // 必要に応じてクリーンアップ処理を追加
});

// プリローダーの管理
function showLoader () {
    document.body.classList.add("loading");
}

function hideLoader () {
    document.body.classList.remove("loading");
}

// ページ遷移の処理
function navigateTo (url) {
    showLoader();

    setTimeout(() => {
        window.location.href = url;
    }, 200);
}

// 戻るボタンの処理
function goBack () {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = "/";
    }
}

// キーボードショートカット
document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Home") {
        e.preventDefault();
        navigateTo("/");
    }

    if (e.ctrlKey && e.key === "h") {
        e.preventDefault();
        navigateTo("/");
    }

    if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        navigateTo("/rules");
    }

    if (e.ctrlKey && e.key === "g") {
        e.preventDefault();
        navigateTo("/guidelines");
    }

    if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        navigateTo("/support");
    }
});

// デバッグ用の関数
function debugInfo () {
    const info = {
        page: getCurrentPage(),
        userAgent: navigator.userAgent,
        location: window.location.href,
        timestamp: new Date().toISOString(),
        discordInviteUrl: DISCORD_INVITE_URL
    };

    console.log("Debug Info:", info);
    return info;
}

// 開発者向けのコンソールメッセージ
if (typeof console !== "undefined") {
    console.log("%cPC Community Website", "color: #5865F2; font-size: 24px; font-weight: bold;");
    console.log("%cデバッグ情報を確認するには debugInfo() を実行してください", "color: #72767D; font-size: 12px;");
}
