-- ============================================================
-- RLSポリシー
-- ファイル: supabase/migrations/20260323000001_rls_policies.sql
-- ============================================================

-- RLSを有効化
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_reviews ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- themes: SELECTは全員、UPDATE/INSERTは認証済みユーザーのみ
-- ------------------------------------------------------------
CREATE POLICY "themes_select_all"
  ON themes FOR SELECT
  USING (true);

CREATE POLICY "themes_insert_authenticated"
  ON themes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "themes_update_authenticated"
  ON themes FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- theme_decisions: SELECTは全員、UPDATE/INSERTは認証済みユーザーのみ
-- ------------------------------------------------------------
CREATE POLICY "theme_decisions_select_all"
  ON theme_decisions FOR SELECT
  USING (true);

CREATE POLICY "theme_decisions_insert_authenticated"
  ON theme_decisions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "theme_decisions_update_authenticated"
  ON theme_decisions FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- theme_reviews: SELECTは全員、INSERTは認証済みユーザーのみ
-- （レビュー記録は追記のみ。UPDATE/DELETEは不可）
-- ------------------------------------------------------------
CREATE POLICY "theme_reviews_select_all"
  ON theme_reviews FOR SELECT
  USING (true);

CREATE POLICY "theme_reviews_insert_authenticated"
  ON theme_reviews FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- anon ロールにSELECT権限を付与（RLS通過後に実行されるため安全）
-- ------------------------------------------------------------
GRANT SELECT ON themes TO anon;
GRANT SELECT ON theme_decisions TO anon;
GRANT SELECT ON theme_reviews TO anon;

GRANT SELECT, INSERT, UPDATE ON themes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON theme_decisions TO authenticated;
GRANT SELECT, INSERT ON theme_reviews TO authenticated;
