<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useSettingsStore } from '../../stores/settings'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const open = ref(false)

function t(obj) {
  if (!obj) return ''
  return obj[settingsStore.lang] || obj.en || ''
}

const I = {
  credits: { zh: '點數', en: 'Credits', ja: 'クレジット' },
  logout: { zh: '登出', en: 'Sign out', ja: 'ログアウト' },
}

function toggle() { open.value = !open.value }
function close() { open.value = false }
function handleLogout() {
  authStore.logout()
  close()
}
</script>

<template>
  <div style="position:relative" @mouseleave="close">
    <!-- User card trigger: avatar + name + credits -->
    <button
      @click="toggle"
      style="display:flex;align-items:center;gap:6px;padding:3px 8px 3px 4px;border-radius:6px;border:1px solid #ddd;background:#fff;cursor:pointer;transition:all .2s"
    >
      <img
        v-if="authStore.user?.avatarUrl"
        :src="authStore.user.avatarUrl"
        :alt="authStore.user.name"
        style="width:18px;height:18px;border-radius:50%;object-fit:cover"
      />
      <div
        v-else
        style="width:18px;height:18px;border-radius:50%;background:#e8e8e8;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;color:#888"
      >
        {{ (authStore.user?.name || '?')[0].toUpperCase() }}
      </div>
      <span style="font-size:10px;color:#555;font-weight:500;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        {{ authStore.user?.name || authStore.user?.email || '' }}
      </span>
      <span style="font-size:9px;color:#999;border-left:1px solid #e8e8e8;padding-left:5px;white-space:nowrap">
        {{ authStore.creditsBalance }} pt
      </span>
    </button>

    <!-- Dropdown -->
    <div
      v-if="open"
      style="position:absolute;right:0;top:100%;background:#fff;border-radius:10px;border:1px solid #e8e8e8;box-shadow:0 8px 24px rgba(0,0,0,.08);min-width:160px;padding:6px 0;padding-top:12px;z-index:100"
    >
      <!-- Credits -->
      <div style="padding:8px 14px;border-bottom:1px solid #f0f0f0">
        <div style="font-size:10px;color:#999;margin-bottom:2px">{{ t(I.credits) }}</div>
        <div style="font-size:16px;font-weight:700;color:#333">{{ authStore.creditsBalance }}</div>
      </div>

      <!-- Logout -->
      <button
        @click="handleLogout"
        style="width:100%;text-align:left;padding:8px 14px;background:none;border:none;font-size:11px;color:#888;cursor:pointer;transition:color .2s"
      >
        <i class="fa-duotone fa-thin fa-arrow-right-from-bracket" style="margin-right:5px"></i>
        {{ t(I.logout) }}
      </button>
    </div>
  </div>
</template>
