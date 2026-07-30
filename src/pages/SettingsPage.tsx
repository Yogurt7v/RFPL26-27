import { useContext, useState, useEffect } from 'react'
import { ThemeContext } from '../context/ThemeContext'
import { useAuth } from '../hooks/useAuth'
import { getSecurityQuestion, setSecurityQuestion, SECURITY_QUESTIONS } from '../api/auth'
import { LogoutIcon } from '../components/Icons'
import { PredictionResults } from '../components/PredictionResults'
import { APP_VERSION } from '../config'

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
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [showSecurity, setShowSecurity] = useState(false)
  const [questionMsg, setQuestionMsg] = useState<string | null>(null)
  const [questionSet, setQuestionSet] = useState(false)

  useEffect(() => {
    if (!user) return
    getSecurityQuestion(user.username).then(q => {
      if (q) setQuestionSet(true)
    })
  }, [user])

  if (!themeCtx) return null

  const { theme, fontSize, toggleTheme, setFontSize } = themeCtx

  const handleSaveQuestion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const question = fd.get('question') as string
    const answer = fd.get('answer') as string
    if (!question || !answer || answer.length < 2) return
    const ok = await setSecurityQuestion(user!.id, question, answer)
    if (ok) {
      setQuestionMsg('Сохранено')
      setQuestionSet(true)
      setShowQuestionForm(false)
    } else {
      setQuestionMsg('Ошибка сохранения')
    }
    setTimeout(() => setQuestionMsg(null), 3000)
  }

  return (
    <div className="page">
      <div className="settings">
        <h2 className="settings__title">Настройки</h2>

        <div className="settings-section">
          <div className="settings-section__label">Аккаунт</div>
          {user && (
            <div className="settings-user">
              <span className="settings-user__name">{user.username}</span>
              <button className="settings-user__logout" onClick={logout} title="Выйти">
                <LogoutIcon size={20} />
              </button>
            </div>
          )}
        </div>

        <div className="settings-section">
          <div
            className="settings-section__label settings-section__label--clickable"
            onClick={() => setShowSecurity(!showSecurity)}
          >
            {showSecurity ? '▾' : '▸'} Безопасность
          </div>

          {showSecurity && (
            <>
              <p className="settings-hint" style={{ marginBottom: 'var(--spacing-sm)' }}>
                Контрольный вопрос используется для восстановления пароля
              </p>

              {!showQuestionForm ? (
                <button
                  className="btn btn--primary"
                  onClick={() => setShowQuestionForm(true)}
                >
                  {questionSet ? 'Изменить контрольный вопрос' : 'Задать контрольный вопрос'}
                </button>
              ) : (
                <form className="settings-security-form" onSubmit={handleSaveQuestion}>
                  <select className="input" name="question" defaultValue="">
                    <option value="" disabled>Выберите контрольный вопрос</option>
                    {SECURITY_QUESTIONS.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  <input
                    className="input"
                    name="answer"
                    type="text"
                    placeholder="Ответ на вопрос"
                    minLength={2}
                    required
                  />
                  <div className="settings-security-form__actions">
                    <button type="submit" className="btn btn--primary">
                      Сохранить
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => setShowQuestionForm(false)}
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              )}

              {questionMsg && (
                <span className="settings-hint" style={{ color: 'var(--color-success)', marginTop: 'var(--spacing-sm)', display: 'block' }}>
                  {questionMsg}
                </span>
              )}
            </>
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

      {user && <PredictionResults userId={user.id} />}

      <div className="settings__version">
        Версия {APP_VERSION}
      </div>
    </div>
  )
}

export default SettingsPage
