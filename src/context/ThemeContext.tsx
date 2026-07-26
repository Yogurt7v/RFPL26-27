import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'

type Theme = 'light' | 'dark'
type FontSize = 1 | 2 | 3 | 4 | 5

interface ThemeContextType {
  theme: Theme
  fontSize: FontSize
  toggleTheme: () => void
  setFontSize: (size: FontSize) => void
}

export const ThemeContext = createContext<ThemeContextType | null>(null)

const THEME_KEY = 'rfpl_theme'
const USER_SET_KEY = 'rfpl_theme_user_set'
const FONT_SIZE_KEY = 'rfpl_font_size'

function loadTheme(): Theme {
  const userSet = localStorage.getItem(USER_SET_KEY) === '1'
  if (userSet) {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function loadFontSize(): FontSize {
  const stored = localStorage.getItem(FONT_SIZE_KEY)
  const num = parseInt(stored || '')
  if (num >= 1 && num <= 5) return num as FontSize
  return 3
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [userSet, setUserSet] = useState(() => localStorage.getItem(USER_SET_KEY) === '1')
  const [fontSize, setFontSizeState] = useState<FontSize>(loadFontSize)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (userSet) {
      localStorage.setItem(THEME_KEY, theme)
    }
  }, [theme, userSet])

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', String(fontSize))
    localStorage.setItem(FONT_SIZE_KEY, String(fontSize))
  }, [fontSize])

  // Реагируем на смену системной темы, пока пользователь не нажал toggle
  useEffect(() => {
    if (userSet) return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [userSet])

  const toggleTheme = useCallback(() => {
    setUserSet(true)
    localStorage.setItem(USER_SET_KEY, '1')
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size)
  }

  return (
    <ThemeContext.Provider value={{ theme, fontSize, toggleTheme, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  )
}
