<div align="center">
  <img src="src/assets/logo.jpg" alt="img2ui" width="120" style="border-radius: 16px;" />

  # img2ui <sup>v0.1-beta</sup>

  **あらゆる画像から完全なデザインシステムを生成**

  スクリーンショット、デザインカンプ、写真、イラストをアップロード — カラー、タイポグラフィ、スペーシングトークン、25種類のUIコンポーネントを自動生成。

  [ライブデモ](https://img2ui.com) &nbsp;|&nbsp; [English](README.md) &nbsp;|&nbsp; [繁體中文](README.zh-TW.md)
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
8. **エクスポート** — JSON、SKILL.md（コーディングエージェント向け）、DESIGN.md（Google Stitch向け）、Figma Plugin JSON、スタンドアロンHTML

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
- **OpenAI** — GPT-4o / GPT-4o-mini / GPT-5シリーズ / o4-mini
- **Google** — Gemini Flash
- **OpenRouter** — Hunter Alpha（無料）、Grok 4.1 Fast、Qwen 3.5（35B / 9B / Flash）

> 画像はブラウザ内でのみ処理されます。注釈された領域のみが選択したAIプロバイダーに送信されます。

## アーキテクチャ

```
画像アップロード
  → K-meansカラー抽出（160×160にダウンサンプリング）
  → セマンティックスロット割当（HSLヒューリスティックスコアリング）
  → デザインシステム導出（タイポグラフィ、スペーシング、ラジウス、シャドウ）
  → [任意] Canvas注釈 + LLM Vision分析
  → UIキットレンダリング（25種類のコンポーネント）
  → エクスポート（JSON / SKILL.md / DESIGN.md / Figma JSON / HTML）
```

**技術スタック：** Vue 3（Composition API）· Pinia · Vite · Vanilla CSS

**主要な設計判断：**
- **サーバー不要** — すべてブラウザ内で実行（AI呼び出しはブラウザから直接API接続）
- **3段階AIフォールバック** — グループ分析 → 個別分析 → ピクセルベースのローカルヒューリスティック
- **デザインシステムは画像から計算** — 手動設定ではなく、入力画像から完全に導出
- **マルチプロバイダーAI** — 4社のプロバイダーに対応、直接APIとOpenRouter経由、開発者モードのモデル比較ツール付き
- **IR（中間表現）ファースト** — 中間表現がコア資産、デザイン ↔ コードの双方向同期を実現

## 依存関係と代替手段

| 依存項目 | 現在の使用 | 置換可能？ | 備考 |
|----------|-----------|:----------:|------|
| **アイコン** | Font Awesome Pro (Duotone) | 可 | 絵文字や任意のアイコンセットに置換可能 |
| **AIプロバイダー** | Anthropic / OpenAI / Google / OpenRouter | 可 | 任意のプロバイダーを選択、またはAI無しでも動作 — ローカルヒューリスティックが機能 |
| **Worker** | Cloudflare Worker + KV + D1 + R2 | 可 | レート制限と画像ストレージ用のみ、任意のバックエンドで自前デプロイ可能 |
| **ホスティング** | Cloudflare Pages | 可 | 静的SPA — 任意のプラットフォームにデプロイ可能 |

> コア機能（カラー抽出 → デザインシステム → UIキット）は完全にクライアントサイドで動作し、外部依存はゼロです。

## エクスポート形式

| 形式 | 説明 |
|------|------|
| **JSON** | 完全なデザインシステム + コンポーネント定義の構造化IR |
| **SKILL.md** | コーディングエージェント向けMarkdown仕様（Claude Code、Cursor等） |
| **SKILL ZIP** | デュアルテーマトークン、分析ログ、モジュール化skillファイルをバンドルしたアーカイブ |
| **DESIGN.md** | [Google Stitch](https://stitch.withgoogle.com/)画面生成用の自然言語デザインシステム記述 |
| **HTML** | 全コンポーネントをレンダリングしたスタンドアロンプレビューページ |

## プロジェクト構造

```
src/
├── components/
│   ├── steps/     # 6ステップウィザード（アップロード → 分析 → 配色 → 注釈 → 生成中 → 結果）
│   └── ui/        # 共有UI（WizardBar、DropdownMenu、ActionFooter、AuthModal、UserMenu）
├── services/      # ビジネスロジック（AI、カラー抽出、DS構築、レンダラー、エクスポート）
├── stores/        # Piniaストア（pipeline、settings、auth、rateLimit）
└── data/          # コンポーネントタイプ、メタデータ、スケルトン、i18n、定数
worker/            # Cloudflare Worker（認証、クレジット、レート制限、R2画像ストレージ、D1）
docs/              # 設計ドキュメント
```

## 変更履歴

| バージョン | マイルストーン |
|-----------|-------------|
| **v0.2-beta** | Google + GitHub OAuth認証、クレジット制（登録時+10、毎日ログイン+3、上限50）、匿名初回無料体験、トップページ2カラムレイアウト再設計、クレジット表示付きユーザーメニュー、Kitページの再注釈を削除、ダークテーマカバーテキスト修正 |
| **v0.1.1-beta** | Figma Plugin JSONエクスポート、ステップ3の注釈スキップショートカット、フッターレイアウト再設計 |
| **v0.1-beta** | コード構造リファクタリング、デュアルテーマ（ライト/ダーク）パレット生成 |
| **v0.0.4** | OpenRouter統合 — Hunter Alpha、Grok 4.1 Fast、Qwen 3.5シリーズ |
| **v0.0.3** | Cloudflare Worker統合 — レート制限、R2画像ストレージ、セッショントークン、Turnstile検証 |
| **v0.0.2** | モデル選択、開発者モードバイパス、デバッグログ、レスポンシブUI強化 |
| **v0.0.1** | 初回リリース — 6ステップウィザードパイプライン、K-meansカラー抽出、25種類のコンポーネント、マルチプロバイダーLLM分析、JSON / SKILL.md / HTMLエクスポート |

## ロードマップ

- [ ] **コミュニティギャラリー** — 他のユーザーが作成したデザインシステムを閲覧・探索（認証システム構築済み）
- [ ] **スマート画像分類** — アップロード画像がUIスクリーンショットか写真かを自動判別し、注釈ワークフローの提供を条件付きで切替
- [ ] **Figmaネイティブクリップボード** — プラグイン不要で、fig-kiwiバイナリ形式を使用してデザイントークンを直接Figmaに貼り付け
- [ ] **npm / npxインストールパッケージ** — インストール可能なCLI skillパッケージとして配布し、`npx img2ui` でターミナルから直接デザインシステムを生成
- [ ] **クレジット購入** — Stripe連携による追加クレジットの購入

## ライセンス

MIT
