---
theme_id: "TH-004"
title: "議論ログINSERT機能の接続とエージェント定義更新"
phase: "story-definition"
status: "completed"
source: "dogfooding-feedback"
created_at: "2026-03-23"
updated_at: "2026-03-23"
next_action: "Phase 5（実装）へ進む"
awaiting_review: ""
participants:
  - "AIPO"
  - "AI PM"
  - "AI PD"
  - "AI Dev"
tags:
  - "discussion-logs"
  - "agent-integration"
---

# Phase 3: Story策定 -- 決定記録

## 日付
2026-03-23

## 議論の参加者
- AIPO, AI PM, AI PD, AI Dev

## 議論の経緯

### 論点1: エージェントが議論ログをINSERTするタイミングと方法
- **AI PMの意見**: エージェントはCLI上で動作するため、CLIスクリプト `scripts/insert-discussion-log.ts` を `Bash` ツール経由で呼び出すのが現実的
- **AI PDの意見**: UIの3タブ構成は実装済み。データが入ればリアルタイムで議論を追跡できる
- **AI Devの意見**: CLIスクリプトは `SUPABASE_SERVICE_ROLE_KEY` を使いRLSバイパス可能。エージェントはサーバーサイド（CLI）で動作するので適切。API Route案は認証が複雑になる
- **議論のポイント**: 全員CLIスクリプト方式で合意。API Route案は将来Realtime対応時に再検討

### 論点2: 記録の責任分担（一元管理 vs 分散管理）
- **AI PMの意見**: AIPOが一元的にrequest/responseを記録するのが管理しやすい
- **AI Devの意見**: AIPOの一元管理を基本としつつ、各サブエージェントにもresponse記録指示を追加してロバスト性を向上させる
- **議論のポイント**: 案A（AIPOが両方記録 + サブエージェントのフォールバック記録）を採用

### 論点3: シードデータの設計
- **AI PMの意見**: TH-003をテーマとした各Phase・各ロールの議論ログを用意すべき
- **AI Devの意見**: `insertDiscussionLogBatch` を使ったバッチINSERT。冪等性のため実行前の既存データ削除オプションを追加

## 検討した選択肢

### 案A: CLIスクリプト + AIPO一元管理 + サブエージェントフォールバック（採用）
- 内容: 既存CLIスクリプトをBash経由で呼び出す指示をエージェント定義に追加
- メリット: シンプル、既存インフラ活用、冗長性あり
- デメリット: Bashコマンド実行のオーバーヘッド

### 案B: API Route + curl呼び出し（却下）
- 内容: `/api/discussion-logs` エンドポイントを作成しcurlで呼ぶ
- メリット: RESTful、将来のWebhook統合に有利
- デメリット: 認証処理が複雑、開発サーバー起動が前提

## 決定事項
- CLIスクリプト方式を採用
- AIPOが一元的にrequest/responseを記録する
- 各サブエージェントにもresponse記録のフォールバック指示を追加
- バリデーション関数のユニットテストを追加
- シードデータ投入スクリプトを新規作成

## 判断理由
- 既存の `scripts/insert-discussion-log.ts` と `insertDiscussionLog` 関数が既に実装済みであり、新たな技術スタックは不要
- CLIスクリプト方式はエージェントのBashツール利用と親和性が高い
- MVP思考に基づき、最小限の変更で最大の効果を得る

## 却下した案とその理由
- API Route案: 認証の複雑さとdev server依存のため却下。将来Realtime対応時に再検討

## リスク・不確実性
- エージェントがBashコマンドを確実に実行するかはClaude Codeの動作に依存
- `SUPABASE_SERVICE_ROLE_KEY` が未設定の環境ではINSERTが失敗する（エラーハンドリング済み）

## Storyリスト

### Story 1: エージェント定義に議論ログINSERT指示を追加
- 概要: AIPO/AI PM/AI PD/AI Devの定義に議論ログ記録の手順を追加
- 受け入れ条件:
  - [ ] AIPO定義にrequest/response記録の指示がある
  - [ ] 各サブエージェント定義にresponse記録の指示がある
  - [ ] CLIスクリプトの呼び出し方法が明記されている
- 優先度: High
- 見積もり: S

### Story 2: INSERT関数のユニットテストを追加
- 概要: validateDiscussionLogInput / insertDiscussionLog / insertDiscussionLogBatch のテスト
- 受け入れ条件:
  - [ ] バリデーション関数の正常系・異常系テストがパスする
  - [ ] INSERT関数のモックテストがパスする
  - [ ] バッチINSERT関数のモックテストがパスする
- 優先度: High
- 見積もり: M

### Story 3: シードデータ投入スクリプトを作成
- 概要: UIの動作確認用にリアルな議論ログデータを投入するスクリプト
- 受け入れ条件:
  - [ ] `scripts/seed-discussion-logs.ts` が存在し実行可能
  - [ ] TH-003の議論ログ（各Phase・各ロール）が投入される
  - [ ] 冪等実行が可能（--clean オプション）
- 優先度: Medium
- 見積もり: S

## 次のアクション
- Phase 5（実装）へ進む
