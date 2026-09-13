-- ============================================
-- Миграция 017: Массовый пересчёт очков вместо триггера
-- ============================================
-- Проблема: рекурсивный триггер FOR EACH ROW AFTER INSERT/UPDATE
-- считал прогнозы каждого завершённого матча отдельным UPDATE.
-- Во время пачки (крон upsert'ит все FINISHED разом) это давало
-- всплеск запросов: 1 UPDATE на каждый матч.
--
-- Решение: триггер убираем, крон после upsert матчей вызывает
-- recalculate_finished_predictions() — один bulk-UPDATE по всем
-- завершённым прогнозам (паттерн шага 4 миграции 009).
--
-- Условие использования: api/cron/sync-matches.js — единственный
-- писатель таблицы matches. Если появится другой источник записи
-- FINISHED-матчей, массовый пересчёт нужно вернуть в него же.

-- 1) Убираем построчный триггер и его функцию
DROP TRIGGER IF EXISTS trigger_recalculate_predictions ON matches;
DROP FUNCTION IF EXISTS recalculate_match_predictions();

-- 2) Bulk-функция пересчёта всех прогнозов завершённых матчей.
--    Идемпотентна: повторный запуск даёт тот же результат.
CREATE OR REPLACE FUNCTION recalculate_finished_predictions()
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE predictions p
  SET points_earned = calculate_points(
    p.predicted_home_score,
    p.predicted_away_score,
    m.home_score,
    m.away_score,
    p.outcome,
    p.home_goals_threshold,
    p.away_goals_threshold
  )
  FROM matches m
  WHERE m.id = p.match_id
    AND m.status = 'FINISHED'
    AND m.home_score IS NOT NULL
    AND m.away_score IS NOT NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Запрещаем вызов всем, кроме service_role (крон)
REVOKE EXECUTE ON FUNCTION recalculate_finished_predictions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION recalculate_finished_predictions() TO service_role;

-- Проверка после применения:
--   SELECT recalculate_finished_predictions();
--   SELECT * FROM predictions WHERE match_id = 19;