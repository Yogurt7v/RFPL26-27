import { supabase } from './supabase'
import { cacheGet, cacheSet } from './cache'

const FAVORITES_CACHE_KEY = 'favorites_overview'
const FAVORITES_CACHE_TTL = 24 * 60 * 60 * 1000

export function getCachedFavoritesOverview(): FavoritesOverview | null {
  return cacheGet<FavoritesOverview>(FAVORITES_CACHE_KEY)
}

export interface FavoriteUser {
  username: string
  userId: string
}

export interface FavoriteRow {
  matchId: string
  username: string
  userId: string
}

export interface Starlet {
  letter: string
  username: string
  userId: string
}

export interface FavoriteAgg {
  matchId: string
  count: number
  starlets: Starlet[]
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

export interface FavoritesOverview {
  favorites: FavoriteAgg[]
  totalUsers: number
}

export async function getFavoritesOverview(): Promise<FavoritesOverview> {
  const { data, error } = await supabase.rpc('get_favorites_overview')
  if (error || !data?.length) return { favorites: [], totalUsers: 0 }

  const json = (data[0] as { result: {
    favorites: { match_id: string; count: number; starlets: { username: string; userId: string }[] }[]
    totalUsers: number
  }}).result

  const result: FavoritesOverview = {
    favorites: (json.favorites ?? []).map(f => ({
      matchId: f.match_id,
      count: f.count,
      starlets: (f.starlets ?? []).map(s => ({
        letter: s.username.charAt(0).toUpperCase(),
        username: s.username,
        userId: s.userId,
      })),
    })),
    totalUsers: json.totalUsers ?? 0,
  }

  cacheSet(FAVORITES_CACHE_KEY, result, FAVORITES_CACHE_TTL)
  return result
}
