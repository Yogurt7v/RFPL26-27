import { useState, useEffect } from 'react'
import { getLeaderboard, type LeaderboardEntry } from '../api/leaderboard'

interface LeaderboardTableProps {
  currentUserId?: string
}

const MEDALS = ['🥇', '🥈', '🥉']

export function LeaderboardTable({ currentUserId }: LeaderboardTableProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getLeaderboard()
        if (data.length === 0) {
          setError('Пока нет данных для таблицы лидеров')
        } else {
          setEntries(data)
        }
      } catch (err) {
        console.error('Error loading leaderboard:', err)
        setError('Ошибка загрузки данных')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  if (isLoading) {
    return (
      <div className="leaderboard-table">
        <div className="leaderboard-table__header">
          <span className="leaderboard-table__title">Таблица лидеров</span>
        </div>
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

  if (error) {
    return <div className="leaderboard-table" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>{error}</div>
  }

  return (
    <div className="leaderboard-table">
      <div className="leaderboard-table__header">
        <span className="leaderboard-table__title">Таблица лидеров</span>
      </div>

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
                {index < 3 ? (
                  <span className="leaderboard-table__medal">{MEDALS[index]}</span>
                ) : (
                  index + 1
                )}
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

      <div className="leaderboard-table__zigzag" />
    </div>
  )
}
