import { supabase } from './supabase'

export interface FavoriteUser {
  username: string
  userId: string
}

export interface FavoriteRow {
  matchId: string
  username: string
  userId: string
}

export async function addFavorite(userId: string, matchId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('add_favorite', {
    p_user_id: userId,
    p_match_id: matchId,
  })
  return !error && data === true
}

export async function removeFavorite(userId: string, matchId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('remove_favorite', {
    p_user_id: userId,
    p_match_id: matchId,
  })
  return !error && data === true
}

export async function getUserFavorites(userId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_user_favorites', {
    p_user_id: userId,
  })
  if (error) return []
  return ((data as { match_id: string }[]) ?? []).map(d => d.match_id)
}

export async function getMatchFavorites(matchId: string): Promise<FavoriteUser[]> {
  const { data, error } = await supabase.rpc('get_match_favorites', {
    p_match_id: matchId,
  })
  if (error) return []
  return ((data as { username: string; user_id: string }[]) ?? []).map(d => ({
    username: d.username,
    userId: d.user_id,
  }))
}

export async function getAllFavoritesWithUsers(): Promise<FavoriteRow[]> {
  const { data, error } = await supabase.rpc('get_all_favorites_with_users')
  if (error) return []
  return ((data as { match_id: string; username: string; user_id: string }[]) ?? []).map(d => ({
    matchId: d.match_id,
    username: d.username,
    userId: d.user_id,
  }))
}

export async function getTotalUsersCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_total_users_count')
  if (error) return 0
  return (data as number) ?? 0
}
