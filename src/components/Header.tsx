import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LogoutIcon } from './Icons'

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="header">
      <Link to="/" className="header__logo">
        <img src="/favicon/favicon-96x96.png" alt="РПЛ" className="header__logo-img" />
        <span>РПЛ Прогнозы</span>
      </Link>

      <div className="header__right">
        {user && (
          <>
            <span className="header__username">{user.username}</span>
            <button className="header__logout" onClick={logout} title="Выйти">
              <LogoutIcon size={20} />
            </button>
          </>
        )}
      </div>
    </header>
  )
}
