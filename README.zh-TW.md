<div align="center">
  <img src="src/assets/logo.jpg" alt="img2ui" width="120" style="border-radius: 16px;" />

  # img2ui

  **將任意圖片轉換為完整的 Design System**

  上傳截圖、設計稿、照片或插圖 — 自動產出配色、字體、間距 token，以及 25 種 UI 元件。

  [線上 Demo](#) &nbsp;|&nbsp; [English](README.md) &nbsp;|&nbsp; [日本語](README.ja.md)
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
8. **匯出**為 JSON、SKILL.md（供 coding agent 使用）或獨立 HTML

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
- **OpenAI** — GPT-4o / GPT-4o-mini
- **Google** — Gemini Flash

> 圖片僅在本地瀏覽器端處理。只有標注區域會傳送至你選擇的 AI 供應商。

## 架構

```
圖片上傳
  → K-means 色彩萃取（降取樣至 160×160）
  → 語義插槽分配（HSL 啟發式評分）
  → Design System 推導（字體、間距、圓角、陰影）
  → [選填] Canvas 標注 + LLM Vision 分析
  → UI Kit 渲染（25 種元件類型）
  → 匯出（JSON / SKILL.md / HTML）
```

**技術棧：** Vue 3（Composition API）· Pinia · Vite · Vanilla CSS

**核心設計決策：**
- **無需伺服器** — 全部在瀏覽器內執行（AI 呼叫為瀏覽器直連 API）
- **三層 AI 降級** — 群組分析 → 個別分析 → 像素級本地啟發式推斷
- **Design System 由圖片計算產出**，非手動配置 — 完全由輸入圖片推導
- **IR 優先** — 中間表示層是核心資產，實現設計 ↔ 程式碼雙向同步

## 匯出格式

| 格式 | 說明 |
|------|------|
| **JSON** | 完整 Design System + 元件定義的結構化 IR |
| **SKILL.md** | 供 coding agent 使用的 Markdown 規範（Claude Code、Cursor 等） |
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
worker/            # 選用的 Cloudflare Worker（頻率限制）
docs/              # 設計文件
```

## 授權

MIT
