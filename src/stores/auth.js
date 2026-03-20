/**
 * Auth Store
 * Manages user authentication (Google/GitHub OAuth) and credits
 * - User session state
 * - Login/logout flows
 * - Credits balance and generation tracking
 * - Anonymous design claiming
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function getDevHeaders() {
  const hdrs = { 'Content-Type': 'application/json' };
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) {
    hdrs['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY;
  }
  return hdrs;
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null); // { id, email, name, avatarUrl }
  const sessionToken = ref('');
  const creditsBalance = ref(0);
  const canGenerate = ref(true);
  const authModalVisible = ref(false);
  const authModalReason = ref(''); // 'second_use' | 'download' | ''
  const loading = ref(false);
  const anonIp = ref(''); // IP shown in gate message

  // Computed
  const isAuthenticated = computed(() => !!user.value);

  /**
   * Check if anonymous user has used their free pass today
   */
  function hasUsedFreePass() {
    const stored = localStorage.getItem('pic2ui_free_used');
    if (!stored) return false;
    const today = new Date().toISOString().slice(0, 10);
    return stored === today;
  }

  /**
   * Mark anonymous free pass as used today (client + server)
   */
  async function markFreePassUsed() {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('pic2ui_free_used', today);
    if (API_BASE) {
      try {
        await fetch(`${API_BASE}/api/anon-check`, { method: 'POST', headers: getDevHeaders() });
      } catch { /* silent */ }
    }
  }

  /**
   * Check server-side anonymous usage (fallback if localStorage cleared)
   * @returns {{ used: boolean, ip?: string }}
   */
  async function checkAnonServer() {
    if (!API_BASE) return { used: false };
    try {
      const resp = await fetch(`${API_BASE}/api/anon-check`, { headers: getDevHeaders() });
      const data = await resp.json();
      return { used: data.used === true, ip: data.ip };
    } catch { return { used: false }; }
  }

  /**
   * Determine if user can start a new generation
   * @returns {{ allowed: boolean, reason?: string, isFreePass?: boolean }}
   */
  async function canStartGeneration() {
    if (isAuthenticated.value) {
      return canGenerate.value
        ? { allowed: true }
        : { allowed: false, reason: 'no_credits' };
    }
    // Anonymous
    if (!hasUsedFreePass()) {
      const { used: serverUsed, ip } = await checkAnonServer();
      if (!serverUsed) return { allowed: true, isFreePass: true };
      localStorage.setItem('pic2ui_free_used', 'true');
      if (ip) anonIp.value = ip;
    }
    return { allowed: false, reason: 'login_required' };
  }

  /**
   * Show auth modal with reason
   */
  function showAuthModal(reason = '') {
    authModalReason.value = reason;
    authModalVisible.value = true;
  }

  function hideAuthModal() {
    authModalVisible.value = false;
    authModalReason.value = '';
  }

  /**
   * Handle Google login via GSI id_token
   */
  async function loginWithGoogle(idToken) {
    if (!API_BASE) return;
    loading.value = true;
    try {
      const resp = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: getDevHeaders(),
        body: JSON.stringify({ id_token: idToken }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || data.error);
      applyAuthResponse(data);
      hideAuthModal();
      await claimAnonymousDesigns();
    } catch (err) {
      console.error('[auth] Google login failed:', err.message);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Initiate GitHub OAuth flow (redirects to GitHub)
   */
  function loginWithGitHub() {
    if (!API_BASE) return;
    window.location.href = `${API_BASE}/api/auth/github`;
  }

  /**
   * Handle GitHub OAuth callback (parse auth data from URL fragment)
   */
  function handleGitHubCallback() {
    const hash = window.location.hash;
    if (hash.startsWith('#auth=')) {
      try {
        const data = JSON.parse(decodeURIComponent(hash.slice(6)));
        applyAuthResponse(data);
        window.history.replaceState(null, '', window.location.pathname);
        claimAnonymousDesigns();
        return true;
      } catch (err) {
        console.error('[auth] GitHub callback parse error:', err);
      }
    }
    if (hash.startsWith('#auth_error=')) {
      console.error('[auth] GitHub error:', decodeURIComponent(hash.slice(12)));
      window.history.replaceState(null, '', window.location.pathname);
    }
    return false;
  }

  /**
   * Apply auth response from server
   */
  function applyAuthResponse(data) {
    user.value = data.user;
    sessionToken.value = data.sessionToken;
    creditsBalance.value = data.credits?.balance || 0;
    canGenerate.value = data.credits?.canGenerate ?? true;
    // Persist to localStorage
    localStorage.setItem('pic2ui_auth', JSON.stringify({
      user: data.user,
      sessionToken: data.sessionToken,
    }));
  }

  /**
   * Logout
   */
  function logout() {
    user.value = null;
    sessionToken.value = '';
    creditsBalance.value = 0;
    canGenerate.value = true;
    localStorage.removeItem('pic2ui_auth');
  }

  /**
   * Refresh credits balance from server
   */
  async function refreshCredits() {
    if (!isAuthenticated.value || !API_BASE) return;
    try {
      const resp = await fetch(
        `${API_BASE}/api/credits?user_id=${user.value.id}&session_token=${encodeURIComponent(sessionToken.value)}`,
        { headers: getDevHeaders() }
      );
      const data = await resp.json();
      if (resp.ok) {
        creditsBalance.value = data.balance;
        canGenerate.value = data.canGenerate;
      }
    } catch { /* silent */ }
  }

  /**
   * Claim anonymous designs stored in localStorage
   */
  async function claimAnonymousDesigns() {
    if (!isAuthenticated.value || !API_BASE) return;
    const raw = localStorage.getItem('pic2ui_anon_designs');
    if (!raw) return;
    try {
      const designIds = JSON.parse(raw);
      if (!Array.isArray(designIds) || designIds.length === 0) return;
      await fetch(`${API_BASE}/api/claim-designs`, {
        method: 'POST',
        headers: getDevHeaders(),
        body: JSON.stringify({
          user_id: user.value.id,
          session_token: sessionToken.value,
          design_ids: designIds,
        }),
      });
      localStorage.removeItem('pic2ui_anon_designs');
    } catch { /* silent */ }
  }

  /**
   * Store an anonymous design ID for later claiming
   */
  function storeAnonDesignId(designId) {
    const raw = localStorage.getItem('pic2ui_anon_designs');
    const ids = raw ? JSON.parse(raw) : [];
    if (!ids.includes(designId)) {
      ids.push(designId);
      localStorage.setItem('pic2ui_anon_designs', JSON.stringify(ids));
    }
  }

  /**
   * Restore session from localStorage on init
   */
  function init() {
    // Check GitHub callback first
    handleGitHubCallback();

    // Restore persisted session
    try {
      const raw = localStorage.getItem('pic2ui_auth');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.user && data.sessionToken) {
          user.value = data.user;
          sessionToken.value = data.sessionToken;
          // Refresh credits in background
          refreshCredits();
        }
      }
    } catch { /* silent */ }
  }

  /**
   * Get the Google Client ID for GSI
   */
  function getGoogleClientId() {
    return GOOGLE_CLIENT_ID;
  }

  return {
    // State
    user,
    sessionToken,
    creditsBalance,
    canGenerate,
    authModalVisible,
    authModalReason,
    loading,
    anonIp,

    // Computed
    isAuthenticated,

    // Actions
    hasUsedFreePass,
    markFreePassUsed,
    canStartGeneration,
    showAuthModal,
    hideAuthModal,
    loginWithGoogle,
    loginWithGitHub,
    handleGitHubCallback,
    logout,
    refreshCredits,
    claimAnonymousDesigns,
    storeAnonDesignId,
    init,
    getGoogleClientId,
  };
});
