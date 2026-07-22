import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="header">
      <Link to="/" className="header__logo">
        🏟️ РПЛ Прогнозы
      </Link>

      <div className="header__right">
        {user && (
          <>
            <span className="header__username">{user.username}</span>
            <button className="header__logout" onClick={logout}>
              🚪
            </button>
          </>
        )}
      </div>
    </header>
  )
}
