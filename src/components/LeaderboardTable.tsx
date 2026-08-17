import { useQuery } from '@tanstack/react-query'
import { getLeaderboard, type LeaderboardEntry } from '../api/leaderboard'

interface LeaderboardTableProps {
  currentUserId?: string
}

export function LeaderboardTable({ currentUserId }: LeaderboardTableProps) {
  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: getLeaderboard,
    staleTime: 5 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="leaderboard-table">
        <h2 className="leaderboard-table__title">Таблица лидеров</h2>
        <table className="leaderboard-table__table">
          <thead>
            <tr>
              <th className="leaderboard-table__th leaderboard-table__th--pos"><div className="skeleton" style={{ width: 16, height: 12 }} /></th>
              <th className="leaderboard-table__th leaderboard-table__th--user"><div className="skeleton" style={{ width: 40, height: 12 }} /></th>
              <th className="leaderboard-table__th leaderboard-table__th--pts"><div className="skeleton" style={{ width: 32, height: 12 }} /></th>
              <th className="leaderboard-table__th"><div className="skeleton" style={{ width: 48, height: 12 }} /></th>
              <th className="leaderboard-table__th"><div className="skeleton" style={{ width: 40, height: 12 }} /></th>
              <th className="leaderboard-table__th"><div className="skeleton" style={{ width: 40, height: 12 }} /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="leaderboard-table__row">
                <td className="leaderboard-table__td leaderboard-table__td--pos">
                  <div className="skeleton" style={{ width: 24, height: 20, margin: '0 auto' }} />
                </td>
                <td className="leaderboard-table__td leaderboard-table__td--user">
                  <div className="skeleton" style={{ width: `${50 + i * 20}%`, height: 14 }} />
                </td>
                <td className="leaderboard-table__td leaderboard-table__td--pts">
                  <div className="skeleton" style={{ width: 28, height: 14, margin: '0 auto' }} />
                </td>
                <td className="leaderboard-table__td"><div className="skeleton" style={{ width: 24, height: 14 }} /></td>
                <td className="leaderboard-table__td"><div className="skeleton" style={{ width: 24, height: 14 }} /></td>
                <td className="leaderboard-table__td"><div className="skeleton" style={{ width: 24, height: 14 }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (error || entries.length === 0) {
    return (
      <div className="leaderboard-table error-fallback">
        {error ? 'Ошибка загрузки данных' : 'Пока нет данных для таблицы лидеров'}
      </div>
    )
  }

  return (
    <div className="leaderboard-table">
      <h2 className="leaderboard-table__title">Таблица лидеров</h2>

      <table className="leaderboard-table__table content-enter">
        <thead>
          <tr>
            <th className="leaderboard-table__th leaderboard-table__th--pos">#</th>
            <th className="leaderboard-table__th leaderboard-table__th--user">Игрок</th>
            <th className="leaderboard-table__th leaderboard-table__th--pts">Очки</th>
            <th className="leaderboard-table__th">Прогнозы</th>
            <th className="leaderboard-table__th">Точные</th>
            <th className="leaderboard-table__th">Исходы</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr
              key={entry.id}
              className={`leaderboard-table__row ${
                entry.id === currentUserId ? 'leaderboard-table__row--current' : ''
              }`}
            >
              <td className="leaderboard-table__td leaderboard-table__td--pos">
                {index + 1}
              </td>
              <td className="leaderboard-table__td leaderboard-table__td--user">
                {entry.username}
              </td>
              <td className="leaderboard-table__td leaderboard-table__td--pts">
                {entry.totalPoints}
              </td>
              <td className="leaderboard-table__td">{entry.totalPredictions}</td>
              <td className="leaderboard-table__td">{entry.exactScores}</td>
              <td className="leaderboard-table__td">{entry.correctOutcomes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
