## Context

Step 7 (Result) 目前直接顯示 25 個元件的 UI Kit render + JSON panel。缺少一個品牌封面區塊來展示設計系統的整體視覺個性。所有 DS tokens（colors、typo、fonts、radius、shadows、spacing）已在 pipeline store 的 `DS` 物件中就緒。

## Goals / Non-Goals

**Goals:**
- 在 Result 頁面最上方渲染一個動態封面 Hero，100% 使用 DS tokens 驅動
- 支援使用者自訂 UI Kit 名稱（可選填，預設 "img2ui UI Kit"）
- 右側元件預覽圖呈現設計系統的「真實樣貌」

**Non-Goals:**
- 本階段不處理下載/分享功能（後續迭代）
- 不引入 html2canvas 或任何新依賴
- 不修改現有 25 個元件的渲染邏輯

## Decisions

### 1. 封面渲染在 StepResult.vue 的 Vue template 中（非 uiKitRenderer.js）

**選擇：** 直接在 Vue template 中使用 DS reactive binding 渲染封面。

**理由：** 封面需要 inline editable 的名稱 input，這在 v-html 中無法做到。先在 Vue 中實現，後續需要下載時再抽取成 renderer 函式。

**替代方案：** 在 uiKitRenderer.js 中新增 `renderCover()` — 下載時有優勢，但名稱輸入的互動性受限。留給後續迭代。

### 2. 元件預覽圖使用純 CSS transform 實現旋轉出血效果

**選擇：** 一個 16:9 的 `<div>` 容器，內部排列精選元件的 mini HTML，外層 `overflow: hidden` + `transform: rotate(-12deg) scale(0.55)` 做出傾斜出血感。

**理由：** 零依賴、即時響應 DS 變化、效能好。元件是「活的」HTML 不是截圖。

### 3. 精選 6 個元件固定編排

**選擇：** 固定使用 navbar、hero、card（×2）、button row、input + alert，不根據使用者標注動態調整。

**理由：** 穩定的視覺編排比動態內容更重要。這 6 個元件能覆蓋幾乎所有 DS token 的展示（primary、secondary、accent、surface、text、border、radius、shadows、typography 全用到）。

### 4. UI Kit 名稱存在 pipeline store

**選擇：** 在 pipeline store 新增 `uiKitName` 欄位，預設 `"img2ui UI Kit"`。

**理由：** 後續下載/分享功能需要讀取這個值。放在 pipeline store 跟其他 DS 資料一起，保持 single source of truth。

### 5. 封面底色使用 primary 淡化 + gradient

**選擇：** `background: linear-gradient(135deg, primary 10% opacity, secondary 5% opacity)`，dark mode 時用 surface 深色底 + primary 微光。

**理由：** 比純 surface 更有品牌感，但不會搶過右側的元件預覽。

## Risks / Trade-offs

- **[右側預覽在小螢幕上可能太擠]** → 手機版改為封面只顯示標題 + badges，隱藏元件預覽圖，或讓預覽圖移到標題下方
- **[精選元件的 mini HTML 需要簡化版渲染]** → 不直接複用 uiKitRenderer 的完整渲染，而是寫精簡版的 inline HTML，避免過度複雜
