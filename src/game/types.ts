export type PresetKey = 'beginner' | 'intermediate' | 'expert'
export type DifficultyKey = PresetKey | 'custom'

export interface GameConfig {
  rows: number
  cols: number
  mines: number
}

export interface Cell {
  mine: boolean
  adjacent: number
  revealed: boolean
  flagged: boolean
  /** The mine the player detonated. */
  exploded: boolean
  /** A flag that turned out to be wrong, shown after a loss. */
  wrongFlag: boolean
}

export type GameStatus = 'ready' | 'playing' | 'won' | 'lost'

export interface GameBoard {
  rows: number
  cols: number
  mines: number
  cells: Cell[]
  status: GameStatus
  /** Mines are placed lazily, on the first reveal, so that click is always safe. */
  minesPlaced: boolean
}

export type BestTimes = Partial<Record<PresetKey, number>>
