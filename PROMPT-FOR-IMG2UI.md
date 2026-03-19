# Prompt: img2ui 產出 Figma Plugin JSON

> 把這份文件丟給你的 img2ui 專案（或 AI），讓它直接從 design tokens 產出正確排版的 Figma JSON。

---

## 指令

你需要新增一個功能：除了產出 UI Kit 的 HTML 預覽，也要同時產出一份 **Figma Plugin JSON**，讓使用者可以透過 Figma Plugin 一鍵貼上為可編輯的 Figma 節點。

**重要：不要從 HTML 轉換。直接從 design tokens（顏色、字型、元件清單）生成 JSON。**

---

## JSON 格式規格

### 頂層結構

```json
{
  "source": "img2ui",
  "version": "1.0",
  "nodes": [
    {
      "type": "FRAME",
      "name": "img2ui UI Kit",
      "layout": { "mode": "VERTICAL", "gap": 20, "padding": [32, 32, 32, 32] },
      "size": { "w": 960 },
      "fills": [{ "hex": "#F5F5F5" }],
      "cornerRadius": 20,
      "children": [
        /* ...所有 section 放這裡... */
      ]
    }
  ]
}
```

所有 section 都是這個根 FRAME 的 children，根 FRAME 用 VERTICAL auto-layout 自動排列。

### 節點類型

#### FRAME（容器）

```json
{
  "type": "FRAME",
  "name": "Section Name",
  "layout": {
    "mode": "VERTICAL",           // "VERTICAL" | "HORIZONTAL"
    "gap": 12,                    // 子元素間距 (px)
    "padding": [18, 20, 18, 20],  // [top, right, bottom, left] 或單一數值
    "align": "center",            // 副軸對齊: "start" | "center" | "end"
    "justify": "start",           // 主軸對齊: "start" | "center" | "end" | "between"
    "wrap": true                  // 是否換行
  },
  "size": { "w": 896 },          // 固定寬度（不設 h 就自動高度）
  "fills": [{ "hex": "#FFFFFF" }],
  "cornerRadius": 14,
  "strokes": [{ "width": 1, "color": "rgba(26,26,26,0.12)" }],
  "effects": [{ "type": "shadow", "x": 0, "y": 2, "blur": 8, "color": "rgba(0,0,0,0.06)" }],
  "opacity": 1,
  "clip": false,
  "children": []
}
```

#### TEXT（文字）

```json
{
  "type": "TEXT",
  "content": "Hello World",
  "font": { "family": "Inter", "weight": 700, "size": 16 },
  "color": "#1A1A1A",
  "lineHeight": 1.4,
  "letterSpacing": 0.08,
  "textAlign": "left",
  "opacity": 1,
  "layoutChild": { "hug": "fill" }
}
```

#### RECT（矩形 / 分隔線 / 色塊）

```json
{
  "type": "RECT",
  "name": "Divider",
  "size": { "w": 200, "h": 1 },
  "fills": [{ "color": "rgba(26,26,26,0.12)" }],
  "cornerRadius": 0,
  "layoutChild": { "hug": "fill" }
}
```

#### ELLIPSE（圓形）

```json
{
  "type": "ELLIPSE",
  "name": "Avatar",
  "size": { "w": 40, "h": 40 },
  "fills": [{ "hex": "#FC541C" }]
}
```

### layoutChild — 子節點在 auto-layout 中的行為

```json
"layoutChild": {
  "hug": "fill",   // 水平: "hug"(內容大小) 或 "fill"(撐滿父層寬度)
  "vug": "fill",   // 垂直: 同上
  "grow": true      // flex-grow: 1
}
```

### 顏色格式

支援兩種：
- `{ "hex": "#FC541C" }` — 純色
- `{ "color": "rgba(26,26,26,0.12)" }` — 帶透明度

---

## 排版規則（極重要）

### 1. 每個 FRAME 都必須有明確的 layout

沒有 layout 的 FRAME 在 Figma 中會把所有子節點疊在 (0,0)。
**所有有 children 的 FRAME 都必須設定 `layout`。**

### 2. TEXT 在 auto-layout 中必須設 layoutChild

文字預設是 "hug"（內容大小），在窄容器中會只顯示一個字就換行。
**長文字都應該設 `"layoutChild": { "hug": "fill" }`** 讓它撐滿父層寬度。

### 3. Section 寬度要明確

每個 section 的 FRAME 應該有 `"size": { "w": 896 }`（根容器 960 - padding 64），
或設 `"layoutChild": { "hug": "fill" }` 讓它自動撐滿。

### 4. 用 HORIZONTAL wrap 取代 CSS Grid

HTML 的 `display: grid; grid-template-columns: repeat(3, 1fr)` 改成：
```json
{
  "layout": { "mode": "HORIZONTAL", "gap": 12, "wrap": true },
  "children": [
    { "size": { "w": 280 }, ... },
    { "size": { "w": 280 }, ... },
    { "size": { "w": 280 }, ... }
  ]
}
```
每個子元素給固定寬度（父寬 ÷ 列數 - gap）。

