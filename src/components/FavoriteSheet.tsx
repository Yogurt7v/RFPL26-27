import { useEffect, useState } from 'react'
import type { FavoriteUser } from '../api/favorites'

interface FavoriteSheetProps {
  matchId: string
  isOpen: boolean
  onClose: () => void
  getFavorites: (matchId: string) => Promise<FavoriteUser[]>
}

export function FavoriteSheet({ matchId, isOpen, onClose, getFavorites }: FavoriteSheetProps) {
  const [users, setUsers] = useState<FavoriteUser[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    getFavorites(matchId).then(list => {
      setUsers(list)
      setLoading(false)
    })
  }, [matchId, isOpen, getFavorites])

  if (!isOpen) return null

  return (
    <>
      <div className="favorite-sheet__backdrop" onClick={onClose} />
      <div className="favorite-sheet">
        <div className="favorite-sheet__header">
          <h3 className="favorite-sheet__title">Нравится</h3>
          <button className="favorite-sheet__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        <div className="favorite-sheet__body">
          {loading ? (
            <p className="favorite-sheet__loading">Загрузка...</p>
          ) : users.length === 0 ? (
            <p className="favorite-sheet__empty">Пока никто не отметил этот матч</p>
          ) : (
            users.map(u => (
              <div key={u.userId} className="favorite-sheet__user">
                <span className="favorite-sheet__starlet">★</span>
                <span>{u.username}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
