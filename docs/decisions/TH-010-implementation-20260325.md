---
theme_id: "TH-010"
title: "議論ログSupabase Push不具合修正"
phase: "implementation"
status: "completed"
source: "bug-report"
created_at: "2026-03-25"
updated_at: "2026-03-25"
next_action: "Phase 6（デリバリー）へ進む"
awaiting_review: ""
participants:
  - "AIPO"
  - "AI Dev"
tags:
  - "bug-fix"
  - "supabase"
---

# Phase 5: 実装 — 議論ログSupabase Push不具合修正

## 日付
2026-03-25

## 議論の参加者
- AIPO, AI Dev

## 議論の経緯

### 論点1: upsert戦略（merge-duplicates vs ignore-duplicates）
- **AI Devの意見**: `resolution=merge-duplicates` は既存テーマの title を上書きするリスクがある。`resolution=ignore-duplicates`（ON CONFLICT DO NOTHING相当）を採用すべき
- **AIPOの判断**: AI Devの提案を採用。既存テーマの正確なデータを保護することが最優先

### 論点2: ensureThemeExistsの失敗時の挙動
- **AI Devの意見**: ベストエフォートとし、失敗してもログINSERTは試みる
- **AIPOの判断**: 妥当。二重のfallback設計で可用性を最大化

## 実装内容
| ファイル | 変更内容 |
|---------|---------|
| `.claude/hooks/log-discussion.mjs` | `ensureThemeExists()` 関数を追加（L94-L123）。main関数内でinsertLog前に呼び出し（L200-L209） |

### 変更詳細
- `ensureThemeExists(supabaseUrl, serviceRoleKey, themeId)`: themes テーブルへの INSERT（ignore-duplicates）
  - 新規テーマ: `theme_id` と仮タイトル `Theme TH-XXX` でINSERT
  - 既存テーマ: DO NOTHING（上書きなし）
- main関数のステップ5として、ログINSERT前にテーマ存在を保証
- 失敗時はエラーログ出力後、ログINSERTを続行（ベストエフォート）

## テスト結果
| テストケース | 結果 |
|-------------|------|
| 新規テーマ（TH-010）でのログ記録 | pass — request/response 両方記録成功 |
| 既存テーマ（TH-001）のtitle非破壊 | pass — 「AIオーケストレーション可視化ダッシュボード」のまま |
| discussion_logsにTH-010レコード存在 | pass — 2件確認 |
| TH-010テーマの仮タイトル作成 | pass — 「Theme TH-010」で作成 |

## 技術的判断とその理由
- `resolution=ignore-duplicates` 採用: 既存テーマの正確なデータ（title等）を保護するため。仮タイトルは後続の `migrate-md-to-supabase.ts` で上書き可能
- ベストエフォート設計: hookの主目的はログ記録。テーマupsert失敗でログ記録まで止めるのは過剰
- exit 0 維持: 会話フローを止めない設計原則を継続

## 次のアクション
- Phase 6（デリバリー）へ進む
