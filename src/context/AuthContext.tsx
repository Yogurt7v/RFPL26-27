import { createContext, useState, useEffect, type ReactNode } from 'react'
import { registerUser, verifyUser, type AuthUser } from '../api/auth'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: (login: string, password: string) => Promise<string | null>
  register: (login: string, password: string) => Promise<string | null>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_KEY = 'rfpl_user'

function loadUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
  return null
}

function saveUser(user: AuthUser | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = loadUser()
    setUser(storedUser)
    setIsLoading(false)
  }, [])

  const login = async (login: string, password: string): Promise<string | null> => {
    const { user: authUser, error } = await verifyUser(login, password)
    if (error) return error

    setUser(authUser)
    saveUser(authUser)
    return null
  }

  const register = async (login: string, password: string): Promise<string | null> => {
    const { user: authUser, error } = await registerUser(login, password)
    if (error) return error

    setUser(authUser)
    saveUser(authUser)
    return null
  }

  const logout = () => {
    setUser(null)
    saveUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
