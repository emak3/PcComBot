// guidelines.js - 質問ガイドラインページ専用のJavaScript

// 質問テンプレート
const QUESTION_TEMPLATE = `**【質問の種類】**
□ ハードウェア選び  □ ソフトウェア設定  □ トラブル解決  □ その他

**【現在の状況】**
（問題の詳細な説明）

**【エラーメッセージ】**
（あれば正確に記載）

**【PC構成】**
CPU: 
GPU: 
メモリ: 
マザーボード: 
ストレージ: 
OS: 

**【試した対策】**
1. 
2. 
3. 

**【期待する結果】**
（どのような状態にしたいか）

**【追加情報】**
（画像やログファイルなど）`;

// ページ読み込み時の初期化
document.addEventListener("DOMContentLoaded", () => {
    // FAQ項目の初期化
    setupFAQItems();

    // 例示タブの初期化
    initializeExampleTabs();

    // テンプレートの初期化
    setupTemplate();

    // システム情報取得のヘルプ
    setupSystemInfoHelp();
});

// FAQ項目のセットアップ
function setupFAQItems () {
    const faqItems = document.querySelectorAll(".faq-item");

    faqItems.forEach(item => {
        const question = item.querySelector(".faq-question");
        const answer = item.querySelector(".faq-answer");

        // 初期状態では回答を非表示
        answer.style.display = "none";

        // クリックイベントの設定
        question.addEventListener("click", () => {
            toggleFAQ(question);
        });
    });
}

// FAQ項目の開閉
function toggleFAQ (element) {
    const faqItem = element.closest(".faq-item");
    const answer = faqItem.querySelector(".faq-answer");
    const icon = element.querySelector("i");

    const isOpen = answer.style.display === "block";

    if (isOpen) {
        // 閉じる
        answer.style.display = "none";
        icon.classList.remove("fa-chevron-down");
        icon.classList.add("fa-chevron-right");
        faqItem.classList.remove("active");
    } else {
        // 開く
        answer.style.display = "block";
        icon.classList.remove("fa-chevron-right");
        icon.classList.add("fa-chevron-down");
        faqItem.classList.add("active");
    }
}

// 例示タブの初期化
function initializeExampleTabs () {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".example-content");

    // 最初のタブを有効化
    if (tabButtons.length > 0) {
        tabButtons[0].classList.add("active");
    }

    if (tabContents.length > 0) {
        tabContents[0].classList.add("active");
    }
}

// 例示タブの切り替え
function switchExampleTab (tabName) {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".example-content");

    // 全てのタブを非アクティブ化
    tabButtons.forEach(btn => btn.classList.remove("active"));
    tabContents.forEach(content => content.classList.remove("active"));

    // 選択されたタブを有効化
    const selectedButton = document.querySelector(`[onclick="switchExampleTab('${tabName}')"]`);
    const selectedContent = document.getElementById(tabName);

    if (selectedButton) {
        selectedButton.classList.add("active");
    }

    if (selectedContent) {
        selectedContent.classList.add("active");
    }
}

// テンプレートのセットアップ
function setupTemplate () {
    const templateElement = document.getElementById("questionTemplate");
    if (templateElement) {
        templateElement.textContent = QUESTION_TEMPLATE;
    }
}

// テンプレートのコピー
function copyTemplate () {
    const templateElement = document.getElementById("questionTemplate");
    if (!templateElement) return;

    const template = templateElement.textContent;

    // クリップボードにコピー
    navigator.clipboard.writeText(template).then(() => {
        showToast("テンプレートをクリップボードにコピーしました", "success");

        // コピーボタンのフィードバック
        const copyBtn = event.target;
        const originalText = copyBtn.innerHTML;

        copyBtn.innerHTML = '<i class="fas fa-check"></i> コピー完了';
        copyBtn.style.backgroundColor = "var(--discord-green)";

        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.backgroundColor = "";
        }, 2000);
    }).catch(err => {
        console.error("コピーに失敗しました:", err);
        showToast("コピーに失敗しました", "error");

        // フォールバック：テキストエリアを使用
        fallbackCopyTemplate(template);
    });
}

// フォールバック用のコピー機能
function fallbackCopyTemplate (text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand("copy");
        showToast("テンプレートをコピーしました", "success");
    } catch (err) {
        console.error("フォールバックコピーも失敗しました:", err);
        showToast("コピーに失敗しました。手動でコピーしてください", "error");
    }

    document.body.removeChild(textarea);
}

// システム情報取得のヘルプ
function setupSystemInfoHelp () {
    // システム情報取得のためのヘルプ機能
    const infoCards = document.querySelectorAll(".info-card");

    infoCards.forEach(card => {
        const codeElements = card.querySelectorAll("code");

        codeElements.forEach(code => {
            code.addEventListener("click", () => {
                copyToClipboard(code.textContent);
            });

            // ホバー時のスタイル
            code.style.cursor = "pointer";
            code.title = "クリックでコピー";
        });
    });
}

// クリップボードにコピー
function copyToClipboard (text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`"${text}" をコピーしました`, "info");
    }).catch(err => {
        console.error("コピーに失敗しました:", err);
        showToast("コピーに失敗しました", "error");
    });
}

