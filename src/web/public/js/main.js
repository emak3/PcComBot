const formUserSection = document.getElementById("formUserSection");
const loginPrompt = document.getElementById("loginPrompt");
const formContainer = document.getElementById("formContainer");
const notSupportPage = document.getElementById("notSupportPage");
const inquiryForm = document.getElementById("inquiryForm");
const categorySelect = document.getElementById("category");
const customTitleGroup = document.getElementById("customTitleGroup");
const wantDialogCheckbox = document.getElementById("wantDialog");
const anonymousCheckbox = document.getElementById("anonymous");
const contentTextarea = document.getElementById("content");
const charCount = document.getElementById("charCount");
const fileInput = document.getElementById("attachments");
const fileUploadArea = document.getElementById("fileUploadArea");
const fileUploadContent = document.getElementById("fileUploadContent");
const fileUploadPreview = document.getElementById("fileUploadPreview");
const uploadPreviewGrid = document.getElementById("uploadPreviewGrid");
const submitBtn = document.getElementById("submitBtn");
const toast = document.getElementById("toast");

// Markdown elements

// Selected files management
let selectedFiles = [];
let isSupportPage = false;
let userMenuVisible = false;

// ファイル名を安全にする関数
function sanitizeFileName (filename) {
    // スペースをハイフンに置き換え、その他の問題のある文字も処理
    return filename
        .replace(/\s+/g, "-")  // スペース（複数の連続も含む）をハイフンに
        .replace(/[<>:"/\\|?*]/g, "-")  // ファイル名に使えない文字をハイフンに
        .replace(/-+/g, "-")  // 連続するハイフンを単一に
        .replace(/^-+|-+$/g, "");  // 先頭・末尾のハイフンを削除
}

// Page initialization
document.addEventListener("DOMContentLoaded", async () => {
    // Check if current page is support page
    isSupportPage = window.location.pathname === "/support";

    if (isSupportPage) {
        await checkAuthStatus();
        setupEventListeners();
    } else {
        showNotSupportPage();
    }
});

// Clean up on page unload (especially important for mobile)
window.addEventListener("beforeunload", () => {
    if (toast) {
        hideToast();
    }
});

// Clean up on visibility change (mobile background/foreground)
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && toast) {
        // Force immediate cleanup when page becomes hidden
        toast.classList.remove("show");
        toast.style.display = "none";
        toast.textContent = "";
        toast.className = "toast";
    }
});

// Show not support page
function showNotSupportPage () {
    if (notSupportPage) {
        notSupportPage.style.display = "flex";
    }
    if (loginPrompt) {
        loginPrompt.style.display = "none";
    }
    if (formContainer) {
        formContainer.style.display = "none";
    }
}

// Check authentication status
async function checkAuthStatus () {
    if (!isSupportPage) return;

    try {
        const response = await fetch("/api/user");
        const data = await response.json();

        if (data.user) {
            showUserInfo(data.user);
            showForm();
        } else {
            showLoginPrompt();
        }
    } catch (error) {
        console.error("認証状態確認エラー:", error);
        showToast("ネットワークエラーが発生しました", "error");
        showLoginPrompt();
    }
}

// Show user information
function showUserInfo (user) {
    // Form user section - show user with dropdown
    if (formUserSection) {
        formUserSection.innerHTML = `
            <div class="form-user-info" onclick="toggleUserMenu()">
                <img src="${user.avatarURL}" alt="Avatar" class="form-user-avatar" onerror="this.src='/favicon.ico'">
                <span class="form-user-name">${escapeHtml(user.displayName || user.globalName || user.username)}</span>
                <i class="fas fa-chevron-down form-user-dropdown"></i>
                <div class="form-user-menu" id="formUserMenu">
                    <div class="form-user-menu-item" onclick="logout(); event.stopPropagation();">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>${i18n.translate('common.logout')}</span>
                    </div>
                </div>
            </div>
        `;
        formUserSection.style.display = "flex";
    }
}

// Show login prompt
function showLoginPrompt () {
    // Hide form user section
    if (formUserSection) {
        formUserSection.style.display = "none";
    }
    
    loginPrompt.style.display = "flex";
    formContainer.style.display = "none";
}

// Show form
function showForm () {
    loginPrompt.style.display = "none";
    formContainer.style.display = "block";
}

