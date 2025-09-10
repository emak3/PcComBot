# PC Community - Multilingual Support

This directory contains language files for the PC Community website's internationalization (i18n) system.

## Current Languages

- 🇯🇵 **Japanese (ja)** - `ja.json` - Default language
- 🇺🇸 **English (en)** - `en.json` - Complete translation

## How to Add a New Language

### Step 1: Create Language File

1. Copy `_template.json` and rename it to `[language_code].json`
   - Use ISO 639-1 language codes (e.g., `fr.json`, `de.json`, `es.json`, `zh.json`)
   
2. Update the `meta` section:
   ```json
   "meta": {
     "name": "Français",           // Language name in English
     "nativeName": "Français",     // Language name in native language
     "code": "fr",                 // ISO language code
     "flag": "🇫🇷"                // Flag emoji
   }
   ```

### Step 2: Translate Content

1. **Translate VALUES only** - Keep all keys (before the colon) exactly the same
2. **DO NOT translate**:
   - Keys (e.g., `"common.home"`)
   - HTML tags (e.g., `<strong>`, `<br>`)
   - Placeholder variables (e.g., `{variable}`)
   - URLs and file paths
   - Brand names like "PC Community", "Discord"

3. **Example**:
   ```json
   // ✅ CORRECT
   "common": {
     "home": "Accueil",        // French translation
     "rules": "Règles"         // French translation
   }
   
   // ❌ WRONG - Don't translate keys
   "commun": {
     "accueil": "Accueil"
   }
   ```

### Step 3: Add Language to System

1. Open `/js/i18n.js`
2. Find the `knownLanguages` array (around line 45)
3. Add your language code:
   ```javascript
   const knownLanguages = ['ja', 'en', 'fr']; // Add 'fr' for French
   ```

### Step 4: Test Your Translation

1. Open the website in a browser
2. Use the language switcher in the top navigation
3. Select your new language
4. Check that all text displays correctly
5. Test on all pages: Home, Rules, Guidelines, Support

## Translation Guidelines

### Tone and Style
- **Professional but friendly** - Match the community's welcoming atmosphere
- **Clear and concise** - Technical documentation should be easy to understand
- **Consistent terminology** - Use the same terms throughout (create a glossary)

### Technical Terms
- Keep technical terms in English when commonly used (e.g., "Discord", "GitHub")
- Translate user interface elements (buttons, labels, messages)
- For programming terms, use what's most natural in your language

### Cultural Adaptation
- Adapt examples to your culture when appropriate
- Keep time formats and number formats consistent with local conventions
- Maintain the original meaning while making it natural in your language

## File Structure

Each language file follows this structure:

```
{
  "meta": { ... },           // Language metadata
  "common": { ... },         // Common UI elements
  "header": { ... },         // Header/navigation
  "footer": { ... },         // Footer content
  "home": { ... },           // Homepage content
  "rules": { ... },          // Community rules
  "guidelines": { ... },     // Question guidelines
  "support": { ... },        // Support/contact form
  "language_switcher": { ... } // Language switcher
}
```

## Key Translation Sections

### Critical Sections (Translate First)
1. `common` - Basic UI elements used everywhere
2. `header` - Navigation menu
3. `footer` - Footer links and text
4. `language_switcher` - Language selection interface

### Content Sections
1. `home` - Homepage content
2. `rules` - Community rules (important for moderation)
3. `guidelines` - Question guidelines (important for users)
4. `support` - Contact form and help

## Testing Checklist

- [ ] Language appears in the language switcher dropdown
- [ ] All navigation links are translated
- [ ] All form labels and placeholders work
- [ ] Error messages and notifications are translated
- [ ] Footer links and text are correct
- [ ] Page titles update correctly
- [ ] No missing translations (check browser console for warnings)

## Need Help?

- Check existing translations (`ja.json` and `en.json`) for reference
- Follow the structure exactly - the system is very strict about key names
- Test frequently while translating
- Ask in the Discord if you need clarification on specific terms

## Contributing

1. Fork the repository
2. Add your language file
3. Test thoroughly
4. Submit a pull request
5. We'll review and merge your contribution

Thank you for helping make PC Community accessible to more people! 🌍