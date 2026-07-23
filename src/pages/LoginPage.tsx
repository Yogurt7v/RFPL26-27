import { useState, useActionState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type Tab = 'login' | 'register'
type MessageType = 'error' | 'success' | null

interface Message {
  text: string
  type: MessageType
}

export function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<Tab>('login')
  const [loginMessage, setLoginMessage] = useState<Message | null>(null)
  const [registerMessage, setRegisterMessage] = useState<Message | null>(null)

  useEffect(() => {
    setLoginMessage(null)
    setRegisterMessage(null)
  }, [activeTab])

  const [, loginFormAction, loginPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const username = formData.get('username') as string
      const password = formData.get('password') as string

      if (!username || username.length < 3) {
        setLoginMessage({ text: 'Логин должен быть не менее 3 символов', type: 'error' })
        return 'validation'
      }
      if (!password || password.length < 6) {
        setLoginMessage({ text: 'Пароль должен быть не менее 6 символов', type: 'error' })
        return 'validation'
      }

      const error = await login(username, password)
      if (error) {
        setLoginMessage({ text: 'Неверный логин или пароль', type: 'error' })
        return 'auth_error'
      }

      setLoginMessage({ text: 'Вход выполнен!', type: 'success' })
      setTimeout(() => navigate('/'), 500)
      return null
    },
    null
  )

  const [, registerFormAction, registerPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const username = formData.get('username') as string
      const password = formData.get('password') as string

      if (!username || username.length < 3) {
        setRegisterMessage({ text: 'Логин должен быть не менее 3 символов', type: 'error' })
        return 'validation'
      }
      if (!password || password.length < 6) {
        setRegisterMessage({ text: 'Пароль должен быть не менее 6 символов', type: 'error' })
        return 'validation'
      }

      const error = await register(username, password)
      if (error) {
        if (error.includes('duplicate') || error.includes('unique')) {
          setRegisterMessage({ text: 'Логин уже занят', type: 'error' })
        } else {
          setRegisterMessage({ text: 'Ошибка регистрации. Попробуйте другой логин', type: 'error' })
        }
        return 'auth_error'
      }

      setRegisterMessage({ text: 'Пользователь создан успешно!', type: 'success' })
      setTimeout(() => navigate('/'), 1000)
      return null
    },
    null
  )

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>РПЛ Прогнозы</h1>
        <p className="login-card__subtitle">Прогнозы матчей РПЛ 2026/2027</p>

        <div className="tabs">
          <button
            className={activeTab === 'login' ? 'active' : ''}
            onClick={() => setActiveTab('login')}
          >
            Вход
          </button>
          <button
            className={activeTab === 'register' ? 'active' : ''}
            onClick={() => setActiveTab('register')}
          >
            Регистрация
          </button>
        </div>

        {activeTab === 'login' ? (
          <form action={loginFormAction} key="login">
            <input
              name="username"
              type="text"
              placeholder="Логин"
              minLength={3}
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Пароль"
              minLength={6}
              required
            />
            <button type="submit" disabled={loginPending}>
              {loginPending ? 'Вход...' : 'Войти'}
            </button>
            {loginMessage && (
              <div className={`login-message login-message--${loginMessage.type}`}>
                {loginMessage.text}
              </div>
            )}
          </form>
        ) : (
          <form action={registerFormAction} key="register">
            <input
              name="username"
              type="text"
              placeholder="Логин (мин. 3 символа)"
              minLength={3}
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Пароль (мин. 6 символов)"
              minLength={6}
              required
            />
            <button type="submit" disabled={registerPending}>
              {registerPending ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
            {registerMessage && (
              <div className={`login-message login-message--${registerMessage.type}`}>
                {registerMessage.text}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
