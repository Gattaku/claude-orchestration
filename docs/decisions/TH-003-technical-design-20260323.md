---
theme_id: "TH-003"
title: "議論ログ・議事録のSupabase保存とUI表示"
phase: "technical-design"
status: "completed"
source: "owner-request"
created_at: "2026-03-23"
updated_at: "2026-03-23"
next_action: "Phase 5（実装）へ進む"
awaiting_review: ""
participants:
  - "AIPO"
  - "AI Dev"
  - "AI PD"
tags:
  - "data-gap"
  - "supabase"
  - "schema"
---

# Phase 4: 技術設計 — 決定記録

## 日付
2026-03-23

## 議論の参加者
- AIPO, AI Dev, AI PD

## 議論の経緯

### 論点1: discussion_logsテーブルのスキーマ設計

- **AI Devの意見**: INSERT-only設計にすべき。カラムは最小限に: theme_id, decision_id(nullable), agent_role, direction(request/response), message(TEXT), created_at。Supabase Realtimeは`INSERT`イベントのfilterが最も効率的。
- **AI PDの意見**: agent_roleは表示用に`AIPO`, `AI PM`, `AI PD`, `AI Dev`のENUMが欲しい。directionはUIで吹き出しの左右を決めるのに使う。
- **議論のポイント**: agent_roleをENUMにするかTEXTにするかで議論。ENUMにすると将来の拡張でマイグレーションが必要だが、現状のロールは固定されているためENUMが安全。directionは`request`/`response`の2値で十分。

### 論点2: theme_decisionsテーブルの拡張

- **AI Devの意見**: `input_content`(TEXT, nullable)と`decisions_summary`(TEXT, nullable)の2カラムを追加。既存データへの影響はなし（nullable）。
- **AIPO判断**: 採用。既存のbody_htmlはそのまま残し、新カラムは補完的に使う。

### 論点3: UIコンポーネント構成

- **AI PDの意見**: 議論ログタブはチャット風UIがわかりやすい。agent_roleごとにアイコン色を分け、directionで左寄せ（request）・右寄せ（response）にする。ただしMVPでは単純なリスト表示で十分。
- **AI Devの意見**: 新コンポーネントは`discussion-log-tab.tsx`と`discussion-log-entry.tsx`。既存のtimeline-tab.tsxを拡張してタブを追加する形。
- **AIPO判断**: MVPはリスト表示。チャット風UIはリアルタイム機能と合わせて後続で検討。

## 検討した選択肢

### 案A: discussion_logsを独立テーブル + theme_decisions拡張 — 採用
- 内容: 新テーブル`discussion_logs` + 既存テーブルにカラム追加
- メリット: 関心事が分離。ログは高頻度INSERT、decisionsは低頻度UPDATE。Realtime subscriptionをログテーブルだけに絞れる
- デメリット: テーブルが増える

### 案B: theme_decisionsにJSONBカラムで議論ログを埋め込む
- 内容: `discussion_log JSONB`カラムを追加
- メリット: テーブル数が増えない
- デメリット: JOINなしでログ取得できるが、Realtimeでの差分検知が困難。ログが大きくなるとパフォーマンス劣化

## 決定事項

### 1. 新テーブル: discussion_logs

```sql
CREATE TYPE agent_role_enum AS ENUM ('AIPO', 'AI PM', 'AI PD', 'AI Dev');
CREATE TYPE message_direction_enum AS ENUM ('request', 'response');

CREATE TABLE discussion_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id    TEXT NOT NULL REFERENCES themes(theme_id) ON DELETE CASCADE,
  decision_id UUID REFERENCES theme_decisions(id) ON DELETE SET NULL,
  agent_role  agent_role_enum NOT NULL,
  direction   message_direction_enum NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discussion_logs_theme_id ON discussion_logs(theme_id);
CREATE INDEX idx_discussion_logs_decision_id ON discussion_logs(decision_id);
CREATE INDEX idx_discussion_logs_created_at ON discussion_logs(theme_id, created_at);
```

### 2. theme_decisionsテーブルの拡張

```sql
ALTER TABLE theme_decisions ADD COLUMN input_content TEXT;
ALTER TABLE theme_decisions ADD COLUMN decisions_summary TEXT;
```

### 3. RLSポリシー

```sql
ALTER TABLE discussion_logs ENABLE ROW LEVEL SECURITY;
-- SELECT: 全員、INSERT: authenticated
CREATE POLICY "discussion_logs_select_all" ON discussion_logs FOR SELECT USING (true);
CREATE POLICY "discussion_logs_insert_authenticated" ON discussion_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
GRANT SELECT ON discussion_logs TO anon;
GRANT SELECT, INSERT ON discussion_logs TO authenticated;
```

### 4. TypeScript型定義

```typescript
export type AgentRole = 'AIPO' | 'AI PM' | 'AI PD' | 'AI Dev';
export type MessageDirection = 'request' | 'response';

export interface DiscussionLog {
  id: string;
  theme_id: string;
  decision_id: string | null;
  agent_role: AgentRole;
  direction: MessageDirection;
  message: string;
  created_at: string;
}
```

### 5. データ取得関数

- `getDiscussionLogsByThemeId(themeId: string): Promise<DiscussionLog[]>` -- theme_idでフィルタ、created_at昇順
- `getThemeById`を拡張してdiscussion_logsも含める（Theme型にdiscussion_logs追加）

### 6. UIコンポーネント

- `timeline-tab.tsx`: 3タブ構成に変更（タイムライン / 議論ログ / 判断ポイント→決定事項サマリー）
- `discussion-log-entry.tsx`: 新規。ログエントリの表示（agent_role、direction、message、timestamp）
- `timeline-entry.tsx`: input_contentとdecisions_summaryの表示を追加（折りたたみ可能）

## 判断理由
- 独立テーブル案を採用。将来のRealtime対応でdiscussion_logsテーブルのみをsubscribeすれば済む
- INSERT-only設計でUPDATE/DELETEを想定しない。ログは追記のみが自然
- ENUMを使うことで不正なデータの混入を防ぐ。現状のロールは固定されており拡張頻度は低い

## 却下した案とその理由
- **案B（JSONB埋め込み）**: Realtimeとの相性が悪い。ログが大きくなるとdecisionsテーブル全体のパフォーマンスに影響

## リスク・不確実性
- discussion_logsの量が大きくなった場合のページネーション: MVPでは100件上限で取得。将来的にcursorベースのページネーションを追加
- 既存のTH-001, TH-002にはdiscussion_logsがない: empty stateで対応

## 次のアクション
- Phase 5（実装）: 上記設計に基づいて実装を進める