// Toggle user menu
function toggleUserMenu() {
    const menu = document.getElementById("formUserMenu");
    if (menu) {
        userMenuVisible = !userMenuVisible;
        if (userMenuVisible) {
            menu.classList.add("show");
        } else {
            menu.classList.remove("show");
        }
    }
}

// Close user menu when clicking outside
function closeUserMenu() {
    const menu = document.getElementById("formUserMenu");
    if (menu && userMenuVisible) {
        userMenuVisible = false;
        menu.classList.remove("show");
    }
}

// Setup event listeners
function setupEventListeners () {
    if (!isSupportPage) return;

    // Category change handler
    categorySelect.addEventListener("change", () => {
        const isOther = categorySelect.value === "その他";
        customTitleGroup.style.display = isOther ? "block" : "none";
    });

    // Dialog checkbox handler
    wantDialogCheckbox.addEventListener("change", () => {
        if (wantDialogCheckbox.checked) {
            anonymousCheckbox.checked = false;
            anonymousCheckbox.disabled = true;
            anonymousCheckbox.closest(".checkbox-label").style.opacity = "0.5";
            showToast(i18n.translate('js.messages.anonymous_not_available_in_dialog'), "info");
        } else {
            anonymousCheckbox.disabled = false;
            anonymousCheckbox.closest(".checkbox-label").style.opacity = "1";
        }
    });

    // Character counter and live preview
    contentTextarea.addEventListener("input", () => {
        const count = contentTextarea.value.length;
        charCount.textContent = count;

        if (count > 800) {
            charCount.style.color = "var(--discord-red)";
        } else if (count > 700) {
            charCount.style.color = "var(--discord-yellow)";
        } else {
            charCount.style.color = "var(--text-muted)";
        }

        // Update live highlight in editor
        updateLiveHighlight();
    });

    // File drag and drop
    ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, preventDefaults);
    });

    function preventDefaults (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ["dragenter", "dragover"].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
            fileUploadArea.classList.add("dragover");
        });
    });

    ["dragleave", "drop"].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
            fileUploadArea.classList.remove("dragover");
        });
    });

    fileUploadArea.addEventListener("drop", (e) => {
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    // File selection
    fileInput.addEventListener("change", (e) => {
        handleFiles(e.target.files);
    });

    // Paste functionality for images
    document.addEventListener("paste", handlePaste);

    // Form submission
    inquiryForm.addEventListener("submit", handleSubmit);

    // Close user menu when clicking outside
    document.addEventListener("click", (e) => {
        const formUserInfo = document.querySelector(".form-user-info");
        const formUserMenu = document.getElementById("formUserMenu");
        
        if (userMenuVisible && formUserInfo && !formUserInfo.contains(e.target)) {
            closeUserMenu();
        }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "Enter") {
            if (document.activeElement === contentTextarea) {
                handleSubmit(e);
            }
        }

        // Markdown shortcuts
        if (e.ctrlKey && document.activeElement === contentTextarea) {
            switch (e.key) {
            case "b":
                e.preventDefault();
                applyMarkdown("bold");
                break;
            case "i":
                e.preventDefault();
                applyMarkdown("italic");
                break;
            case "u":
                e.preventDefault();
                applyMarkdown("underline");
                break;
            case "s":
                e.preventDefault();
                applyMarkdown("strikethrough");
                break;
            case "e":
                e.preventDefault();
                applyMarkdown("code");
                break;
            case "Enter":
                e.preventDefault();
                applyMarkdown("codeblock");
                break;
            case "1":
                e.preventDefault();
                applyMarkdown("header1");
                break;
            case "2":
                e.preventDefault();
                applyMarkdown("header2");
                break;
            case "3":
                e.preventDefault();
                applyMarkdown("header3");
                break;
            }
        }

        if (e.key === "Control") {
            const pasteInfo = document.querySelector(".paste-info");
            if (pasteInfo && formContainer.style.display !== "none") {
                pasteInfo.style.background = "rgba(88, 166, 255, 0.1)";
                pasteInfo.style.borderColor = "var(--discord-blurple)";
            }
        }
    });

    document.addEventListener("keyup", (e) => {
        // Reset paste hint when Ctrl is released
        if (e.key === "Control") {
            const pasteInfo = document.querySelector(".paste-info");
            if (pasteInfo) {
                pasteInfo.style.background = "var(--background-secondary)";
                pasteInfo.style.borderColor = "var(--border-color)";
            }
        }
    });
}



