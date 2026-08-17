import { useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import {
  addFavorite,
  removeFavorite,
  getFavoritesOverview,
  getCachedFavoritesOverview,
  type FavoriteAgg,
  type FavoritesOverview,
  type Starlet,
} from '../api/favorites'

export function useFavorites() {
  const { user } = useAuth()
  const userId = user?.id
  const queryClient = useQueryClient()

  const { data: overview } = useQuery({
    queryKey: ['favorites', 'overview'],
    queryFn: getFavoritesOverview,
    enabled: !!userId,
    staleTime: 60_000,
    placeholderData: getCachedFavoritesOverview,
  })

  const totalUsers = overview?.totalUsers ?? 0

  const byMatch = useMemo(() => {
    const map = new Map<string, FavoriteAgg>()
    for (const f of overview?.favorites ?? []) {
      map.set(f.matchId, f)
    }
    return map
  }, [overview])

  const userFavorites = useMemo(() => {
    const set = new Set<string>()
    if (!userId) return set
    for (const f of overview?.favorites ?? []) {
      if (f.starlets.some(s => s.userId === userId)) {
        set.add(f.matchId)
      }
    }
    return set
  }, [overview, userId])

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
      await queryClient.cancelQueries({ queryKey: ['favorites', 'overview'] })
      const previous = queryClient.getQueryData<FavoritesOverview>(['favorites', 'overview'])

      queryClient.setQueryData<FavoritesOverview>(['favorites', 'overview'], old => {
        if (!old) return old
        const favorites = old.favorites.map(f => {
          if (f.matchId !== matchId) return f
          if (wasFav) {
            return { ...f, count: f.count - 1, starlets: f.starlets.filter(s => s.userId !== userId) }
          }
          const starlets: Starlet[] = f.starlets.length < 3
            ? [...f.starlets, { letter: user!.username.charAt(0).toUpperCase(), username: user!.username, userId: userId! }]
            : f.starlets
          return { ...f, count: f.count + 1, starlets }
        })
        if (!wasFav && !favorites.some(f => f.matchId === matchId)) {
          favorites.push({
            matchId,
            count: 1,
            starlets: [{ letter: user!.username.charAt(0).toUpperCase(), username: user!.username, userId: userId! }],
          })
        }
        return { ...old, favorites }
      })

      return { previous }
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['favorites', 'overview'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', 'overview'] })
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
    (matchId: string) => byMatch.get(matchId)?.count ?? 0,
    [byMatch]
  )

  const starlets = useCallback(
    (matchId: string): Starlet[] => (byMatch.get(matchId)?.starlets ?? []).filter(s => s.userId !== userId),
    [byMatch, userId]
  )

  const glowLevel = useCallback(
    (matchId: string): 0 | 1 | 2 | 3 => {
      const count = byMatch.get(matchId)?.count ?? 0
      if (count === 0 || totalUsers === 0) return 0
      const ratio = count / totalUsers
      if (ratio >= 0.5) return 3
      if (ratio >= 0.25) return 2
      if (ratio >= 0.1) return 1
      return 0
    },
    [byMatch, totalUsers]
  )

  return {
    isFavorite,
    toggleFavorite,
    favoriteCount,
    starlets,
    totalUsers,
    glowLevel,
  }
}
