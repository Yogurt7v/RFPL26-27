-- ============================================
-- Фикс дублей матчей «ЦСКА Москва — Ростов»
-- ============================================
-- Проблема: туры 3 и 18 получили зеркальные дубли,
-- когда парсер сменил порядок хозяин/гость.
--   Тур 3: 144690 ЦСКА—Ростов 0:0 (FINISHED) — реальный матч ✅
--          19    Ростов—ЦСКА 27.02.2027 (SCHEDULED) — дубль ❌
--   Тур 18: 144810 Ростов—ЦСКА 27.02.2027 (SCHEDULED) — реальный ✅
--           139    ЦСКА—Ростов 08.08.2026 (SCHEDULED) — дубль ❌
-- Прогнозы были сделаны на ошибочную запись id=19,
-- переносим их на реальный матч 144690 с перестановкой сторон
-- (счёт, пороги голов, исход 1<->2), затем пересчитываем очки.

BEGIN;

-- 1) Перенос прогнозов с ошибочного матча 19 на реальный 144690
--    с перестановкой домашняя/гостевая.
--    В одном UPDATE все RHS читаются из старой строки — перестановка корректна.
UPDATE predictions
SET match_id = 144690,
    predicted_home_score = predicted_away_score,
    predicted_away_score = predicted_home_score,
    home_goals_threshold = away_goals_threshold,
    away_goals_threshold = home_goals_threshold,
    outcome = CASE outcome WHEN '1' THEN '2' WHEN '2' THEN '1' ELSE 'X' END
WHERE match_id = 19;

-- 2) Пересчёт очков по фактическому счёту 0:0 (ЦСКА—Ростов, тур 3)
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
WHERE m.id = 144690
  AND p.match_id = 144690;

-- 3) Удаление зеркальных дублей (19 и 139)
DELETE FROM matches WHERE id IN (19, 139);

-- Проверка после применения:
--   SELECT id, round, home_team, away_team, status, home_score, away_score
--   FROM matches WHERE home_team IN ('ЦСКА Москва','Ростов') OR away_team IN ('ЦСКА Москва','Ростов');
--   SELECT * FROM predictions WHERE match_id = 144690;

COMMIT;
