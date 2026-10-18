import { SAFE_ZONE_SIZE, clampConfig } from './config'
import type { Cell, GameBoard, GameConfig } from './types'

function emptyCell(): Cell {
  return {
    mine: false,
    adjacent: 0,
    revealed: false,
    flagged: false,
    exploded: false,
    wrongFlag: false,
  }
}

export function createGame(config: GameConfig): GameBoard {
  const { rows, cols, mines } = clampConfig(config)
  return {
    rows,
    cols,
    mines,
    cells: Array.from({ length: rows * cols }, emptyCell),
    status: 'ready',
    minesPlaced: false,
  }
}

export function neighborsOf(index: number, rows: number, cols: number): number[] {
  const row = Math.floor(index / cols)
  const col = index % cols
  const result: number[] = []
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue
      const r = row + dr
      const c = col + dc
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue
      result.push(r * cols + c)
    }
  }
  return result
}

function cloneCells(board: GameBoard): Cell[] {
  return board.cells.map((cell) => ({ ...cell }))
}

/**
 * Scatters mines, keeping the clicked cell and its neighbours clear so the first
 * click always opens something. Falls back to sparing only the clicked cell when
 * the board is too dense for a full 3×3 safe zone.
 */
function withMines(board: GameBoard, safeIndex: number): GameBoard {
  const { rows, cols, mines } = board
  const cells = cloneCells(board)

  const safe = new Set([safeIndex, ...neighborsOf(safeIndex, rows, cols)])
  let candidates: number[] = []
  for (let i = 0; i < cells.length; i += 1) {
    if (!safe.has(i)) candidates.push(i)
  }
  if (candidates.length < mines) {
    candidates = []
    for (let i = 0; i < cells.length; i += 1) {
      if (i !== safeIndex) candidates.push(i)
    }
  }

  shuffle(candidates)
  for (let i = 0; i < Math.min(mines, candidates.length); i += 1) {
    cells[candidates[i]].mine = true
  }

  for (let i = 0; i < cells.length; i += 1) {
    cells[i].adjacent = neighborsOf(i, rows, cols).filter((n) => cells[n].mine).length
  }

  return { ...board, cells, minesPlaced: true }
}

/** Fisher–Yates, in place. */
function shuffle(values: number[]): void {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[values[i], values[j]] = [values[j], values[i]]
  }
}

/** Opens a cell and, for empty cells, spreads outward until it meets numbers. */
function floodReveal(cells: Cell[], rows: number, cols: number, start: number): void {
  const stack = [start]
  while (stack.length > 0) {
    const index = stack.pop() as number
    const cell = cells[index]
    if (cell.revealed || cell.flagged || cell.mine) continue
    cell.revealed = true
    if (cell.adjacent > 0) continue
    for (const next of neighborsOf(index, rows, cols)) {
      const neighbor = cells[next]
      if (!neighbor.revealed && !neighbor.flagged) stack.push(next)
    }
  }
}

function revealAllMines(cells: Cell[]): void {
  for (const cell of cells) {
    if (cell.mine && !cell.flagged) cell.revealed = true
  }
}

function markWrongFlags(cells: Cell[]): void {
  for (const cell of cells) {
    if (!cell.mine && cell.flagged) cell.wrongFlag = true
  }
}

function isCleared(cells: Cell[]): boolean {
  return cells.every((cell) => cell.mine || cell.revealed)
}

function withWin(board: GameBoard, cells: Cell[]): GameBoard {
  for (const cell of cells) {
    if (cell.mine) cell.flagged = true
  }
  return { ...board, cells, status: 'won' }
}

function withLoss(board: GameBoard, cells: Cell[], hitIndex: number): GameBoard {
  cells[hitIndex].revealed = true
  cells[hitIndex].exploded = true
  revealAllMines(cells)
  markWrongFlags(cells)
  return { ...board, cells, status: 'lost' }
}

function finished(board: GameBoard): boolean {
  return board.status === 'won' || board.status === 'lost'
}

/** Left click: open a hidden cell, or chord an already-open number. */
export function revealCell(board: GameBoard, index: number): GameBoard {
  if (finished(board)) return board
  const cell = board.cells[index]
  if (!cell || cell.flagged) return board
  if (cell.revealed) return chordCell(board, index)

  const next = board.minesPlaced ? board : withMines(board, index)
  if (next.cells[index].mine) return withLoss(next, cloneCells(next), index)

  const cells = cloneCells(next)
  floodReveal(cells, next.rows, next.cols, index)
  return isCleared(cells) ? withWin(next, cells) : { ...next, cells, status: 'playing' }
}

/** Right click: cycle a flag on a hidden cell. */
export function toggleFlag(board: GameBoard, index: number): GameBoard {
  if (finished(board)) return board
  const cell = board.cells[index]
  if (!cell || cell.revealed) return board

  const cells = cloneCells(board)
  cells[index].flagged = !cells[index].flagged
  return { ...board, cells }
}

/**
 * Reveals every unflagged neighbour of an open number once the surrounding flags
 * match its count — the classic time-saver.
 */
export function chordCell(board: GameBoard, index: number): GameBoard {
  if (board.status !== 'playing') return board
  const cell = board.cells[index]
  if (!cell || !cell.revealed || cell.adjacent === 0) return board

  const around = neighborsOf(index, board.rows, board.cols)
  const flags = around.filter((n) => board.cells[n].flagged).length
  if (flags !== cell.adjacent) return board

  const cells = cloneCells(board)
  for (const n of around) {
    const neighbor = cells[n]
    if (neighbor.revealed || neighbor.flagged) continue
    if (neighbor.mine) return withLoss(board, cells, n)
    floodReveal(cells, board.rows, board.cols, n)
  }
  return isCleared(cells) ? withWin(board, cells) : { ...board, cells }
}

export function countFlags(board: GameBoard): number {
  return board.cells.reduce((total, cell) => total + (cell.flagged ? 1 : 0), 0)
}

export function minesRemaining(board: GameBoard): number {
  return board.mines - countFlags(board)
}

export function revealedCount(board: GameBoard): number {
  return board.cells.reduce((total, cell) => total + (cell.revealed && !cell.mine ? 1 : 0), 0)
}

export function safeCellCount(board: GameBoard): number {
  return board.cells.length - board.mines
}

export { SAFE_ZONE_SIZE }