// Handle paste functionality
function handlePaste (e) {
    // Only handle paste when the form is visible and focused area is appropriate
    if (formContainer.style.display === "none") return;

    const items = e.clipboardData?.items;
    if (!items) return;

    const files = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Check if item is a file and is an image
        if (item.kind === "file" && item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
                // Generate a filename for pasted images
                const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
                const extension = file.type.split("/")[1] || "png";
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
        showToast(i18n.translate('js.messages.images_pasted', {count: files.length}), "success");
    }
}

// Handle file selection / ファイル選択処理
function handleFiles (files) {
    for (let file of files) {
        if (selectedFiles.length >= 5) {
            showToast(i18n.translate('js.messages.max_files'), "error");
            break;
        }

        if (file.size > 1024 * 1024) {
            showToast(i18n.translate('js.messages.file_too_large', {filename: file.name}), "error");
            continue;
        }

        // ファイル名にスペースがある場合の警告とファイル名修正
        const originalName = file.name;
        const safeName = sanitizeFileName(originalName);

        if (originalName !== safeName) {
            showToast(i18n.translate('js.messages.filename_fixed', {original: originalName, safe: safeName}), "info");

            // File オブジェクトを新しい名前で再作成
            file = new File([file], safeName, { type: file.type });
        }

        // Check for duplicates (修正後の名前で)
        if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            showToast(i18n.translate('js.messages.file_already_selected', {filename: file.name}), "error");
            continue;
        }

        selectedFiles.push(file);
        showToast(i18n.translate('js.messages.file_added', {filename: file.name}), "success");
    }

    updateUploadPreview();
}


// Remove file / ファイル削除
function removeFile (index) {
    const removedFile = selectedFiles[index];
    selectedFiles.splice(index, 1);
    updateUploadPreview();
    showToast(i18n.translate('js.messages.file_removed', {filename: removedFile.name}), "info");
}


// Update upload preview area / アップロードプレビュー領域更新
function updateUploadPreview() {
    if (selectedFiles.length === 0) {
        fileUploadContent.style.display = "block";
        fileUploadPreview.style.display = "none";
    } else {
        fileUploadContent.style.display = "none";
        fileUploadPreview.style.display = "block";
        
        uploadPreviewGrid.innerHTML = "";
        
        selectedFiles.forEach((file, index) => {
            const previewCard = document.createElement("div");
            previewCard.className = "upload-preview-card";
            
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewCard.innerHTML = `
                        <div class="upload-preview-image">
                            <img src="${e.target.result}" alt="Preview" />
                        </div>
                        <div class="upload-preview-info">
                            <div class="upload-preview-name">${file.name}</div>
                            <div class="upload-preview-size">${formatFileSize(file.size)}</div>
                        </div>
                        <button type="button" class="upload-preview-delete" onclick="removeFile(${index})">
                            <i class="fas fa-trash"></i> ${i18n.translate('common.delete')}
                        </button>
                    `;
                };
                reader.readAsDataURL(file);
            } else {
                previewCard.innerHTML = `
                    <div class="upload-preview-icon-container">
                        <i class="fas fa-${getFileIcon(file.type)} upload-preview-file-icon"></i>
                    </div>
                    <div class="upload-preview-info">
                        <div class="upload-preview-name">${file.name}</div>
                        <div class="upload-preview-size">${formatFileSize(file.size)}</div>
                    </div>
                    <button type="button" class="upload-preview-delete" onclick="removeFile(${index})">
                        <i class="fas fa-trash"></i> ${i18n.translate('common.delete')}
                    </button>
                `;
            }
            
            uploadPreviewGrid.appendChild(previewCard);
        });
    }
}

// Format file size
function formatFileSize (bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Get file icon based on file type
function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.includes('pdf')) return 'file-pdf';
    if (fileType.includes('word') || fileType.includes('document')) return 'file-word';
    if (fileType.includes('zip') || fileType.includes('rar')) return 'file-archive';
    if (fileType.includes('text')) return 'file-alt';
    return 'file';
}

