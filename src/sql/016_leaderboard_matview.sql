-- ============================================
-- Миграция 016: Leaderboard → materialized view
-- ============================================
-- Проблема: getLeaderboard читал живую view: users LEFT JOIN predictions
-- + GROUP BY + 3 COUNT + ORDER на каждый заход после staleTime 5 мин.
-- Это единственный безындексный агрегат в приложении; пересчёт на чтение
-- масштабируется линейно по users × predictions.
--
-- Решение: материализованное представление. Пересчёт выполняется
-- крон-синхронизацией (api/cron/sync-matches.js) раз в день и при
-- ручном «Обновить» из приложения.
--
-- Условие использования: новый пользователь появляется в таблице
-- только после следующего refresh (до 24 ч). Для текущего масштаба
-- приемлемо; авторизованным/анонимам доступ только на чтение,
-- refresh_leaderboard() — только для service_role (крон).

-- 1) Убираем прежнюю живую view (если создавалась миграциями 001/007)
DROP VIEW IF EXISTS leaderboard;

-- 2) Материализованное представление (тот же смысл, без ORDER BY внутри —
--    сортировка на клиенте: getLeaderboard делает .order('total_points', desc))
CREATE MATERIALIZED VIEW leaderboard AS
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
GROUP BY u.id, u.username, u.starting_points;

-- 3) Уникальный индекс — обязателен для REFRESH ... CONCURRENTLY
CREATE UNIQUE INDEX leaderboard_id_idx ON leaderboard (id);

-- 4) Права на чтение (как было у view)
GRANT SELECT ON leaderboard TO anon, authenticated;

-- 5) Функция обновления: вызывается кроном (service key)
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Запрещаем вызов всем, кроме service_role (не даём анонимам грузить БД)
REVOKE EXECUTE ON FUNCTION refresh_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_leaderboard() TO service_role;

-- Проверка после применения:
--   SELECT * FROM leaderboard ORDER BY total_points DESC;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;  -- вручную, при необходимости