// トーストの表示（pages.jsと共通）
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

// スクリーンショットのヘルプ
function showScreenshotHelp () {
    const helpModal = document.createElement("div");
    helpModal.className = "modal-overlay";
    helpModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>スクリーンショットの詳細な撮り方</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="screenshot-help">
                    <h4>Windows 11/10の場合</h4>
                    <ul>
                        <li><strong>Snipping Tool</strong>: Windows + Shift + S</li>
                        <li><strong>PrintScreen</strong>: 画面全体をキャプチャ</li>
                        <li><strong>Alt + PrintScreen</strong>: アクティブウィンドウのみ</li>
                    </ul>
                    
                    <h4>保存先について</h4>
                    <p>スクリーンショットは通常、以下の場所に保存されます：</p>
                    <ul>
                        <li>Windows + PrintScreen: ピクチャフォルダ</li>
                        <li>Snipping Tool: クリップボード（貼り付け可能）</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(helpModal);

    // ESCキーで閉じる
    document.addEventListener("keydown", handleModalEscape);
}

// モーダルを閉じる
function closeModal () {
    const modal = document.querySelector(".modal-overlay");
    if (modal) {
        modal.remove();
        document.removeEventListener("keydown", handleModalEscape);
    }
}

// ESCキーでモーダルを閉じる
function handleModalEscape (e) {
    if (e.key === "Escape") {
        closeModal();
    }
}

// 例示カードのアニメーション
function animateExampleCards () {
    const cards = document.querySelectorAll(".example-card");

    cards.forEach((card, index) => {
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";

        setTimeout(() => {
            card.style.transition = "all 0.5s ease";
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
        }, index * 200);
    });
}

// ページ内検索機能
function searchContent (query) {
    const content = document.querySelector(".content-section");
    const sections = content.querySelectorAll(".rule-section, .info-section, .faq-section");

    if (!query) {
        // 検索クエリが空の場合、全て表示
        sections.forEach(section => {
            section.style.display = "block";
        });
        return;
    }

    sections.forEach(section => {
        const text = section.textContent.toLowerCase();
        if (text.includes(query.toLowerCase())) {
            section.style.display = "block";
            highlightText(section, query);
        } else {
            section.style.display = "none";
        }
    });
}

// テキストハイライト
function highlightText (element, query) {
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const textNodes = [];
    let node;

    while (node = walker.nextNode()) {
        textNodes.push(node);
    }

    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const regex = new RegExp(`(${query})`, "gi");

        if (regex.test(text)) {
            const parent = textNode.parentNode;
            const wrapper = document.createElement("span");
            wrapper.innerHTML = text.replace(regex, "<mark>$1</mark>");
            parent.replaceChild(wrapper, textNode);
        }
    });
}

// 印刷用のスタイル調整
function preparePrint () {
    // 印刷前の処理
    const printStyles = document.createElement("style");
    printStyles.textContent = `
        @media print {
            .header, .footer, .toast { display: none; }
            .example-card { break-inside: avoid; }
            .rule-section { break-inside: avoid; }
            .main { margin: 0; padding: 20px; }
        }
    `;
    document.head.appendChild(printStyles);

    // 印刷ダイアログを開く
    window.print();

    // 印刷後にスタイルを削除
    setTimeout(() => {
        document.head.removeChild(printStyles);
    }, 1000);
}

// ページ印刷用の関数
function printPage () {
    preparePrint();
}

// 戻るボタン
function goBack () {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = "/";
    }
}

// 目次の生成
function generateTOC () {
    const toc = document.querySelector(".toc-list");
    if (!toc) return;

    const headings = document.querySelectorAll("h3[id], .rule-section h3");

    headings.forEach(heading => {
        if (!heading.id) {
            // IDが無い場合は生成
            const text = heading.textContent;
            const id = text.toLowerCase().replace(/[^a-zA-Z0-9]/g, "-");
            heading.id = id;
        }

        const link = document.createElement("a");
        link.href = `#${heading.id}`;
        link.textContent = heading.textContent;

        const li = document.createElement("li");
        li.appendChild(link);
        toc.appendChild(li);
    });
}

// 進捗インジケーター
function updateReadingProgress () {
    const progressBar = document.querySelector(".reading-progress");
    if (!progressBar) return;

    const scrollTop = window.pageYOffset;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;

    progressBar.style.width = `${progress}%`;
}

// スクロール時の処理
window.addEventListener("scroll", () => {
    updateReadingProgress();
});

// 初期化時にアニメーションを開始
setTimeout(() => {
    animateExampleCards();
}, 500);

// デバッグ用の関数
function debugGuidelines () {
    console.log("Guidelines Debug:", {
        faqItems: document.querySelectorAll(".faq-item").length,
        exampleTabs: document.querySelectorAll(".tab-button").length,
        template: document.getElementById("questionTemplate") ? "Found" : "Not found"
    });
}

// エクスポート用の関数（他のファイルから使用可能）
window.guidelinesUtils = {
    copyTemplate,
    switchExampleTab,
    toggleFAQ,
    showScreenshotHelp,
    printPage,
    debugGuidelines
};
