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

// Selected files management
let selectedFiles = [];

// Page initialization
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthStatus();
    setupEventListeners();
});

// Check authentication status
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
        showToast('ネットワークエラーが発生しました', 'error');
        showLoginPrompt();
    }
}

// Show user information
function showUserInfo(user) {
    userSection.innerHTML = `
        <div class="user-info">
            <img src="${user.avatarURL}" alt="Avatar" class="user-avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
            <span class="user-name">${escapeHtml(user.displayName || user.globalName || user.username)}</span>
        </div>
        <div class="auth-buttons">
            <button class="btn btn-secondary" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i> ログアウト
            </button>
        </div>
    `;
}

// Show login prompt
function showLoginPrompt() {
    userSection.innerHTML = `
        <div class="auth-buttons">
            <button class="btn btn-discord" onclick="login()">
                <i class="fab fa-discord"></i>
                ログイン
            </button>
        </div>
    `;
    loginPrompt.style.display = 'flex';
    formContainer.style.display = 'none';
}

// Show form
function showForm() {
    loginPrompt.style.display = 'none';
    formContainer.style.display = 'block';
}

// Setup event listeners
function setupEventListeners() {
    // Category change handler
    categorySelect.addEventListener('change', () => {
        const isOther = categorySelect.value === 'その他';
        customTitleGroup.style.display = isOther ? 'block' : 'none';
    });

    // Dialog checkbox handler
    wantDialogCheckbox.addEventListener('change', () => {
        if (wantDialogCheckbox.checked) {
            anonymousCheckbox.checked = false;
            anonymousCheckbox.disabled = true;
            anonymousCheckbox.closest('.checkbox-label').style.opacity = '0.5';
            showToast('対話モードでは匿名は利用できません', 'info');
        } else {
            anonymousCheckbox.disabled = false;
            anonymousCheckbox.closest('.checkbox-label').style.opacity = '1';
        }
    });

    // Character counter
    contentTextarea.addEventListener('input', () => {
        const count = contentTextarea.value.length;
        charCount.textContent = count;
        
        if (count > 800) {
            charCount.style.color = 'var(--discord-red)';
        } else if (count > 700) {
            charCount.style.color = 'var(--discord-yellow)';
        } else {
            charCount.style.color = 'var(--text-muted)';
        }
    });

    // File drag and drop
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

    // File selection
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Paste functionality for images
    document.addEventListener('paste', handlePaste);

    // Form submission
    inquiryForm.addEventListener('submit', handleSubmit);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            if (document.activeElement === contentTextarea) {
                handleSubmit(e);
            }
        }
        
        if (e.key === 'Control') {
            const pasteInfo = document.querySelector('.paste-info');
            if (pasteInfo && formContainer.style.display !== 'none') {
                pasteInfo.style.background = 'rgba(88, 166, 255, 0.1)';
                pasteInfo.style.borderColor = 'var(--discord-blurple)';
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        // Reset paste hint when Ctrl is released
        if (e.key === 'Control') {
            const pasteInfo = document.querySelector('.paste-info');
            if (pasteInfo) {
                pasteInfo.style.background = 'var(--background-secondary)';
                pasteInfo.style.borderColor = 'var(--border-color)';
            }
        }
    });
}

// Handle paste functionality
function handlePaste(e) {
    // Only handle paste when the form is visible and focused area is appropriate
    if (formContainer.style.display === 'none') return;
    
    const items = e.clipboardData?.items;
    if (!items) return;

    const files = [];
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Check if item is a file and is an image
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
                // Generate a filename for pasted images
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const extension = file.type.split('/')[1] || 'png';
                const fileName = `pasted-image-${timestamp}.${extension}`;
                
                // Create a new File object with a proper name
                const namedFile = new File([file], fileName, { type: file.type });
                files.push(namedFile);
            }
        }
    }
    
    if (files.length > 0) {
        e.preventDefault(); // Prevent default paste behavior
        handleFiles(files);
        showToast(`📋 ${files.length}個の画像をペーストしました`, 'success');
    }
}

// Handle file selection
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

        // Check for duplicates
        if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            showToast(`${file.name} は既に選択されています`, 'error');
            continue;
        }

        selectedFiles.push(file);
        showToast(`${file.name} を追加しました`, 'success');
    }

    updateFileList();
}

// Update file list display
function updateFileList() {
    fileList.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        fileItem.innerHTML = `
            <div class="file-info">
                <i class="fas fa-file"></i>
                <span class="file-name">${escapeHtml(file.name)}</span>
                <span class="file-size">(${formatFileSize(file.size)})</span>
            </div>
            <button type="button" class="file-remove" onclick="removeFile(${index})">
                <i class="fas fa-times"></i> 削除
            </button>
        `;
        
        fileList.appendChild(fileItem);
    });
}

// Remove file
function removeFile(index) {
    const removedFile = selectedFiles[index];
    selectedFiles.splice(index, 1);
    updateFileList();
    showToast(`${removedFile.name} を削除しました`, 'info');
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const category = categorySelect.value;
    const customTitle = document.getElementById('customTitle').value;
    const wantDialog = wantDialogCheckbox.checked;
    const anonymous = anonymousCheckbox.checked;
    const content = contentTextarea.value.trim();

    // Validation
    if (!category) {
        showToast('カテゴリーを選択してください', 'error');
        categorySelect.focus();
        return;
    }

    if (category === 'その他' && !customTitle.trim()) {
        showToast('タイトルを入力してください', 'error');
        document.getElementById('customTitle').focus();
        return;
    }

    if (!content) {
        showToast('内容を入力してください', 'error');
        contentTextarea.focus();
        return;
    }

    if (content.length > 800) {
        showToast('内容は800文字以内で入力してください', 'error');
        contentTextarea.focus();
        return;
    }

    // Build form data
    formData.append('category', category);
    formData.append('customTitle', customTitle);
    formData.append('wantDialog', wantDialog ? 'on' : '');
    formData.append('anonymous', anonymous ? 'on' : '');
    formData.append('content', content);

    // Add files
    selectedFiles.forEach(file => {
        formData.append('attachments', file);
    });

    // Set loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 送信中...';
    submitBtn.classList.add('loading');

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
        showToast('送信に失敗しました。ネットワークを確認してください。', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 送信する';
        submitBtn.classList.remove('loading');
    }
}

// Reset form
function resetForm() {
    inquiryForm.reset();
    selectedFiles = [];
    updateFileList();
    customTitleGroup.style.display = 'none';
    charCount.textContent = '0';
    charCount.style.color = 'var(--text-muted)';
    anonymousCheckbox.disabled = false;
    anonymousCheckbox.closest('.checkbox-label').style.opacity = '1';
}

// Show toast notification
function showToast(message, type = 'success') {
    // Remove existing toast
    toast.classList.remove('show');
    
    setTimeout(() => {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        // Auto hide after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }, 100);
}

// Escape HTML
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

// Login function
function login() {
    const loginBtn = event.target;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ログイン中...';
    loginBtn.disabled = true;
    
    setTimeout(() => {
        window.location.href = '/auth/login';
    }, 300);
}

// Logout function
async function logout() {
    try {
        const logoutBtn = event.target;
        logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ログアウト中...';
        logoutBtn.disabled = true;

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
        
        // Reset button
        event.target.innerHTML = '<i class="fas fa-sign-out-alt"></i> ログアウト';
        event.target.disabled = false;
    }
}