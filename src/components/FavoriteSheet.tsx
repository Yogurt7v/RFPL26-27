import { useQuery } from '@tanstack/react-query'
import { getMatchFavorites } from '../api/favorites'
import { useAuth } from '../hooks/useAuth'

interface FavoriteSheetProps {
  matchId: string
  isOpen: boolean
  onClose: () => void
}

export function FavoriteSheet({ matchId, isOpen, onClose }: FavoriteSheetProps) {
  const { user } = useAuth()
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['favorites', 'match', matchId],
    queryFn: () => getMatchFavorites(matchId),
    enabled: isOpen && !!matchId,
    staleTime: 30_000,
  })

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
          {isLoading ? (
            <p className="favorite-sheet__loading">Загрузка...</p>
          ) : users.length === 0 ? (
            <p className="favorite-sheet__empty">Пока никто не отметил этот матч</p>
          ) : (
            users.map(u => (
              <div key={u.userId} className="favorite-sheet__user">
                <span className="favorite-sheet__starlet">★</span>
                <span>{u.username}{u.userId === user?.id ? <span className="favorite-sheet__you"> (это вы)</span> : null}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
