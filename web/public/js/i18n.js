/**
 * Internationalization (i18n) system for PC Community
 * Supports multiple languages with easy addition of new languages
 */

class I18n {
    constructor() {
        this.currentLanguage = 'ja'; // Default language
        this.fallbackLanguage = 'ja'; // Fallback if translation missing
        this.translations = {};
        this.availableLanguages = [];
        this.initialized = false;
        
        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.loadLanguage = this.loadLanguage.bind(this);
        this.setLanguage = this.setLanguage.bind(this);
        this.translate = this.translate.bind(this);
        this.updatePageContent = this.updatePageContent.bind(this);
    }

    /**
     * Initialize the i18n system
     */
    async init() {
        try {
            // Load saved language preference or detect browser language
            const savedLang = localStorage.getItem('pccom_language');
            const browserLang = navigator.language.split('-')[0];
            
            // Determine initial language
            let initialLang = savedLang || browserLang || this.fallbackLanguage;
            
            // Ensure the language exists, fallback if not
            const availableLanguages = await this.getAvailableLanguages();
            if (!availableLanguages.includes(initialLang)) {
                initialLang = this.fallbackLanguage;
            }
            
            await this.loadLanguage(initialLang);
            await this.createLanguageSwitcher();
            this.updatePageContent();
            this.initialized = true;
            
            console.log(`I18n initialized with language: ${this.currentLanguage}`);
        } catch (error) {
            console.error('Failed to initialize i18n:', error);
            // Fallback to default language if initialization fails
            this.currentLanguage = this.fallbackLanguage;
        }
    }

    /**
     * Get list of available languages by checking lang directory
     */
    async getAvailableLanguages() {
        if (!this.availableLanguages || this.availableLanguages.length === 0) {
            try {
                // Try to fetch the lang directory listing
                const response = await fetch('/lang/');
                if (response.ok) {
                    const html = await response.text();
                    // Extract .json filenames from directory listing
                    const jsonFiles = [];
                    const regex = /href="([^"]+\.json)"/g;
                    let match;
                    while ((match = regex.exec(html)) !== null) {
                        const filename = match[1];
                        if (filename !== 'template.json') { // Exclude template file
                            const langCode = filename.replace('.json', '');
                            jsonFiles.push(langCode);
                        }
                    }
                    
                    if (jsonFiles.length > 0) {
                        this.availableLanguages = jsonFiles;
                        return jsonFiles;
                    }
                }
            } catch (error) {
                console.warn('Could not auto-detect languages, falling back to known languages');
            }
            
