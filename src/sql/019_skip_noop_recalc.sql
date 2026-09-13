-- ============================================
-- Миграция 019: Recalc без перезаписи неизменных прогнозов
-- ============================================
-- Проблема: recalculate_finished_predictions() на каждом синке
-- переписывала ВСЕ прогнозы завершённых матчей (UPDATE даёт новый
-- row-version даже при том же значении). На свободном тарифе это давало
-- всплеск записей и 10-секундные «хвосты» у конкурентных чтений.
--
-- Решение: WHERE ... IS DISTINCT FROM — строка переписывается только
-- когда новое значение очков реально отличается от текущего.
-- Recalc остаётся безусловным (идемпотентным) — безопасность от
-- пропуска пересчёта сохраняется (см. баг с матчем 8-62).

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
    AND m.away_score IS NOT NULL
    AND p.points_earned IS DISTINCT FROM calculate_points(
      p.predicted_home_score,
      p.predicted_away_score,
      m.home_score,
      m.away_score,
      p.outcome,
      p.home_goals_threshold,
      p.away_goals_threshold
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Проверка после применения:
--   SELECT recalculate_finished_predictions();  -- повторный запуск даёт 0