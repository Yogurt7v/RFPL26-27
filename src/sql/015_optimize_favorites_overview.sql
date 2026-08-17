-- ============================================
-- Миграция 015: Оптимизация get_favorites_overview
-- ============================================
-- Проблема: get_favorites_overview() возвращала N сырых строк
-- (все фавориты всех пользователей) с дублированием total_users.
-- Клиент сам строил top-3 starlets, считал count на матч.
--
-- Решение: серверная агрегация через CTE.
-- Возвращает TABLE(result JSON) — PostgREST отдаёт [{result: {...}}].
-- JSON содержит: { favorites: [...], totalUsers: N }
-- Каждый элемент favorites: { match_id, count, starlets: [{username, userId}] }
-- Top-3 starlets выбираются по created_at (ранние = приоритет).

DROP FUNCTION IF EXISTS get_favorites_overview();

CREATE OR REPLACE FUNCTION get_favorites_overview()
RETURNS TABLE(result JSON) AS $$
DECLARE
  u_count INTEGER;
  overview JSON;
BEGIN
  SELECT COUNT(*) INTO u_count FROM users;

  WITH match_counts AS (
    SELECT f.match_id, COUNT(*)::INTEGER AS cnt
    FROM favorites f
    GROUP BY f.match_id
  ),
  top_starlets AS (
    SELECT
      ranked.match_id,
      json_agg(
        json_build_object('username', u.username, 'userId', u.id)
      ) AS starlets
    FROM (
      SELECT f.user_id, f.match_id,
             ROW_NUMBER() OVER (PARTITION BY f.match_id ORDER BY f.created_at) AS rn
      FROM favorites f
    ) ranked
    JOIN users u ON u.id = ranked.user_id
    WHERE ranked.rn <= 3
    GROUP BY ranked.match_id
  )
  SELECT json_agg(
    json_build_object(
      'match_id', mc.match_id,
      'count', mc.cnt,
      'starlets', COALESCE(ts.starlets, '[]'::json)
    )
  ) INTO overview
  FROM match_counts mc
  LEFT JOIN top_starlets ts ON ts.match_id = mc.match_id;

  result := json_build_object(
    'favorites', COALESCE(overview, '[]'::json),
    'totalUsers', u_count
  );
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_favorites_overview() TO anon, authenticated;
