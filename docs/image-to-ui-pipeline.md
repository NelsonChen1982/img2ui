# Image → UI Pipeline：概念設計文件

> 目標：上傳圖片 → AI 辨識整合 → 產出原始結構 → 預覽網頁
> 可延伸為 open source coding agent skill

---

## 核心概念

把「圖像」反向工程成可操作的 UI 結構（IR），讓 coding agent 或 Figma 可以直接消費這份資料。

**與現有工具（v0、screenshot-to-code）的差異：**
- 中間有明確的 IR 層，可被 agent 操作
- 支援自定義元件庫（對應你的 design system）
- Design ↔ Code 可雙向同步

---

## 完整流程

```
上傳圖片
  ↓
[選填] 標記元件區域 + 指定元件類型
  ↓
AI 辨識（色彩 / 排版 / 元件語意）
  ↓
產出 UI-IR JSON
  ↓
[確認步驟] 微調結構 / 元件類型 / design token
  ↓
輸出：預覽網頁 / 程式碼 / Figma 節點
```

---

## AI 辨識的技術點

| 任務 | 難度 | 備註 |
|------|------|------|
| 色彩提取 | 低 | 取樣 + 量化，對應 HEX/design token |
| 排版偵測 | 中 | bounding box → Auto Layout 推論 |
| 文字辨識 | 中 | OCR |
| 元件分割 | 高 | 語意分割，需 UI component classifier |
| 字型推論 | 高 | 字型辨識 API |
| Layout inference | 高 | padding / gap / alignment / constraint 推論 |

**最難的是元件語意**：這是 button 還是 tag？這是 card 還是 modal？
→ 靠自定義元件庫 + LLM Vision 輔助解決。

---

## UI-IR Schema 設計

```json
{
  "type": "Frame",
  "layout": "horizontal",
  "padding": { "top": 16, "right": 24, "bottom": 16, "left": 24 },
  "gap": 12,
  "alignment": "center",
  "background": "#FFFFFF",
  "children": [
    {
      "type": "Button",
      "variant": "primary",
      "label": "Submit",
      "style": {
        "fontSize": 14,
        "color": "#FFFFFF",
        "backgroundColor": "#1A73E8",
        "borderRadius": 8
      }
    }
  ]
}
```

IR 往兩個方向輸出：
- **→ Figma**：透過 MCP 建立節點
- **→ Code**：React / Vue / HTML 元件

---

## 自定義元件庫（差異化核心）

使用者可在系統內定義元件庫，AI 辨識時對照比對：

```json
{
  "components": [
    {
      "name": "PrimaryButton",
      "type": "Button",
      "variants": ["primary", "secondary", "ghost"],
      "props": ["label", "disabled", "loading"],
      "style": { "borderRadius": 8, "fontWeight": 600 }
    },
    {
      "name": "Card",
      "type": "Container",
      "variants": ["default", "elevated"],
      "props": ["title", "subtitle", "image"]
    }
  ],
  "tokens": {
    "colors": {
      "primary": "#1A73E8",
      "surface": "#FFFFFF",
      "text": "#1F1F1F"
    },
    "spacing": [4, 8, 12, 16, 24, 32, 48]
  }
}
```

AI 辨識完後，會嘗試把偵測到的元素 **map 到你的元件庫**，找不到對應的才建立 generic 節點。

---

## 確認步驟設計（Progressive Disclosure）

```
Step 1：結構確認
  → 顯示偵測到的元件邊框 overlay
  → 讓使用者調整分割錯誤的區塊

Step 2：語意確認
  → "這個是 Button 嗎？" 校正元件類型

Step 3：Design Token 確認
  → 顏色是否對應到 design system 的 token
  → 間距是否 snap 到 spacing scale

Step 4：輸出選擇
  → 預覽網頁 / React 程式碼 / Figma / 全部
```

---

## Web Demo 版本

**技術棧建議：**
- Frontend：React + Tailwind
- 圖片標記：Canvas overlay（Fabric.js 或自刻）
- AI：Claude Vision API（辨識）
- 預覽：動態 render IR → React component tree
- 儲存：IR JSON 可匯出

**UX 流程：**
1. 拖拉上傳圖片
2. 可選：在圖上框選區域並標記元件類型
3. 送出 → AI 產出 IR
4. 確認介面：左邊原圖 + 邊框 overlay，右邊 IR tree
5. 確認後 → 右側即時 Preview

---

## Coding Agent Skill 版本

### Skill 介面定義

```yaml
skill: image-to-ui

inputs:
  - image: 路徑 / base64 / URL
  - component_library: 元件庫 JSON（可選，預設 generic）
  - output_format: react | vue | html | figma-ir | all

outputs:
  - ir_json: 中間結構
  - code: 對應 framework 的元件程式碼
  - preview_url: 本地 dev server（選配）
```

### 圖片輸入的三種情境

| 情境 | 描述 | 適合場景 |
|------|------|---------|
| **A：Repo 路徑** | `designs/login.png` 在 repo 內 | 設計師交付圖給工程師 |
| **B：Chat 貼圖** | base64 直接傳入 | Claude Code / Cursor 原生支援 |
| **C：URL 截圖** | skill 自動 screenshot | UI review、競品分析 |

### Agent 使用範例

```
「請依照 /designs/dashboard.png，使用我的元件庫做出頁面」

→ Skill 讀取圖片
→ 載入 component_library.json
→ Vision API 辨識 + map 元件
→ 產出 IR
→ 生成 React 程式碼
→ 輸出到 /src/pages/Dashboard.tsx
```

---

## Open Source 專案結構建議

```
image-to-ui/
├── packages/
│   ├── core/          # IR schema + 辨識邏輯
│   ├── web/           # Web Demo 前端
│   ├── cli/           # CLI tool（agent skill 入口）
│   └── adapters/
│       ├── figma/     # Figma MCP 輸出
│       ├── react/     # React 程式碼生成
│       └── vue/       # Vue 程式碼生成
├── examples/
│   └── component-libraries/   # 範例元件庫定義
└── docs/
    └── ir-schema.md   # IR 規格文件
```

---

## 建議的 PoC 優先順序

1. **先做 Web Demo**
   - 跑通完整 pipeline
   - 在這裡定義好 IR schema
   - Preview 畫面當作 skill output 的 spec

2. **抽出 Core 套件**
   - 辨識邏輯獨立為 `@image-to-ui/core`
   - CLI 包裝成 agent skill

3. **加入元件庫系統**
   - 定義元件庫 JSON schema
   - 提供幾個開箱即用的範例（Tailwind UI、shadcn）

4. **Figma MCP 整合**
   - 從 IR 直接寫入 Figma 節點

---

## 關鍵設計原則

- **IR 是核心資產**，不是過渡物。它讓 design ↔ code 真正雙向。
- **元件庫是差異化**，通用工具不知道你的 design system，這個 skill 知道。
- **確認步驟不能省**，AI 辨識不會 100% 準確，人在 IR 層修正比在圖上或程式碼上修正都更有效率。
- **Web Demo 先行**，用來驗證 UX 流程、定義 schema，再包成 skill。
