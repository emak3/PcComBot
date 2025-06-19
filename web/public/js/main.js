// DOM要素
const userSection = document.getElementById('userSection');
const loginPrompt = document.getElementById('loginPrompt');
const formContainer = document.getElementById('formContainer');
const inquiryForm = document.getElementById('inquiryForm');
const categorySelect = document.getElementById('category');
const customTitleGroup = document.getElementById('customTitleGroup');
const wantDialogCheckbox = document.getElementById('wantDialog');
const anonymousCheckbox = document.getElementById('anonymous');
const contentTextarea = document.getElementById('content');
const charCount = document.getElementById('charCount');
const fileInput = document.getElementById('attachments');
const fileUploadArea = document.getElementById('fileUploadArea');
const fileList = document.getElementById('fileList');
const submitBtn = document.getElementById('submitBtn');
const toast = document.getElementById('toast');

// 選択されたファイルを管理
let selectedFiles = [];

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async () => {
    // ページロード時のアニメーション
    document.body.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 100));
    document.body.style.transition = 'opacity 0.6s ease';
    document.body.style.opacity = '1';

    await checkAuthStatus();
    setupEventListeners();
    addThemeToggle();
});

// 認証状態確認
async function checkAuthStatus() {
    try {
        showLoadingState();
        const response = await fetch('/api/user');
        const data = await response.json();
        
        if (data.user) {
            showUserInfo(data.user);
            await showForm();
        } else {
            showLoginPrompt();
        }
    } catch (error) {
        console.error('認証状態確認エラー:', error);
        showToast('🔌 ネットワークエラーが発生しました', 'error');
        showLoginPrompt();
    } finally {
        hideLoadingState();
    }
}

// ローディング状態表示
function showLoadingState() {
    document.body.style.cursor = 'wait';
}

function hideLoadingState() {
    document.body.style.cursor = 'default';
}

// ユーザー情報表示
function showUserInfo(user) {
    userSection.innerHTML = `
        <div class="user-info">
            <img src="${user.avatarURL}" alt="Avatar" class="user-avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
            <span class="user-name">${escapeHtml(user.displayName || user.globalName || user.username)}</span>
        </div>
        <div class="auth-buttons">
            <button class="btn btn-secondary" onclick="logout()">
                👋 ログアウト
            </button>
        </div>
    `;
}

// ログインプロンプト表示
function showLoginPrompt() {
    userSection.innerHTML = `
        <div class="auth-buttons">
            <button class="btn btn-discord" onclick="login()">
                <span class="discord-icon">🎮</span>
                ログイン
            </button>
        </div>
    `;
    loginPrompt.style.display = 'flex';
    formContainer.style.display = 'none';
}

// フォーム表示
async function showForm() {
    loginPrompt.style.display = 'none';
    formContainer.style.display = 'block';
    
    // アニメーション効果
    await new Promise(resolve => setTimeout(resolve, 100));
    formContainer.style.opacity = '0';
    formContainer.style.transform = 'translateY(20px)';
    formContainer.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    
    requestAnimationFrame(() => {
        formContainer.style.opacity = '1';
        formContainer.style.transform = 'translateY(0)';
    });
}

// イベントリスナー設定
function setupEventListeners() {
    // カテゴリー選択時の処理
    categorySelect.addEventListener('change', () => {
        const isOther = categorySelect.value === 'その他';
        customTitleGroup.style.display = isOther ? 'block' : 'none';
        
        if (isOther) {
            customTitleGroup.style.opacity = '0';
            customTitleGroup.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                customTitleGroup.style.transition = 'all 0.3s ease';
                customTitleGroup.style.opacity = '1';
                customTitleGroup.style.transform = 'translateY(0)';
            }, 10);
        }
    });

    // 管理者との対話チェック時の処理
    wantDialogCheckbox.addEventListener('change', () => {
        if (wantDialogCheckbox.checked) {
            anonymousCheckbox.checked = false;
            anonymousCheckbox.disabled = true;
            anonymousCheckbox.closest('.checkbox-label').style.opacity = '0.5';
            showToast('💬 対話モードでは匿名は利用できません', 'info');
        } else {
            anonymousCheckbox.disabled = false;
            anonymousCheckbox.closest('.checkbox-label').style.opacity = '1';
        }
    });

    // 文字数カウンター
    contentTextarea.addEventListener('input', () => {
        const count = contentTextarea.value.length;
        charCount.textContent = count;
        
        if (count > 800) {
            charCount.style.color = 'var(--accent-pink)';
            charCount.style.fontWeight = '700';
        } else if (count > 700) {
            charCount.style.color = 'var(--accent-purple)';
            charCount.style.fontWeight = '600';
        } else {
            charCount.style.color = 'var(--text-muted)';
            charCount.style.fontWeight = '500';
        }
    });

    // ファイルドラッグ&ドロップ
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, preventDefaults);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
            fileUploadArea.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
            fileUploadArea.classList.remove('dragover');
        });
    });

    fileUploadArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    // ファイル選択
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // フォーム送信
    inquiryForm.addEventListener('submit', handleSubmit);

    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            if (document.activeElement === contentTextarea) {
                handleSubmit(e);
            }
        }
    });
}

