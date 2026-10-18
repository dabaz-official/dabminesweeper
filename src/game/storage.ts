import type { BestTimes, PresetKey } from './types'

const BEST_TIMES_KEY = 'minesweeper.best-times.v1'
const THEME_KEY = 'minesweeper.theme.v1'

const PRESET_KEYS: PresetKey[] = ['beginner', 'intermediate', 'expert']

export function loadBestTimes(): BestTimes {
  try {
    const raw = localStorage.getItem(BEST_TIMES_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const source = parsed as Record<string, unknown>
    const best: BestTimes = {}
    for (const key of PRESET_KEYS) {
      const value = source[key]
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        best[key] = Math.floor(value)
      }
    }
    return best
  } catch {
    return {}
  }
}

export function saveBestTimes(times: BestTimes): void {
  try {
    localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(times))
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); scores just won't persist.
  }
}

export type Theme = 'dark' | 'light'

export function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // fall through to the system preference
  }
  const prefersLight =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches
  return prefersLight ? 'light' : 'dark'
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Non-fatal: the theme simply resets next visit.
  }
}
