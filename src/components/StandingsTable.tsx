import { useState, useEffect } from 'react'
import { getStandings, type Standing } from '../api/standings'
import { getTeamByName } from '../lib/teams'
import { Spinner } from './Spinner'

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
    return <div className="standings-table"><Spinner /></div>
  }

  if (error) {
    return <div className="standings-table" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>{error}</div>
  }

  return (
    <div className="standings-table">
      <div className="standings-table__header">
        <span className="standings-table__title">Турнирная таблица</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="standings-table__table">
          <thead>
            <tr>
              <th className="standings-table__th standings-table__th--pos">#</th>
              <th className="standings-table__th standings-table__th--team">Команда</th>
              <th className="standings-table__th standings-table__th--pts">Очки</th>
              <th className="standings-table__th">И</th>
              <th className="standings-table__th">В</th>
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
              const posClass = row.position <= 3 ? `standings-table__td--pos--${row.position}` : ''
              return (
                <tr key={row.teamId} className="standings-table__row">
                  <td className={`standings-table__td standings-table__td--pos ${posClass}`}>
                    {row.position}
                  </td>
                  <td className="standings-table__td standings-table__td--team">
                    <span className="standings-table__team-name">
                      {team && (
                        <img
                          src={team.logo}
                          alt={row.teamName}
                          className="standings-table__logo"
                        />
                      )}
                      {row.teamName}
                    </span>
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

      <div className="standings-table__zigzag" />
    </div>
  )
}