// ファイル処理
function handleFiles(files) {
    for (let file of files) {
        if (selectedFiles.length >= 5) {
            showToast('📎 ファイルは最大5つまでです', 'error');
            break;
        }

        if (file.size > 1024 * 1024) {
            showToast(`📏 ${file.name} は1MBを超えています`, 'error');
            continue;
        }

        // 重複チェック
        if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            showToast(`🔄 ${file.name} は既に選択されています`, 'error');
            continue;
        }

        selectedFiles.push(file);
        showToast(`✅ ${file.name} を追加しました`, 'success');
    }

    updateFileList();
}

// ファイルリスト更新
function updateFileList() {
    fileList.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.style.opacity = '0';
        fileItem.style.transform = 'translateY(10px)';
        
        fileItem.innerHTML = `
            <div class="file-info">
                <span class="file-name">${escapeHtml(file.name)}</span>
                <span class="file-size">(${formatFileSize(file.size)})</span>
            </div>
            <button type="button" class="file-remove" onclick="removeFile(${index})">
                🗑️ 削除
            </button>
        `;
        
        fileList.appendChild(fileItem);
        
        // アニメーション
        setTimeout(() => {
            fileItem.style.transition = 'all 0.3s ease';
            fileItem.style.opacity = '1';
            fileItem.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

// ファイル削除
function removeFile(index) {
    const removedFile = selectedFiles[index];
    selectedFiles.splice(index, 1);
    updateFileList();
    showToast(`🗑️ ${removedFile.name} を削除しました`, 'info');
}

// ファイルサイズフォーマット
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// フォーム送信処理
async function handleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const category = categorySelect.value;
    const customTitle = document.getElementById('customTitle').value;
    const wantDialog = wantDialogCheckbox.checked;
    const anonymous = anonymousCheckbox.checked;
    const content = contentTextarea.value.trim();

    // バリデーション
    if (!category) {
        showToast('📋 カテゴリーを選択してください', 'error');
        categorySelect.focus();
        return;
    }

    if (category === 'その他' && !customTitle.trim()) {
        showToast('🏷️ タイトルを入力してください', 'error');
        document.getElementById('customTitle').focus();
        return;
    }

    if (!content) {
        showToast('📄 内容を入力してください', 'error');
        contentTextarea.focus();
        return;
    }

    if (content.length > 800) {
        showToast('📏 内容は800文字以内で入力してください', 'error');
        contentTextarea.focus();
        return;
    }

    // フォームデータ作成
    formData.append('category', category);
    formData.append('customTitle', customTitle);
    formData.append('wantDialog', wantDialog ? 'on' : '');
    formData.append('anonymous', anonymous ? 'on' : '');
    formData.append('content', content);

    // ファイル追加
    selectedFiles.forEach(file => {
        formData.append('attachments', file);
    });

    // 送信中状態
    submitBtn.disabled = true;
    submitBtn.innerHTML = '🚀 送信中...';
    submitBtn.classList.add('loading');

    try {
        const response = await fetch('/form/submit', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            showToast(`✅ ${result.message}`, 'success');
            await resetFormWithAnimation();
        } else {
            showToast(`❌ ${result.error || 'エラーが発生しました'}`, 'error');
        }
    } catch (error) {
        console.error('送信エラー:', error);
        showToast('🔌 送信に失敗しました。ネットワークを確認してください。', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '🚀 送信する';
        submitBtn.classList.remove('loading');
    }
}

// フォームリセット（アニメーション付き）
async function resetFormWithAnimation() {
    // フェードアウト
    inquiryForm.style.transition = 'opacity 0.3s ease';
    inquiryForm.style.opacity = '0.5';
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // リセット
    inquiryForm.reset();
    selectedFiles = [];
    updateFileList();
    customTitleGroup.style.display = 'none';
    charCount.textContent = '0';
    anonymousCheckbox.disabled = false;
    anonymousCheckbox.closest('.checkbox-label').style.opacity = '1';
    
    // フェードイン
    inquiryForm.style.opacity = '1';
}

// トースト表示
function showToast(message, type = 'success') {
    // 既存のトーストがあれば削除
    toast.classList.remove('show');
    
    setTimeout(() => {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
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

// テーマトグル追加
function addThemeToggle() {
    // 今回はダークテーマのみなので、将来的な拡張のためのプレースホルダー
}

// ログイン
function login() {
    // ローディングアニメーション
    const loginBtn = event.target;
    loginBtn.innerHTML = '🎮 ログイン中...';
    loginBtn.disabled = true;
    
    setTimeout(() => {
        window.location.href = '/auth/login';
    }, 500);
}

// ログアウト
async function logout() {
    try {
        const logoutBtn = event.target;
        logoutBtn.innerHTML = '👋 ログアウト中...';
        logoutBtn.disabled = true;

        const response = await fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showToast('👋 ログアウトしました', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            throw new Error('ログアウト失敗');
        }
    } catch (error) {
        console.error('ログアウトエラー:', error);
        showToast('❌ ログアウトに失敗しました', 'error');
        
        // ボタンを元に戻す
        event.target.innerHTML = '👋 ログアウト';
        event.target.disabled = false;
    }
}

// サービスワーカー登録（将来的なオフライン対応）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // 今回は実装しないが、将来的にオフライン機能を追加可能
    });
}