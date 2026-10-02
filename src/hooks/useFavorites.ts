import { useMemo, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import {
  addFavorite,
  removeFavorite,
  getFavoritesOverview,
  getCachedFavoritesOverview,
  getUserFavorites,
  type FavoriteAgg,
  type FavoritesOverview,
  type Starlet,
} from '../api/favorites'
import { cacheGetStale, cacheSet } from '../api/cache'
import { getPerfEntries } from '../api/perf'

// Снимок личных избранных нужен ровно затем, чтобы офлайн-перезагрузка
// не снимала звёздочки: get_user_favorites при сетевой ошибке отдаёт [].
const MINE_CACHE_KEY = 'favorites_mine_v1'
const MINE_CACHE_TTL = 15 * 60 * 1000
// Метка сетевого вызова в perf-инфраструктуре (src/api/perf.ts:114).
const MINE_RPC_LABEL = 'rpc:get_user_favorites'
// Сервер отдаёт максимум 3 аватара на матч (015_optimize_favorites_overview.sql).
const MAX_STARLETS = 3

// Именно cacheGetStale, а НЕ cacheGet: у cacheGet просроченная запись
// УДАЛЯЕТСЯ на чтении. Этот снимок уходит в initialData, т.е. читается раньше
// loadUserFavorites, и cacheGet стирал бы ровно ту копию, на которую опирается
// офлайн-fallback ниже: при сбое get_user_favorites и просроченном кэше звёздочки
// исчезали бы ровно тогда, когда они нужнее всего. Просроченность здесь не
// страшна — у запроса initialDataUpdatedAt: 0.
function getCachedUserFavorites(): string[] {
  return cacheGetStale<string[]>(MINE_CACHE_KEY) ?? []
}

async function loadUserFavorites(userId: string): Promise<string[]> {
  const entriesBefore = getPerfEntries().length
  const ids = await getUserFavorites(userId)
  // Пустой ответ неотличим от «избранных нет»: RPC-ошибка тоже даёт [].
  // Достоверным считаем только ответ, дошедший до сервера — это видно по
  // записи с ok в perf-инфраструктуре (не дошёл / упал — записи с ok нет).
  const delivered = getPerfEntries()
    .slice(entriesBefore)
    .some(e => e.label === MINE_RPC_LABEL && e.ok)

  if (!delivered) {
    const stale = cacheGetStale<string[]>(MINE_CACHE_KEY)
    if (stale) return stale
    console.error('[useFavorites] get_user_favorites недоступен, снимка нет — избранные показаны пустыми')
    return []
  }

  cacheSet(MINE_CACHE_KEY, ids, MINE_CACHE_TTL)
  return ids
}

export function useFavorites() {
  const { user } = useAuth()
  const userId = user?.id
  const queryClient = useQueryClient()

  const { data: overview, error: overviewError } = useQuery({
    queryKey: ['favorites', 'overview'],
    queryFn: getFavoritesOverview,
    enabled: !!userId,
    staleTime: 60_000,
    retry: 1,
    placeholderData: keepPreviousData,
    initialData: getCachedFavoritesOverview,
    // Снимок из localStorage показываем сразу, но он же устаревший: принудительно
    // помечаем его старым, чтобы mount всегда пересверился с get_favorites_overview.
    initialDataUpdatedAt: 0,
  })

  const { data: myFavorites, error: mineError } = useQuery({
    queryKey: ['favorites', 'mine'],
    queryFn: () => loadUserFavorites(userId!),
    enabled: !!userId,
    staleTime: 60_000,
    retry: 1,
    initialData: getCachedUserFavorites,
    // Снимок из localStorage показываем сразу, но он же устаревший: принудительно
    // помечаем его старым, чтобы mount всегда пересверился с get_user_favorites.
    initialDataUpdatedAt: 0,
  })

  // Канал ошибок React Query не должен умирать молча: data при этом остаётся
  // пустым, как и раньше, но сбой виден в консоли рядом с местом потребления.
  useEffect(() => {
    if (overviewError) console.error('[useFavorites] overview query failed:', overviewError)
  }, [overviewError])

  useEffect(() => {
    if (mineError) console.error('[useFavorites] mine query failed:', mineError)
  }, [mineError])

  const totalUsers = overview?.totalUsers ?? 0

  const byMatch = useMemo(() => {
    const map = new Map<string, FavoriteAgg>()
    for (const f of overview?.favorites ?? []) {
      map.set(f.matchId, f)
    }
    return map
  }, [overview])

  // Членство берётся из get_user_favorites, а не из starlets: тот массив
  // сервер режет до 3 (015_optimize_favorites_overview.sql), из-за чего
  // 4-й и далее фанат матча не видел собственной звезды.
  const userFavorites = useMemo(() => new Set(myFavorites ?? []), [myFavorites])

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
      await queryClient.cancelQueries({ queryKey: ['favorites', 'mine'] })
      const previous = queryClient.getQueryData<FavoritesOverview>(['favorites', 'overview'])
      const previousMine = queryClient.getQueryData<string[]>(['favorites', 'mine'])

      queryClient.setQueryData<FavoritesOverview>(['favorites', 'overview'], old => {
        if (!old) return old
        const favorites = old.favorites.map(f => {
          if (f.matchId !== matchId) return f
          if (wasFav) {
            return { ...f, count: f.count - 1, starlets: f.starlets.filter(s => s.userId !== userId) }
          }
          const starlets: Starlet[] = [
            ...f.starlets.filter(s => s.userId !== userId),
            { letter: user!.username.charAt(0).toUpperCase(), username: user!.username, userId: userId! },
          ]
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

      queryClient.setQueryData<string[]>(['favorites', 'mine'], old => {
        const list = old ?? []
        return wasFav ? list.filter(id => id !== matchId) : [...list, matchId]
      })

      return { previous, previousMine }
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['favorites', 'overview'], context.previous)
      }
      if (context?.previousMine) {
        queryClient.setQueryData(['favorites', 'mine'], context.previousMine)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', 'overview'] })
      queryClient.invalidateQueries({ queryKey: ['favorites', 'mine'] })
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

  // Свой аватар не отбрасываем: если матч отметил только я, список без фильтра
  // даёт одну букву у звезды, а с фильтром — пустоту (матч выглядит неизбранным).
  const starlets = useCallback(
    (matchId: string): Starlet[] => (byMatch.get(matchId)?.starlets ?? []).slice(0, MAX_STARLETS),
    [byMatch]
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
