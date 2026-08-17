import { useQuery } from '@tanstack/react-query'
import { getStandings, type Standing } from '../api/standings'
import { getTeamByName } from '../lib/teams'

export function StandingsTable() {
  const { data: standings = [], isLoading, error } = useQuery({
    queryKey: ['standings'],
    queryFn: getStandings,
    staleTime: 5 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="standings-table">
        <h2 className="standings-table__title">Турнирная таблица</h2>
        <div className="content-enter table-scroll">
          <table className="standings-table__table">
            <thead>
              <tr>
                <th className="standings-table__th standings-table__th--pos"><div className="skeleton" style={{ width: 16, height: 12 }} /></th>
                <th className="standings-table__th standings-table__th--team"><div className="skeleton" style={{ width: 56, height: 12 }} /></th>
                <th className="standings-table__th standings-table__th--pts"><div className="skeleton" style={{ width: 32, height: 12 }} /></th>
                <th className="standings-table__th"><div className="skeleton" style={{ width: 16, height: 12 }} /></th>
                <th className="standings-table__th"><div className="skeleton" style={{ width: 16, height: 12 }} /></th>
                <th className="standings-table__th"><div className="skeleton" style={{ width: 16, height: 12 }} /></th>
                <th className="standings-table__th"><div className="skeleton" style={{ width: 16, height: 12 }} /></th>
                <th className="standings-table__th"><div className="skeleton" style={{ width: 16, height: 12 }} /></th>
                <th className="standings-table__th"><div className="skeleton" style={{ width: 16, height: 12 }} /></th>
                <th className="standings-table__th"><div className="skeleton" style={{ width: 28, height: 12 }} /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 16 }).map((_, i) => (
                <tr key={i} className="standings-table__row">
                  <td className="standings-table__td standings-table__td--pos">
                    <div className="skeleton" style={{ width: 20, height: 14 }} />
                  </td>
                  <td className="standings-table__td standings-table__td--team">
                    <span className="standings-table__team-name">
                      <div className="skeleton" style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0 }} />
                      <div className="skeleton" style={{ width: `${60 + (i % 5) * 15}%`, height: 14 }} />
                    </span>
                  </td>
                  <td className="standings-table__td standings-table__td--pts">
                    <div className="skeleton" style={{ width: 28, height: 14 }} />
                  </td>
                  <td className="standings-table__td"><div className="skeleton" style={{ width: 20, height: 14 }} /></td>
                  <td className="standings-table__td"><div className="skeleton" style={{ width: 20, height: 14 }} /></td>
                  <td className="standings-table__td"><div className="skeleton" style={{ width: 20, height: 14 }} /></td>
                  <td className="standings-table__td"><div className="skeleton" style={{ width: 20, height: 14 }} /></td>
                  <td className="standings-table__td"><div className="skeleton" style={{ width: 20, height: 14 }} /></td>
                  <td className="standings-table__td"><div className="skeleton" style={{ width: 20, height: 14 }} /></td>
                  <td className="standings-table__td"><div className="skeleton" style={{ width: 30, height: 14 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (error || standings.length === 0) {
    return <div className="standings-table error-fallback">
      {error ? 'Ошибка загрузки данных' : 'Не удалось загрузить турнирную таблицу'}
    </div>
  }

  return (
    <div className="standings-table">
      <h2 className="standings-table__title">Турнирная таблица</h2>

      <div className="content-enter table-scroll">
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
              return (
                <tr key={row.teamId} className="standings-table__row">
                  <td className="standings-table__td standings-table__td--pos">
                    {row.position <= 3 ? (
                      <span className={`standings-table__pos-badge standings-table__pos-badge--${row.position}`}>
                        {row.position}
                      </span>
                    ) : (
                      row.position
                    )}
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
                    {row.points}
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
    </div>
  )
}
