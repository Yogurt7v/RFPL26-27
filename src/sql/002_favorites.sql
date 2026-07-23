-- ============================================
-- Шаг 6: Таблица избранных матчей
-- ============================================

-- Удаляем старую таблицу если есть
DROP TABLE IF EXISTS favorites;

-- Таблица для хранения избранных матчей пользователей.
-- Каждый пользователь может добавить матч в избранное.
-- Уникальное ограничение: один пользователь — один матч.
CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, match_id)
);

-- Права для анонимных пользователей
GRANT SELECT, INSERT, DELETE ON favorites TO anon;

-- RLS политики
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Политика: все могут видеть избранное
CREATE POLICY "Anyone can view favorites" ON favorites
  FOR SELECT TO anon
  USING (true);

-- Политика: все могут добавлять избранное
CREATE POLICY "Anyone can add favorites" ON favorites
  FOR INSERT TO anon
  WITH CHECK (true);

-- Политика: все могут удалять избранное
CREATE POLICY "Anyone can delete favorites" ON favorites
  FOR DELETE TO anon
  USING (true);

-- Также разрешаем authenticated роль (на всякий случай)
GRANT SELECT, INSERT, DELETE ON favorites TO authenticated;
