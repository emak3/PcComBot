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
    await checkAuthStatus();
    setupEventListeners();
});

// 認証状態確認
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        
        if (data.user) {
            showUserInfo(data.user);
            showForm();
        } else {
            showLoginPrompt();
        }
    } catch (error) {
        console.error('認証状態確認エラー:', error);
        showLoginPrompt();
    }
}

// ユーザー情報表示
function showUserInfo(user) {
    userSection.innerHTML = `
        <div class="user-info">
            <img src="${user.avatarURL}" alt="Avatar" class="user-avatar">
            <span class="user-name">${user.displayName || user.globalName || user.username}</span>
        </div>
        <div class="auth-buttons">
            <button class="btn btn-secondary" onclick="logout()">ログアウト</button>
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
    loginPrompt.style.display = 'block';
    formContainer.style.display = 'none';
}

// フォーム表示
function showForm() {
    loginPrompt.style.display = 'none';
    formContainer.style.display = 'block';
}

// イベントリスナー設定
function setupEventListeners() {
    // カテゴリー選択時の処理
    categorySelect.addEventListener('change', () => {
        if (categorySelect.value === 'その他') {
            customTitleGroup.style.display = 'block';
        } else {
            customTitleGroup.style.display = 'none';
        }
    });

    // 管理者との対話チェック時の処理
    wantDialogCheckbox.addEventListener('change', () => {
        if (wantDialogCheckbox.checked) {
            anonymousCheckbox.checked = false;
            anonymousCheckbox.disabled = true;
        } else {
            anonymousCheckbox.disabled = false;
        }
    });

    // 文字数カウンター
    contentTextarea.addEventListener('input', () => {
        const count = contentTextarea.value.length;
        charCount.textContent = count;
        
        if (count > 800) {
            charCount.style.color = '#f04747';
        } else {
            charCount.style.color = '#72767d';
        }
    });

    // ファイルドラッグ&ドロップ
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.classList.add('dragover');
    });

    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.classList.remove('dragover');
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    // ファイル選択
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // フォーム送信
    inquiryForm.addEventListener('submit', handleSubmit);
}

// ファイル処理
function handleFiles(files) {
    for (let file of files) {
        if (selectedFiles.length >= 5) {
            showToast('ファイルは最大5つまでです', 'error');
            break;
        }

        if (file.size > 1024 * 1024) {
            showToast(`${file.name} は1MBを超えています`, 'error');
            continue;
        }

        // 重複チェック
        if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            showToast(`${file.name} は既に選択されています`, 'error');
            continue;
        }

        selectedFiles.push(file);
    }

    updateFileList();
}

// ファイルリスト更新
function updateFileList() {
    fileList.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${formatFileSize(file.size)})</span>
            </div>
            <button type="button" class="file-remove" onclick="removeFile(${index})">削除</button>
        `;
        fileList.appendChild(fileItem);
    });
}

// ファイル削除
function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
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
        showToast('カテゴリーを選択してください', 'error');
        return;
    }

    if (category === 'その他' && !customTitle.trim()) {
        showToast('タイトルを入力してください', 'error');
        return;
    }

    if (!content) {
        showToast('内容を入力してください', 'error');
        return;
    }

    if (content.length > 800) {
        showToast('内容は800文字以内で入力してください', 'error');
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
    submitBtn.textContent = '送信中...';

    try {
        const response = await fetch('/form/submit', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            showToast(result.message, 'success');
            resetForm();
        } else {
            showToast(result.error || 'エラーが発生しました', 'error');
        }
    } catch (error) {
        console.error('送信エラー:', error);
        showToast('送信に失敗しました', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '送信する';
    }
}

// フォームリセット
function resetForm() {
    inquiryForm.reset();
    selectedFiles = [];
    updateFileList();
    customTitleGroup.style.display = 'none';
    charCount.textContent = '0';
    anonymousCheckbox.disabled = false;
}

// トースト表示
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// ログイン
function login() {
    window.location.href = '/auth/login';
}

// ログアウト
async function logout() {
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showToast('ログアウトしました');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showToast('ログアウトに失敗しました', 'error');
        }
    } catch (error) {
        console.error('ログアウトエラー:', error);
        showToast('ログアウトに失敗しました', 'error');
    }
}