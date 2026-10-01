-- ============================================
-- Миграция 022: Идемпотентный add_favorite
-- ============================================
-- Проблема: INSERT ... ON CONFLICT DO NOTHING оставляет PL/pgSQL-переменную
-- FOUND в false, когда строка уже существует (конфликт просто пропустил
-- вставку). Клиент (src/api/favorites.ts) трактует возвращённый false
-- как неудачную запись и откатывает оптимистичное обновление — звезда
-- не загорается, хотя строка в базе есть и ошибки не видно.
--
-- Решение: всегда возвращать TRUE. Повторное добавление того же матча
-- теперь отчитывается как успех — операция становится идемпотентной.
--
-- Миграция неразрушающая: сигнатура add_favorite(UUID, TEXT) сохранена,
-- поэтому CREATE OR REPLACE достаточно — гранты и зависимости сохраняются.
-- Таблица favorites не меняется, существующие строки не затрагиваются.
--
-- ВНИМАНИЕ: применить вручную в Supabase SQL Editor — автоматического
-- прогона миграций в проекте нет (см. AGENTS.md).

CREATE OR REPLACE FUNCTION add_favorite(p_user_id UUID, p_match_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO favorites (user_id, match_id) VALUES (p_user_id, p_match_id)
  ON CONFLICT DO NOTHING;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_favorite(UUID, TEXT) TO anon, authenticated;
