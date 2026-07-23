import { Link } from 'react-router-dom'

export function Header() {
  return (
    <header className="header">
      <Link to="/" className="header__logo">
        <img src="/favicon/favicon-96x96.png" alt="Рфпл" className="header__logo-img" />
        <span>Рфпл Прогнозы</span>
      </Link>
    </header>
  )
}
