<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { useAuthStore } from '../stores/auth'
import GalleryCard from '../components/ui/GalleryCard.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()

const items = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const limit = 20

const hasMore = computed(() => items.value.length < total.value)

// Delete confirm dialog
const deleteTarget = ref(null)
const deleting = ref(false)

const t = {
  title: { zh: '我的設計', en: 'My Designs', ja: 'マイデザイン' },
  subtitle: { zh: '管理你的 Design System 作品', en: 'Manage your Design System creations', ja: 'デザインシステム作品を管理' },
  loadMore: { zh: '載入更多', en: 'Load More', ja: 'もっと見る' },
  empty: { zh: '尚無設計作品', en: 'No designs yet', ja: 'まだデザインがありません' },
  emptyHint: { zh: '前往首頁上傳圖片，開始製作你的第一個 UI Kit', en: 'Upload an image on the home page to create your first UI Kit', ja: 'ホームページで画像をアップロードして最初のUIキットを作りましょう' },
  loginRequired: { zh: '請先登入', en: 'Please sign in first', ja: 'まずログインしてください' },
  goHome: { zh: '前往首頁', en: 'Go to Home', ja: 'ホームへ' },
  deleteTitle: { zh: '刪除設計', en: 'Delete Design', ja: 'デザインを削除' },
  deleteMsg: { zh: '確定要刪除此設計嗎？此操作無法復原。', en: 'Are you sure you want to delete this design? This cannot be undone.', ja: 'このデザインを削除してもよろしいですか？この操作は元に戻せません。' },
  cancel: { zh: '取消', en: 'Cancel', ja: 'キャンセル' },
  delete: { zh: '刪除', en: 'Delete', ja: '削除' },
}

function tl(obj) { return obj?.[settingsStore.lang] || obj?.en || '' }

function getApiHeaders() {
  const hdrs = { 'Content-Type': 'application/json' }
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) hdrs['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY
  return hdrs
}

async function fetchMyDesigns(append = false) {
  if (!authStore.isAuthenticated) return
  loading.value = true
  const apiBase = import.meta.env.VITE_API_BASE || ''
  if (!apiBase) { loading.value = false; return }

  const params = new URLSearchParams()
  params.set('page', String(page.value))
  params.set('limit', String(limit))
  params.set('sort', 'latest')
  params.set('mine', '1')
  params.set('user_id', authStore.user.id)
  params.set('session_token', authStore.sessionToken)

  try {
    const hdrs = {}
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) hdrs['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY
    const resp = await fetch(`${apiBase}/api/gallery?${params}`, { headers: hdrs })
    if (resp.ok) {
      const data = await resp.json()
      if (append) {
        items.value = [...items.value, ...(data.items || [])]
      } else {
        items.value = data.items || []
      }
      total.value = data.total || 0
    }
  } catch { /* silent */ }
  loading.value = false
}

function loadMore() {
  page.value++
  fetchMyDesigns(true)
}

async function toggleVisibility(item) {
  const apiBase = import.meta.env.VITE_API_BASE || ''
  if (!apiBase || !authStore.isAuthenticated) return
  const newVis = item.visibility === 'public' ? 'private' : 'public'
  try {
    await fetch(`${apiBase}/api/gallery/${item.id}`, {
      method: 'PATCH',
      headers: getApiHeaders(),
      body: JSON.stringify({ user_id: authStore.user.id, session_token: authStore.sessionToken, visibility: newVis }),
    })
    item.visibility = newVis
  } catch { /* silent */ }
}

// Delete: show confirm dialog
function requestDelete(item) {
  deleteTarget.value = item
}

