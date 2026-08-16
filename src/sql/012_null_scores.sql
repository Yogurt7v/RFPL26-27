-- ============================================
-- Обнуление счёта незавершённых матчей
-- ============================================
-- Старый крон-парсер писал home_score/away_score = 0 для запланированных
-- матчей (SCHEDULED) вместо NULL. Из-за этого UI показывал «реальный счёт»
-- 0:0 для ещё не сыгранных матчей.
-- Крон исправлен (пишет NULL). Эта миграция чистит уже сохранённые строки.

UPDATE matches
SET home_score = NULL, away_score = NULL
WHERE status = 'SCHEDULED'
  AND home_score = 0
  AND away_score = 0;

-- Проверка после применения:
--   SELECT status, home_score, away_score, COUNT(*)
--   FROM matches
--   GROUP BY status, home_score, away_score;
