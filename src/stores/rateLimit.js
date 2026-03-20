/**
 * Rate Limit Store
 * Manages daily usage tracking for the email gate
 * - Tracks daily usage count
 * - Resets count when date changes
 * - Provides remaining uses and rate limit status
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
const DAILY_LIMIT = 30; // legacy constant, kept for backward compat

export const useRateLimitStore = defineStore('rateLimit', () => {
  // State
  const usageData = ref({
    count: 0,
    date: '',
  });

  /**
   * Get today's date as ISO string (YYYY-MM-DD)
   * @returns {string} Today's date
   */
  function getTodayDate() {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Load daily usage from localStorage
   * @returns {Object} Usage object {count, date}
   */
  function getDailyUsage() {
    try {
      const raw = localStorage.getItem('pic2ui_usage');
      if (!raw) {
        return { count: 0, date: '' };
      }

      const data = JSON.parse(raw);
      const today = getTodayDate();

      // Reset if date changed
      if (data.date !== today) {
        return { count: 0, date: today };
      }

      return data;
    } catch (e) {
      return { count: 0, date: '' };
    }
  }

  /**
   * Increment usage counter and save to localStorage
   * @returns {Object} Updated usage object
   */
  function incrementUsage() {
    const today = getTodayDate();
    const usage = getDailyUsage();

    if (usage.date !== today) {
      usage.count = 1;
      usage.date = today;
    } else {
      usage.count++;
    }

    usageData.value = usage;
    localStorage.setItem('pic2ui_usage', JSON.stringify(usage));
    return usage;
  }

  /**
   * Get remaining uses for today
   * @returns {number} Number of remaining uses
   */
  function getRemainingUses() {
    const usage = getDailyUsage();
    const today = getTodayDate();

    if (usage.date !== today) {
      return DAILY_LIMIT;
    }

    return Math.max(0, DAILY_LIMIT - usage.count);
  }

  /**
   * Check if rate limited (no remaining uses)
   * @returns {boolean} Whether user is rate limited
   */
  function isRateLimited() {
    return getRemainingUses() <= 0;
  }

  /**
   * Initialize store by loading current usage
   */
  function init() {
    usageData.value = getDailyUsage();
  }

  // Computed properties

  /**
   * Current daily usage count
   */
  const currentCount = computed(() => usageData.value.count);

  /**
   * Current usage date
   */
  const currentDate = computed(() => usageData.value.date);

  /**
   * Remaining uses
   */
  const remaining = computed(() => getRemainingUses());

  /**
   * Is rate limited
   */
  const limited = computed(() => isRateLimited());

  return {
    // State
    usageData,

    // Actions
    getDailyUsage,
    incrementUsage,
    getRemainingUses,
    isRateLimited,
    init,
    getTodayDate,

    // Computed
    currentCount,
    currentDate,
    remaining,
    limited,
  };
});
