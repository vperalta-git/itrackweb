'use client'

import * as React from 'react'

type Theme = 'light' | 'dark'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
}

type ThemeContextValue = {
  resolvedTheme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'theme'

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
}: ThemeProviderProps) {
  const [resolvedTheme, setResolvedTheme] = React.useState<Theme>(defaultTheme)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)

    const storedTheme = window.localStorage.getItem(STORAGE_KEY)
    const nextTheme = storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : defaultTheme

    setResolvedTheme(nextTheme)
    applyTheme(nextTheme)
  }, [defaultTheme])

  const setTheme = React.useCallback((theme: Theme) => {
    setResolvedTheme(theme)
    window.localStorage.setItem(STORAGE_KEY, theme)
    applyTheme(theme)
  }, [])

  const value = React.useMemo(
    () => ({
      resolvedTheme,
      setTheme,
    }),
    [resolvedTheme, setTheme]
  )

  return (
    <ThemeContext.Provider value={value}>
      {mounted ? children : null}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = React.useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}
