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

export async function getFavorites(matchId: string): Promise<Favorite[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('id, user_id, match_id')
    .eq('match_id', matchId)

  if (error) {
    console.error('Error fetching favorites:', error)
    return []
  }

  if (!data || data.length === 0) return []

  const userIds = data.map((r: Record<string, unknown>) => r.user_id as string)

  let userMap = new Map<string, string>()
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

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as number,
    userId: row.user_id as string,
    matchId: row.match_id as string,
    username: userMap.get(row.user_id as string) || 'Аноним',
  }))
}

export async function isFavorite(
  userId: string,
  matchId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('match_id', matchId)
    .maybeSingle()

  if (error) {
    console.error('Error checking favorite:', error)
    return false
  }
  return !!data
}
