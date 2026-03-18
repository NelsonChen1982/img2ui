## 1. Store 擴展

- [x] 1.1 在 pipeline store 新增 `uiKitName` state 欄位，預設值 "img2ui UI Kit"

## 2. Cover Hero 區塊 — 結構與底色

- [x] 2.1 在 StepResult.vue template 最上方（現有 description 之前）新增 Cover Hero 容器 div，使用 DS-driven 的 primary gradient 底色（支援 isDark 切換）
- [x] 2.2 建立左右兩欄的 flex layout（左側標題區、右側預覽區）

## 3. 左側 — 標題與 Icon Badges

- [x] 3.1 新增可編輯的 UI Kit 名稱 input，綁定 pipeline store 的 `uiKitName`，使用 DS.typo Display 字級 + DS.fonts.heading 字體
- [x] 3.2 新增三個垂直排列的 icon badges（JSON Format / Coding Agent SKILL / Preview HTML），使用 Font Awesome icons + DS 語義色

## 4. 右側 — 元件預覽圖

- [x] 4.1 建立 16:9 容器，內部排列精簡版的 6 個代表性元件（navbar、hero、card ×2、button row、input + alert），全部使用 DS tokens 渲染
- [x] 4.2 對預覽容器套用 CSS transform rotate(-12deg) + scale + 父層 overflow hidden，做出旋轉出血效果

## 5. 響應式處理

- [x] 5.1 手機版（≤768px）封面改為單欄佈局：標題 + badges 保留，元件預覽圖隱藏或移至下方
