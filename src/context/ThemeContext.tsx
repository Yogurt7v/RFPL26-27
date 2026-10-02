import { createContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'
type FontSize = 1 | 2 | 3 | 4 | 5

interface ThemeContextType {
  theme: Theme
  effectiveTheme: ResolvedTheme
  fontSize: FontSize
  setThemePreference: (pref: Theme) => void
  setFontSize: (size: FontSize) => void
}

export const ThemeContext = createContext<ThemeContextType | null>(null)

const THEME_KEY = 'rfpl_theme'
// Ключ старого «защёлка»: его ставил прежний бинарный тумблер темы в знак того, что
// пользователь сделал осознанный выбор, и больше не давал переключиться обратно на
// системную тему. Защёлка была «запись один раз», поэтому такие пользователи оказались
// намертво прибиты к своему выбору — и это ровно тот баг, который убирает миграция ниже:
// значение переписывается в 'system', а ключ удаляется, чтобы вернуть управление темой.
const LEGACY_LATCH_KEY = 'rfpl_theme_user_set'
const FONT_SIZE_KEY = 'rfpl_font_size'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** Превращает сохранённую настройку в тему, которую нужно применить к <html>. */
export function resolveTheme(pref: Theme): ResolvedTheme {
  if (pref === 'dark' || pref === 'light') return pref
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

/**
 * Зеркалит блокирующий boot-скрипт из index.html: явный выбор 'light'/'dark'
 * уважается, всё остальное (включая 'system' и мусор) следует за системой.
 * Защёлённые старым тумблером пользователи переписываются на 'system', поэтому
 * boot-скрипт и React после миграции принимают одно и то же значение.
 */
function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)

  const latchedByOldToggler = localStorage.getItem(LEGACY_LATCH_KEY) === '1'
  if (latchedByOldToggler && (stored === 'light' || stored === 'dark')) {
    localStorage.setItem(THEME_KEY, 'system')
    localStorage.removeItem(LEGACY_LATCH_KEY)
    return 'system'
  }

  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

function loadFontSize(): FontSize {
  const stored = localStorage.getItem(FONT_SIZE_KEY)
  const num = parseInt(stored || '')
  if (num >= 1 && num <= 5) return num as FontSize
  return 3
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(loadTheme)
  // Следует за системной темой: меняется только обработчиком matchMedia ниже.
  const [systemPref, setSystemPref] = useState<ResolvedTheme>(() => resolveTheme('system'))
  const [fontSize, setFontSizeState] = useState<FontSize>(loadFontSize)

  // systemPref в зависимостях заставляет resolveTheme перечитать matchMedia,
  // когда системная тема меняется при активной настройке 'system'.
  const effectiveTheme = useMemo(() => resolveTheme(theme), [theme, systemPref])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme, effectiveTheme])

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', String(fontSize))
    localStorage.setItem(FONT_SIZE_KEY, String(fontSize))
  }, [fontSize])

  // Реагируем на смену системной темы, пока выбран режим 'system'
  useEffect(() => {
    if (theme !== 'system') return

    const mq = window.matchMedia(DARK_QUERY)
    const handler = (e: MediaQueryListEvent) => {
      setSystemPref(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  // Blink кеширует кандидатов theme-color при построении Document и потом перечитывает
  // их media/content живьём, поэтому мета-теги только мутируются и никогда не создаются:
  // новый <meta>, добавленный после загрузки, уже не будет учтён.
  // Пишем цвет во ВСЕ кандидаты: браузер берёт первый meta, у которого media совпал с
  // системной схемой, а это не обязательно первый в дереве — запись в один элемент
  // оставляла бы неверный цвет выбранным там, где схема ОС и выбор юзера расходятся.
  useEffect(() => {
    const themeColors = document.querySelectorAll('meta[name="theme-color"]')
    if (themeColors.length > 0) {
      const color = effectiveTheme === 'dark' ? '#0A0E1A' : '#FFFFFF'
      themeColors.forEach((meta) => meta.setAttribute('content', color))
    } else {
      console.warn('ThemeProvider: <meta name="theme-color"> не найден — содержимое не обновлено')
    }

    const statusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    if (statusBar) {
      statusBar.setAttribute('content', 'default')
    } else {
      console.warn(
        'ThemeProvider: <meta name="apple-mobile-web-app-status-bar-style"> не найден — содержимое не обновлено',
      )
    }
  }, [effectiveTheme])

  const setThemePreference = useCallback((pref: Theme) => {
    setTheme(pref)
  }, [])

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size)
  }

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, fontSize, setThemePreference, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  )
}
