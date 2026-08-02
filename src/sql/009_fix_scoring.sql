    -- ============================================
    -- Фикс системы начисления очков
    -- ============================================
    -- Проблемы, которые закрывает эта миграция:
    -- 1. Правило «Порог голов НЕ суммируется с точным счётом»
    --    (максимум 8 очков за матч) не было реализовано.
    -- 2. Штраф -1 за полностью неправильный прогноз мог не начисляться:
    --    - функция в БД могла не иметь ветки points = 0 -> -1;
    --    - триггер был только AFTER UPDATE, поэтому матчи, вставляемые
    --      крон-парсером СРАЗУ как FINISHED, не пересчитывались
    --      (points_earned оставался 0).
    -- 3. Функция оперировала старыми полями goals_team/goals_threshold,
    --    а код использует home_goals_threshold / away_goals_threshold.

    -- Логика (согласовано с правилами RFPL26-27.md):
    -- - Точный счёт угадан: 5 (счёт) + 3 (исход) = 8, пороги игнорируются.
    -- - Иначе: угадан исход -> +3; каждый сработавший порог -> +X (оба суммируются).
    -- - Итог 0 очков -> штраф -1.

    -- ============================================
    -- Шаг 1: гарантируем колонки порогов
    -- ============================================
    ALTER TABLE predictions
    ADD COLUMN IF NOT EXISTS home_goals_threshold INTEGER,
    ADD COLUMN IF NOT EXISTS away_goals_threshold INTEGER;

    -- ============================================
    -- Шаг 2: пересоздаём calculate_points
    -- ============================================
    -- Убираем возможные старые сигнатуры, чтобы не было перегрузок.
    DROP FUNCTION IF EXISTS calculate_points(INTEGER, INTEGER, INTEGER, INTEGER, TEXT, TEXT, INTEGER);
    DROP FUNCTION IF EXISTS calculate_points(INTEGER, INTEGER, INTEGER, INTEGER, TEXT, TEXT, TEXT, INTEGER);
    DROP FUNCTION IF EXISTS calculate_points(INTEGER, INTEGER, INTEGER, INTEGER, TEXT, INTEGER, INTEGER);

    CREATE OR REPLACE FUNCTION calculate_points(
    predicted_home INTEGER,
    predicted_away INTEGER,
    actual_home INTEGER,
    actual_away INTEGER,
    outcome TEXT,
    home_goals_threshold INTEGER,
    away_goals_threshold INTEGER
    ) RETURNS INTEGER AS $$
    DECLARE
    points INTEGER := 0;
    predicted_outcome TEXT;
    actual_outcome TEXT := CASE
        WHEN actual_home > actual_away THEN '1'
        WHEN actual_home = actual_away THEN 'X'
        ELSE '2'
    END;
    exact_match BOOLEAN;
    BEGIN
    exact_match := predicted_home IS NOT NULL
        AND predicted_away IS NOT NULL
        AND predicted_home = actual_home
        AND predicted_away = actual_away;

    IF exact_match THEN
        -- Точный счёт (5) + исход (3) = максимум 8. Порог НЕ суммируется.
        points := 5 + 3;
    ELSE
        -- Исход
        IF predicted_home IS NOT NULL AND predicted_away IS NOT NULL THEN
        predicted_outcome := CASE
            WHEN predicted_home > predicted_away THEN '1'
            WHEN predicted_home = predicted_away THEN 'X'
            ELSE '2'
        END;
        IF predicted_outcome = actual_outcome THEN
            points := points + 3;
        END IF;
        ELSIF outcome IS NOT NULL THEN
        IF outcome = actual_outcome THEN
            points := points + 3;
        END IF;
        END IF;

        -- Пороги голов (оба суммируются, если заданы оба)
        IF home_goals_threshold IS NOT NULL AND actual_home >= home_goals_threshold THEN
        points := points + home_goals_threshold;
        END IF;
        IF away_goals_threshold IS NOT NULL AND actual_away >= away_goals_threshold THEN
        points := points + away_goals_threshold;
        END IF;
    END IF;

    -- Полностью неправильный прогноз -> штраф
    IF points = 0 THEN
        RETURN -1;
    END IF;
    RETURN points;
    END;
    $$ LANGUAGE plpgsql;

    -- ============================================
    -- Шаг 3: триггер с учётом INSERT и корректным счётом
    -- ============================================
    CREATE OR REPLACE FUNCTION recalculate_match_predictions() RETURNS TRIGGER AS $$
    BEGIN
    IF NEW.status = 'FINISHED' AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
        UPDATE predictions
        SET points_earned = calculate_points(
        predicted_home_score,
        predicted_away_score,
        NEW.home_score,
        NEW.away_score,
        outcome,
        home_goals_threshold,
        away_goals_threshold
        )
        WHERE match_id = NEW.id;
    END IF;
    RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_recalculate_predictions ON matches;
    CREATE TRIGGER trigger_recalculate_predictions
    AFTER INSERT OR UPDATE OF home_score, away_score, status ON matches
    FOR EACH ROW
    WHEN (NEW.status = 'FINISHED')
    EXECUTE FUNCTION recalculate_match_predictions();

    -- ============================================
    -- Шаг 4: пересчёт очков для уже завершённых матчей
    -- ============================================
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
