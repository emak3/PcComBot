// pages.js - ページ専用の JavaScript 関数
const config = require("../../../config.js");
// Discord参加リンクを取得
let DISCORD_INVITE_URL = config.discordInviteUrl;

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async () => {
    // ユーザー情報の取得
    await loadUserInfo();

    // Discord招待リンクの取得
    await loadDiscordInvite();

    // ページ固有の初期化
    const currentPage = getCurrentPage();

    if (currentPage === 'home') {
        await loadCommunityStats();
        startStatsAnimation();
    }

    // スムーズスクロール設定
    setupSmoothScroll();
});

// Discord招待リンクを取得
async function loadDiscordInvite() {
    try {
        const response = await fetch('/api/discord-invite');
        const data = await response.json();

        if (data.success && data.inviteUrl) {
            DISCORD_INVITE_URL = data.inviteUrl;
        }
    } catch (error) {
        console.error('Discord招待リンクの取得に失敗しました:', error);
    }
}

// 現在のページを取得
function getCurrentPage() {
    const path = window.location.pathname;

    if (path === '/' || path === '/home') return 'home';
    if (path === '/rules') return 'rules';
    if (path === '/guidelines') return 'guidelines';
    if (path === '/support') return 'support';

    return 'unknown';
}

// ユーザー情報を読み込み
async function loadUserInfo() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();

        if (data.user) {
            updateUserSection(data.user);
        }
    } catch (error) {
        console.error('ユーザー情報の取得に失敗しました:', error);
    }
}

// ユーザーセクションの更新
function updateUserSection(user) {
    const userSection = document.getElementById('userSection');
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
async function loadCommunityStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        if (data.success) {
            updateStatsDisplay(data.stats);
        } else {
            // デフォルト値を設定
            updateStatsDisplay({
                members: 1500,
                todayMessages: 234,
                solvedQuestions: 89
            });
        }
    } catch (error) {
        console.error('統計の取得に失敗しました:', error);
        // デフォルト値を設定
        updateStatsDisplay({
            members: 1500,
            todayMessages: 234,
            solvedQuestions: 89
        });
    }
}

// 統計表示の更新
function updateStatsDisplay(stats) {
    const memberCount = document.getElementById('memberCount');
    const messageCount = document.getElementById('messageCount');
    const questionCount = document.getElementById('questionCount');

    if (memberCount) memberCount.textContent = formatNumber(stats.members);
    if (messageCount) messageCount.textContent = formatNumber(stats.todayMessages);
    if (questionCount) questionCount.textContent = formatNumber(stats.solvedQuestions);
}

// 数値のフォーマット
function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

// 統計のアニメーション開始
function startStatsAnimation() {
    const statNumbers = document.querySelectorAll('.stat-number');

    statNumbers.forEach(element => {
        const target = parseInt(element.textContent.replace(/[^0-9]/g, ''));
        if (isNaN(target)) return;

        animateNumber(element, 0, target, 2000);
    });
}

// 数値のアニメーション
function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    const suffix = element.textContent.includes('k') ? 'k' : '';
    const actualEnd = suffix ? Math.floor(end / 1000) : end;

    function updateNumber(currentTime) {
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
function loginDiscord() {
    const btn = event.target;
    const originalText = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ログイン中...';
    btn.disabled = true;

    // 現在のページを保存
    const currentPath = window.location.pathname;
    const returnTo = currentPath === '/' ? '/home' : currentPath;

    setTimeout(() => {
        window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
    }, 500);
}

// ログアウト
async function logoutUser() {
    try {
        const btn = event.target;
        const originalText = btn.innerHTML;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ログアウト中...';
        btn.disabled = true;

        const response = await fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showToast('ログアウトしました', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            throw new Error('ログアウト失敗');
        }
    } catch (error) {
        console.error('ログアウトエラー:', error);
        showToast('ログアウトに失敗しました', 'error');

        // ボタンを元に戻す
        const btn = event.target;
        btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> ログアウト';
        btn.disabled = false;
    }
}

// Discord参加
function joinDiscord() {
    // 新しいタブでDiscordに参加
    window.open(DISCORD_INVITE_URL, '_blank');

    // 参加完了の案内を表示
    showToast('Discordサーバーを開きました！', 'success');
}

// スムーズスクロールの設定
function setupSmoothScroll() {
    // アンカーリンクのクリック時にスムーズスクロール
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// トーストの表示
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    // 既存のトーストを削除
    toast.classList.remove('show');

    setTimeout(() => {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        // 4秒後に自動で非表示
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }, 100);
}

// HTMLエスケープ
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// エラーハンドリング
window.addEventListener('error', (e) => {
    console.error('JavaScript エラー:', e.error);
});

// 未処理のPromise拒否をキャッチ
window.addEventListener('unhandledrejection', (e) => {
    console.error('未処理のPromise拒否:', e.reason);
});

// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    // 必要に応じてクリーンアップ処理を追加
});

// プリローダーの管理
function showLoader() {
    document.body.classList.add('loading');
}

function hideLoader() {
    document.body.classList.remove('loading');
}

// ページ遷移の処理
function navigateTo(url) {
    showLoader();

    setTimeout(() => {
        window.location.href = url;
    }, 200);
}

// 戻るボタンの処理
function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = '/';
    }
}

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    // Ctrl+Home: ホームに戻る
    if (e.ctrlKey && e.key === 'Home') {
        e.preventDefault();
        navigateTo('/');
    }

    // Ctrl+H: ホームに戻る
    if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        navigateTo('/');
    }

    // Ctrl+R: ルールページ
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        navigateTo('/rules');
    }

    // Ctrl+G: ガイドラインページ
    if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        navigateTo('/guidelines');
    }

    // Ctrl+S: サポートページ
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        navigateTo('/support');
    }
});

// デバッグ用の関数
function debugInfo() {
    const info = {
        page: getCurrentPage(),
        userAgent: navigator.userAgent,
        location: window.location.href,
        timestamp: new Date().toISOString()
    };

    console.log('Debug Info:', info);
    return info;
}

// 開発者向けのコンソールメッセージ
if (typeof console !== 'undefined') {
    console.log('%cPC Community Website', 'color: #5865F2; font-size: 24px; font-weight: bold;');
    console.log('%cデバッグ情報を確認するには debugInfo() を実行してください', 'color: #72767D; font-size: 12px;');
}