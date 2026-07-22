import { useState, useEffect } from 'react'
import { getLeaderboard, type LeaderboardEntry } from '../api/leaderboard'

interface LeaderboardTableProps {
  currentUserId?: string
}

export function LeaderboardTable({ currentUserId }: LeaderboardTableProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const data = await getLeaderboard()
      if (data.length === 0) {
        setError('Пока нет данных для таблицы лидеров')
      } else {
        setEntries(data)
      }
      setIsLoading(false)
    }
    load()
  }, [])

  if (isLoading) {
    return <div className="leaderboard-table">Загрузка...</div>
  }

  if (error) {
    return <div className="leaderboard-table leaderboard-table--error">{error}</div>
  }

  return (
    <div className="leaderboard-table">
      <h2>Таблица лидеров</h2>

      <table className="leaderboard-table__table">
        <thead>
          <tr>
            <th className="leaderboard-table__th leaderboard-table__th--pos">#</th>
            <th className="leaderboard-table__th leaderboard-table__th--user">Игрок</th>
            <th className="leaderboard-table__th leaderboard-table__th--pts">Очки</th>
            <th className="leaderboard-table__th">Прогнозы</th>
            <th className="leaderboard-table__th">Точные счёта</th>
            <th className="leaderboard-table__th">Угаданные исходы</th>
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
                <strong>{entry.totalPoints}</strong>
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
