-- ============================================
-- Миграция 008: Единый запрос избранного
-- Возвращает все избранные записи + счётчик пользователей
-- одним вызовом (вместо двух: get_all_favorites_with_users
-- и get_total_users_count) — на странице на 1 запрос меньше.
-- ============================================

CREATE OR REPLACE FUNCTION get_favorites_overview()
RETURNS TABLE(match_id TEXT, username TEXT, user_id UUID, total_users INTEGER) AS $$
DECLARE
  u_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO u_count FROM users;

  RETURN QUERY
  SELECT f.match_id, u.username, u.id, u_count
  FROM favorites f
  JOIN users u ON u.id = f.user_id
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_favorites_overview() TO anon, authenticated;
