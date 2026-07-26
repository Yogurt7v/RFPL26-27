import { useContext } from 'react'
import { ThemeContext } from '../context/ThemeContext'
import { useAuth } from '../hooks/useAuth'
import { PredictionResults } from '../components/PredictionResults'

const FONT_SIZE_LABELS: Record<number, string> = {
  1: 'Очень маленький',
  2: 'Маленький',
  3: 'Средний',
  4: 'Большой',
  5: 'Очень большой',
}

export function SettingsPage() {
  const themeCtx = useContext(ThemeContext)
  const { user, logout } = useAuth()

  if (!themeCtx) return null

  const { theme, fontSize, toggleTheme, setFontSize } = themeCtx

  return (
    <div className="page">
      <div className="settings">
        <div className="settings__header">
          <span className="settings__title">Настройки</span>
        </div>

        <div className="settings-section">
          <div className="settings-section__label">Аккаунт</div>
          {user && (
            <div className="settings-user">
              <span className="settings-user__name">{user.username}</span>
              <button className="btn btn--secondary" onClick={logout}>
                Выйти
              </button>
            </div>
          )}
        </div>

        <div className="settings-section">
          <div className="settings-section__label">Тема</div>
          <div className="settings-toggle">
            <span>Тёмная тема</span>
            <button
              className={`toggle-switch ${theme === 'dark' ? 'toggle-switch--active' : ''}`}
              onClick={toggleTheme}
            >
              <span className="toggle-switch__knob" />
            </button>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section__label">Размер шрифта</div>
          <div className="settings-range">
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={fontSize}
              onChange={e => setFontSize(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
              className="settings-range__input"
            />
            <div className="settings-range__labels">
              <span className="settings-range__label">1</span>
              <span className="settings-range__label">2</span>
              <span className="settings-range__label">3</span>
              <span className="settings-range__label">4</span>
              <span className="settings-range__label">5</span>
            </div>
          </div>
          <span className="settings-hint">{FONT_SIZE_LABELS[fontSize]}</span>
        </div>
      </div>

      <div className="settings__zigzag" />

      {user && <PredictionResults userId={user.id} />}
    </div>
  )
}

export default SettingsPage
