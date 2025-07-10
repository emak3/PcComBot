const userSection = document.getElementById('userSection');
const loginPrompt = document.getElementById('loginPrompt');
const formContainer = document.getElementById('formContainer');
const notSupportPage = document.getElementById('notSupportPage');
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

// Markdown elements
const markdownToolbar = document.getElementById('markdownToolbar');
const markdownPreview = document.getElementById('markdownPreview');
const previewContent = document.getElementById('previewContent');
const markdownHelpPanel = document.getElementById('markdownHelpPanel');

// Selected files management
let selectedFiles = [];
let currentTab = 'editor';
let isSupportPage = false;

// ファイル名を安全にする関数
function sanitizeFileName(filename) {
    // スペースをハイフンに置き換え、その他の問題のある文字も処理
    return filename
        .replace(/\s+/g, '-')  // スペース（複数の連続も含む）をハイフンに
        .replace(/[<>:"/\\|?*]/g, '-')  // ファイル名に使えない文字をハイフンに
        .replace(/-+/g, '-')  // 連続するハイフンを単一に
        .replace(/^-+|-+$/g, '');  // 先頭・末尾のハイフンを削除
}

// Page initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Check if current page is support page
    isSupportPage = window.location.pathname === '/support';

    if (isSupportPage) {
        await checkAuthStatus();
        setupEventListeners();
        setupMarkdownEditor();
    } else {
        showNotSupportPage();
    }
});

// Show not support page
function showNotSupportPage() {
    if (notSupportPage) {
        notSupportPage.style.display = 'flex';
    }
    if (loginPrompt) {
        loginPrompt.style.display = 'none';
    }
    if (formContainer) {
        formContainer.style.display = 'none';
    }
}

