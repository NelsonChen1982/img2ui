<div align="center">
  <img src="src/assets/logo.jpg" alt="img2ui" width="120" style="border-radius: 16px;" />

  # img2ui <sup>v0.1-beta</sup>

  **將任意圖片轉換為完整的 Design System**

  上傳截圖、設計稿、照片或插圖 — 自動產出配色、字體、間距 token，以及 25 種 UI 元件。

  [線上 Demo](https://img2ui.com) &nbsp;|&nbsp; [English](README.md) &nbsp;|&nbsp; [日本語](README.ja.md)
</div>

---

## 功能介紹

img2ui 是一個純瀏覽器端工具，能將任何圖片反向工程為可用的 Design System：

1. **上傳**任意圖片（PNG / JPG / WebP）
2. **萃取**色盤 — 透過 K-means 量化演算法
3. **對應**語義色彩插槽（主色、副色、強調色、成功、警告、錯誤⋯）
4. **推導**字體層級、間距比例、圓角與陰影 token
5. **標注**（選填）— 在圖片上框選區域並指定元件類型
6. **分析**標注區域 — 支援多家 Vision LLM（Claude、GPT-4o、Gemini）
7. **渲染**完整 UI Kit，包含 25 種元件類型
8. **匯出**為 JSON、SKILL.md（供 coding agent 使用）、DESIGN.md（供 Google Stitch 使用）、Figma Plugin JSON 或獨立 HTML

### 25 種元件類型

| 分類 | 元件 |
|------|------|
| **佈局** | Navbar、Hero / Banner、Section、Sidebar、Footer |
| **導航** | Tab Bar、Breadcrumb、Pagination、Stepper |
| **內容** | Card、List / Item、Table、Image / Media、Rich Text |
| **表單** | Button、Text Input、Checkbox / Radio、Select / Dropdown、Search Bar、Toggle / Switch |
| **回饋** | Alert / Banner、Toast、Modal / Dialog、Tooltip、Badge / Tag、Avatar |

## 快速開始

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建置生產版本
npm run build
```

### AI 功能（選用）

如需啟用 LLM 元件分析，可在應用程式設定面板（開發者模式）中配置 API Key。支援的供應商：

- **Anthropic** — Claude Haiku / Sonnet
- **OpenAI** — GPT-4o / GPT-4o-mini / GPT-5 系列 / o4-mini
- **Google** — Gemini Flash
- **OpenRouter** — Hunter Alpha（免費）、Grok 4.1 Fast、Qwen 3.5（35B / 9B / Flash）

> 圖片僅在本地瀏覽器端處理。只有標注區域會傳送至你選擇的 AI 供應商。

## 架構

```
圖片上傳
  → K-means 色彩萃取（降取樣至 160×160）
  → 語義插槽分配（HSL 啟發式評分）
  → Design System 推導（字體、間距、圓角、陰影）
  → [選填] Canvas 標注 + LLM Vision 分析
  → UI Kit 渲染（25 種元件類型）
  → 匯出（JSON / SKILL.md / DESIGN.md / Figma JSON / HTML）
```

**技術棧：** Vue 3（Composition API）· Pinia · Vite · Vanilla CSS

**核心設計決策：**
- **無需伺服器** — 全部在瀏覽器內執行（AI 呼叫為瀏覽器直連 API）
- **三層 AI 降級** — 群組分析 → 個別分析 → 像素級本地啟發式推斷
- **Design System 由圖片計算產出**，非手動配置 — 完全由輸入圖片推導
- **多供應商 AI** — 支援 4 家供應商，透過直連 API 與 OpenRouter，附開發者模式模型比較工具
- **IR 優先** — 中間表示層是核心資產，實現設計 ↔ 程式碼雙向同步

## 技術依賴與替代方案

| 依賴項 | 目前使用 | 可替換？ | 說明 |
|--------|---------|:--------:|------|
| **圖示** | Font Awesome Pro (Duotone) | 可 | 可改用 emoji 或任何 icon set |
| **AI 供應商** | Anthropic / OpenAI / Google / OpenRouter | 可 | 任選其一，或完全不用 AI — 本地啟發式推斷仍可運作 |
| **Worker** | Cloudflare Worker + KV + D1 + R2 | 可 | 僅用於頻率限制與圖片儲存，可自行部署任何後端替代 |
| **部署** | Cloudflare Pages | 可 | 純靜態 SPA，可部署至任何平台 |

> 核心功能（色彩萃取 → Design System → UI Kit）完全在瀏覽器端執行，無需任何外部依賴。

## 匯出格式

| 格式 | 說明 |
|------|------|
| **JSON** | 完整 Design System + 元件定義的結構化 IR |
| **SKILL.md** | 供 coding agent 使用的 Markdown 規範（Claude Code、Cursor 等） |
| **SKILL ZIP** | 打包雙主題 token、分析紀錄與模組化 skill 檔案的壓縮封裝 |
| **DESIGN.md** | 自然語言設計系統描述，供 [Google Stitch](https://stitch.withgoogle.com/) 畫面生成使用 |
| **HTML** | 獨立預覽頁面，包含所有渲染元件 |

## 專案結構

```
src/
├── components/
│   ├── steps/     # 六步驟精靈（上傳 → 辨識 → 配色 → 標注 → 產出中 → 結果）
│   └── ui/        # 共用 UI（WizardBar、DropdownMenu、ActionFooter）
├── services/      # 業務邏輯（AI、色彩萃取、DS 建構、渲染器、匯出）
├── stores/        # Pinia stores（pipeline、settings、rateLimit）
└── data/          # 元件類型、metadata、骨架、i18n、常數
worker/            # Cloudflare Worker（頻率限制、R2 圖片儲存、D1 使用紀錄）
docs/              # 設計文件
```

## 更新紀錄

| 版本 | 里程碑 |
|------|--------|
| **v0.1.1-beta** | Figma Plugin JSON 匯出、第三步驟略過標註捷徑、底部列版面重新設計 |
| **v0.1-beta** | 程式碼結構重構、雙主題（淺色/深色）色盤生成 |
| **v0.0.4** | OpenRouter 整合 — Hunter Alpha、Grok 4.1 Fast、Qwen 3.5 系列 |
| **v0.0.3** | Cloudflare Worker 整合 — 頻率限制、R2 圖片儲存、Session Token、Turnstile 驗證 |
| **v0.0.2** | 模型選擇、開發者模式繞過、除錯日誌、響應式 UI 增強 |
| **v0.0.1** | 初始發佈 — 六步驟精靈流程、K-means 色彩萃取、25 種元件類型、多供應商 LLM 分析、JSON / SKILL.md / HTML 匯出 |

## 開發路線

- [ ] **社群 Gallery** — 瀏覽其他使用者建立的 Design System 作品
- [ ] **智慧圖片分類** — 自動判斷上傳圖片為 UI 截圖或照片，依結果決定是否提供標注流程
- [ ] **上傳圖片吸色** — 在配色與字體步驟中，直接從上傳的圖片挑選顏色
- [ ] **Figma 原生剪貼簿** — 無需 Plugin，直接將 design token 貼上到 Figma（透過 fig-kiwi 二進位格式）
- [ ] **npm / npx 安裝套件** — 封裝為可安裝的 CLI skill 套件，讓使用者可透過 `npx img2ui` 直接在終端產生 Design System

## 授權

MIT