async function confirmDelete() {
  const item = deleteTarget.value
  if (!item) return
  deleting.value = true
  const apiBase = import.meta.env.VITE_API_BASE || ''
  if (!apiBase || !authStore.isAuthenticated) { deleting.value = false; return }
  try {
    const resp = await fetch(`${apiBase}/api/gallery/${item.id}`, {
      method: 'DELETE',
      headers: getApiHeaders(),
      body: JSON.stringify({ user_id: authStore.user.id, session_token: authStore.sessionToken }),
    })
    if (resp.ok) {
      items.value = items.value.filter(i => i.id !== item.id)
      total.value = Math.max(0, total.value - 1)
    }
  } catch { /* silent */ }
  deleting.value = false
  deleteTarget.value = null
}

function cancelDelete() {
  deleteTarget.value = null
}

watch(() => authStore.isAuthenticated, (val) => {
  if (!val) return
  fetchMyDesigns()
})

onMounted(() => {
  if (authStore.isAuthenticated) {
    fetchMyDesigns()
  }
})
</script>

<template>
  <main style="flex:1;padding:36px 28px;overflow:auto;background:#fafafa;">
    <div style="max-width:1200px;margin:0 auto;">
      <!-- Not logged in -->
      <div v-if="!authStore.isAuthenticated" style="text-align:center;padding:80px 0;">
        <div style="font-size:40px;color:#ccc;margin-bottom:16px;"><i class="fa-duotone fa-thin fa-lock"></i></div>
        <h2 style="font-size:18px;font-weight:700;color:#333;margin-bottom:8px;">{{ tl(t.loginRequired) }}</h2>
        <p style="color:#888;font-size:14px;">
          <button @click="authStore.showAuthModal('register')" style="color:#3b82f6;background:none;border:none;cursor:pointer;font-size:14px;text-decoration:underline;">
            Sign in
          </button>
        </p>
      </div>

      <!-- Logged in -->
      <template v-else>
        <h1 style="font-size:24px;font-weight:800;color:#222;margin-bottom:4px;">{{ tl(t.title) }}</h1>
        <p style="color:#888;font-size:14px;margin-bottom:24px;">{{ tl(t.subtitle) }}</p>

        <!-- Loading -->
        <div v-if="loading && items.length === 0" style="text-align:center;padding:60px 0;color:#aaa;font-size:14px;">
          <i class="fa-duotone fa-thin fa-spinner-third fa-spin" style="margin-right:6px;"></i>Loading...
        </div>

        <!-- Empty -->
        <div v-else-if="items.length === 0" style="text-align:center;padding:60px 0;">
          <div style="font-size:40px;color:#ddd;margin-bottom:12px;"><i class="fa-duotone fa-thin fa-palette"></i></div>
          <p style="color:#bbb;font-size:14px;margin-bottom:12px;">{{ tl(t.empty) }}</p>
          <p style="color:#ccc;font-size:12px;margin-bottom:16px;">{{ tl(t.emptyHint) }}</p>
          <router-link to="/" style="color:#3b82f6;font-size:13px;font-weight:500;">{{ tl(t.goHome) }}</router-link>
        </div>

        <!-- Grid -->
        <div v-else class="my-grid">
          <div v-for="item in items" :key="item.id" class="my-card-wrap">
            <GalleryCard
              :item="item"
              :show-visibility-toggle="false"
            />
            <!-- Owner actions below card -->
            <div class="my-card-actions">
              <button class="my-card-vis-btn" :class="item.visibility === 'private' ? 'my-card-vis-btn--private' : ''" @click="toggleVisibility(item)">
                <i :class="item.visibility === 'public' ? 'fa-duotone fa-thin fa-globe' : 'fa-duotone fa-thin fa-lock'" style="font-size:10px;"></i>
                {{ item.visibility === 'public' ? 'Public' : 'Private' }}
              </button>
              <button class="my-card-delete" @click="requestDelete(item)">
                <i class="fa-duotone fa-thin fa-trash" style="font-size:10px;"></i>
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Load More -->
        <div v-if="hasMore" style="text-align:center;padding:24px 0;">
          <button class="load-more-btn" @click="loadMore" :disabled="loading">
            <i v-if="loading" class="fa-duotone fa-thin fa-spinner-third fa-spin" style="margin-right:6px;"></i>
            {{ tl(t.loadMore) }}
          </button>
        </div>
      </template>
    </div>
  </main>

  <!-- Delete Confirm Dialog -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="deleteTarget" class="confirm-overlay" @click.self="cancelDelete">
        <div class="confirm-dialog">
          <div class="confirm-icon">
            <i class="fa-duotone fa-thin fa-triangle-exclamation" style="font-size:24px;color:#ef4444;"></i>
          </div>
          <h3 class="confirm-title">{{ tl(t.deleteTitle) }}</h3>
          <p class="confirm-msg">{{ tl(t.deleteMsg) }}</p>
          <div class="confirm-actions">
            <button class="confirm-btn confirm-btn--cancel" @click="cancelDelete">
              {{ tl(t.cancel) }}
            </button>
            <button class="confirm-btn confirm-btn--danger" @click="confirmDelete" :disabled="deleting">
              <i v-if="deleting" class="fa-duotone fa-thin fa-spinner-third fa-spin" style="margin-right:4px;"></i>
              {{ tl(t.delete) }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.my-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
}
.my-card-wrap {
  display: flex;
  flex-direction: column;
}
.my-card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px 0;
}
.my-card-vis-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #d1fae5;
  border-radius: 6px;
  background: #f0fdf4;
  font-size: 10px;
  font-weight: 500;
  color: #22c55e;
  cursor: pointer;
  transition: all .15s;
}
.my-card-vis-btn:hover {
  background: #dcfce7;
}
.my-card-vis-btn--private {
  border-color: #fef3c7;
  background: #fffbeb;
  color: #f59e0b;
}
.my-card-vis-btn--private:hover {
  background: #fef3c7;
}
.my-card-delete {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: #fff;
  font-size: 10px;
  color: #ccc;
  cursor: pointer;
  transition: all .15s;
}
.my-card-delete:hover {
  color: #ef4444;
  border-color: #fecaca;
  background: #fef2f2;
}

