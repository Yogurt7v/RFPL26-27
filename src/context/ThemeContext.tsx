import { createContext, useState, useEffect, type ReactNode } from 'react'

type Theme = 'light' | 'dark'
type FontSize = 'small' | 'medium' | 'large'

interface ThemeContextType {
  theme: Theme
  fontSize: FontSize
  toggleTheme: () => void
  setFontSize: (size: FontSize) => void
}

export const ThemeContext = createContext<ThemeContextType | null>(null)

const THEME_KEY = 'rfpl_theme'
const FONT_SIZE_KEY = 'rfpl_font_size'

function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function loadFontSize(): FontSize {
  const stored = localStorage.getItem(FONT_SIZE_KEY)
  if (stored === 'small' || stored === 'medium' || stored === 'large') return stored
  return 'medium'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [fontSize, setFontSizeState] = useState<FontSize>(loadFontSize)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize)
    localStorage.setItem(FONT_SIZE_KEY, fontSize)
  }, [fontSize])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size)
  }

  return (
    <ThemeContext.Provider value={{ theme, fontSize, toggleTheme, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  )
}
