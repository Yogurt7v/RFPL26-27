import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import {
  addFavorite,
  removeFavorite,
  getAllFavoritesWithUsers,
  getTotalUsersCount,
  getMatchFavorites,
  type FavoriteRow,
  type FavoriteUser,
} from '../api/favorites'

interface Starlet {
  letter: string
  username: string
  userId: string
}

function firstLetter(username: string): string {
  return username.charAt(0).toUpperCase()
}

function buildFromRows(rows: FavoriteRow[], currentUserId: string | undefined) {
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

  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set())
  const [starletsByMatch, setStarletsByMatch] = useState<Map<string, Starlet[]>>(new Map())
  const [countsByMatch, setCountsByMatch] = useState<Map<string, number>>(new Map())
  const [totalUsers, setTotalUsers] = useState(0)
  const [matchFavoritesCache, setMatchFavoritesCache] = useState<Record<string, FavoriteUser[]>>({})
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!userId) {
      setUserFavorites(new Set())
      setStarletsByMatch(new Map())
      setCountsByMatch(new Map())
      setTotalUsers(0)
      setMatchFavoritesCache({})
      loadedRef.current = false
      return
    }

    if (loadedRef.current) return
    loadedRef.current = true

    Promise.all([
      getAllFavoritesWithUsers(),
      getTotalUsersCount(),
    ]).then(([rows, total]) => {
      const { byMatch, counts } = buildFromRows(rows, userId)
      setStarletsByMatch(byMatch)
      setCountsByMatch(counts)
      setTotalUsers(total)

      const myFavs = new Set(
        rows.filter(r => r.userId === userId).map(r => r.matchId)
      )
      setUserFavorites(myFavs)
    })
  }, [userId])

  const invalidate = useCallback(() => {
    loadedRef.current = false
    if (!userId) return
    getAllFavoritesWithUsers().then(rows => {
      const { byMatch, counts } = buildFromRows(rows, userId)
      setStarletsByMatch(byMatch)
      setCountsByMatch(counts)
      const myFavs = new Set(
        rows.filter(r => r.userId === userId).map(r => r.matchId)
      )
      setUserFavorites(myFavs)
    })
  }, [userId])

  const isFavorite = useCallback(
    (matchId: string) => userFavorites.has(matchId),
    [userFavorites]
  )

  const toggleFavorite = useCallback(
    async (matchId: string) => {
      if (!userId || !user) return

      const wasFav = userFavorites.has(matchId)
      const username = user.username
      const me: Starlet = { letter: firstLetter(username), username, userId }

      setUserFavorites(prev => {
        const next = new Set(prev)
        if (wasFav) next.delete(matchId)
        else next.add(matchId)
        return next
      })

      setCountsByMatch(prev => {
        const next = new Map(prev)
        const cur = next.get(matchId) ?? 0
        next.set(matchId, Math.max(0, cur + (wasFav ? -1 : 1)))
        return next
      })

      setStarletsByMatch(prev => {
        const next = new Map(prev)
        const list = (next.get(matchId) ?? []).filter(s => s.userId !== userId)
        if (!wasFav) {
          list.unshift(me)
          if (list.length > 3) list.length = 3
        }
        if (list.length === 0) next.delete(matchId)
        else next.set(matchId, list)
        return next
      })

      if (wasFav) {
        const ok = await removeFavorite(userId, matchId)
        if (!ok) invalidate()
      } else {
        const ok = await addFavorite(userId, matchId)
        if (!ok) invalidate()
      }
    },
    [userId, user, userFavorites, invalidate]
  )

  const favoriteCount = useCallback(
    (matchId: string) => countsByMatch.get(matchId) ?? 0,
    [countsByMatch]
  )

  const starlets = useCallback(
    (matchId: string) => (starletsByMatch.get(matchId) ?? []).filter(s => s.userId !== userId),
    [starletsByMatch, userId]
  )

  const getMatchFavoritesList = useCallback(
    async (matchId: string) => {
      if (matchFavoritesCache[matchId]) return matchFavoritesCache[matchId]
      const list = await getMatchFavorites(matchId)
      setMatchFavoritesCache(prev => ({ ...prev, [matchId]: list }))
      return list
    },
    [matchFavoritesCache]
  )

  const glowLevel = useCallback(
    (matchId: string): 0 | 1 | 2 | 3 => {
      const count = countsByMatch.get(matchId) ?? 0
      if (count === 0 || totalUsers === 0) return 0
      const ratio = count / totalUsers
      if (ratio >= 0.5) return 3
      if (ratio >= 0.25) return 2
      if (ratio >= 0.1) return 1
      return 0
    },
    [countsByMatch, totalUsers]
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
