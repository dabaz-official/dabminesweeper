import { useCallback, useEffect, useState } from 'react'
import { loadTheme, saveTheme, type Theme } from '../game/storage'

/** Browser chrome colour of the installed app, matching --canvas in each theme. */
const THEME_COLOR: Record<Theme, string> = { light: '#ffffff', dark: '#0a0a0a' }

/** Applies the theme to <html data-theme> so CSS variables can switch wholesale. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(loadTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLOR[theme])
    saveTheme(theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle }
}
