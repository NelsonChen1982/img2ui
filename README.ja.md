<div align="center">
  <img src="src/assets/logo.jpg" alt="img2ui" width="120" style="border-radius: 16px;" />

  # img2ui

  **あらゆる画像から完全なデザインシステムを生成**

  スクリーンショット、デザインカンプ、写真、イラストをアップロード — カラー、タイポグラフィ、スペーシングトークン、25種類のUIコンポーネントを自動生成。

  [ライブデモ](#) &nbsp;|&nbsp; [English](README.md) &nbsp;|&nbsp; [繁體中文](README.zh-TW.md)
</div>

---

## 概要

img2ui は、あらゆる画像をデザインシステムにリバースエンジニアリングするブラウザベースのツールです：

1. **アップロード** — 任意の画像（PNG / JPG / WebP）
2. **カラー抽出** — K-means量子化アルゴリズムによるパレット生成
3. **セマンティックマッピング** — カラーを意味的スロットに割当（プライマリ、セカンダリ、アクセント、成功、警告、危険…）
4. **トークン導出** — タイポグラフィスケール、スペーシング、ボーダーラジウス、シャドウ
5. **注釈**（任意）— 画像上で領域を描画しコンポーネントタイプを指定
6. **AI分析** — マルチプロバイダーVision LLM対応（Claude、GPT-4o、Gemini）
7. **レンダリング** — 25種類のコンポーネントを含む完全なUIキット
8. **エクスポート** — JSON、SKILL.md（コーディングエージェント向け）、スタンドアロンHTML

### 25種類のコンポーネント

| カテゴリ | コンポーネント |
|---------|-------------|
| **レイアウト** | Navbar、Hero/Banner、Section、Sidebar、Footer |
| **ナビゲーション** | Tab Bar、Breadcrumb、Pagination、Stepper |
| **コンテンツ** | Card、List/Item、Table、Image/Media、Rich Text |
| **フォーム** | Button、Text Input、Checkbox/Radio、Select/Dropdown、Search Bar、Toggle/Switch |
| **フィードバック** | Alert/Banner、Toast、Modal/Dialog、Tooltip、Badge/Tag、Avatar |

## クイックスタート

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# プロダクションビルド
npm run build
```

### AI機能（オプション）

LLMによるコンポーネント分析を有効にするには、アプリの設定パネル（開発者モード）でAPIキーを設定してください。対応プロバイダー：

- **Anthropic** — Claude Haiku / Sonnet
- **OpenAI** — GPT-4o / GPT-4o-mini
- **Google** — Gemini Flash

> 画像はブラウザ内でのみ処理されます。注釈された領域のみが選択したAIプロバイダーに送信されます。

## アーキテクチャ

```
画像アップロード
  → K-meansカラー抽出（160×160にダウンサンプリング）
  → セマンティックスロット割当（HSLヒューリスティックスコアリング）
  → デザインシステム導出（タイポグラフィ、スペーシング、ラジウス、シャドウ）
  → [任意] Canvas注釈 + LLM Vision分析
  → UIキットレンダリング（25種類のコンポーネント）
  → エクスポート（JSON / SKILL.md / HTML）
```

**技術スタック：** Vue 3（Composition API）· Pinia · Vite · Vanilla CSS

**主要な設計判断：**
- **サーバー不要** — すべてブラウザ内で実行（AI呼び出しはブラウザから直接API接続）
- **3段階AIフォールバック** — グループ分析 → 個別分析 → ピクセルベースのローカルヒューリスティック
- **デザインシステムは画像から計算** — 手動設定ではなく、入力画像から完全に導出
- **IR（中間表現）ファースト** — 中間表現がコア資産、デザイン ↔ コードの双方向同期を実現

## エクスポート形式

| 形式 | 説明 |
|------|------|
| **JSON** | 完全なデザインシステム + コンポーネント定義の構造化IR |
| **SKILL.md** | コーディングエージェント向けMarkdown仕様（Claude Code、Cursor等） |
| **HTML** | 全コンポーネントをレンダリングしたスタンドアロンプレビューページ |

## プロジェクト構造

```
src/
├── components/
│   ├── steps/     # 6ステップウィザード（アップロード → 分析 → 配色 → 注釈 → 生成中 → 結果）
│   └── ui/        # 共有UI（WizardBar、DropdownMenu、ActionFooter）
├── services/      # ビジネスロジック（AI、カラー抽出、DS構築、レンダラー、エクスポート）
├── stores/        # Piniaストア（pipeline、settings、rateLimit）
└── data/          # コンポーネントタイプ、メタデータ、スケルトン、i18n、定数
worker/            # オプションのCloudflare Worker（レート制限）
docs/              # 設計ドキュメント
```

## ライセンス

MIT
