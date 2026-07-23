import { useState, useEffect } from 'react'
import { getStandings, type Standing } from '../api/standings'
import { getTeamByName } from '../lib/teams'

export function StandingsTable() {
  const [standings, setStandings] = useState<Standing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getStandings()
        if (data.length === 0) {
          setError('Не удалось загрузить турнирную таблицу')
        } else {
          setStandings(data)
        }
      } catch (err) {
        console.error('Error loading standings:', err)
        setError('Ошибка загрузки данных')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  if (isLoading) {
    return <div className="standings-table">Загрузка...</div>
  }

  if (error) {
    return <div className="standings-table standings-table--error">{error}</div>
  }

  return (
    <div className="standings-table">
      <h2>Турнирная таблица</h2>

      <table className="standings-table__table">
        <thead>
          <tr>
            <th className="standings-table__th standings-table__th--pos">#</th>
            <th className="standings-table__th standings-table__th--team">Команда</th>
            <th className="standings-table__th standings-table__th--pts">Очки</th>
            <th className="standings-table__th">Игры</th>
            <th className="standings-table__th">П</th>
            <th className="standings-table__th">Н</th>
            <th className="standings-table__th">П</th>
            <th className="standings-table__th">З</th>
            <th className="standings-table__th">П</th>
            <th className="standings-table__th">+/−</th>
          </tr>
        </thead>
        <tbody>
          {standings.map(row => {
            const team = getTeamByName(row.teamName)
            return (
              <tr key={row.teamId} className="standings-table__row">
                <td className="standings-table__td standings-table__td--pos">
                  {row.position}
                </td>
                <td className="standings-table__td standings-table__td--team">
                  {team && (
                    <img
                      src={team.logo}
                      alt={team.name}
                      className="standings-table__logo"
                    />
                  )}
                  <span>{row.teamName}</span>
                </td>
                <td className="standings-table__td standings-table__td--pts">
                  <strong>{row.points}</strong>
                </td>
                <td className="standings-table__td">{row.played}</td>
                <td className="standings-table__td">{row.won}</td>
                <td className="standings-table__td">{row.drawn}</td>
                <td className="standings-table__td">{row.lost}</td>
                <td className="standings-table__td">{row.goalsFor}</td>
                <td className="standings-table__td">{row.goalsAgainst}</td>
                <td className="standings-table__td">
                  {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
