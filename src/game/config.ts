import type { DifficultyKey, GameConfig, PresetKey } from './types'

export interface Preset extends GameConfig {
  key: PresetKey
  label: string
  /** One-line description shown under the difficulty name. */
  blurb: string
}

export const PRESETS: Preset[] = [
  { key: 'beginner', label: 'Beginner', blurb: '9 × 9 · 10 mines', rows: 9, cols: 9, mines: 10 },
  {
    key: 'intermediate',
    label: 'Intermediate',
    blurb: '16 × 16 · 40 mines',
    rows: 16,
    cols: 16,
    mines: 40,
  },
  { key: 'expert', label: 'Expert', blurb: '30 × 16 · 99 mines', rows: 16, cols: 30, mines: 99 },
]

export const PRESET_BY_KEY = Object.fromEntries(PRESETS.map((preset) => [preset.key, preset])) as Record<
  PresetKey,
  Preset
>

export const DEFAULT_CONFIG: GameConfig = {
  rows: PRESET_BY_KEY.beginner.rows,
  cols: PRESET_BY_KEY.beginner.cols,
  mines: PRESET_BY_KEY.beginner.mines,
}

export const CUSTOM_LIMITS = {
  minDimension: 5,
  maxDimension: 30,
  minMines: 1,
} as const

/** The 3×3 area around the first click stays mine-free, so a few cells must be left over. */
export const SAFE_ZONE_SIZE = 9

export function maxMinesFor(rows: number, cols: number): number {
  return Math.max(CUSTOM_LIMITS.minMines, rows * cols - SAFE_ZONE_SIZE)
}

/** Keeps any user- or preset-supplied config inside the supported range. */
export function clampConfig(config: GameConfig): GameConfig {
  const rows = clampInt(config.rows, CUSTOM_LIMITS.minDimension, CUSTOM_LIMITS.maxDimension)
  const cols = clampInt(config.cols, CUSTOM_LIMITS.minDimension, CUSTOM_LIMITS.maxDimension)
  const mines = clampInt(config.mines, CUSTOM_LIMITS.minMines, maxMinesFor(rows, cols))
  return { rows, cols, mines }
}

export function configKey(config: GameConfig): string {
  return `${config.rows}x${config.cols}x${config.mines}`
}

export function describeConfig(config: GameConfig): string {
  return `${config.rows} × ${config.cols} · ${config.mines} mines`
}

export function labelForDifficulty(key: DifficultyKey): string {
  return key === 'custom' ? 'Custom' : PRESET_BY_KEY[key].label
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}
