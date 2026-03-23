---
theme_id: "TH-003"
title: "議論ログ・議事録のSupabase保存とUI表示"
phase: "implementation"
status: "completed"
source: "owner-request"
created_at: "2026-03-23"
updated_at: "2026-03-23"
next_action: "Phase 6（デリバリー）へ進む"
awaiting_review: ""
participants:
  - "AIPO"
  - "AI Dev"
  - "AI PD"
tags:
  - "data-gap"
  - "supabase"
  - "implementation"
---

# Phase 5: 実装 — 決定記録

## 日付
2026-03-23

## 議論の参加者
- AIPO, AI Dev, AI PD

## 実装サマリー

### Story 1: DBスキーマ + 型定義 + データ取得ロジック

**実装したファイル:**
- `supabase/migrations/20260323000002_discussion_logs.sql` -- 新テーブル・カラム追加・RLS
- `src/lib/data/types.ts` -- DiscussionLog型、AgentRole型、MessageDirection型を追加。ThemeDecision型にinput_content/decisions_summaryを追加。Theme型にdiscussion_logsを追加
- `src/lib/data/themes.ts` -- toDiscussionLog変換関数、getDiscussionLogsByThemeId関数を追加。getAllThemes/buildThemeをdiscussion_logs対応に拡張

**マイグレーション内容:**
- `agent_role_enum` ENUM型（AIPO, AI PM, AI PD, AI Dev）
- `message_direction_enum` ENUM型（request, response）
- `discussion_logs`テーブル（INSERT-only設計、3つのインデックス）
- `theme_decisions`に`input_content`と`decisions_summary`カラムを追加（nullable）
- RLSポリシー: SELECT全員、INSERT authenticated

### Story 2: 議論ログタブのUI実装

**実装したファイル:**
- `src/components/discussion-log-entry.tsx` -- 新規。エージェントごとに色分けされたバッジ、direction（request/response）で左右配置、タイムスタンプ表示
- `src/components/timeline-tab.tsx` -- 3タブ構成に変更（タイムライン / 議論ログ / 決定事項）。Coming Soonを廃止
- `src/app/themes/[themeId]/page.tsx` -- TimelineTabにdiscussionLogsプロパティを渡すよう更新

### Story 3: タイムラインのInput内容・決定事項の表示強化

**実装したファイル:**
- `src/components/timeline-entry.tsx` -- decisions_summaryをハイライト表示（青い左ボーダー付き）。input_contentを折りたたみ可能なセクションとして表示。"use client"を追加（useStateのため）

### テスト更新

**更新したテストファイル:**
- `__tests__/components/timeline-tab.test.tsx` -- 3タブ構成に対応。議論ログタブ、決定事項タブのテストを追加
- `__tests__/components/timeline-entry.test.tsx` -- decisions_summary表示、input_content折りたたみのテストを追加
- `__tests__/components/discussion-log-entry.test.tsx` -- 新規。agent_role表示、direction配置、タイムスタンプのテスト
- `__tests__/components/theme-card.test.tsx` -- Theme型にdiscussion_logsを追加
- `__tests__/components/theme-list.test.tsx` -- Theme型にdiscussion_logsを追加
- `__tests__/lib/themes.test.ts` -- discussion_logsテーブルのモックを追加
- `__tests__/types.test.ts` -- AgentRole、MessageDirection、DiscussionLog型のテストを追加

## テスト結果
- 18ファイル、116テスト: 全パス
- ESLint: エラーなし

## 議論の経緯

### 論点: timeline-entry.tsxのクライアントコンポーネント化
- **AI Devの意見**: input_contentの折りたたみにuseStateが必要。"use client"ディレクティブの追加が必要
- **AI PDの意見**: 折りたたみUIはユーザビリティ上必須。常に展開だとページが長くなりすぎる
- **AIPO判断**: クライアントコンポーネント化を採用。timeline-entry単体のhydrationコストは許容範囲内

## 決定事項
- 全3 Storyの実装完了
- Coming Soonだった「判断ポイント」タブを「決定事項」タブとして実装
- timeline-entry.tsxをクライアントコンポーネントに変更（折りたたみUI対応）

## 次のアクション
- Phase 6（デリバリー）: 受け入れ条件の検証、最終コミット・push
