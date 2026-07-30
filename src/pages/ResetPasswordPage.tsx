import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getSecurityQuestion, resetPasswordWithSecurity } from '../api/auth'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState<'username' | 'reset'>('username')
  const [username, setUsername] = useState('')
  const [question, setQuestion] = useState('')
  const [error, setError] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  const handleUsernameSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const form = new FormData(e.currentTarget)
    const login = form.get('username') as string

    if (!login || login.length < 3) {
      setError('Введите логин')
      return
    }

    const q = await getSecurityQuestion(login)
    if (!q) {
      setError('Для этого аккаунта не установлен контрольный вопрос. Восстановление невозможно.')
      return
    }

    setUsername(login)
    setQuestion(q)
    setStep('reset')
  }

  const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsResetting(true)
    const form = new FormData(e.currentTarget)
    const answer = form.get('answer') as string
    const newPassword = form.get('newPassword') as string

    if (!answer) {
      setError('Введите ответ на контрольный вопрос')
      setIsResetting(false)
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Новый пароль должен быть не менее 6 символов')
      setIsResetting(false)
      return
    }

    const result = await resetPasswordWithSecurity(username, answer, newPassword)
    if (!result.success) {
      setError(result.error || 'Неверный ответ')
      setIsResetting(false)
      return
    }

    const loginErr = await login(username, newPassword)
    if (loginErr) {
      navigate('/login')
    } else {
      navigate('/')
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <img className="login-brand__icon" src="/favicon/favicon-96x96.png" alt="Рфпл" />
        <h1 className="login-brand__title">РПЛ<br />Прогнозы</h1>
        <p className="login-brand__subtitle">Восстановление пароля</p>
      </div>
      <div className="login-form">
        <div className="login-form__inner">
          {step === 'username' && (
            <form onSubmit={handleUsernameSubmit}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '16px', textAlign: 'center' }}>
                Введите ваш логин, чтобы восстановить пароль через контрольный вопрос
              </p>
              <input
                className="input"
                name="username"
                type="text"
                placeholder="Логин"
                minLength={3}
                required
                autoFocus
              />
              <button type="submit" className="btn btn--primary btn--full">
                Далее
              </button>
              {error && (
                <div className="login-message login-message--error">{error}</div>
              )}
              <button
                type="button"
                className="btn btn--secondary btn--full"
                onClick={() => navigate('/login')}
                style={{ marginTop: '8px' }}
              >
                Назад
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetSubmit}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', marginBottom: '16px', textAlign: 'center', fontWeight: 500 }}>
                {question}
              </p>
              <input
                className="input"
                name="answer"
                type="text"
                placeholder="Ответ на контрольный вопрос"
                required
                autoFocus
                autoComplete="off"
              />
              <input
                className="input"
                name="newPassword"
                type="password"
                placeholder="Новый пароль"
                minLength={6}
                required
                autoComplete="new-password"
              />
              <button type="submit" className="btn btn--primary btn--full" disabled={isResetting}>
                {isResetting ? 'Сброс...' : 'Сбросить пароль'}
              </button>
              {error && (
                <div className="login-message login-message--error">{error}</div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage
