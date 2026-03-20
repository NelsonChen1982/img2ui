<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useSettingsStore } from '../../stores/settings'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const open = ref(false)
const historyOpen = ref(false)
const historyLoading = ref(false)
const historyItems = ref([])

function t(obj) {
  if (!obj) return ''
  return obj[settingsStore.lang] || obj.en || ''
}

const I = {
  credits: { zh: '點數', en: 'Credits', ja: 'クレジット' },
  history: { zh: '點數紀錄', en: 'Credit History', ja: 'クレジット履歴' },
  logout: { zh: '登出', en: 'Sign out', ja: 'ログアウト' },
  noRecords: { zh: '尚無紀錄', en: 'No records yet', ja: '記録なし' },
}

const typeLabels = {
  welcome: { zh: '註冊獎勵', en: 'Welcome Bonus', ja: '登録ボーナス' },
  daily_refill: { zh: '每日登入', en: 'Daily Login', ja: '毎日ログイン' },
  generation: { zh: 'UI Kit 產出', en: 'UI Kit Generation', ja: 'UIキット生成' },
  admin_grant: { zh: '管理員加值', en: 'Admin Grant', ja: '管理者付与' },
  purchase: { zh: '購買', en: 'Purchase', ja: '購入' },
}

function toggle() { open.value = !open.value }
function close() { open.value = false }
function handleLogout() {
  authStore.logout()
  close()
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts + 'Z')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${mi}`
}

async function openHistory() {
  close()
  historyOpen.value = true
  historyLoading.value = true
  historyItems.value = []

  const apiBase = import.meta.env.VITE_API_BASE || ''
  if (!apiBase || !authStore.user?.id) {
    historyLoading.value = false
    return
  }

  try {
    const hdrs = {}
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) hdrs['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY
    const resp = await fetch(
      `${apiBase}/api/credits-history?user_id=${authStore.user.id}&session_token=${encodeURIComponent(authStore.sessionToken)}`,
      { headers: hdrs }
    )
    if (resp.ok) {
      const data = await resp.json()
      historyItems.value = data.items || []
    }
  } catch { /* silent */ }
  historyLoading.value = false
}
</script>

<template>
  <div style="position:relative" @mouseleave="close">
    <!-- User card trigger -->
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
      style="position:absolute;right:0;top:100%;background:#fff;border-radius:10px;border:1px solid #e8e8e8;box-shadow:0 8px 24px rgba(0,0,0,.08);min-width:180px;padding:6px 0;padding-top:12px;z-index:100"
    >
      <!-- User info -->
      <div style="padding:6px 14px 8px;border-bottom:1px solid #f0f0f0">
        <div style="font-size:11px;font-weight:600;color:#333">{{ authStore.user?.name || '' }}</div>
        <div style="font-size:10px;color:#aaa;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ authStore.user?.email || '' }}</div>
      </div>

      <!-- Credits -->
      <div style="padding:8px 14px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:10px;color:#999">{{ t(I.credits) }}</div>
          <div style="font-size:16px;font-weight:700;color:#333">{{ authStore.creditsBalance }}</div>
        </div>
      </div>

      <!-- History -->
      <button
        @click="openHistory"
        style="width:100%;text-align:left;padding:8px 14px;background:none;border:none;font-size:11px;color:#666;cursor:pointer;transition:color .2s;border-bottom:1px solid #f0f0f0"
      >
        <i class="fa-duotone fa-thin fa-clock-rotate-left" style="margin-right:5px"></i>
        {{ t(I.history) }}
      </button>

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

  <!-- Credits History Modal -->
  <Teleport to="body">
    <div
      v-if="historyOpen"
      style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);backdrop-filter:blur(3px)"
      @click.self="historyOpen = false"
    >
      <div style="background:#fff;border-radius:16px;padding:24px;max-width:360px;width:90%;max-height:70vh;display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(0,0,0,.12)">
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <h3 style="font-size:16px;font-weight:700;color:#222;margin:0">{{ t(I.history) }}</h3>
          <button @click="historyOpen = false" style="background:none;border:none;font-size:16px;color:#aaa;cursor:pointer;padding:4px">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- List -->
        <div style="flex:1;overflow-y:auto;min-height:0">
          <div v-if="historyLoading" style="text-align:center;padding:24px;color:#aaa;font-size:13px">
            <i class="fa-duotone fa-thin fa-spinner-third fa-spin" style="margin-right:6px"></i>Loading...
          </div>

          <div v-else-if="historyItems.length === 0" style="text-align:center;padding:24px;color:#bbb;font-size:13px">
            {{ t(I.noRecords) }}
          </div>

          <div v-else>
            <div
              v-for="item in historyItems"
              :key="item.id"
              style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f5f5f5"
            >
              <div style="min-width:0;flex:1;margin-right:12px">
                <div style="font-size:12px;font-weight:500;color:#444">
                  {{ t(typeLabels[item.type] || { en: item.type }) }}
                </div>
                <div style="font-size:10px;color:#bbb;margin-top:2px">
                  {{ formatTime(item.created_at) }}
                </div>
                <!-- Design ID from memo (format: "label:designId") -->
                <div
                  v-if="item.type === 'generation' && item.memo?.includes(':')"
                  style="font-size:9px;color:#ccc;margin-top:3px;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                  :title="item.memo.split(':').slice(1).join(':')"
                >
                  # {{ item.memo.split(':').slice(1).join(':') }}
                </div>
              </div>
              <div
                style="font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;flex-shrink:0"
                :style="{ color: item.amount >= 0 ? '#22c55e' : '#ef4444' }"
              >
                {{ item.amount >= 0 ? '+' : '' }}{{ item.amount }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
