import { useCallback, useEffect, useState } from 'react'
import { loadTheme, saveTheme, type Theme } from '../game/storage'

/** Applies the theme to <html data-theme> so CSS variables can switch wholesale. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(loadTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    saveTheme(theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle }
}
