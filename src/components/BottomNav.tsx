import { NavLink } from 'react-router-dom'
import { SoccerBallIcon, TableIcon, TrophyIcon, SettingsIcon } from './Icons'

const navItems = [
  { to: '/', icon: SoccerBallIcon, label: 'Матчи' },
  { to: '/standings', icon: TableIcon, label: 'Таблица' },
  { to: '/leaderboard', icon: TrophyIcon, label: 'Лидеры' },
  { to: '/settings', icon: SettingsIcon, label: 'Настройки' },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
          }
        >
          <item.icon className="bottom-nav__icon" size={24} />
          <span className="bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
