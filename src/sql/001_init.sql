-- ============================================
-- Шаг 2.1: Расширение pgcrypto
-- ============================================

-- Расширение pgcrypto добавляет в PostgreSQL криптографические функции.
-- Нам нужно оно для хеширования паролей алгоритмом SHA-256.
-- Без этого расширения функция digest() будет недоступна.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- Шаг 2.2: Таблица users
-- ============================================

-- Таблица пользователей. Каждый пользователь имеет:
-- - id (UUID) — уникальный идентификатор, генерируется автоматически
-- - username (TEXT) — логин, должен быть уникальным
-- - password_hash (TEXT) — хеш пароля (SHA-256), не сам пароль
-- - created_at — дата регистрации
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Шаг 2.3: Таблица matches
-- ============================================

-- Таблица матчей РПЛ. Хранит расписание и результаты всех матчей.
-- Основные поля:
-- - home_team / away_team — команды (хозяева и гости)
-- - match_date — дата и время матча
-- - status — статус: SCHEDULED (запланирован), LIVE (идёт), FINISHED (завершён)
-- - home_score / away_score — счёт матча
-- - round — номер тура (1-30)
-- - stadium_name / city / timezone — информация о стадионе
CREATE TABLE matches (
  id INTEGER PRIMARY KEY,
  league_id INTEGER DEFAULT 0,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  match_date TIMESTAMPTZ,
  status TEXT DEFAULT 'SCHEDULED',
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  half_time_home_score INTEGER,
  half_time_away_score INTEGER,
  stadium_name TEXT,
  city TEXT,
  timezone TEXT,
  round INTEGER,
  home_penalty_score INTEGER,
  away_penalty_score INTEGER,
  last_update TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Шаг 2.4: Таблица predictions
-- ============================================

-- Таблица прогнозов пользователей. Связывает users с matches.
-- Каждый пользователь может сделать один прогноз на каждый матч (UNIQUE на user_id + match_id).
-- Прогноз может включать:
-- - Точный счёт: predicted_home_score + predicted_away_score
-- - Исход: outcome (1, X или 2)
-- - Порог голов: goals_team (home/away) + goals_threshold (число голов)
-- points_earned — начисленные очки (пересчитываются триггером)
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  predicted_home_score INTEGER,
  predicted_away_score INTEGER,
  outcome TEXT CHECK (outcome IN ('1', 'X', '2')),
  goals_team TEXT CHECK (goals_team IN ('home', 'away')),
  goals_threshold INTEGER,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, match_id)
);

-- ============================================
-- Шаг 2.5: Функция calculate_points
-- ============================================

-- Функция расчёта очков за один прогноз.
-- Логика:
-- 1. Если пользователь угадал точный счёт → +5 очков
-- 2. Если угадал исход (1/X/2) → +3 очка
--    (исход засчитывается и при точном счёте, и при пороге, и отдельно)
-- 3. Если поставил порог голов и команда забила ≥ порога → +X очков (равно порогу)
-- 4. Порог голов НЕ суммируется с точным счётом
-- Пример: прогноз 2:1, реальность 2:1 → 8 очков (5 за счёт + 3 за исход)
CREATE OR REPLACE FUNCTION calculate_points(
  predicted_home INTEGER,
  predicted_away INTEGER,
  actual_home INTEGER,
  actual_away INTEGER,
  outcome TEXT,
  goals_team TEXT,
  goals_threshold INTEGER
) RETURNS INTEGER AS $$
DECLARE
  points INTEGER := 0;
  predicted_outcome TEXT;
  actual_outcome TEXT := CASE
    WHEN actual_home > actual_away THEN '1'
    WHEN actual_home = actual_away THEN 'X'
    ELSE '2'
  END;
