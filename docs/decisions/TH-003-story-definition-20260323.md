---
theme_id: "TH-003"
title: "議論ログ・議事録のSupabase保存とUI表示"
phase: "story-definition"
status: "completed"
source: "owner-request"
created_at: "2026-03-23"
updated_at: "2026-03-23"
next_action: "Phase 4（技術設計）へ進む"
awaiting_review: ""
participants:
  - "AIPO"
  - "AI PM"
  - "AI PD"
  - "AI Dev"
tags:
  - "data-gap"
  - "supabase"
---

# Phase 3: Story策定 — 決定記録

## 日付
2026-03-23

## 議論の参加者
- AIPO, AI PM, AI PD, AI Dev

## 議論の経緯

### 論点1: Story粒度 — どの単位で分割するか

- **AI PMの意見**: ギャップの重要度に基づいて4つのStory（議論ログ保存、Input内容保存、決定事項構造化、判断ポイントタブUI）に分けるべき。ユーザー価値の単位で切れる。
- **AI PDの意見**: UI変更は2段階に分けたい。(1)議論ログタブの実装 (2)タイムラインへのInput内容の組み込み。判断ポイントタブを議論ログタブに置き換えるのが自然。
- **AI Devの意見**: DBスキーマ変更（新テーブル + 既存テーブルのカラム追加）は整合性の観点から1つのマイグレーションにまとめるべき。保存ロジックとUI表示は分離できる。
- **議論のポイント**: AI PMが4つ、AI PDが2つ、AI Devが技術レイヤーで1つ。AIPO判断で「DB+保存」「UI表示」「データ構造化」の3つに整理。ただしMVP方針で「データ構造化」は後回し可能。

### 論点2: 「判断ポイント」タブの扱い

- **AI PMの意見**: ユーザーが「決まったこと」を見たいという明確なニーズがある。Coming Soonを解消すべき。
- **AI PDの意見**: 既存の「判断ポイント」タブを活かし、決定事項のサマリーを表示するのが自然。議論ログは新しいタブか、タイムライン内に統合する。
- **AI Devの意見**: 決定事項の構造化（JSON抽出）はMVPとしては重い。まずはdecisionsテーブルから「決定事項」セクションを表示するだけでも十分。
- **議論のポイント**: 完全な構造化はMVPで不要。既存のbody_htmlから決定セクションを表示するか、新しい`decisions_summary`カラムを追加するかの2択。後者が将来拡張しやすい。

### 論点3: 将来のリアルタイム化との整合性

- **AI Devの意見**: Supabase Realtimeはテーブル単位でsubscribeする。discussion_logsテーブルをINSERT-onlyで設計しておけば、将来`supabase.channel().on('postgres_changes', ...)`で新規ログをリアルタイム受信できる。UPDATEベースの設計にすると差分検知が面倒になる。
- **AI PDの意見**: リアルタイム表示では「誰が今話しているか」のインジケーターが将来必要。テーブルに`agent_role`と`direction`(request/response)を入れておけば対応しやすい。
- **AIPO判断**: INSERT-only設計 + agent_role + directionカラムを採用。将来のリアルタイム化の延長線上にある設計にする。

## 検討した選択肢

### 案A: 4 Story分割（AI PM案）
- 内容: 議論ログ保存 / Input内容保存 / 決定事項構造化 / UIタブ実装の4つ
- メリット: 粒度が細かく、個別にリリース・テスト可能
- デメリット: DBスキーマが2回に分かれて整合性リスク。オーバーヘッド大

### 案B: 3 Story分割（AIPO統合案）— 採用
- 内容: Story 1(DBスキーマ+保存ロジック) / Story 2(議論ログUI) / Story 3(判断ポイントタブUI)
- メリット: 技術レイヤーとUI レイヤーが適切に分離。DBは一括で整合性確保
- デメリット: Story 1が少し大きい

### 案C: 2 Story分割（最小）
- 内容: バックエンド一括 / フロントエンド一括
- メリット: シンプル
- デメリット: 各Storyが大きすぎてレビューしにくい

## 決定事項

### Story 1: 議論ログ・Input内容のDBスキーマと保存ロジック
- **目的**: エージェント間の議論生ログとInput内容をSupabaseに保存可能にする
- **受け入れ条件**:
  - [ ] `discussion_logs`テーブルが作成されている（theme_id, decision_id, agent_role, direction, message, created_at）
  - [ ] `theme_decisions`テーブルに`input_content`カラム（議事録・Input本文を保存）と`decisions_summary`カラム（決定事項テキスト）が追加されている
  - [ ] TypeScript型定義が更新されている（DiscussionLog型、ThemeDecision型の拡張）
  - [ ] データ取得関数が拡張されている（getDiscussionLogs, getThemeByIdが新データを含む）
  - [ ] RLSポリシーが設定されている（SELECT: 全員、INSERT: authenticated）
  - [ ] マイグレーションスクリプトが更新されている

### Story 2: 議論ログタブのUI実装
- **目的**: エージェント間の議論の流れをUI上で閲覧可能にする
- **受け入れ条件**:
  - [ ] 「判断ポイント」タブが「議論ログ」タブに変更されている
  - [ ] 議論ログが時系列で表示される（エージェント名、direction、メッセージ、タイムスタンプ）
  - [ ] ログが空の場合は適切なempty stateが表示される
  - [ ] テーマ詳細ページから議論ログが閲覧できる

### Story 3: タイムラインのInput内容・決定事項の表示強化
- **目的**: タイムラインエントリにInput内容と決定事項サマリーを表示する
- **受け入れ条件**:
  - [ ] タイムラインエントリにInput内容（議事録本文など）が表示される（折りたたみ可能）
  - [ ] タイムラインエントリに決定事項サマリーがハイライト表示される
  - [ ] 既存のbody_html表示と共存する

## 判断理由
- 3 Story分割を採用。DBスキーマを1つのマイグレーションにまとめることで整合性を確保しつつ、UI実装を2段階に分けることでレビューしやすくした
- 「データ構造化（JSON化）」はMVPスコープ外とし、テキストベースの`decisions_summary`カラムで代替。将来のフェーズで構造化を検討する
- INSERT-only設計で将来のSupabase Realtime対応を見据えた

## 却下した案とその理由
- **案A（4分割）**: DBスキーマが複数マイグレーションに分かれるリスク。この規模では過剰な分割
- **案C（2分割）**: 各Storyが大きすぎてレビュー困難。UI変更の2つの関心事（議論ログ vs タイムライン強化）を混ぜるべきでない

## リスク・不確実性
- discussion_logsのデータ量が大きくなった場合のページネーション設計は本テーマでは最低限（将来改善）
- 既存データ（TH-001, TH-002）にはdiscussion_logsがないため、過去データは空表示になる
- decisions_summaryの内容品質はAIPOの記録精度に依存する

## 次のアクション
- Phase 4（技術設計）: 新テーブルの詳細スキーマ、Realtime対応を見据えたインデックス設計、UIコンポーネント構成を策定する
