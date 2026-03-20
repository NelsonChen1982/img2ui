<script setup>
import { useAuthStore } from '../../stores/auth'
import { useSettingsStore } from '../../stores/settings'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()

function t(obj) {
  if (!obj) return ''
  return obj[settingsStore.lang] || obj.en || ''
}

const I = {
  login: { zh: '登入', en: 'Sign in', ja: 'ログイン' },
}
</script>

<template>
  <button
    @click="authStore.showAuthModal('login')"
    style="padding:5px 10px;border-radius:6px;border:1px solid #ddd;background:#fff;color:#555;font-size:10px;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap;display:flex;align-items:center;gap:4px"
  >
    {{ t(I.login) }}
  </button>
</template>
