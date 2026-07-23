import { useState, useActionState, useEffect, useRef } from 'react'
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

  const loginBtnRef = useRef<HTMLButtonElement>(null)
  const registerBtnRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="login-page">
      <div className="login-brand">
        <img className="login-brand__icon" src="/favicon/favicon-96x96.png" alt="Рфпл" />
        <h1 className="login-brand__title">РФПЛ<br />Прогнозы</h1>
        <p className="login-brand__subtitle">Прогнозы матчей РФПЛ 2026/2027</p>
      </div>
      <div className="login-form">
        <div className="login-form__inner">
          <div className="tabs">
            <span
              className="tabs__indicator"
              style={{
                transform: `translateX(${activeTab === 'register' ? '100%' : '0'})`,
              }}
            />
            <button
              ref={loginBtnRef}
              className={`tabs__btn ${activeTab === 'login' ? 'tabs__btn--active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Вход
            </button>
            <button
              ref={registerBtnRef}
              className={`tabs__btn ${activeTab === 'register' ? 'tabs__btn--active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              Регистрация
            </button>
          </div>

          {activeTab === 'login' ? (
            <form action={loginFormAction} key="login">
              <input
                className="input"
                name="username"
                type="text"
                placeholder="Логин"
                minLength={3}
                required
              />
              <input
                className="input"
                name="password"
                type="password"
                placeholder="Пароль"
                minLength={6}
                required
              />
              <button type="submit" className="btn btn--primary btn--full" disabled={loginPending}>
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
                className="input"
                name="username"
                type="text"
                placeholder="Логин (мин. 3 символа)"
                minLength={3}
                required
              />
              <input
                className="input"
                name="password"
                type="password"
                placeholder="Пароль (мин. 6 символов)"
                minLength={6}
                required
              />
              <button type="submit" className="btn btn--primary btn--full" disabled={registerPending}>
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
    </div>
  )
}
