---
theme_id: "TH-009"
title: "Phase個別承認UI"
phase: "implementation"
status: "completed"
source: "owner-request"
created_at: "2026-03-25"
updated_at: "2026-03-25"
next_action: "Phase 6（デリバリー）へ進む"
awaiting_review: ""
participants:
  - "AIPO"
  - "AI Dev"
tags:
  - "ui"
  - "review-flow"
---

# Phase 5: 実装 — Phase個別承認UI

## 日付
2026-03-25

## 議論の参加者
- AIPO, AI Dev

## 議論の経緯

### 論点1: ThemeDecision型にidフィールドが不足
- Supabaseの`theme_decisions`テーブルにはUUIDの`id`カラムがあるが、TypeScript型`ThemeDecision`に含まれていなかった
- Server Actionで特定のdecisionを更新するためにidが必須
- 判断: `id: string`をThemeDecision型に追加。parser.ts（Markdown用）では`md-{theme_id}-{phase}`形式のダミーIDを生成

### 論点2: 認証情報の伝搬方法
- `TimelineEntry`コンポーネントで承認ボタンの表示/非表示を制御するため、認証状態が必要
- 判断: `page.tsx` → `TimelineTab` → `TimelineEntry`とpropsで伝搬。`isAuthenticated`プロパティを追加

### 論点3: Server Action設計
- 既存の`approveTheme`はテーマ全体の承認。今回はdecision単位の承認が必要
- 判断: `approveDecision(decisionId)`を新設。`theme_reviews`にdecision_id付きでレビュー記録を挿入し、`theme_decisions.status`を`completed`に更新

## 実装内容
| ファイル | 変更内容 |
|---------|---------|
| `src/lib/data/types.ts` | `ThemeDecision`に`id: string`フィールド追加 |
| `src/lib/data/themes.ts` | `toThemeDecision()`で`id`マッピング追加 |
| `src/lib/data/parser.ts` | Markdown用ダミーID生成 |
| `src/app/actions/review.ts` | `approveDecision` Server Action追加 |
| `src/components/decision-approve-button.tsx` | 承認ボタンコンポーネント新規作成 |
| `src/components/timeline-entry.tsx` | `isAuthenticated` prop追加、awaiting-review時に承認ボタン表示 |
| `src/components/timeline-tab.tsx` | `isAuthenticated` prop追加、TimelineEntryへ伝搬 |
| `src/app/themes/[themeId]/page.tsx` | TimelineTabに`isAuthenticated`を渡す |
| `__tests__/` (7ファイル) | ThemeDecision mockに`id`フィールド追加 |

## テスト結果
| テストケース | 結果 |
|-------------|------|
| TypeScript型チェック (tsc --noEmit) | pass |
| 全テスト (148件 / 19ファイル) | pass |

## 技術的判断とその理由
- `approveDecision`はdecision IDでステータスチェック→レビュー記録挿入→ステータス更新の3ステップ。既存の`approveTheme`パターンに準拠
- RLSポリシーは既に`authenticated`ユーザーに`theme_decisions`のUPDATEと`theme_reviews`のINSERTを許可しているため、追加マイグレーション不要
- Markdownパーサーでは`md-{theme_id}-{phase}`形式のIDを生成。承認ボタンはSupabase上のUUIDに対してのみ動作するため、Markdown由来のダミーIDでは承認操作は行えない（意図通り）

## 次のアクション
- Phase 6（デリバリー）へ進む
