---
theme_id: "TH-001"
title: "AIオーケストレーション可視化ダッシュボード"
phase: "technical-design"
status: "completed"
source: "docs/meeting/dummy.md"
created_at: "2026-03-23"
updated_at: "2026-03-23"
next_action: "実装（Phase 5）へ進む。S-001（プロジェクト初期構成）から着手"
awaiting_review: ""
participants:
  - "AIPO"
  - "AI Dev"
  - "AI PD"
tags:
  - "mvp"
  - "dashboard"
  - "tech-stack"
---

# Phase 4: 技術設計 — 決定記録

## 日付
2026-03-23

## 議論の参加者
- AIPO, AI Dev, AI PD

---

## 議論の経緯

### 論点1: Tailwind CSS v3 vs v4

- **AI Devの意見**: v4を推奨。2025年初頭リリースから1年以上経過し、shadcn/uiも正式対応済み。新規プロジェクトでv3を選ぶ合理性がない。v3で始めるとv4移行コストが確実に発生する。
- **AI PDの意見**: shadcn/uiのv4対応状況の確認をAI Devに求めたが、対応済みとの回答。
- **AIPOの判断**: v4を採用。エコシステムの成熟度が十分であり、後方互換リスクよりも移行コスト回避のメリットが大きい。

### 論点2: パッケージマネージャー（pnpm vs npm）

- **AI Devの意見（初回）**: pnpmを推奨（ディスク効率、速度）。ただしWindows環境でのシンボリンク問題を懸念。
- **AI Devの意見（修正後）**: AIPOの暫定判断（npm）に同意。小〜中規模では体感差が小さい。npmはNode.js同梱でセットアップ障壁が最低。
- **AIPOの判断**: npmを採用。Windows環境（`C:\Users\gatag\...`）での安定性を最優先。

### 論点3: ディレクトリ構成（dashboard/ サブディレクトリ vs ルート配置）

- **AI Devの意見（初回）**: `dashboard/` サブディレクトリに配置し、`../docs/decisions/` を参照する構成を提案。
- **AI Devの意見（修正後）**: `../` 参照のリスク（Vercelデプロイ時のルートディレクトリ問題）を再評価し、**ルートにNext.jsを配置する構成**を推奨に変更。
- **AIPOの判断**: ルート配置を採用。`../` 参照の問題を根本回避し、Vercelデプロイが素直になる。

### 論点4: コンポーネントライブラリ

- **AI Devの意見**: shadcn/ui を推奨。必要なコンポーネントのみコピーする方式でバンドル最小化。Radix UIベースのアクセシビリティ。
- **AI PDの意見**: shadcn/ui に同意。17コンポーネント中、5種をライブラリ流用、12種を自作（多くはシンプルなレイアウト）。MUIは「視覚的静けさ」と衝突するため不採用。
- **議論のポイント**: 完全一致。

### 論点5: デザイントークンの命名規約

- **AI PDの指摘**: `text-primary` がTailwindの `text-*` ユーティリティと競合する。shadcn/uiの命名規約（`foreground` / `muted-foreground`）に揃えるべき。
- **AI Devの回答**: 同意。shadcn/uiのCSS変数ベースのテーマシステムに従えば競合は発生しない。
- **AIPOの判断**: shadcn/uiの命名規約に準拠。Phase 2で定義した色名はUI実装上のセマンティック名に変換する。

### 論点6: PhaseProgressBarの実装方針

- **AI PDの意見**: ドット表示はCSS-onlyで実装すべき。4-6pxの小さい表示にアイコンSVGは解像度問題が出やすい。
- **AI Devの回答**: 同意。CSSの丸（`rounded-full`）のほうがピクセルパーフェクト。
- **AIPOの判断**: CSS-onlyを採用。完了チェックマークのみLucide `Check` を使用。

---

## 決定事項: 技術スタック

### 1. Frontend

| 項目 | 選定 |
|---|---|
| フレームワーク | **Next.js 15（App Router）** |
| レンダリング | **SSG**（`output: 'export'`）。v1でSSR/ISRに移行 |
| 言語 | **TypeScript** |

### 2. バックエンド

| 項目 | 選定 |
|---|---|
| v0 | **なし**（SSG。ランタイムバックエンド不要） |
| v1移行先 | **Next.js Route Handler** + Supabase Client |

### 3. スタイル