            // Fallback to known languages
            const knownLanguages = ['ja', 'en']; 
            this.availableLanguages = knownLanguages;
            return knownLanguages;
        }
        return this.availableLanguages;
    }

    /**
     * Load language file
     */
    async loadLanguage(langCode) {
        try {
            const response = await fetch(`/lang/${langCode}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load language ${langCode}`);
            }
            
            const languageData = await response.json();
            this.translations[langCode] = languageData;
            this.currentLanguage = langCode;
            
            // Update document language
            document.documentElement.lang = langCode;
            
            return languageData;
        } catch (error) {
            console.error(`Error loading language ${langCode}:`, error);
            
            // If not the fallback language, try to load fallback
            if (langCode !== this.fallbackLanguage) {
                console.log(`Falling back to ${this.fallbackLanguage}`);
                return await this.loadLanguage(this.fallbackLanguage);
            }
            
            throw error;
        }
    }

    /**
     * Set current language and update page
     */
    async setLanguage(langCode) {
        if (langCode === this.currentLanguage) return;
        
        try {
            await this.loadLanguage(langCode);
            localStorage.setItem('pccom_language', langCode);
            this.updatePageContent();
            this.updateLanguageSwitcher();
            
            // Dispatch language change event
            window.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { language: langCode }
            }));
            
        } catch (error) {
            console.error(`Failed to set language to ${langCode}:`, error);
        }
    }

    /**
     * Get translation for a key
     */
    translate(key, params = {}) {
        if (!this.translations[this.currentLanguage]) {
            console.warn(`No translations loaded for language: ${this.currentLanguage}`);
            return key;
        }

        const translation = this.getNestedValue(this.translations[this.currentLanguage], key);
        
        if (translation === undefined) {
            // Try fallback language
            if (this.currentLanguage !== this.fallbackLanguage && this.translations[this.fallbackLanguage]) {
                const fallbackTranslation = this.getNestedValue(this.translations[this.fallbackLanguage], key);
                if (fallbackTranslation !== undefined) {
                    return this.interpolate(fallbackTranslation, params);
                }
            }
            
            console.warn(`Translation missing for key: ${key}`);
            return key;
        }

        return this.interpolate(translation, params);
    }

    /**
     * Get nested object value using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Interpolate parameters into translation string
     */
    interpolate(str, params) {
        if (typeof str !== 'string') return str;
        
        return str.replace(/\{(\w+)\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    /**
     * Create language switcher UI (globe icon version)
     */
    async createLanguageSwitcher() {
        // Remove existing switcher
        const existingSwitcher = document.querySelector('.language-switcher');
        if (existingSwitcher) {
            existingSwitcher.remove();
        }

        const headerNav = document.querySelector('.header-nav');
        if (!headerNav) {
            setTimeout(() => this.createLanguageSwitcher(), 100);
            return;
        }

        // Get available languages
        const availableLanguages = await this.getAvailableLanguages();
        
        // Pre-load language metadata for all available languages
        const languageMetadata = {};
        for (const langCode of availableLanguages) {
            try {
                // Try to load just the metadata portion of the language file
                if (!this.translations[langCode]) {
                    const response = await fetch(`/lang/${langCode}.json`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.meta) {
                            // Store just the meta info temporarily for UI generation
                            this.translations[langCode] = { meta: data.meta };
                        }
                    }
                }
                languageMetadata[langCode] = this.getLangMeta(langCode);
            } catch (error) {
                console.warn(`Could not load metadata for ${langCode}:`, error);
                languageMetadata[langCode] = this.getLangMeta(langCode); // Use fallback
            }
        }
        
        // Get current language metadata
        const currentLang = languageMetadata[this.currentLanguage] || this.getLangMeta(this.currentLanguage);
        
        // Create language selector button
        const switcher = document.createElement('div');
        switcher.className = 'language-switcher';
        
        switcher.innerHTML = `
            <button class="language-selector-btn" type="button">
                <span class="language-flag">${currentLang.flag}</span>
                <span class="language-name">${currentLang.name}</span>
                <i class="fas fa-chevron-down"></i>
            </button>
            <div class="language-dropdown">
                ${availableLanguages.map(langCode => {
                    const langData = languageMetadata[langCode] || this.getLangMeta(langCode);
                    const isActive = langCode === this.currentLanguage;
                    return `
                        <div class="language-option ${isActive ? 'active' : ''}" data-lang="${langCode}">
                            <span class="language-flag">${langData.flag}</span>
                            <div class="language-info">
                                <div class="language-name">${langData.name}</div>
                                <div class="language-native">${langData.nativeName}</div>
                            </div>
                            ${isActive ? '<i class="fas fa-check language-check"></i>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        headerNav.appendChild(switcher);
        
        // Set up events
        this.setupLanguageSwitcherEvents();
    }


    /**
     * Setup language switcher events for traditional dropdown
     */
    setupLanguageSwitcherEvents() {
        const switcher = document.querySelector('.language-switcher');
        const selectorBtn = document.querySelector('.language-selector-btn');
        const dropdown = document.querySelector('.language-dropdown');
        
        if (!switcher || !selectorBtn || !dropdown) return;
        
        // Toggle dropdown
        selectorBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            switcher.classList.toggle('open');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!switcher.contains(e.target)) {
                switcher.classList.remove('open');
            }
        });
        
        // Language option selection
        dropdown.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Find the language option element
            let option = e.target;
            while (option && option !== dropdown) {
                if (option.classList && option.classList.contains('language-option')) {
                    const lang = option.getAttribute('data-lang');
                    if (lang && lang !== this.currentLanguage) {
                        this.setLanguage(lang);
                    }
                    switcher.classList.remove('open');
                    return;
                }
                option = option.parentElement;
            }
        });
    }

    /**
     * Get language metadata
     * Dynamically generates metadata from language file or uses fallback
     */
    getLangMeta(langCode) {
        // Try to get metadata from loaded translation
        if (this.translations[langCode] && this.translations[langCode].meta) {
            const meta = this.translations[langCode].meta;
            return {
                name: meta.name || langCode.toUpperCase(),
                nativeName: meta.nativeName || meta.name || langCode.toUpperCase(),
                flag: meta.flag || this.getDefaultFlag(langCode)
            };
        }
        
        // Fallback to default metadata
        return {
            name: langCode.toUpperCase(),
            nativeName: langCode.toUpperCase(),
            flag: this.getDefaultFlag(langCode)
        };
    }

    /**
     * Get default flag emoji for language code
     */
    getDefaultFlag(langCode) {
        const flagMap = {
            'ja': '🇯🇵', 'en': '🇺🇸', 'zh': '🇨🇳', 'ko': '🇰🇷', 
            'fr': '🇫🇷', 'de': '🇩🇪', 'es': '🇪🇸', 'it': '🇮🇹',
            'pt': '🇵🇹', 'ru': '🇷🇺', 'ar': '🇸🇦', 'hi': '🇮🇳',
            'th': '🇹🇭', 'vi': '🇻🇳', 'id': '🇮🇩', 'ms': '🇲🇾',
            'tl': '🇵🇭', 'nl': '🇳🇱', 'sv': '🇸🇪', 'no': '🇳🇴',
            'da': '🇩🇰', 'fi': '🇫🇮', 'pl': '🇵🇱', 'cs': '🇨🇿',
            'sk': '🇸🇰', 'hu': '🇭🇺', 'ro': '🇷🇴', 'bg': '🇧🇬',
            'hr': '🇭🇷', 'sr': '🇷🇸', 'sl': '🇸🇮', 'et': '🇪🇪',
            'lv': '🇱🇻', 'lt': '🇱🇹', 'mt': '🇲🇹', 'cy': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
            'ga': '🇮🇪', 'gd': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'br': '🇫🇷', 'eu': '🇪🇸',
            'ca': '🇪🇸', 'gl': '🇪🇸', 'oc': '🇫🇷', 'co': '🇫🇷'
        };
        return flagMap[langCode] || '🌐';
    }


    /**
     * Update language switcher display
     */
    updateLanguageSwitcher() {
        const selectorBtn = document.querySelector('.language-selector-btn');
        const dropdown = document.querySelector('.language-dropdown');
        
        if (selectorBtn) {
            const currentLang = this.getLangMeta(this.currentLanguage);
            selectorBtn.querySelector('.language-flag').textContent = currentLang.flag;
            selectorBtn.querySelector('.language-name').textContent = currentLang.name;
        }
        
        if (dropdown) {
            // Update active state in dropdown options
            const options = dropdown.querySelectorAll('.language-option');
            options.forEach(option => {
                const lang = option.getAttribute('data-lang');
                const isActive = lang === this.currentLanguage;
                
                if (isActive) {
                    option.classList.add('active');
                    // Add check icon if not already present
                    if (!option.querySelector('.language-check')) {
                        option.innerHTML += '<i class="fas fa-check language-check"></i>';
                    }
                } else {
                    option.classList.remove('active');
                    // Remove check icon if present
                    const checkIcon = option.querySelector('.language-check');
                    if (checkIcon) {
                        checkIcon.remove();
                    }
                }
            });
        }
    }

    /**
     * Update all translatable content on the page
     */
    updatePageContent() {
        // Update elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                const translation = this.translate(key);
                
                // Handle different types of content
                if (element.tagName === 'INPUT' && (element.type === 'submit' || element.type === 'button')) {
                    element.value = translation;
                } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translation;
                } else {
                    element.innerHTML = translation;
                }
            }
        });

        // Update elements with data-i18n-attr for attributes
        const attrElements = document.querySelectorAll('[data-i18n-attr]');
        attrElements.forEach(element => {
            const attrData = element.getAttribute('data-i18n-attr');
            try {
                const attrs = JSON.parse(attrData);
                Object.entries(attrs).forEach(([attr, key]) => {
                    const translation = this.translate(key);
                    element.setAttribute(attr, translation);
                });
            } catch (error) {
                console.warn('Invalid data-i18n-attr format:', attrData);
            }
        });

        // Update page title and meta tags
        this.updatePageMeta();
    }

    /**
     * Update page title and meta information
     */
    updatePageMeta() {
        const currentPage = this.getCurrentPage();
        
        if (currentPage) {
            const pageTitle = this.translate(`${currentPage}.title`);
            const baseTitle = this.translate('header.title');
            
            if (pageTitle && pageTitle !== `${currentPage}.title`) {
                document.title = `${baseTitle} - ${pageTitle}`;
            }
        }
    }

    /**
     * Get current page identifier
     */
    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '') || 'home';
        
        const pageMap = {
            '': 'home',
            'index': 'home',
            'home': 'home',
            'rules': 'rules',
            'guidelines': 'guidelines',
            'support': 'support'
        };
        
        return pageMap[page] || null;
    }

    /**
     * Get current language code
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }


    /**
     * Check if i18n is initialized
     */
    isInitialized() {
        return this.initialized;
    }
}

// Create global instance
window.i18n = new I18n();

// Auto-initialize when DOM is ready
function initializeI18n() {
    if (window.i18n) {
        window.i18n.init();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeI18n);
} else if (document.readyState === 'interactive') {
    // DOM is loaded but resources may still be loading
    setTimeout(initializeI18n, 50);
} else {
    // DOM and resources are loaded
    initializeI18n();
}

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18n;
}