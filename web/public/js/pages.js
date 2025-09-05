// web/public/js/pages.js の修正版

// Discord参加リンクを初期化（デフォルト値）
let DISCORD_INVITE_URL = "https://discord.gg/your-server-link";

// ページ読み込み時の初期化
document.addEventListener("DOMContentLoaded", async () => {
    // ユーザー情報の取得
    await loadUserInfo();

    // Discord招待リンクの取得
    await loadDiscordInvite();

    // サーバーアイコンの設定
    loadServerIcon();

    // ページ固有の初期化
    const currentPage = getCurrentPage();

    if (currentPage === "home") {
        await loadCommunityStats();
        startStatsAnimation();
    }

    // スムーズスクロール設定
    setupSmoothScroll();
});

// サーバーアイコンを設定
function loadServerIcon() {
    const headerIcon = document.querySelector('.header-icon');
    if (headerIcon) {
        headerIcon.innerHTML = '<img src="./server_icon.png" alt="icon" style="width: 32px; height: 32px; border-radius: 50%"></img>';
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
        console.warn("Discord invite link not configured");
        showToast(i18n.translate('js.messages.discord_link_not_configured'), "error");
        return;
    }

    try {
        window.open(DISCORD_INVITE_URL, "_blank");
        showToast(i18n.translate('js.messages.discord_server_opened'), "success");
    } catch (error) {
        console.error("Failed to open Discord invite link:", error);
        showToast(i18n.translate('js.messages.discord_server_failed'), "error");
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
            <img src="${user.avatarURL}" alt="Avatar" class="user-avatar" onerror="this.src='/favicon.ico'">
            <span class="user-name">${escapeHtml(user.displayName || user.globalName || user.username)}</span>
        </div>
        <div class="auth-buttons">
            <button class="btn btn-secondary" onclick="logoutUser()">
                <i class="fas fa-sign-out-alt"></i> ${i18n.translate('common.logout')}
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

// Discord login function / Discordログイン機能
function loginDiscord () {
    const btn = event.target;
    const originalText = btn.innerHTML;

    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${i18n.translate('js.messages.logging_in')}`;
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

        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${i18n.translate('js.messages.logging_out')}`;
        btn.disabled = true;

        const response = await fetch("/auth/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (response.ok) {
            showToast(i18n.translate('js.messages.logged_out'), "success");
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            throw new Error("Logout failed");
        }
    } catch (error) {
        console.error("Logout error:", error);
        showToast(i18n.translate('js.messages.logout_failed'), "error");

        const btn = event.target;
        btn.innerHTML = `<i class="fas fa-sign-out-alt"></i> ${i18n.translate('common.logout')}`;
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
