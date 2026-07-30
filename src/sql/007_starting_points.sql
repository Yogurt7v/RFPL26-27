-- ============================================
-- Шаг 3.1: Добавление стартовых очков
-- ============================================

-- Колонка starting_points добавляется каждому пользователю.
-- По умолчанию 30 — все существующие пользователи получат 30 очков.
ALTER TABLE users ADD COLUMN IF NOT EXISTS starting_points INTEGER NOT NULL DEFAULT 30;

-- ============================================
-- Шаг 3.2: Обновление leaderboard
-- ============================================

-- Включаем стартовые очки в общую сумму.
-- total_points = стартовые (+30) + заработанные на прогнозах.
DROP VIEW IF EXISTS leaderboard;
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  u.id,
  u.username,
  (u.starting_points + COALESCE(SUM(p.points_earned), 0))::INTEGER AS total_points,
  COUNT(p.id)::INTEGER AS total_predictions,
  COUNT(CASE WHEN p.points_earned >= 5 THEN 1 END)::INTEGER AS exact_scores,
  COUNT(CASE WHEN p.points_earned >= 3 THEN 1 END)::INTEGER AS correct_outcomes,
  COUNT(CASE WHEN p.points_earned > 0 THEN 1 END)::INTEGER AS scored_predictions
FROM users u
LEFT JOIN predictions p ON u.id = p.user_id
GROUP BY u.id, u.username, u.starting_points
ORDER BY total_points DESC;