| 項目 | 選定 |
|---|---|
| CSSフレームワーク | **Tailwind CSS v4** |
| コンポーネントライブラリ | **shadcn/ui**（Card, Badge, Tabs, Breadcrumb） |
| アイコン | **Lucide React**（shadcn/uiデフォルト。7個程度使用） |
| フォント | **next/font**（Inter + Noto Sans JP。セルフホスト） |
| Markdownスタイル | **@tailwindcss/typography**（proseクラス + カスタマイズ） |
| デザイントークン命名 | **shadcn/ui規約**（foreground / muted-foreground 等） |

### 4. DB

| 項目 | 選定 |
|---|---|
| v0 | **なし**（`docs/decisions/` のmdファイルパース） |
| v1移行先 | **Supabase**（PostgreSQL + Auth + Realtime） |

### 5. 認証

| 項目 | 選定 |
|---|---|
| v0 | **なし**（ドッグフーディング用。URLを非公開にするのみ） |
| v1移行先 | **Supabase Auth**（OIDC: Google認証） |

### 6. デプロイ先

| 項目 | 選定 |
|---|---|
| ホスティング | **Vercel**（Hobbyプラン） |
| CI/CD | **GitHub連携自動デプロイ** + プレビューデプロイ |

### 7. 追加の技術スタック

| カテゴリ | 選定 |
|---|---|
| mdパーサー | **gray-matter**（frontmatter）+ **unified**（remark-parse + remark-gfm + remark-rehype + rehype-sanitize + rehype-stringify） |
| テスト | **Vitest** + **React Testing Library**（v0）、Playwright（v1以降） |
| Linter/Formatter | **ESLint**（flat config + eslint-config-next）+ **Prettier** |
| パッケージマネージャー | **npm** |

### 8. プロジェクト構成

**ルートにNext.jsを配置する構成**を採用。

```
claude-orchestration/              # プロジェクトルート = Next.jsルート
├── src/                           # アプリケーションソース
│   ├── app/                       # App Router
│   │   ├── layout.tsx             # ルートレイアウト（AppHeader, フォント）
│   │   ├── page.tsx               # オーバービュー (/)
│   │   ├── not-found.tsx          # 404ページ
│   │   └── themes/
│   │       └── [themeId]/
│   │           └── page.tsx       # テーマ詳細 (/themes/[themeId])
│   ├── components/                # UIコンポーネント
│   │   ├── ui/                    # shadcn/ui ベース
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   └── tabs.tsx
│   │   ├── app-header.tsx
│   │   ├── awaiting-review-banner.tsx
│   │   ├── theme-card.tsx
│   │   ├── theme-list.tsx
│   │   ├── phase-progress-bar.tsx # 一覧用（CSS-onlyドット）
│   │   ├── phase-progress-map.tsx # 詳細用（日付付き）
│   │   ├── status-badge.tsx
│   │   ├── timeline-tab.tsx
│   │   ├── timeline-entry.tsx
│   │   ├── decision-tab.tsx       # S-008 (Should)
│   │   └── empty-state.tsx
│   ├── lib/                       # ビジネスロジック
│   │   ├── data/
│   │   │   ├── types.ts           # Theme, Phase, Status 型定義
│   │   │   ├── parser.ts          # mdファイルパーサー
│   │   │   ├── themes.ts          # データアクセスファサード
│   │   │   └── constants.ts       # Phase/Status 定数・表示名
│   │   ├── utils/
│   │   │   ├── date.ts            # 相対時間表示
│   │   │   └── phase.ts           # フェーズ算出共通ロジック
│   │   └── markdown/
│   │       └── processor.ts       # unified パイプライン
│   └── styles/
│       └── globals.css            # Tailwind directives
├── docs/                          # ドキュメント（データソース）
│   ├── decisions/                 # mdファイル（パース対象）
│   ├── meeting/                   # 議事録
│   └── vision.md
├── __tests__/                     # テスト
│   ├── lib/
│   │   ├── parser.test.ts
│   │   ├── themes.test.ts
│   │   └── phase.test.ts
│   ├── components/
│   │   └── ...
│   └── fixtures/                  # テスト用mdファイル
├── .claude/                       # AIエージェント設定（既存）
│   └── agents/
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── package.json
├── .env.local.example
└── .gitignore
```

### 9. データアクセス層の設計（v1移行を見据えて）

```typescript
// src/lib/data/types.ts
export type Phase =
  | 'insight-extraction'
  | 'value-definition'
  | 'story-definition'
  | 'technical-design'
  | 'implementation'
  | 'delivery';

export type Status = 'in-progress' | 'awaiting-review' | 'completed' | 'on-hold';

export interface ThemeDecision {
  theme_id: string;
  title: string;
  phase: Phase;
  status: Status;
  source: string;
  created_at: string;
  updated_at: string;
  next_action: string;
  awaiting_review: string;
  participants: string[];
  tags?: string[];
  body_html: string;
}

export interface Theme {
  theme_id: string;
  title: string;
  current_phase: Phase;
  current_status: Status;
  decisions: ThemeDecision[];
  phases: PhaseInfo[];
}
```

