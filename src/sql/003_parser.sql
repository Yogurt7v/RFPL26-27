-- ============================================
-- Шаг 3.1: Уникальный ключ для matches
-- ============================================

-- Парсер будет обновлять матчи по (round, home_team, away_team),
-- чтобы не плодить дубликаты при каждом запуске.
-- Это же поле используется predictions.findMatchId().
ALTER TABLE matches ADD CONSTRAINT matches_round_home_away_unique
  UNIQUE (round, home_team, away_team);

-- ============================================
-- Шаг 3.2: Таблица standings (турнирная таблица)
-- ============================================

-- Таблица турнирного положения команд РПЛ.
-- Обновляется парсером каждые 5 минут.
-- Первичный ключ: soccer365 team_id (стабильный идентификатор).
CREATE TABLE standings (
  team_id INTEGER PRIMARY KEY,
  team_name TEXT NOT NULL,
  position INTEGER NOT NULL,
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Разрешаем чтение для анонимных пользователей (RLS)
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY standings_read_policy ON standings
  FOR SELECT USING (true);
