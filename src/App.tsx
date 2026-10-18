import { useCallback, useEffect, useMemo, useState } from 'react'
import { CustomForm } from './components/CustomForm'
import { DifficultyPicker } from './components/DifficultyPicker'
import { Game } from './components/Game'
import { MineIcon, MoonIcon, SlidersIcon, SunIcon } from './components/Icons'
import { DEFAULT_CONFIG, PRESET_BY_KEY, clampConfig, configKey } from './game/config'
import { loadBestTimes, saveBestTimes } from './game/storage'
import type { BestTimes, DifficultyKey, GameConfig, PresetKey } from './game/types'
import { useTheme } from './hooks/useTheme'

const DEFAULT_CUSTOM: GameConfig = { rows: 12, cols: 12, mines: 24 }

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme()
  const [difficulty, setDifficulty] = useState<DifficultyKey>('beginner')
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG)
  const [customSeed, setCustomSeed] = useState<GameConfig>(DEFAULT_CUSTOM)
  const [customOpen, setCustomOpen] = useState(false)
  const [bestTimes, setBestTimes] = useState<BestTimes>(loadBestTimes)
  // Bumped when a difficulty is picked, to force a fresh game for that board.
  const [boardToken, setBoardToken] = useState(0)

  useEffect(() => {
    saveBestTimes(bestTimes)
  }, [bestTimes])

  const selectPreset = useCallback((key: PresetKey) => {
    const preset = PRESET_BY_KEY[key]
    setDifficulty(key)
    setConfig({ rows: preset.rows, cols: preset.cols, mines: preset.mines })
    setCustomOpen(false)
    setBoardToken((value) => value + 1)
  }, [])

  const applyCustom = useCallback((next: GameConfig) => {
    const clamped = clampConfig(next)
    setDifficulty('custom')
    setConfig(clamped)
    setCustomSeed(clamped)
    setCustomOpen(false)
    setBoardToken((value) => value + 1)
  }, [])

  const handleWin = useCallback(
    (seconds: number) => {
      if (difficulty === 'custom') return
      setBestTimes((previous) => {
        const current = previous[difficulty]
        if (current !== undefined && current <= seconds) return previous
        return { ...previous, [difficulty]: seconds }
      })
    },
    [difficulty],
  )

  const bestTime = difficulty === 'custom' ? undefined : bestTimes[difficulty]
  const gameKey = `${configKey(config)}-${boardToken}`
  const isLight = theme === 'light'
  const themeLabel = useMemo(
    () => (isLight ? 'Switch to dark theme' : 'Switch to light theme'),
    [isLight],
  )

  return (
    <div className="app">
      <div className="ambient" aria-hidden="true" />

      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">
            <MineIcon className="brand-icon" />
          </span>
          <span className="brand-text">
            <h1 className="brand-title">Minesweeper</h1>
            <p className="brand-tagline">Clear every safe tile. Mind the boom.</p>
          </span>
        </div>

        <div className="header-controls">
          <DifficultyPicker active={difficulty} bestTimes={bestTimes} onSelect={selectPreset} />
          <button
            type="button"
            className={`button button-outline custom-trigger${customOpen ? ' is-open' : ''}`}
            aria-expanded={customOpen}
            onClick={() => setCustomOpen((open) => !open)}
          >
            <SlidersIcon className="button-icon" />
            Custom
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={toggleTheme}
            aria-label={themeLabel}
            title={themeLabel}
          >
            {isLight ? (
              <MoonIcon className="icon-button-glyph" />
            ) : (
              <SunIcon className="icon-button-glyph" />
            )}
          </button>
        </div>
      </header>

      <main className="app-main">
        {customOpen ? (
          <CustomForm
            initial={customSeed}
            onApply={applyCustom}
            onCancel={() => setCustomOpen(false)}
          />
        ) : null}

        <Game
          key={gameKey}
          config={config}
          difficulty={difficulty}
          bestTime={bestTime}
          onWin={handleWin}
        />

        <p className="keyboard-hints">
          <span>
            <kbd>Arrows</kbd> move · <kbd>Enter</kbd> open
          </span>
          <span>
            <kbd>F</kbd> flag mode · <kbd>R</kbd> restart
          </span>
          <span>Long-press on touch to flag</span>
        </p>
      </main>

      <footer className="app-footer">
        Built with Vite · React · TypeScript — no game libraries, just a shuffled array
      </footer>
    </div>
  )
}
