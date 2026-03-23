-- ============================================================
-- TH-003: 議論ログ・議事録のSupabase保存
-- ファイル: supabase/migrations/20260323000002_discussion_logs.sql
-- ============================================================

-- ------------------------------------------------------------
-- ENUM型
-- ------------------------------------------------------------
CREATE TYPE agent_role_enum AS ENUM (
  'AIPO',
  'AI PM',
  'AI PD',
  'AI Dev'
);

CREATE TYPE message_direction_enum AS ENUM (
  'request',
  'response'
);

-- ------------------------------------------------------------
-- discussion_logs: エージェント間の議論生ログ
-- INSERT-only設計（将来のSupabase Realtime対応を見据える）
-- ------------------------------------------------------------
CREATE TABLE discussion_logs (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id    TEXT            NOT NULL REFERENCES themes(theme_id) ON DELETE CASCADE,
  decision_id UUID            REFERENCES theme_decisions(id) ON DELETE SET NULL,
  agent_role  agent_role_enum NOT NULL,
  direction   message_direction_enum NOT NULL,
  message     TEXT            NOT NULL,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_discussion_logs_theme_id ON discussion_logs(theme_id);
CREATE INDEX idx_discussion_logs_decision_id ON discussion_logs(decision_id);
CREATE INDEX idx_discussion_logs_created_at ON discussion_logs(theme_id, created_at);

-- ------------------------------------------------------------
-- theme_decisions: カラム追加（議事録本文・決定事項サマリー）
-- ------------------------------------------------------------
ALTER TABLE theme_decisions ADD COLUMN input_content TEXT;
ALTER TABLE theme_decisions ADD COLUMN decisions_summary TEXT;

-- ------------------------------------------------------------
-- RLS: discussion_logs
-- ------------------------------------------------------------
ALTER TABLE discussion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussion_logs_select_all"
  ON discussion_logs FOR SELECT
  USING (true);

CREATE POLICY "discussion_logs_insert_authenticated"
  ON discussion_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT ON discussion_logs TO anon;
GRANT SELECT, INSERT ON discussion_logs TO authenticated;
