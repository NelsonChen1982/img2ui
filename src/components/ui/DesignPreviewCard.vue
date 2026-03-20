<script setup>
/**
 * DesignPreviewCard
 * Mini UI Kit preview rendered from a design system tokens object.
 * Extracted from StepResult's cover-preview-frame.
 * Accepts either a full DS object or a colors-only object.
 */
import { computed } from 'vue'
import { isLight, ha, darken, safeTextColor } from '../../services/colorUtils'

const props = defineProps({
  ds: { type: Object, required: true },
})

// Normalize: accept either full DS or just { colors }
const colors = computed(() => props.ds?.colors || {})
const isDark = computed(() => props.ds?.isDark || false)
const radius = computed(() => props.ds?.radius || {})
const shadows = computed(() => props.ds?.shadows || {})
const fonts = computed(() => props.ds?.fonts || {})
const allColors = computed(() => props.ds?.allColors || Object.values(colors.value).filter(c => c && c.startsWith('#')))

const cardBg = computed(() => isDark.value ? ha('#ffffff', 0.06) : '#fff')
const hFF = computed(() => `'${fonts.value?.heading || 'Inter'}',-apple-system,sans-serif`)
const bFF = computed(() => `'${fonts.value?.body || 'Inter'}',-apple-system,sans-serif`)
const pt = computed(() => safeTextColor(colors.value.primary || '#333', isLight(colors.value.primary || '#333') ? (colors.value.text || '#333') : '#fff'))
</script>

