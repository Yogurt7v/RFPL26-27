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

// Снимок личных избранных нужен ровно затем, чтобы офлайн-перезагрузка
// не снимала звёздочки: get_user_favorites при сетевой ошибке не отвечает.
const MINE_CACHE_PREFIX = 'favorites_mine_v1'
const MINE_CACHE_TTL = 15 * 60 * 1000
// Сервер отдаёт максимум 3 аватара на матч (015_optimize_favorites_overview.sql).
const MAX_STARLETS = 3

// И снимок, и query key включают id: logout() (src/context/AuthContext.tsx) не
// чистит ни QueryClient, ни localStorage, поэтому общий ключ отдал бы следующему
// пользователю на том же устройстве чужие звёздочки — в памяти до staleTime (и без
// refetch вовсе), а с офлайн-снимка бессрочно. Обзор (overview) общим быть может:
// он хранит избранные всех, а не одного.
function mineCacheKey(userId: string): string {
  return `${MINE_CACHE_PREFIX}_${userId}`
}

function mineQueryKey(userId: string): readonly ['favorites', 'mine', string] {
  return ['favorites', 'mine', userId]
}

// Именно cacheGetStale, а НЕ cacheGet: у cacheGet просроченная запись
// УДАЛЯЕТСЯ на чтении. Этот снимок уходит в initialData, т.е. читается раньше
// loadUserFavorites, и cacheGet стирал бы ровно ту копию, на которую опирается
// офлайн-fallback ниже: при сбое get_user_favorites и просроченном кэше звёздочки
// исчезали бы ровно тогда, когда они нужнее всего. Просроченность здесь не
// страшна — у запроса initialDataUpdatedAt: 0.
function getCachedUserFavorites(userId: string | undefined): string[] {
  if (!userId) return []
  return cacheGetStale<string[]>(mineCacheKey(userId)) ?? []
}

async function loadUserFavorites(userId: string): Promise<string[]> {
  const { ids, delivered } = await getUserFavorites(userId)

  if (delivered) {
    // Сюда попадает и честный пустой ответ: снятая последняя звезда — это
    // доставленный результат, и он обязан быть записан, иначе офлайн вернёт
    // старую звезду обратно.
    cacheSet(mineCacheKey(userId), ids, MINE_CACHE_TTL)
    return ids
  }

  // Единственный путь, читающий просроченный снимок. Ниже ответа нет — пустой
  // результат обязан быть виден (IS-8), но не обязан быть записан.
  const stale = cacheGetStale<string[]>(mineCacheKey(userId))
  if (stale) return stale
  console.error('[useFavorites] get_user_favorites недоступен, снимка нет — избранные показаны пустыми')
  return []
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
    queryKey: mineQueryKey(userId!),
    queryFn: () => loadUserFavorites(userId!),
    enabled: !!userId,
    staleTime: 60_000,
    retry: 1,
    // Функция, а не значение: снимок читается на каждый mount по id из ключа,
    // поэтому сменившийся пользователь не наследует чужой.
    initialData: () => getCachedUserFavorites(userId),
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
      await queryClient.cancelQueries({ queryKey: mineQueryKey(userId!) })
      const previous = queryClient.getQueryData<FavoritesOverview>(['favorites', 'overview'])
      const previousMine = queryClient.getQueryData<string[]>(mineQueryKey(userId!))

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

      queryClient.setQueryData<string[]>(mineQueryKey(userId!), old => {
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
        queryClient.setQueryData(mineQueryKey(userId!), context.previousMine)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', 'overview'] })
      queryClient.invalidateQueries({ queryKey: mineQueryKey(userId!) })
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
