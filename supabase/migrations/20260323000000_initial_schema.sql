-- ============================================================
-- Supabase統合 v1: DBスキーマ
-- ファイル: supabase/migrations/20260323000000_initial_schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- ENUM型
-- ------------------------------------------------------------
CREATE TYPE phase_enum AS ENUM (
  'triage',
  'insight-extraction',
  'value-definition',
  'story-definition',
  'technical-design',
  'implementation',
  'delivery'
);

CREATE TYPE status_enum AS ENUM (
  'in-progress',
  'awaiting-review',
  'completed',
  'on-hold'
);

CREATE TYPE review_action_enum AS ENUM (
  'approved',
  'rejected'
);

-- ------------------------------------------------------------
-- themes: テーママスター
-- TypeScript型: Theme
-- ------------------------------------------------------------
CREATE TABLE themes (
  theme_id     TEXT         PRIMARY KEY,
  title        TEXT         NOT NULL,
  current_phase  phase_enum   NOT NULL DEFAULT 'triage',
  current_status status_enum  NOT NULL DEFAULT 'in-progress',
  source       TEXT         NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  next_action  TEXT         NOT NULL DEFAULT '',
  awaiting_review TEXT      NOT NULL DEFAULT ''
);

-- updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER themes_updated_at
  BEFORE UPDATE ON themes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- theme_decisions: 決定記録
-- TypeScript型: ThemeDecision
-- ------------------------------------------------------------
CREATE TABLE theme_decisions (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id       TEXT         NOT NULL REFERENCES themes(theme_id) ON DELETE CASCADE,
  title          TEXT         NOT NULL,
  phase          phase_enum   NOT NULL,
  status         status_enum  NOT NULL DEFAULT 'in-progress',
  source         TEXT         NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  next_action    TEXT         NOT NULL DEFAULT '',
  awaiting_review TEXT        NOT NULL DEFAULT '',
  participants   TEXT[]       NOT NULL DEFAULT '{}',
  tags           TEXT[]       DEFAULT '{}',
  body_html      TEXT         NOT NULL DEFAULT ''
);

CREATE INDEX idx_theme_decisions_theme_id ON theme_decisions(theme_id);
CREATE INDEX idx_theme_decisions_phase ON theme_decisions(theme_id, phase);

CREATE TRIGGER theme_decisions_updated_at
  BEFORE UPDATE ON theme_decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- theme_reviews: Go/No-Go操作の履歴
-- 新規テーブル（TypeScript型に対応する型はv1実装時に追加）
-- ------------------------------------------------------------
CREATE TABLE theme_reviews (
  id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id       TEXT            NOT NULL REFERENCES themes(theme_id) ON DELETE CASCADE,
  decision_id    UUID            REFERENCES theme_decisions(id) ON DELETE SET NULL,
  action         review_action_enum NOT NULL,
  reviewer_email TEXT            NOT NULL,
  comment        TEXT,
  created_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_theme_reviews_theme_id ON theme_reviews(theme_id);
CREATE INDEX idx_theme_reviews_created_at ON theme_reviews(created_at DESC);
