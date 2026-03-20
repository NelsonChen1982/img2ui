<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'
import GalleryCard from '../components/ui/GalleryCard.vue'

const settingsStore = useSettingsStore()

const items = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const limit = 20

// Filters
const activeHue = ref('')
const activeTheme = ref('') // '' | 'light' | 'dark'
const activeSort = ref('latest') // 'latest' | 'downloads'
const hueOptions = [
  { value: 'red', label: 'Red', color: '#ef4444' },
  { value: 'orange', label: 'Orange', color: '#f97316' },
  { value: 'yellow', label: 'Yellow', color: '#eab308' },
  { value: 'green', label: 'Green', color: '#22c55e' },
  { value: 'cyan', label: 'Cyan', color: '#06b6d4' },
  { value: 'blue', label: 'Blue', color: '#3b82f6' },
  { value: 'purple', label: 'Purple', color: '#a855f7' },
  { value: 'neutral', label: 'Neutral', color: '#888888' },
]

const hasMore = computed(() => items.value.length < total.value)

const t = {
  title: { zh: 'Gallery', en: 'Gallery', ja: 'ギャラリー' },
  subtitle: { zh: '探索社群創作的 Design System', en: 'Explore design systems created by the community', ja: 'コミュニティが作成したデザインシステムを探索' },
  loadMore: { zh: '載入更多', en: 'Load More', ja: 'もっと見る' },
  empty: { zh: '尚無設計作品', en: 'No designs yet', ja: 'まだデザインがありません' },
  latest: { zh: '最新', en: 'Latest', ja: '最新' },
  mostDownloads: { zh: '最多下載', en: 'Most Downloads', ja: 'ダウンロード順' },
  all: { zh: '全部', en: 'All', ja: 'すべて' },
  light: { zh: 'Light', en: 'Light', ja: 'ライト' },
  dark: { zh: 'Dark', en: 'Dark', ja: 'ダーク' },
}

function tl(obj) { return obj?.[settingsStore.lang] || obj?.en || '' }

async function fetchGallery(append = false) {
  loading.value = true
  const apiBase = import.meta.env.VITE_API_BASE || ''
  if (!apiBase) { loading.value = false; return }

  const params = new URLSearchParams()
  params.set('page', String(page.value))
  params.set('limit', String(limit))
  params.set('sort', activeSort.value === 'downloads' ? 'downloads' : 'latest')
  if (activeHue.value) params.set('hue', activeHue.value)
  if (activeTheme.value) params.set('theme', activeTheme.value)

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
  fetchGallery(true)
}

function toggleHue(hue) {
  activeHue.value = activeHue.value === hue ? '' : hue
}

function resetAndFetch() {
  page.value = 1
  items.value = []
  fetchGallery()
}

// Re-fetch when filters change
watch([activeHue, activeTheme, activeSort], resetAndFetch)

onMounted(() => fetchGallery())
</script>

<template>
  <main style="flex:1;padding:36px 28px;overflow:auto;background:#fafafa;">
    <div style="max-width:1200px;margin:0 auto;">
      <!-- Header -->
      <h1 style="font-size:24px;font-weight:800;color:#222;margin-bottom:4px;">{{ tl(t.title) }}</h1>
      <p style="color:#888;font-size:14px;margin-bottom:24px;">{{ tl(t.subtitle) }}</p>

      <!-- Filters -->
      <div class="gallery-filters">
        <!-- Color pills -->
        <div class="gallery-filters__hues">
          <button
            v-for="h in hueOptions" :key="h.value"
            class="hue-pill"
            :class="{ 'hue-pill--active': activeHue === h.value }"
            @click="toggleHue(h.value)"
          >
            <span class="hue-pill__dot" :style="{ background: h.color }"></span>
            {{ h.label }}
          </button>
        </div>

        <!-- Controls row -->
        <div class="gallery-filters__controls">
          <!-- Theme -->
          <div class="gallery-filter-group">
            <button
              v-for="opt in [{ v: '', l: t.all }, { v: 'light', l: t.light }, { v: 'dark', l: t.dark }]" :key="opt.v"
              class="filter-btn"
              :class="{ 'filter-btn--active': activeTheme === opt.v }"
              @click="activeTheme = opt.v"
            >{{ tl(opt.l) }}</button>
          </div>

          <!-- Sort -->
          <div class="gallery-filter-group">
            <button
              class="filter-btn"
              :class="{ 'filter-btn--active': activeSort === 'latest' }"
              @click="activeSort = 'latest'"
            >{{ tl(t.latest) }}</button>
            <button
              class="filter-btn"
              :class="{ 'filter-btn--active': activeSort === 'downloads' }"
              @click="activeSort = 'downloads'"
            >{{ tl(t.mostDownloads) }}</button>
          </div>

        </div>
      </div>

      <!-- Grid -->
      <div v-if="loading && items.length === 0" style="text-align:center;padding:60px 0;color:#aaa;font-size:14px;">
        <i class="fa-duotone fa-thin fa-spinner-third fa-spin" style="margin-right:6px;"></i>Loading...
      </div>
      <div v-else-if="items.length === 0" style="text-align:center;padding:60px 0;color:#bbb;font-size:14px;">
        {{ tl(t.empty) }}
      </div>
      <div v-else class="gallery-grid">
        <GalleryCard
          v-for="item in items" :key="item.id"
          :item="item"
          :show-visibility-toggle="false"
          @toggle-visibility="toggleVisibility"
        />
      </div>

      <!-- Load More -->
      <div v-if="hasMore" style="text-align:center;padding:24px 0;">
        <button class="load-more-btn" @click="loadMore" :disabled="loading">
          <i v-if="loading" class="fa-duotone fa-thin fa-spinner-third fa-spin" style="margin-right:6px;"></i>
          {{ tl(t.loadMore) }}
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.gallery-filters {
  margin-bottom: 24px;
}
.gallery-filters__hues {
  display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;
}
.hue-pill {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: 999px;
  border: 1px solid #e8e8e8; background: #fff;
  font-size: 11px; font-weight: 500; color: #666; cursor: pointer;
  transition: all .15s;
}
.hue-pill:hover { border-color: #ccc; background: #fafafa; }
.hue-pill--active { border-color: #333; background: #111; color: #fff; }
.hue-pill__dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}

.gallery-filters__controls {
  display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
}
.gallery-filter-group {
  display: flex; gap: 2px; background: #f0f0f0; border-radius: 8px; padding: 2px;
}
.filter-btn {
  padding: 5px 12px; border: none; border-radius: 6px;
  background: transparent; font-size: 11px; font-weight: 500;
  color: #888; cursor: pointer; transition: all .15s;
}
.filter-btn--active {
  background: #fff; color: #222; box-shadow: 0 1px 3px rgba(0,0,0,.08);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
}

.load-more-btn {
  padding: 10px 28px; border: 1px solid #e8e8e8; border-radius: 10px;
  background: #fff; font-size: 13px; font-weight: 600; color: #555;
  cursor: pointer; transition: all .15s;
}
.load-more-btn:hover { background: #f5f5f5; }
.load-more-btn:disabled { opacity: .5; cursor: not-allowed; }

@media (max-width: 1024px) {
  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .gallery-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .gallery-filters__controls {
    flex-direction: column; align-items: stretch;
  }
}
</style>
