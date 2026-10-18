import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import type { GameBoard } from '../game/types'
import { CellTile } from './Cell'

interface BoardProps {
  board: GameBoard
  onPrimary: (index: number) => void
  onFlag: (index: number) => void
}

const CELL_GAP = 2
const BOARD_PADDING = 12
const MIN_CELL = 20
const MAX_CELL = 42
/** Panel + wrap + board padding, plus a little slack. */
const HORIZONTAL_CHROME = 2 * 18 + 2 * 4 + 2 * BOARD_PADDING + 6
const SLACK = 8

function elementHeight(element: Element | null | undefined, fallback: number): number {
  return element instanceof HTMLElement ? element.offsetHeight : fallback
}

function gapOf(element: Element | null | undefined, fallback: number): number {
  if (!(element instanceof HTMLElement)) return fallback
  const gap = Number.parseFloat(window.getComputedStyle(element).rowGap)
  return Number.isFinite(gap) ? gap : fallback
}

function paddingOf(element: Element | null | undefined, side: 'bottom' | 'top', fallback: number): number {
  if (!(element instanceof HTMLElement)) return fallback
  const value = Number.parseFloat(window.getComputedStyle(element)[side === 'bottom' ? 'paddingBottom' : 'paddingTop'])
  return Number.isFinite(value) ? value : fallback
}

/**
 * Everything that sits below the board: the panel footer, the hint line and the
 * page footer, plus the gaps and padding around them. Measured rather than
 * assumed, so the board can claim whatever room is actually left. Elements
 * hidden by the short-viewport stylesheet measure zero and free their space.
 */
function measureBottomChrome(wrap: HTMLElement | null): number {
  const panel = wrap?.closest('.game-panel')
  const appMain = document.querySelector('.app-main')
  const app = document.querySelector('.app')
  const hints = document.querySelector('.keyboard-hints')
  const appFooter = document.querySelector('.app-footer')

  const hintsHeight = elementHeight(hints, 0)
  const footerHeight = elementHeight(appFooter, 0)

  return (
    gapOf(panel, 12) +
    elementHeight(panel?.querySelector('.panel-footer'), 42) +
    paddingOf(panel, 'bottom', 18) +
    gapOf(appMain, 12) +
    hintsHeight +
    (hintsHeight > 0 ? gapOf(app, 18) : 0) +
    footerHeight +
    paddingOf(app, 'bottom', 26) +
    SLACK
  )
}

/**
 * Cells are sized to the space the board actually has: the column width for
 * horizontal room, and the distance from the board's top edge to the bottom of
 * the viewport (minus everything below it) for vertical room. Measuring the top
 * edge instead of assuming a chrome height keeps the whole game on screen.
 */
function computeCellSize(rows: number, cols: number, wrap: HTMLElement | null): number {
  if (typeof window === 'undefined') return MAX_CELL

  const column = wrap?.closest('.app-main') as HTMLElement | null
  const columnWidth = column?.clientWidth ?? window.innerWidth - 40
  const availableWidth = Math.min(columnWidth, 1080) - HORIZONTAL_CHROME

  const wrapTop = wrap?.getBoundingClientRect().top ?? window.innerHeight * 0.55
  const availableHeight = window.innerHeight - wrapTop - measureBottomChrome(wrap)

  const byWidth = (availableWidth - (cols - 1) * CELL_GAP) / cols
  const byHeight = (availableHeight - BOARD_PADDING * 2 - (rows - 1) * CELL_GAP) / rows
  const size = Math.floor(Math.min(byWidth, byHeight))
  return Math.max(MIN_CELL, Math.min(MAX_CELL, size))
}

function useCellSize(rows: number, cols: number, wrapRef: RefObject<HTMLDivElement | null>): number {
  const [size, setSize] = useState(() => computeCellSize(rows, cols, null))

  useEffect(() => {
    const update = () => setSize(computeCellSize(rows, cols, wrapRef.current))
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)

    // The column's height changes when the custom form opens or closes, which
    // shifts the board down; re-measure then too.
    const column = wrapRef.current?.closest('.app-main')
    const observer = column ? new ResizeObserver(update) : null
    if (column && observer) observer.observe(column)

    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      observer?.disconnect()
    }
  }, [rows, cols, wrapRef])

  return size
}

export function Board({ board, onPrimary, onFlag }: BoardProps) {
  const { rows, cols, cells, status } = board
  const wrapRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const cellSize = useCellSize(rows, cols, wrapRef)
  // Roving tabindex: one cell is in the tab order, and it follows the user. It is
  // deliberately not reset by a new game, so keyboard focus survives a restart.
  const [focusIndex, setFocusIndex] = useState(0)

  const handlePrimary = useCallback(
    (index: number) => {
      setFocusIndex(index)
      onPrimary(index)
    },
    [onPrimary],
  )

  const handleFlag = useCallback(
    (index: number) => {
      setFocusIndex(index)
      onFlag(index)
    },
    [onFlag],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement
      const raw = target.dataset.index
      if (raw === undefined) return
      const index = Number(raw)

      // Activate explicitly instead of relying on the browser's native button
      // activation: preventDefault keeps this from also firing a click.
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        if (!event.repeat) handlePrimary(index)
        return
      }

      let next = index
      switch (event.key) {
        case 'ArrowLeft':
          next = index - 1
          break
        case 'ArrowRight':
          next = index + 1
          break
        case 'ArrowUp':
          next = index - cols
          break
        case 'ArrowDown':
          next = index + cols
          break
        case 'Home':
          next = index - (index % cols)
          break
        case 'End':
          next = index - (index % cols) + cols - 1
          break
        default:
          return
      }

      if (next < 0 || next >= rows * cols) return
      event.preventDefault()
      setFocusIndex(next)
      const element = boardRef.current?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)
      element?.focus()
    },
    [cols, handlePrimary, rows],
  )

  const style = {
    '--cols': cols,
    '--cell': `${cellSize}px`,
    '--gap': `${CELL_GAP}px`,
    '--board-pad': `${BOARD_PADDING}px`,
  } as CSSProperties

  return (
    <div className="board-wrap" ref={wrapRef}>
      <div
        ref={boardRef}
        className={`board board-${status}`}
        style={style}
        role="group"
        aria-label={`Minesweeper board, ${rows} rows by ${cols} columns, ${board.mines} mines`}
        onKeyDown={handleKeyDown}
        onContextMenu={(event) => event.preventDefault()}
      >
        {cells.map((cell, index) => (
          <CellTile
            key={index}
            cell={cell}
            index={index}
            row={Math.floor(index / cols)}
            col={index % cols}
            focusable={index === focusIndex}
            onPrimary={handlePrimary}
            onFlag={handleFlag}
            onFocus={setFocusIndex}
          />
        ))}
      </div>
    </div>
  )
}
