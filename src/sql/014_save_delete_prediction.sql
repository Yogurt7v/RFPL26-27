-- ============================================
-- Миграция 014: save_prediction / delete_prediction
-- ============================================
-- Проблема: savePrediction делал 3 последовательных round-trip
-- (findMatchId -> проверка status -> upsert), deletePrediction — 2.
-- Решение: единый вызов RPC для каждой операции.
-- Коды возврата save_prediction:
--   1  — сохранено/обновлено
--   0  — матч не найден (round + home_team + away_team)
--   -1 — матч не открыт для прогнозов (status != 'SCHEDULED')

CREATE OR REPLACE FUNCTION save_prediction(
  p_user_id UUID,
  p_home_team TEXT,
  p_away_team TEXT,
  p_round INTEGER,
  p_predicted_home INTEGER,
  p_predicted_away INTEGER,
  p_outcome TEXT,
  p_home_threshold INTEGER,
  p_away_threshold INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_match_id INTEGER;
  v_status TEXT;
BEGIN
  SELECT id INTO v_match_id
  FROM matches
  WHERE round = p_round AND home_team = p_home_team AND away_team = p_away_team;

  IF v_match_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT status INTO v_status FROM matches WHERE id = v_match_id;

  IF v_status IS DISTINCT FROM 'SCHEDULED' THEN
    RETURN -1;
  END IF;

  INSERT INTO predictions (
    user_id,
    match_id,
    predicted_home_score,
    predicted_away_score,
    outcome,
    home_goals_threshold,
    away_goals_threshold
  ) VALUES (
    p_user_id,
    v_match_id,
    p_predicted_home,
    p_predicted_away,
    p_outcome,
    p_home_threshold,
    p_away_threshold
  )
  ON CONFLICT (user_id, match_id) DO UPDATE SET
    predicted_home_score = EXCLUDED.predicted_home_score,
    predicted_away_score = EXCLUDED.predicted_away_score,
    outcome = EXCLUDED.outcome,
    home_goals_threshold = EXCLUDED.home_goals_threshold,
    away_goals_threshold = EXCLUDED.away_goals_threshold,
    updated_at = now();

  RETURN 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_prediction(
  p_user_id UUID,
  p_home_team TEXT,
  p_away_team TEXT,
  p_round INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_match_id INTEGER;
  v_deleted INTEGER;
BEGIN
  SELECT id INTO v_match_id
  FROM matches
  WHERE round = p_round AND home_team = p_home_team AND away_team = p_away_team;

  IF v_match_id IS NULL THEN
    RETURN FALSE;
  END IF;

  DELETE FROM predictions
  WHERE user_id = p_user_id AND match_id = v_match_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION save_prediction(UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_prediction(UUID, TEXT, TEXT, INTEGER) TO anon, authenticated;

-- Проверка после применения:
--   SELECT save_prediction('<user_id>', 'ЦСКА Москва', 'Ростов', 3, 2, 1, '1', NULL, NULL);
--   SELECT delete_prediction('<user_id>', 'ЦСКА Москва', 'Ростов', 3);
