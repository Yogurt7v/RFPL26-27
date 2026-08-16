-- ============================================
-- Миграция 013: Индексы производительности
-- ============================================
-- Проблема: некоторые запросы используют seq scan / не используют индексы:
--   1. predictions.match_id — getMatchOtherPredictions (фильтр по match_id),
--      UNIQUE(user_id, match_id) покрывает только user_id-фильтры.
--   2. favorites.match_id — RPC get_match_favorites (фильтр только по match_id).
--   3. favorites.created_at — get_all_favorites_with_users / get_favorites_overview
--      сортируют по created_at DESC.
--   4. matches.round — getSchedule/getResults сортируют по round, id;
--      save_prediction / delete_prediction / findMatchId ищут матч
--      по (round, home_team, away_team).

CREATE INDEX IF NOT EXISTS idx_predictions_match_id
  ON predictions (match_id);

CREATE INDEX IF NOT EXISTS idx_favorites_match_id
  ON favorites (match_id);

CREATE INDEX IF NOT EXISTS idx_favorites_created_at
  ON favorites (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_matches_round_order
  ON matches (round, id);

CREATE INDEX IF NOT EXISTS idx_matches_round_teams
  ON matches (round, home_team, away_team);

-- Проверка планов запросов:
--   EXPLAIN ANALYZE SELECT * FROM predictions WHERE match_id = 144690;
--   EXPLAIN ANALYZE SELECT f.match_id, u.username, u.id FROM favorites f JOIN users u ON u.id = f.user_id WHERE f.match_id = '3-19';
--   EXPLAIN ANALYZE SELECT * FROM matches ORDER BY round, id;