### 5. 不要用 margin，全部用 gap 和 padding

HTML 的 `margin-bottom: 14px` → 父層 `"layout": { "gap": 14 }`

### 6. 行內排列用 HORIZONTAL + align: center

HTML 的 `display: flex; align-items: center; justify-content: space-between` →
```json
"layout": { "mode": "HORIZONTAL", "gap": 0, "align": "center", "justify": "between" }
```

---

## 完整範例：COLOR PALETTE Section

```json
{
  "type": "FRAME",
  "name": "Color Palette",
  "layout": { "mode": "VERTICAL", "gap": 14, "padding": [18, 20, 18, 20] },
  "layoutChild": { "hug": "fill" },
  "fills": [{ "color": "rgba(252,84,28,0.05)" }],
  "cornerRadius": 14,
  "strokes": [{ "width": 1, "color": "rgba(26,26,26,0.12)" }],
  "children": [
    {
      "type": "TEXT",
      "content": "COLOR PALETTE",
      "font": { "family": "Inter", "weight": 700, "size": 10 },
      "color": "#fc541c",
      "letterSpacing": 0.08
    },
    {
      "type": "FRAME",
      "name": "Swatches",
      "layout": { "mode": "HORIZONTAL", "gap": 8, "wrap": true },
      "layoutChild": { "hug": "fill" },
      "children": [
        {
          "type": "FRAME",
          "name": "Primary",
          "layout": { "mode": "VERTICAL", "gap": 4 },
          "size": { "w": 98 },
          "children": [
            {
              "type": "RECT",
              "name": "Swatch",
              "size": { "w": 98, "h": 56 },
              "fills": [{ "hex": "#fc541c" }],
              "cornerRadius": 10
            },
            {
              "type": "TEXT",
              "content": "Primary",
              "font": { "family": "Inter", "weight": 600, "size": 10 },
              "color": "#1a1a1a"
            },
            {
              "type": "TEXT",
              "content": "#fc541c",
              "font": { "family": "Inter", "weight": 400, "size": 10 },
              "color": "rgba(26,26,26,0.5)"
            }
          ]
        }
      ]
    }
  ]
}
```

## 完整範例：BUTTON Section

```json
{
  "type": "FRAME",
  "name": "Button",
  "layout": { "mode": "VERTICAL", "gap": 14, "padding": [18, 20, 18, 20] },
  "layoutChild": { "hug": "fill" },
  "fills": [{ "color": "rgba(255,255,255,0.92)" }],
  "cornerRadius": 14,
  "strokes": [{ "width": 1, "color": "rgba(26,26,26,0.08)" }],
  "children": [
    {
      "type": "TEXT",
      "content": "BUTTON",
      "font": { "family": "Inter", "weight": 700, "size": 10 },
      "color": "#fc541c",
      "letterSpacing": 0.08
    },
    {
      "type": "FRAME",
      "name": "Variants",
      "layout": { "mode": "HORIZONTAL", "gap": 8, "wrap": true, "align": "center" },
      "layoutChild": { "hug": "fill" },
      "children": [
        {
          "type": "FRAME",
          "name": "Button/Primary/Large",
          "layout": { "mode": "HORIZONTAL", "padding": [12, 24, 12, 24], "align": "center", "justify": "center" },
          "fills": [{ "hex": "#fc541c" }],
          "cornerRadius": 10,
          "children": [
            { "type": "TEXT", "content": "Primary", "font": { "family": "Inter", "weight": 700, "size": 15 }, "color": "#ffffff" }
          ]
        },
        {
          "type": "FRAME",
          "name": "Button/Secondary/Large",
          "layout": { "mode": "HORIZONTAL", "padding": [12, 24, 12, 24], "align": "center", "justify": "center" },
          "fills": [{ "hex": "#ffffff" }],
          "cornerRadius": 10,
          "strokes": [{ "width": 1, "color": "rgba(26,26,26,0.12)" }],
          "children": [
            { "type": "TEXT", "content": "Secondary", "font": { "family": "Inter", "weight": 600, "size": 15 }, "color": "#1a1a1a" }
          ]
        },
        {
          "type": "FRAME",
          "name": "Button/Ghost/Large",
          "layout": { "mode": "HORIZONTAL", "padding": [12, 24, 12, 24], "align": "center", "justify": "center" },
          "cornerRadius": 10,
          "children": [
            { "type": "TEXT", "content": "Ghost", "font": { "family": "Inter", "weight": 600, "size": 15 }, "color": "#fc541c" }
          ]
        }
      ]
    },
    {
      "type": "FRAME",
      "name": "Small Variants",
      "layout": { "mode": "HORIZONTAL", "gap": 8, "align": "center" },
      "layoutChild": { "hug": "fill" },
      "children": [
        {
          "type": "FRAME",
          "name": "Button/Primary/Small",
          "layout": { "mode": "HORIZONTAL", "padding": [6, 14, 6, 14], "align": "center", "justify": "center" },
          "fills": [{ "hex": "#fc541c" }],
          "cornerRadius": 6,
          "children": [
            { "type": "TEXT", "content": "Small", "font": { "family": "Inter", "weight": 600, "size": 12 }, "color": "#ffffff" }
          ]
        }
      ]
    }
  ]
}
```