<template>
  <div
    class="dp-frame"
    :style="{
      background: colors.surface || '#f0f0f0',
      borderRadius: radius?.lg || '12px',
      boxShadow: shadows?.lg || '0 6px 20px rgba(0,0,0,.1)',
    }"
  >
    <!-- Row 1: Palette + Typography -->
    <div style="display:flex;gap:5px;padding:7px 7px 0;">
      <!-- Swatches -->
      <div :style="{ flex: '0 0 auto', background: cardBg, border: `1px solid ${colors.border || '#e0e0e0'}`, borderRadius: radius?.md || '6px', padding: '5px', boxShadow: shadows?.sm }">
        <div :style="{ fontSize: '4.5px', fontWeight: 700, color: ha(colors.text || '#333', 0.45), letterSpacing: '0.05em', marginBottom: '4px' }">PALETTE</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px;">
          <div v-for="(hex, ci) in allColors.slice(0, 8)" :key="'sw'+ci" :style="{ width: '13px', height: '13px', borderRadius: radius?.sm || '3px', background: hex, border: `1px solid ${ha(colors.text || '#333', 0.1)}` }"></div>
        </div>
        <div style="display:flex;gap:2px;margin-top:3px;">
          <div v-for="sk in ['primary','secondary','accent','success','warning','danger']" :key="sk" :style="{ flex: 1, height: '5px', borderRadius: '2px', background: colors[sk] || '#ccc' }"></div>
        </div>
      </div>

      <!-- Typography -->
      <div :style="{ flex: 1, minWidth: 0, background: cardBg, border: `1px solid ${colors.border || '#e0e0e0'}`, borderRadius: radius?.md || '6px', padding: '5px', boxShadow: shadows?.sm }">
        <div :style="{ fontSize: '4.5px', fontWeight: 700, color: ha(colors.text || '#333', 0.45), letterSpacing: '0.05em', marginBottom: '3px' }">TYPOGRAPHY</div>
        <div :style="{ fontSize: '9px', fontWeight: 800, color: colors.text, lineHeight: 1.2, marginBottom: '2px', fontFamily: hFF }">Display</div>
        <div :style="{ fontSize: '7px', fontWeight: 700, color: colors.text, lineHeight: 1.3, marginBottom: '1px', fontFamily: hFF }">Heading</div>
        <div :style="{ fontSize: '4.5px', color: ha(colors.text || '#333', 0.6), lineHeight: 1.5, fontFamily: bFF }">Body text sample. <span :style="{ color: colors.primary, fontWeight: 600 }">Link</span></div>
      </div>
    </div>

    <!-- Row 2: Buttons + Form -->
    <div style="display:flex;gap:5px;padding:5px 7px 0;">
      <!-- Buttons + Badges -->
      <div :style="{ flex: 1, background: cardBg, border: `1px solid ${colors.border || '#e0e0e0'}`, borderRadius: radius?.md || '6px', padding: '5px', boxShadow: shadows?.sm }">
        <div :style="{ fontSize: '4.5px', fontWeight: 700, color: ha(colors.text || '#333', 0.45), letterSpacing: '0.05em', marginBottom: '4px' }">BUTTONS</div>
        <div style="display:flex;flex-wrap:wrap;gap:2px;">
          <div :style="{ padding: '2.5px 7px', borderRadius: radius?.sm || '3px', background: colors.primary, color: safeTextColor(colors.primary || '#333', '#fff'), fontSize: '4.5px', fontWeight: 700 }">Primary</div>
          <div :style="{ padding: '2.5px 7px', borderRadius: radius?.sm || '3px', background: colors.secondary || colors.primary, color: safeTextColor(colors.secondary || colors.primary || '#333', '#fff'), fontSize: '4.5px', fontWeight: 700 }">Secondary</div>
          <div :style="{ padding: '2.5px 7px', borderRadius: radius?.sm || '3px', border: `1px solid ${colors.primary}`, color: colors.primary, fontSize: '4.5px', fontWeight: 600, background: 'transparent' }">Outline</div>
        </div>
        <div style="display:flex;gap:2px;margin-top:4px;">
          <div :style="{ padding: '1.5px 4px', borderRadius: '999px', background: colors.success || '#22c55e', color: '#fff', fontSize: '3.5px', fontWeight: 600 }">Active</div>
          <div :style="{ padding: '1.5px 4px', borderRadius: '999px', background: colors.warning || '#f59e0b', color: '#fff', fontSize: '3.5px', fontWeight: 600 }">Pending</div>
          <div :style="{ padding: '1.5px 4px', borderRadius: '999px', background: colors.danger || '#ef4444', color: '#fff', fontSize: '3.5px', fontWeight: 600 }">Error</div>
        </div>
      </div>

      <!-- Form -->
      <div :style="{ flex: 1, background: cardBg, border: `1px solid ${colors.border || '#e0e0e0'}`, borderRadius: radius?.md || '6px', padding: '5px', boxShadow: shadows?.sm }">
        <div :style="{ fontSize: '4.5px', fontWeight: 700, color: ha(colors.text || '#333', 0.45), letterSpacing: '0.05em', marginBottom: '4px' }">FORM</div>
        <div :style="{ height: '11px', border: `1px solid ${colors.border || '#e0e0e0'}`, borderRadius: radius?.sm || '3px', background: isDark ? ha('#ffffff', 0.04) : '#fff', display: 'flex', alignItems: 'center', paddingLeft: '4px', marginBottom: '3px' }">
          <span :style="{ fontSize: '4px', color: ha(colors.text || '#333', 0.35) }">Enter email...</span>
        </div>
        <div style="display:flex;align-items:center;gap:5px;">
          <div style="display:flex;align-items:center;gap:2px;">
            <div :style="{ width: '7px', height: '7px', borderRadius: '2px', background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }">
              <span style="color:#fff;font-size:4.5px;line-height:1;">&#10003;</span>
            </div>
            <span :style="{ fontSize: '4px', color: colors.text }">Agree</span>
          </div>
          <div :style="{ width: '14px', height: '8px', borderRadius: '999px', background: colors.primary, position: 'relative' }">
            <div style="width:6px;height:6px;border-radius:50%;background:#fff;position:absolute;top:1px;right:1px;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Row 3: Cards -->
    <div style="display:flex;gap:5px;padding:5px 7px 0;">
      <div v-for="i in 3" :key="'crd'+i" :style="{ flex: 1, background: cardBg, border: `1px solid ${colors.border || '#e0e0e0'}`, borderRadius: radius?.md || '6px', overflow: 'hidden', boxShadow: shadows?.sm }">
        <div :style="{ width: '100%', height: '14px', background: i === 1 ? `linear-gradient(135deg, ${colors.primary}, ${darken(colors.primary || '#333', 30)})` : i === 2 ? ha(colors.secondary || colors.primary || '#333', 0.15) : ha(colors.accent || colors.primary || '#333', 0.15) }"></div>
        <div style="padding:4px;">
          <div :style="{ fontSize: '4.5px', fontWeight: 700, color: colors.text, marginBottom: '1px', fontFamily: hFF }">{{ ['Featured','Popular','New'][i-1] }}</div>
          <div :style="{ fontSize: '3.5px', color: ha(colors.text || '#333', 0.5), lineHeight: 1.4, marginBottom: '3px' }">Description text.</div>
          <div :style="{ display: 'inline-block', padding: '1.5px 5px', borderRadius: radius?.sm || '3px', background: i === 1 ? colors.primary : 'transparent', border: i !== 1 ? `1px solid ${colors.border || '#e0e0e0'}` : 'none', color: i === 1 ? safeTextColor(colors.primary || '#333', '#fff') : colors.primary, fontSize: '3.5px', fontWeight: 600 }">{{ i === 1 ? 'Action' : 'Details' }}</div>
        </div>
      </div>
    </div>

    <!-- Row 4: Navbar -->
    <div style="padding:4px 7px 5px;">
      <div :style="{ background: colors.primary, padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius?.sm || '3px' }">
        <div :style="{ fontWeight: 800, color: pt, fontSize: '6px', fontFamily: hFF }">Brand</div>
        <div style="display:flex;gap:5px;">
          <span v-for="l in ['Home','About','Blog']" :key="l" :style="{ fontSize: '4.5px', color: ha(pt, 0.7) }">{{ l }}</span>
        </div>
        <div :style="{ padding: '1.5px 4px', borderRadius: radius?.sm || '3px', background: pt, color: colors.primary, fontSize: '4px', fontWeight: 700 }">CTA</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dp-frame {
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}
</style>
