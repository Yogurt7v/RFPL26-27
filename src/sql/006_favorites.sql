-- ============================================
-- Миграция 006: Избранное (социальное)
-- ============================================

DROP TABLE IF EXISTS favorites CASCADE;
DROP FUNCTION IF EXISTS delete_favorite;

CREATE TABLE favorites (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, match_id)
);

CREATE OR REPLACE FUNCTION add_favorite(p_user_id UUID, p_match_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO favorites (user_id, match_id) VALUES (p_user_id, p_match_id)
  ON CONFLICT DO NOTHING;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION remove_favorite(p_user_id UUID, p_match_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM favorites WHERE user_id = p_user_id AND match_id = p_match_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_favorites(p_user_id UUID)
RETURNS TABLE(match_id TEXT) AS $$
BEGIN
  RETURN QUERY SELECT f.match_id FROM favorites f WHERE f.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_match_favorites(p_match_id TEXT)
RETURNS TABLE(username TEXT, user_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT u.username, u.id
  FROM favorites f
  JOIN users u ON u.id = f.user_id
  WHERE f.match_id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_all_favorites_with_users()
RETURNS TABLE(match_id TEXT, username TEXT, user_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT f.match_id, u.username, u.id
  FROM favorites f
  JOIN users u ON u.id = f.user_id
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_total_users_count()
RETURNS INTEGER AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM users;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_favorite(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION remove_favorite(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_favorites(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_match_favorites(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_all_favorites_with_users() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_total_users_count() TO anon, authenticated;