## 完整範例：NAVBAR Section

```json
{
  "type": "FRAME",
  "name": "Navbar / Header",
  "layout": { "mode": "VERTICAL", "gap": 14, "padding": [18, 20, 18, 20] },
  "layoutChild": { "hug": "fill" },
  "fills": [{ "color": "rgba(255,255,255,0.92)" }],
  "cornerRadius": 14,
  "strokes": [{ "width": 1, "color": "rgba(26,26,26,0.08)" }],
  "children": [
    {
      "type": "TEXT",
      "content": "NAVBAR / HEADER",
      "font": { "family": "Inter", "weight": 700, "size": 10 },
      "color": "#fc541c",
      "letterSpacing": 0.08
    },
    {
      "type": "FRAME",
      "name": "Navbar/Dark",
      "layout": { "mode": "HORIZONTAL", "padding": [12, 16, 12, 16], "align": "center", "justify": "between" },
      "layoutChild": { "hug": "fill" },
      "fills": [{ "hex": "#fc541c" }],
      "cornerRadius": 10,
      "children": [
        { "type": "TEXT", "content": "Brand", "font": { "family": "Inter", "weight": 800, "size": 15 }, "color": "#ffffff" },
        {
          "type": "FRAME",
          "name": "Nav Links",
          "layout": { "mode": "HORIZONTAL", "gap": 16, "align": "center" },
          "children": [
            { "type": "TEXT", "content": "Home", "font": { "family": "Inter", "weight": 600, "size": 13 }, "color": "#ffffff" },
            { "type": "TEXT", "content": "Product", "font": { "family": "Inter", "weight": 400, "size": 13 }, "color": "rgba(255,255,255,0.55)" },
            { "type": "TEXT", "content": "Pricing", "font": { "family": "Inter", "weight": 400, "size": 13 }, "color": "rgba(255,255,255,0.55)" }
          ]
        },
        {
          "type": "FRAME",
          "name": "Actions",
          "layout": { "mode": "HORIZONTAL", "gap": 6, "align": "center" },
          "children": [
            {
              "type": "FRAME",
              "name": "Login",
              "layout": { "mode": "HORIZONTAL", "padding": [5, 12, 5, 12], "justify": "center" },
              "cornerRadius": 6,
              "strokes": [{ "width": 1, "color": "rgba(255,255,255,0.3)" }],
              "children": [
                { "type": "TEXT", "content": "Login", "font": { "family": "Inter", "weight": 400, "size": 12 }, "color": "#ffffff" }
              ]
            },
            {
              "type": "FRAME",
              "name": "Sign Up",
              "layout": { "mode": "HORIZONTAL", "padding": [5, 12, 5, 12], "justify": "center" },
              "fills": [{ "hex": "#ffffff" }],
              "cornerRadius": 6,
              "children": [
                { "type": "TEXT", "content": "Sign up", "font": { "family": "Inter", "weight": 700, "size": 12 }, "color": "#fc541c" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## 常見錯誤與修正

| 問題 | 原因 | 修正 |
|------|------|------|
| 所有東西疊在一起 | FRAME 沒有 `layout` | 每個有 children 的 FRAME 都加 `layout` |
| 文字只顯示一個字 | TEXT 在窄容器中 hug | 加 `"layoutChild": { "hug": "fill" }` |
| Section 寬度太窄 | 沒設寬度也沒設 fill | 加 `"size": { "w": 896 }` 或 `"layoutChild": { "hug": "fill" }` |
| 顏色全黑 | rgba 解析失敗 | 確保 rgba 格式正確，小數前面加 0（`0.12` 不是 `.12`） |
| 色塊看不到 | RECT 沒設 size | RECT 必須有明確的 `"size": { "w": ..., "h": ... }` |
| Grid 排版變一列 | Figma 沒有 Grid | 用 HORIZONTAL + wrap + 子元素固定寬度 |

## 生成流程

```
img2ui AI 分析截圖
       ↓
取得 design tokens: {
  name: "My App",
  colors: { primary: "#fc541c", secondary: "#a81c1c", ... },
  fonts: { heading: "Inter", body: "Inter" },
  components: ["navbar", "hero", "card", "button", ...]
}
       ↓
對每個 component 呼叫對應的 builder:
  buildColorPalette(colors) → FRAME JSON
  buildTypography(fonts) → FRAME JSON
  buildNavbar(colors, fonts) → FRAME JSON
  buildButton(colors, fonts) → FRAME JSON
  ...
       ↓
包在根容器：{
  source: "img2ui",
  version: "1.0",
  nodes: [{ type: "FRAME", name: "UI Kit", layout: VERTICAL, children: [...所有 section] }]
}
       ↓
JSON.stringify → 提供給使用者複製
```
