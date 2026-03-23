---
theme_id: "TH-001"
title: "AIオーケストレーション可視化ダッシュボード"
phase: "implementation"
status: "completed"
source: "docs/meeting/dummy.md"
created_at: "2026-03-23"
updated_at: "2026-03-23"
next_action: "Phase 6（デリバリー）へ進む。Vercelデプロイとドッグフーディング開始"
awaiting_review: ""
participants:
  - "AIPO"
  - "AI Dev"
  - "AI PD"
tags:
  - "mvp"
  - "dashboard"
  - "implementation"
---

# Phase 5: 実装 — 決定記録

## 日付
2026-03-23

## 議論の参加者
- AIPO, AI Dev（×2並列）

---

## 議論の経緯

### 論点1: 実装の分割戦略

- **AIPOの判断**: Story定義のWave構成に従い、オーバービューページ（Wave 1: S-004 + S-005）とテーマ詳細ページ（Wave 2: S-006 + S-007）を2つのAI Devで**並列実装**した。共有ユーティリティ（parser, phase, themes）が完成済みだったため、依存関係の問題は発生しなかった。

### 論点2: TDDアプローチの実績

- **AI Devの実践**: テストファイルを先に作成→実装→テスト通過の順序を厳守。
  - データ層（parser, phase, themes）: 28テスト → 実装 → 全パス
  - Wave 1コンポーネント: 42テスト → 実装 → 全パス
  - Wave 2コンポーネント: 17テスト → 実装 → 全パス
- **合計**: 87テスト全パス

### 論点3: Server/Client Component分離

- **AI Dev（Wave 2）の判断**: ページ本体（テーマヘッダー、PhaseProgressMap）はServer Component、タブ切り替え（TimelineTab）のみClient Componentとした。SSGとの整合性を維持。

### 論点4: タブ状態管理

- **AI Dev（Wave 2）の判断**: v0仕様に従い、URLクエリパラメータではなくReact stateで管理。SSGでのクエリパラメータ処理の複雑さを回避。v1でURL同期を検討。

### 論点5: CSS変数とTailwind v4の統合

- **AI Dev（Wave 1）の発見**: AwaitingReviewBannerの背景色10%透過は、Tailwind CSS v4ではCSS変数のopacity修飾が直接サポートされないため、`color-mix(in srgb, var(--status-awaiting) 10%, transparent)` をインラインstyleで使用。

---

## 決定事項

### 実装完了したStory

| Story | 内容 | 状態 |
|---|---|---|
| S-001 | プロジェクト初期構成 | ✅ 完了 |
| S-002 | mdファイルパーサー | ✅ 完了 |
| S-004 | 判断待ちバナー | ✅ 完了 |
| S-005 | テーマ一覧 | ✅ 完了 |
| S-006 | フェーズ進行マップ + テーマヘッダー | ✅ 完了 |
| S-007 | タイムラインタブ | ✅ 完了 |

### Must Story: 6/6 完了

### Should Story（v0スコープ外）
| Story | 内容 | 状態 |
|---|---|---|
| S-003 | frontmatterバリデーション強化 | 未着手（パース失敗が頻発したら即実装） |
| S-008 | 判断ポイントタブ | 未着手（タブUIはプレースホルダー「Coming Soon」設置済み） |

### 作成されたファイル一覧

**データ層（3ファイル）:**
- `src/lib/data/parser.ts` — frontmatterパース、バリデーション、MD→HTML変換
- `src/lib/data/themes.ts` — データアクセスファサード
- `src/lib/utils/phase.ts` — フェーズ算出ロジック

**共通コンポーネント（4ファイル）:**
- `src/components/app-header.tsx` — ヘッダー
- `src/components/status-badge.tsx` — 4色ステータスバッジ
- `src/components/empty-state.tsx` — 空状態表示
- `src/lib/utils/date.ts` — 相対時間ユーティリティ

**Wave 1 コンポーネント（4ファイル）:**
- `src/components/awaiting-review-banner.tsx` — 判断待ちバナー
- `src/components/phase-progress-bar.tsx` — フェーズ進行ドット（一覧用）
- `src/components/theme-card.tsx` — テーマカード
- `src/components/theme-list.tsx` — テーマ一覧

**Wave 2 コンポーネント（3ファイル）:**
- `src/components/phase-progress-map.tsx` — フェーズ進行マップ（詳細用）
- `src/components/timeline-entry.tsx` — タイムラインエントリ
- `src/components/timeline-tab.tsx` — タイムライン/判断ポイントタブ

**テスト（16ファイル, 87テスト）:**
- `__tests__/lib/` — parser, phase, themes, date, date-format, types
- `__tests__/components/` — app-header, status-badge, empty-state, awaiting-review-banner, phase-progress-bar, theme-card, theme-list, phase-progress-map, timeline-entry, timeline-tab

### ビルド結果

```
Route (app)                                 Size  First Load JS
┌ ○ /                                      289 B         176 kB
├ ○ /_not-found                            123 B         102 kB
└ ● /themes/[themeId]                    11.2 kB         187 kB
    └ /themes/TH-001
```

---

## 検討した選択肢

### 案A: Wave逐次実行（Wave 1完了後にWave 2着手）
- メリット: Wave 1の学びをWave 2に反映できる
- デメリット: 実装期間が倍になる

### 案B: Wave並列実行（採用）
- メリット: 実装期間を半減。共有ユーティリティ完成後は独立に実装可能
- デメリット: 並列エージェント間でのファイル競合リスク

---

## 判断理由

- **並列実行を採用**: 共有ユーティリティ（parser, phase, themes, types, constants）が完成済みであり、Wave 1（オーバービュー）とWave 2（テーマ詳細）のコンポーネントは独立している。ファイル競合は `status-badge.tsx` と `date.ts` のみ発生しうるが、先行エージェントが作成したものを後続が利用する形で解決。

## 却下した案とその理由

### Wave逐次実行
- 却下理由: 共有部分が完成済みのため並列のリスクが低い。時間短縮のメリットが大きい。

---

## リスク・不確実性

1. **SSG再ビルドの頻度**: `docs/decisions/` にmdファイルが追加されるたびに再ビルドが必要。v0はドッグフーディング用なので許容範囲だが、v1ではISR or Supabase移行で解決予定。
2. **Tailwind Typography のスタイリング**: proseクラスのデフォルトスタイルがダッシュボードのデザイントークンと競合する可能性。必要に応じてカスタマイズ。
3. **S-008（判断ポイントタブ）のプレースホルダー**: 「Coming Soon」表示がユーザー体験を損なう可能性。ドッグフーディングで評価。

---

## 次のアクション

### Phase 6: デリバリー
1. Vercelへのデプロイ
2. Storyの受け入れ条件検証
3. デプロイ可否判断
4. 人間オーナーへの `main` マージ提案