`src/lib/data/themes.ts` がファサードとなり、v0では `parser.ts` を呼び、v1では Supabase repository に切り替える。UIはファサードにのみ依存し、データソース変更の影響を局所化する。

---

## 検討した選択肢

### 案A: Tailwind CSS v3
- メリット: 枯れている、ドキュメント豊富
- デメリット: v4移行コストが確実に発生
- 却下理由: v4が1年以上経過し安定。新規プロジェクトでv3を選ぶ合理性なし

### 案B: pnpm
- メリット: 高速、ディスク効率
- デメリット: Windows環境でのシンボリンク問題リスク
- 却下理由: 小〜中規模では体感差小。Windows安定性を優先しnpmを採用

### 案C: dashboard/ サブディレクトリ構成
- メリット: docs/ とアプリの関心分離
- デメリット: `../` 参照のVercelデプロイ問題、next.config.ts追加設定
- 却下理由: ダッシュボードがリポジトリ主成果物。ルート配置で問題を根本回避

### 案D: MUI（Material UI）
- メリット: コンポーネント豊富、成熟
- デメリット: Material Designの視覚言語（shadow, ripple）が「視覚的静けさ」と衝突
- 却下理由: デザイン原則との不整合。カスタマイズで打ち消す工程が発生

### 案E: Biome（Linter/Formatter）
- メリット: Rust製で高速、ESLint+Prettier統合
- デメリット: eslint-config-nextとの統合が非標準
- 却下理由: App Router固有のルール（Server/Client Component制約）をカバーするeslint-config-nextが重要

---

## 判断理由

- **v4採用**: 安定性とエコシステム成熟度を確認済み。移行コスト回避が最大のメリット
- **npm採用**: Windows環境での安定性を最優先。プロジェクト規模ではpnpmのメリットが小さい
- **ルート配置**: Vercelデプロイの素直さ、`../`参照回避。ダッシュボードがリポジトリ主成果物
- **shadcn/ui**: 「視覚的静けさ」原則との適合性、Tailwind統合、必要分だけコピーの軽量さ
- **unified**: remark/rehypeエコシステムの拡張性。S-008のセクション抽出にもAST操作で対応可能

---

## 却下した案とその理由

| 案 | 却下理由 |
|---|---|
| Tailwind v3 | 移行コストが確実に発生。v4は十分安定 |
| pnpm | Windows環境リスク。規模に対してメリット小 |
| dashboard/ サブディレクトリ | Vercelデプロイ問題。`../`参照の根本回避 |
| MUI | 視覚的静けさと衝突 |
| Biome | eslint-config-nextとの統合非対応 |
| bun | Windows安定性の検証事例不足 |
| styled-components | Server Component非対応 |
| next-mdx-remote | v0にはMDX不要。過剰 |

---

## リスク・不確実性

1. **Tailwind v4 + shadcn/ui の組み合わせ**: 対応済みとの判断だが、特定のコンポーネントで問題が発生する可能性。対策: S-001着手時にshadcn/ui initの動作確認を最優先で実施
2. **ルート配置による既存ファイルとの共存**: `.claude/` や `docs/` とNext.jsの設定ファイルが同階層に混在する。対策: `.gitignore` と `next.config.ts` の適切な設定で分離
3. **SSG `output: 'export'` の制約**: Route Handler（API）が使えない、`useSearchParams` にはClient Componentが必要。対策: v0は閲覧のみなのでAPI不要。タブ状態はClient Componentで処理
4. **Markdownパースの堅牢性**: AIPOの出力フォーマットが揺れるとUI表示が壊れる。対策: フォールバック表示（全文レンダリング）+ frontmatterバリデーション

---

## 次のアクション

### Phase 5: 実装
1. S-001（プロジェクト初期構成）から着手
   - Next.js 15 + App Router + Tailwind v4 + shadcn/ui のセットアップ
   - デザイントークン定義（shadcn/ui命名規約準拠）
   - next/font でフォント設定
   - 2ルート（`/`, `/themes/[themeId]`）+ 404ページ
   - Vercelデプロイ
2. S-002（mdパーサー）→ S-004 + S-005（Wave 1）→ S-006 + S-007（Wave 2）の順で実装
3. TDDサイクル: テスト → 実装 → リファクタ
