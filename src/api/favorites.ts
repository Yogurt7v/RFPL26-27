import { supabase } from './supabase'

export interface Favorite {
  id: number
  userId: string
  matchId: string
  username?: string
}

export async function toggleFavorite(
  userId: string,
  matchId: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('match_id', matchId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.rpc('delete_favorite', {
      p_user_id: userId,
      p_match_id: matchId,
    })
    if (error) {
      console.error('Error removing favorite:', error)
    }
    return false
  } else {
    const { data, error } = await supabase
      .from('favorites')
      .insert({ user_id: userId, match_id: matchId })
      .select()
      .single()
    if (error || !data) {
      console.error('Error adding favorite:', error)
      return false
    }
    return true
  }
}

export async function getFavoritesForMatches(
  matchIds: string[]
): Promise<Map<string, Favorite[]>> {
  const result = new Map<string, Favorite[]>()

  if (matchIds.length === 0) return result

  const { data, error } = await supabase
    .from('favorites')
    .select('id, user_id, match_id')
    .in('match_id', matchIds)

  if (error || !data || data.length === 0) return result

  const userIds = [...new Set(data.map((r: Record<string, unknown>) => r.user_id as string))]

  let userMap = new Map<string, string>()
  if (userIds.length > 0) {
    try {
      const { data: users } = await supabase
        .from('users')
        .select('id, username')
        .in('id', userIds)

      if (users) {
        for (const u of users as Array<{ id: string; username: string }>) {
          userMap.set(u.id, u.username)
        }
      }
    } catch {
      // usernames останутся "Аноним"
    }
  }

  for (const row of data as Array<Record<string, unknown>>) {
    const matchId = row.match_id as string
    if (!result.has(matchId)) result.set(matchId, [])

    result.get(matchId)!.push({
      id: row.id as number,
      userId: row.user_id as string,
      matchId,
      username: userMap.get(row.user_id as string) || 'Аноним',
    })
  }

  return result
}

export async function getUserFavoriteIds(
  userId: string,
  matchIds: string[]
): Promise<Set<string>> {
  if (matchIds.length === 0) return new Set()

  const { data, error } = await supabase
    .from('favorites')
    .select('match_id')
    .eq('user_id', userId)
    .in('match_id', matchIds)

  if (error || !data) return new Set()

  return new Set(data.map((r: Record<string, unknown>) => r.match_id as string))
}
