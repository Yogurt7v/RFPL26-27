import { useState, useActionState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type Tab = 'login' | 'register'

export function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<Tab>('login')

  const [loginState, loginFormAction, loginPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const username = formData.get('username') as string
      const password = formData.get('password') as string

      if (!username || username.length < 3) {
        return 'Логин должен быть не менее 3 символов'
      }
      if (!password || password.length < 6) {
        return 'Пароль должен быть не менее 6 символов'
      }

      const error = await login(username, password)
      if (error) return error

      navigate('/')
      return null
    },
    null
  )

  const [registerState, registerFormAction, registerPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const username = formData.get('username') as string
      const password = formData.get('password') as string

      if (!username || username.length < 3) {
        return 'Логин должен быть не менее 3 символов'
      }
      if (!password || password.length < 6) {
        return 'Пароль должен быть не менее 6 символов'
      }

      const error = await register(username, password)
      if (error) return error

      navigate('/')
      return null
    },
    null
  )

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>РПЛ Прогнозы</h1>

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
          <form action={loginFormAction}>
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
            {loginState && <div className="error">{loginState}</div>}
          </form>
        ) : (
          <form action={registerFormAction}>
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
            {registerState && <div className="error">{registerState}</div>}
          </form>
        )}
      </div>
    </div>
  )
}
