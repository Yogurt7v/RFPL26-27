-- ============================================
-- Перенумерация матчей «ЦСКА Москва — Ростов»
-- ============================================
-- После миграции 010 (удаление зеркальных дублей) реальные матчи
-- остались с «большими» id из оригинального импорта (soccer365):
--   Тур 3:  144690 ЦСКА—Ростов (FINISHED 0:0)  → id 19
--   Тур 18: 144810 Ростов—ЦСКА (SCHEDULED)      → id 139
-- Прогнозы переносим на новые id (FK matches(id)).
-- Других ссылок на эти id нет (favorites пуста, в коде не хардкодятся).

-- ВАЖНО: FK predictions.match_id → matches(id) не отложенный (NOT DEFERRABLE),
-- поэтому напрямую обменять ссылки нельзя — любая из сторон нарушит FK.
-- Решение: временно снять FK, обновить данные, вернуть FK обратно.

BEGIN;

-- 0) Снимаем FK, чтобы переставить id в обеих таблицах
ALTER TABLE predictions DROP CONSTRAINT predictions_match_id_fkey;

-- 1) Прогнозы: 144690 → 19
UPDATE predictions SET match_id = 19 WHERE match_id = 144690;

-- 2) Перенумерация матчей
UPDATE matches SET id = 19  WHERE id = 144690;  -- тур 3:  ЦСКА—Ростов
UPDATE matches SET id = 139 WHERE id = 144810;  -- тур 18: Ростов—ЦСКА

-- 3) Возвращаем FK (валидация пройдёт — прогнозы ссылаются на существующий id 19)
ALTER TABLE predictions ADD CONSTRAINT predictions_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

-- 4) Сброс последовательности, чтобы будущие id были компактными
SELECT setval('matches_id_seq', COALESCE((SELECT MAX(id) FROM matches), 0) + 1, false);

-- Проверка после применения:
--   SELECT id, round, home_team, away_team, status, home_score, away_score
--   FROM matches WHERE id IN (19, 139);
--   SELECT * FROM predictions WHERE match_id = 19;

COMMIT;
