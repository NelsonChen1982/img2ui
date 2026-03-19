/**
 * Settings Store
 * Manages user preferences persisted to localStorage and cookies
 * - Language (cookie: pic2ui_lang)
 * - Provider selection (localStorage: pic2ui_provider)
 * - CSS Framework (localStorage: pic2ui_cssfw)
 * - Email (cookie: pic2ui_email)
 * - Dev settings (localStorage: pic2ui_dev)
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { I } from '../data/i18n.js';
import { DAILY_LIMIT } from '../data/constants.js';

/**
 * Cookie utilities
 */
function getCookie(name) {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie =
    name +
    '=' +
    encodeURIComponent(value) +
    ';expires=' +
    date.toUTCString() +
    ';path=/;SameSite=Lax';
}

export const useSettingsStore = defineStore('settings', () => {
  // State
  const lang = ref('zh');
  const selectedProvider = ref('gpt4o');
  const selectedCSSFramework = ref('tailwind');
  const email = ref('');
  const rateLimitRemaining = ref(DAILY_LIMIT);
  const devSettings = ref({
    base: import.meta.env.VITE_API_BASE || '',
    anthropic: '',
    openai: '',
    gemini: '',
    openrouter: '',
  });

  /**
   * Detect language from cookie, browser, or IP
   * @returns {string} Detected language code
   */
  function detectLang() {
    // 1. Check cookie first
    const saved = getCookie('pic2ui_lang');
    if (saved && ['zh', 'en', 'ja'].includes(saved)) {
      return saved;
    }

    // 2. Check browser language
    const browserLang = (
      navigator.language ||
      navigator.userLanguage ||
      'en'
    ).toLowerCase();
    if (browserLang.startsWith('zh')) return 'zh';
    if (browserLang.startsWith('ja')) return 'ja';

    // 3. Async IP-based detection (will update later if different)
    tryIPDetect();
    return 'en';
  }

  /**
   * Attempt to detect language from IP geolocation
   */
  function tryIPDetect() {
    fetch('https://ipapi.co/json/', { mode: 'cors' })
      .then((r) => r.json())
      .then((data) => {
        const countryCode = data.country_code;
        let detected = 'en';

        if (['TW', 'HK', 'MO', 'CN'].includes(countryCode)) {
          detected = 'zh';
        } else if (countryCode === 'JP') {
          detected = 'ja';
        }

        // Only update if different and no explicit cookie set
        if (detected !== lang.value && !getCookie('pic2ui_lang')) {
          setLang(detected);
        }
      })
      .catch(() => {
        // Silent fail for IP detection
      });
  }

  /**
   * Set language and persist to cookie
   * @param {string} l - Language code
   */
  function setLang(l) {
    if (!['zh', 'en', 'ja'].includes(l)) return;
    lang.value = l;
    setCookie('pic2ui_lang', l, 365);
  }

  /**
   * Set provider and persist to localStorage
   * @param {string} p - Provider code
   */
  function setProvider(p) {
    selectedProvider.value = p;
    localStorage.setItem('pic2ui_provider', p);
  }

  /**
   * Set CSS framework and persist to localStorage
   * @param {string} fw - Framework code
   */
  function setCSSFW(fw) {
    if (!['tailwind', 'vanilla', 'cssvar'].includes(fw)) return;
    selectedCSSFramework.value = fw;
    localStorage.setItem('pic2ui_cssfw', fw);
  }

  /**
   * Set and validate email, persist to cookie
   * @param {string} emailVal - Email address
   * @returns {boolean} Whether email is valid
   */
  function setEmail(emailVal) {
    const trimmed = emailVal.trim();
    if (!isValidEmail(trimmed)) {
      return false;
    }
    email.value = trimmed;
    setCookie('pic2ui_email', trimmed, 365);
    return true;
  }

  /**
   * Load dev settings from localStorage
   */
  function loadDevSettings() {
    try {
      const raw = localStorage.getItem('pic2ui_dev');
      if (raw) {
        const parsed = JSON.parse(raw);
        devSettings.value = {
          base: parsed.base || '',
          anthropic: parsed.anthropic || '',
          openai: parsed.openai || '',
          gemini: parsed.gemini || '',
        };
      }
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Save dev settings to localStorage
   * @param {Object} settings - Dev settings object
   */
  function saveDevSettings(settings) {
    devSettings.value = {
      base: settings.base || '',
      anthropic: settings.anthropic || '',
      openai: settings.openai || '',
      gemini: settings.gemini || '',
    };
    localStorage.setItem('pic2ui_dev', JSON.stringify(devSettings.value));
  }

  /**
   * Get API keys for dev mode (non-empty values)
   * @returns {Object} Object with populated API keys
   */
  function getDevKeys() {
    return {
      base: devSettings.value.base || undefined,
      anthropic: devSettings.value.anthropic || undefined,
      openai: devSettings.value.openai || undefined,
      gemini: devSettings.value.gemini || undefined,
    };
  }

  /**
   * Translation helper function
   * Returns a function that selects translation by current language
   * @param {Object} obj - Translation object {zh: '...', en: '...', ja: '...'}
   * @returns {string} Translated text or fallback
   */
  const t = (obj) => {
    if (!obj) return '';
    return obj[lang.value] || obj.en || '';
  };

  /**
   * Check if email is valid format
   * @param {string} str - Email string
   * @returns {boolean} Whether email is valid
   */
  function isValidEmail(str) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(str.trim());
  }

  /**
   * Initialize store with persisted values
   */
  function init() {
    // Language
    lang.value = detectLang();

    // Provider
    const savedProvider = localStorage.getItem('pic2ui_provider');
    if (savedProvider) {
      selectedProvider.value = savedProvider;
    }

    // CSS Framework
    const savedFW = localStorage.getItem('pic2ui_cssfw');
    if (savedFW) {
      selectedCSSFramework.value = savedFW;
    }

    // Email
    const savedEmail = getCookie('pic2ui_email');
    if (savedEmail) {
      email.value = savedEmail;
    }

    // Dev settings
    loadDevSettings();
  }

  return {
    // State
    lang,
    selectedProvider,
    selectedCSSFramework,
    email,
    rateLimitRemaining,
    devSettings,

    // Actions
    detectLang,
    setLang,
    setProvider,
    setCSSFW,
    setEmail,
    loadDevSettings,
    saveDevSettings,
    getDevKeys,
    init,

    // Getters
    t,
    isValidEmail,
  };
});