.load-more-btn {
  padding: 10px 28px; border: 1px solid #e8e8e8; border-radius: 10px;
  background: #fff; font-size: 13px; font-weight: 600; color: #555;
  cursor: pointer; transition: all .15s;
}
.load-more-btn:hover { background: #f5f5f5; }
.load-more-btn:disabled { opacity: .5; cursor: not-allowed; }

/* ── Confirm Dialog ── */
.confirm-overlay {
  position: fixed; inset: 0; z-index: 99999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.4); backdrop-filter: blur(3px);
}
.confirm-dialog {
  background: #fff; border-radius: 16px; padding: 28px 24px 20px;
  max-width: 340px; width: 90%;
  box-shadow: 0 16px 48px rgba(0,0,0,.15);
  text-align: center;
}
.confirm-icon {
  margin-bottom: 12px;
}
.confirm-title {
  font-size: 16px; font-weight: 700; color: #222; margin: 0 0 8px;
}
.confirm-msg {
  font-size: 13px; color: #888; line-height: 1.5; margin: 0 0 20px;
}
.confirm-actions {
  display: flex; gap: 10px;
}
.confirm-btn {
  flex: 1; padding: 10px 0; border-radius: 10px; border: none;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all .15s;
  display: flex; align-items: center; justify-content: center;
}
.confirm-btn--cancel {
  background: #f5f5f5; color: #666;
}
.confirm-btn--cancel:hover { background: #eee; }
.confirm-btn--danger {
  background: #ef4444; color: #fff;
}
.confirm-btn--danger:hover { background: #dc2626; }
.confirm-btn--danger:disabled { opacity: .6; cursor: wait; }

/* Transition */
.modal-enter-active, .modal-leave-active {
  transition: opacity .2s ease;
}
.modal-enter-active .confirm-dialog, .modal-leave-active .confirm-dialog {
  transition: transform .2s ease, opacity .2s ease;
}
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .confirm-dialog { transform: scale(0.95); }

@media (max-width: 1024px) {
  .my-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .my-grid { grid-template-columns: 1fr; gap: 12px; }
}
</style>
