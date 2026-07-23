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

-- Функция для безопасного удаления избранного
-- Принимает user_id и match_id, удаляет только точное совпадение
CREATE OR REPLACE FUNCTION delete_favorite(p_user_id UUID, p_match_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  deleted BOOLEAN;
BEGIN
  DELETE FROM favorites
  WHERE user_id = p_user_id AND match_id = p_match_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted > 0;
END;
$$ LANGUAGE plpgsql;

-- Права для анонимных пользователей
GRANT SELECT, INSERT ON favorites TO anon;
GRANT EXECUTE ON FUNCTION delete_favorite(UUID, TEXT) TO anon;

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

-- Политика: удаление только через RPC функцию delete_favorite
-- (нет прямого DELETE для anon через REST API)

-- Также разрешаем authenticated роль (на всякий случай)
GRANT SELECT, INSERT ON favorites TO authenticated;
GRANT EXECUTE ON FUNCTION delete_favorite(UUID, TEXT) TO authenticated;