// Check authentication status
async function checkAuthStatus() {
    if (!isSupportPage) return;

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
    if (!isSupportPage) return;

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

        // Update preview if in preview mode
        if (currentTab === 'preview') {
            updatePreview();
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

        // Markdown shortcuts
        if (e.ctrlKey && document.activeElement === contentTextarea) {
            switch (e.key) {
                case 'b':
                    e.preventDefault();
                    applyMarkdown('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    applyMarkdown('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    applyMarkdown('underline');
                    break;
                case 's':
                    e.preventDefault();
                    applyMarkdown('strikethrough');
                    break;
                case 'e':
                    e.preventDefault();
                    applyMarkdown('code');
                    break;
                case 'Enter':
                    e.preventDefault();
                    applyMarkdown('codeblock');
                    break;
                case '1':
                    e.preventDefault();
                    applyMarkdown('header1');
                    break;
                case '2':
                    e.preventDefault();
                    applyMarkdown('header2');
                    break;
                case '3':
                    e.preventDefault();
                    applyMarkdown('header3');
                    break;
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

// Setup markdown editor
function setupMarkdownEditor() {
    if (!isSupportPage) return;

    // Show toolbar when text is selected
    contentTextarea.addEventListener('mouseup', handleTextSelection);
    contentTextarea.addEventListener('keyup', handleTextSelection);

    // Update preview when typing
    contentTextarea.addEventListener('input', () => {
        if (currentTab === 'preview') {
            updatePreview();
        }
    });
}

// Handle text selection
function handleTextSelection() {
    const selection = contentTextarea.selectionStart !== contentTextarea.selectionEnd;
    if (selection) {
        markdownToolbar.style.display = 'flex';
    } else {
        setTimeout(() => {
            if (contentTextarea.selectionStart === contentTextarea.selectionEnd) {
                markdownToolbar.style.display = 'none';
            }
        }, 100);
    }
}

// Apply markdown formatting
function applyMarkdown(type) {
    const start = contentTextarea.selectionStart;
    const end = contentTextarea.selectionEnd;
    const selectedText = contentTextarea.value.substring(start, end);
    const beforeText = contentTextarea.value.substring(0, start);
    const afterText = contentTextarea.value.substring(end);

    let newText = '';
    let cursorOffset = 0;

    switch (type) {
        case 'bold':
            newText = `**${selectedText}**`;
            cursorOffset = selectedText ? 2 : 2;
            break;
        case 'italic':
            newText = `*${selectedText}*`;
            cursorOffset = selectedText ? 1 : 1;
            break;
        case 'underline':
            newText = `__${selectedText}__`;
            cursorOffset = selectedText ? 2 : 2;
            break;
        case 'strikethrough':
            newText = `~~${selectedText}~~`;
            cursorOffset = selectedText ? 2 : 2;
            break;
        case 'spoiler':
            newText = `||${selectedText}||`;
            cursorOffset = selectedText ? 2 : 2;
            break;
        case 'code':
            newText = `\`${selectedText}\``;
            cursorOffset = selectedText ? 1 : 1;
            break;
        case 'codeblock':
            newText = `\`\`\`\n${selectedText}\n\`\`\``;
            cursorOffset = selectedText ? 4 : 4;
            break;
        case 'header1':
            newText = `# ${selectedText}`;
            cursorOffset = selectedText ? 2 : 2;
            break;
        case 'header2':
            newText = `## ${selectedText}`;
            cursorOffset = selectedText ? 3 : 3;
            break;
        case 'header3':
            newText = `### ${selectedText}`;
            cursorOffset = selectedText ? 4 : 4;
            break;
        case 'subtext':
            newText = `-# ${selectedText}`;
            cursorOffset = selectedText ? 3 : 3;
            break;
        case 'quote':
            const lines = selectedText.split('\n');
            newText = lines.map(line => `> ${line}`).join('\n');
            cursorOffset = selectedText ? 2 : 2;
            break;
        case 'list':
            const listLines = selectedText.split('\n');
            newText = listLines.map(line => `- ${line}`).join('\n');
            cursorOffset = selectedText ? 2 : 2;
            break;
    }

    contentTextarea.value = beforeText + newText + afterText;

    // Update cursor position
    const newCursorPos = selectedText ? start + newText.length : start + cursorOffset;
    contentTextarea.setSelectionRange(newCursorPos, newCursorPos);

    // Update character count
    const count = contentTextarea.value.length;
    charCount.textContent = count;

    // Update preview if in preview mode
    if (currentTab === 'preview') {
        updatePreview();
    }

    // Focus back to textarea
    contentTextarea.focus();

    // Hide toolbar after applying
    markdownToolbar.style.display = 'none';
}

// Switch between editor and preview tabs
function switchTab(tab) {
    currentTab = tab;

    const editorTab = document.querySelector('.editor-tab');
    const previewTab = document.querySelector('.editor-tab:nth-child(2)');

    if (tab === 'editor') {
        editorTab.classList.add('active');
        previewTab.classList.remove('active');
        contentTextarea.style.display = 'block';
        markdownPreview.style.display = 'none';
    } else {
        editorTab.classList.remove('active');
        previewTab.classList.add('active');
        contentTextarea.style.display = 'none';
        markdownPreview.style.display = 'block';
        updatePreview();
    }
}

// Toggle preview mode
function togglePreview() {
    if (currentTab === 'editor') {
        switchTab('preview');
    } else {
        switchTab('editor');
    }
}

// Update preview content
function updatePreview() {
    const text = contentTextarea.value;
    if (!text.trim()) {
        previewContent.innerHTML = '<em>プレビューする内容がありません</em>';
        return;
    }

    // Simple markdown parsing for Discord-style formatting
    let html = escapeHtml(text);

    // Code blocks (最初に処理して一時的にプレースホルダーに置き換え)
    const codeBlocks = [];
    html = html.replace(/```([a-zA-Z]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
        // 先頭と末尾の改行を削除
        let cleanCode = code.replace(/^\n+/, '').replace(/\n+$/, '');
        const placeholder = `__CODEBLOCK_${codeBlocks.length}__`;

        // シンタックスハイライト用のクラスを追加（簡易実装）
        const langClass = lang ? ` class="language-${lang}"` : '';
        codeBlocks.push(`<pre><code${langClass}>${cleanCode}</code></pre>`);
        return placeholder;
    });

    // Inline code (コードブロックの次に処理)
    const inlineCodes = [];
    html = html.replace(/`([^`]+)`/g, (match, code) => {
        const placeholder = `__INLINECODE_${inlineCodes.length}__`;
        inlineCodes.push(`<code>${code}</code>`);
        return placeholder;
    });

    // Headers (行の開始から処理)
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Subtext
    html = html.replace(/^-# (.+)$/gm, '<span class="subtext">$1</span>');

    // Spoiler tags
    html = html.replace(/\|\|([^|]+)\|\|/g, '<span class="spoiler">$1</span>');

    // Bold (3個、2個の順で処理)
    html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Underline + formatting combinations
    html = html.replace(/__\*\*\*([^_*]+)\*\*\*__/g, '<u><strong><em>$1</em></strong></u>');
    html = html.replace(/__\*\*([^_*]+)\*\*__/g, '<u><strong>$1</strong></u>');
    html = html.replace(/__\*([^_*]+)\*__/g, '<u><em>$1</em></u>');
    html = html.replace(/__([^_]+)__/g, '<u>$1</u>');

    // Italic (single asterisk or underscore)
    html = html.replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/(?<!_)_(?!_)([^_]+)_(?!_)/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // Quote (行の開始から処理)
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // List items (行の開始から処理)
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');

    // Wrap consecutive list items in ul tags
    html = html.replace(/\n/g, '<br>');

    // プレースホルダーを元に戻す
    inlineCodes.forEach((code, index) => {
        html = html.replace(`__INLINECODE_${index}__`, code);
    });

    codeBlocks.forEach((code, index) => {
        html = html.replace(`__CODEBLOCK_${index}__`, code);
    });

    previewContent.innerHTML = html;
}

// Toggle markdown help panel
function toggleMarkdownHelp() {
    const panel = markdownHelpPanel;
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
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

        // ファイル名にスペースがある場合の警告とファイル名修正
        const originalName = file.name;
        const safeName = sanitizeFileName(originalName);

        if (originalName !== safeName) {
            showToast(`ファイル名を修正しました: "${originalName}" → "${safeName}"`, 'info');

            // File オブジェクトを新しい名前で再作成
            file = new File([file], safeName, { type: file.type });
        }

        // Check for duplicates (修正後の名前で)
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
    markdownToolbar.style.display = 'none';
    markdownHelpPanel.style.display = 'none';
    switchTab('editor');
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

    // 現在のページに応じてリダイレクト先を指定
    const returnTo = isSupportPage ? '/support' : '/';

    setTimeout(() => {
        window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
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