BEGIN
  -- Проверка точного счёта + исхода
  IF predicted_home IS NOT NULL AND predicted_away IS NOT NULL THEN
    IF predicted_home = actual_home AND predicted_away = actual_away THEN
      points := points + 5;
    END IF;

    predicted_outcome := CASE
      WHEN predicted_home > predicted_away THEN '1'
      WHEN predicted_home = predicted_away THEN 'X'
      ELSE '2'
    END;
    IF predicted_outcome = actual_outcome THEN
      points := points + 3;
    END IF;
  END IF;

  -- Проверка исхода (если ставка была только на исход, без счёта)
  IF outcome IS NOT NULL AND (predicted_home IS NULL OR predicted_away IS NULL) THEN
    IF outcome = actual_outcome THEN
      points := points + 3;
    END IF;
  END IF;

  -- Проверка порога голов
  IF goals_team IS NOT NULL AND goals_threshold IS NOT NULL THEN
    IF (goals_team = 'home' AND actual_home >= goals_threshold)
       OR (goals_team = 'away' AND actual_away >= goals_threshold)
    THEN
      points := points + goals_threshold;
    END IF;
  END IF;

  RETURN points;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Шаг 2.6: Функции register_user и verify_user
-- ============================================

-- Функция регистрации нового пользователя.
-- Принимает логин и пароль, хеширует пароль через SHA-256,
-- сохраняет в таблицу users и возвращает UUID нового пользователя.
CREATE OR REPLACE FUNCTION register_user(login TEXT, password TEXT)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO users (username, password_hash)
  VALUES (login, encode(digest(password, 'sha256'), 'hex'))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Функция входа (верификации) пользователя.
-- Принимает логин и пароль, проверяет соответствие хеша.
-- Если логин и пароль верны — возвращает id, username, created_at.
-- Если нет — возвращает пустой набор строк.
CREATE OR REPLACE FUNCTION verify_user(login TEXT, password TEXT)
RETURNS TABLE(id UUID, username TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, u.created_at
  FROM users u
  WHERE u.username = login
    AND u.password_hash = encode(digest(password, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Шаг 2.7: Триггер пересчёта очков
-- ============================================

-- Триггерная функция: автоматически пересчитывает очки для всех прогнозов
-- на конкретный матч, когда его статус меняется на FINISHED.
-- Срабатывает после UPDATE таблицы matches по полям home_score, away_score, status.
CREATE OR REPLACE FUNCTION recalculate_match_predictions() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'FINISHED' THEN
    UPDATE predictions
    SET points_earned = calculate_points(
      predicted_home_score,
      predicted_away_score,
      NEW.home_score,
      NEW.away_score,
      outcome,
      goals_team,
      goals_threshold
    )
    WHERE match_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Сам триггер: вешается на таблицу matches.
-- Срабатывает только когда изменился счёт или статус матча.
DROP TRIGGER IF EXISTS trigger_recalculate_predictions ON matches;
CREATE TRIGGER trigger_recalculate_predictions
  AFTER UPDATE OF home_score, away_score, status ON matches
  FOR EACH ROW
  WHEN (
    OLD.status IS DISTINCT FROM NEW.status
    OR OLD.home_score IS DISTINCT FROM NEW.home_score
    OR OLD.away_score IS DISTINCT FROM NEW.away_score
  )
  EXECUTE FUNCTION recalculate_match_predictions();

-- ============================================
-- Шаг 2.8: Представление leaderboard
-- ============================================

-- Таблица лидеров: агрегирует статистику по каждому пользователю.
-- Поля:
-- - total_points — суммарные очки за все прогнозы
-- - total_predictions — количество сделанных прогнозов
-- - exact_scores — количество угаданных точных счетов (≥5 очков)
-- - correct_outcomes — количество угаданных исходов (≥3 очков)
-- - scored_predictions — количество прогнозов, давших очки (>0)
-- Отсортировано по убыванию total_points.
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  u.id,
  u.username,
  COALESCE(SUM(p.points_earned), 0)::INTEGER AS total_points,
  COUNT(p.id)::INTEGER AS total_predictions,
  COUNT(CASE WHEN p.points_earned >= 5 THEN 1 END)::INTEGER AS exact_scores,
  COUNT(CASE WHEN p.points_earned >= 3 THEN 1 END)::INTEGER AS correct_outcomes,
  COUNT(CASE WHEN p.points_earned > 0 THEN 1 END)::INTEGER AS scored_predictions
FROM users u
LEFT JOIN predictions p ON u.id = p.user_id
GROUP BY u.id, u.username
ORDER BY total_points DESC;