// Handle form submission / フォーム送信処理
async function handleSubmit (e) {
    e.preventDefault();

    const formData = new FormData();
    const category = categorySelect.value;
    const customTitle = document.getElementById("customTitle").value;
    const wantDialog = wantDialogCheckbox.checked;
    const anonymous = anonymousCheckbox.checked;
    const content = contentTextarea.value.trim();

    // Validation
    if (!category) {
        showToast(i18n.translate('js.messages.select_category'), "error");
        categorySelect.focus();
        return;
    }

    if (category === "その他" && !customTitle.trim()) {
        showToast(i18n.translate('js.messages.enter_title'), "error");
        document.getElementById("customTitle").focus();
        return;
    }

    if (!content) {
        showToast(i18n.translate('js.messages.enter_content'), "error");
        contentTextarea.focus();
        return;
    }

    if (content.length > 800) {
        showToast(i18n.translate('js.messages.content_too_long'), "error");
        contentTextarea.focus();
        return;
    }

    // Build form data
    formData.append("category", category);
    formData.append("customTitle", customTitle);
    formData.append("wantDialog", wantDialog ? "on" : "");
    formData.append("anonymous", anonymous ? "on" : "");
    formData.append("content", content);

    // Add files
    selectedFiles.forEach(file => {
        formData.append("attachments", file);
    });

    // Set loading state / ローディング状態設定
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${i18n.translate('js.messages.sending')}...`;
    submitBtn.classList.add("loading");

    try {
        const response = await fetch("/form/submit", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            showToast(result.message, "success");
            resetForm();
        } else {
            showToast(result.error || i18n.translate('js.messages.error_occurred'), "error");
        }
    } catch (error) {
        console.error("送信エラー:", error);
        showToast(i18n.translate('js.messages.network_error'), "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> ${i18n.translate('common.submit')}`;
        submitBtn.classList.remove("loading");
    }
}

// Reset form
function resetForm () {
    inquiryForm.reset();
    selectedFiles = [];
    updateUploadPreview();
    customTitleGroup.style.display = "none";
    charCount.textContent = "0";
    charCount.style.color = "var(--text-muted)";
    anonymousCheckbox.disabled = false;
    anonymousCheckbox.closest(".checkbox-label").style.opacity = "1";
}

// Show toast notification
function showToast (message, type = "success") {
    if (!toast) return;
    
    // Clear any existing timeouts
    if (toast.hideTimeout) {
        clearTimeout(toast.hideTimeout);
    }
    if (toast.showTimeout) {
        clearTimeout(toast.showTimeout);
    }

    // Hide current toast first
    toast.classList.remove("show");
    
    // Reset toast state
    toast.showTimeout = setTimeout(() => {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = "block";
        toast.classList.add("show");

        // Auto hide after 4 seconds with cleanup
        toast.hideTimeout = setTimeout(() => {
            hideToast();
        }, 4000);
    }, 100);
}

// Hide toast with complete cleanup
function hideToast() {
    if (!toast) return;
    
    toast.classList.remove("show");
    
    // Wait for transition to complete before hiding
    setTimeout(() => {
        toast.style.display = "none";
        toast.textContent = "";
        toast.className = "toast";
        
        // Clear any remaining timeouts
        if (toast.hideTimeout) {
            clearTimeout(toast.hideTimeout);
            toast.hideTimeout = null;
        }
        if (toast.showTimeout) {
            clearTimeout(toast.showTimeout);
            toast.showTimeout = null;
        }
    }, 300); // Match CSS transition duration
}

// Escape HTML
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

// Login function / ログイン機能
function login () {
    const loginBtn = event.target;
    loginBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${i18n.translate('js.messages.logging_in')}`;
    loginBtn.disabled = true;

    // 現在のページに応じてリダイレクト先を指定
    const returnTo = isSupportPage ? "/support" : "/";

    setTimeout(() => {
        window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
    }, 300);
}

// Logout function / ログアウト機能
async function logout () {
    try {
        const logoutBtn = event.target;
        logoutBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${i18n.translate('js.messages.logging_out')}...`;
        logoutBtn.disabled = true;

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
            throw new Error("ログアウト失敗");
        }
    } catch (error) {
        console.error("ログアウトエラー:", error);
        showToast(i18n.translate('js.messages.logout_failed'), "error");

        // Reset button
        event.target.innerHTML = `<i class="fas fa-sign-out-alt"></i> ${i18n.translate('common.logout')}`;
        event.target.disabled = false;
    }
}

