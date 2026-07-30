import { useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import {
  addFavorite,
  removeFavorite,
  getAllFavoritesWithUsers,
  getTotalUsersCount,
  type FavoriteRow,
} from '../api/favorites'

interface Starlet {
  letter: string
  username: string
  userId: string
}

function firstLetter(username: string): string {
  return username.charAt(0).toUpperCase()
}

function buildFromRows(rows: FavoriteRow[]) {
  const byMatch = new Map<string, Starlet[]>()
  const counts = new Map<string, number>()

  for (const row of rows) {
    counts.set(row.matchId, (counts.get(row.matchId) ?? 0) + 1)
  }

  for (const row of rows) {
    if (!byMatch.has(row.matchId)) {
      byMatch.set(row.matchId, [])
    }
    const list = byMatch.get(row.matchId)!
    if (list.length < 3) {
      list.push({ letter: firstLetter(row.username), username: row.username, userId: row.userId })
    }
  }

  return { byMatch, counts }
}

export function useFavorites() {
  const { user } = useAuth()
  const userId = user?.id
  const queryClient = useQueryClient()

  const { data: rows = [] } = useQuery({
    queryKey: ['favorites', 'all'],
    queryFn: getAllFavoritesWithUsers,
    enabled: !!userId,
    staleTime: 60_000,
  })

  const { data: totalUsers = 0 } = useQuery({
    queryKey: ['favorites', 'total-users'],
    queryFn: getTotalUsersCount,
    enabled: !!userId,
    staleTime: 60_000,
  })

  const userFavorites = useMemo(() =>
    new Set(rows.filter(r => r.userId === userId).map(r => r.matchId)),
    [rows, userId]
  )

  const { byMatch, counts } = useMemo(() => buildFromRows(rows), [rows])

  const toggleMutation = useMutation({
    mutationFn: async ({ matchId, wasFav }: { matchId: string; wasFav: boolean }) => {
      if (wasFav) {
        const ok = await removeFavorite(userId!, matchId)
        if (!ok) throw new Error('remove failed')
      } else {
        const ok = await addFavorite(userId!, matchId)
        if (!ok) throw new Error('add failed')
      }
    },
    onMutate: async ({ matchId, wasFav }) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', 'all'] })
      const previous = queryClient.getQueryData<FavoriteRow[]>(['favorites', 'all'])

      queryClient.setQueryData<FavoriteRow[]>(['favorites', 'all'], old => {
        if (!old) return old
        if (wasFav) {
          return old.filter(r => !(r.matchId === matchId && r.userId === userId))
        }
        return [...old, { matchId, userId: userId!, username: user!.username }]
      })

      return { previous }
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['favorites', 'all'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', 'all'] })
      queryClient.invalidateQueries({ queryKey: ['favorites', 'total-users'] })
    },
  })

  const isFavorite = useCallback(
    (matchId: string) => userFavorites.has(matchId),
    [userFavorites]
  )

  const toggleFavorite = useCallback((matchId: string) => {
    const wasFav = userFavorites.has(matchId)
    toggleMutation.mutate({ matchId, wasFav })
  }, [userFavorites, toggleMutation])

  const favoriteCount = useCallback(
    (matchId: string) => counts.get(matchId) ?? 0,
    [counts]
  )

  const starlets = useCallback(
    (matchId: string) => (byMatch.get(matchId) ?? []).filter(s => s.userId !== userId),
    [byMatch, userId]
  )

  const getMatchFavoritesList = useCallback(
    (matchId: string) => {
      const { getMatchFavorites } = require('../api/favorites')
      return getMatchFavorites(matchId)
    },
    []
  )

  const glowLevel = useCallback(
    (matchId: string): 0 | 1 | 2 | 3 => {
      const count = counts.get(matchId) ?? 0
      if (count === 0 || totalUsers === 0) return 0
      const ratio = count / totalUsers
      if (ratio >= 0.5) return 3
      if (ratio >= 0.25) return 2
      if (ratio >= 0.1) return 1
      return 0
    },
    [counts, totalUsers]
  )

  return {
    isFavorite,
    toggleFavorite,
    favoriteCount,
    starlets,
    getMatchFavoritesList,
    totalUsers,
    glowLevel,
  }
}
