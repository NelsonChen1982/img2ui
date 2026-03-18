## Why

UI Kit 產品缺少一張品牌封面圖。市面上主流 UI Kit（Shadcn、Ant Design、Material）都有封面來傳達設計系統的視覺個性。img2ui 已經萃取完整的 design tokens，但 Result 頁面直接跳到元件列表，缺乏一個「第一印象」的展示區塊。加上封面圖後，使用者可以一眼感受到自己設計系統的配色與字體風格。

## What Changes

- 在 Step 7 (Result) 頁面最上方新增一個 **Cover Hero Section**，使用 DS tokens（colors、typo、fonts、radius、shadows）動態渲染
- 封面左側顯示 UI Kit 名稱（可編輯 input，預設 "img2ui UI Kit"）+ 三個垂直排列的 icon badges（JSON Format、Coding SKILL、Preview HTML），icon 顏色取自 DS
- 封面右側放一張 **16:9 元件預覽圖**：自動精選 6 個代表性元件（navbar、hero、card、button、input、alert）排成一個完整頁面，用 CSS transform rotate + overflow hidden 做出旋轉出血效果
- 封面底色使用 DS-driven 的 primary 淡化色或 gradient
- UI Kit 名稱欄位存入 pipeline store，供後續下載/分享使用

## Capabilities

### New Capabilities
- `cover-hero`: 封面 Hero 區塊的渲染邏輯、元件預覽圖編排、名稱輸入互動

### Modified Capabilities
<!-- 無既有 spec 需要修改 -->

## Impact

- **StepResult.vue** — template 最上方插入封面區塊
- **pipeline store** — 新增 `uiKitName` state 欄位（預設 "img2ui UI Kit"）
- **uiKitRenderer.js** — 可能新增 `buildCoverPreview(DS)` 函式來生成精選元件的 mini 預覽 HTML（為後續下載做準備）
- **無新依賴** — 純 CSS transform，不需 html2canvas 或其他套件
