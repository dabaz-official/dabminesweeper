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
const WRAP_PADDING = 4
/**
 * Cell size floors. The width floor keeps cells tappable and lets narrow screens
 * scroll sideways; the height floor is lower so a tall board shrinks to fit
 * rather than gaining a vertical scrollbar (vertical movement inside the frame is
 * exactly what the fixed frame exists to avoid).
 */
const MIN_CELL_WIDTH = 20
const MIN_CELL_HEIGHT = 16
const MAX_CELL = 42
/** Panel + wrap + board padding, plus a little slack. */
const HORIZONTAL_CHROME = 2 * 18 + 2 * 4 + 2 * BOARD_PADDING + 6
const SLACK = 8
/** Never collapse the board frame to nothing, even on absurdly short windows. */
const MIN_WRAP_HEIGHT = 120

interface BoardMetrics {
  cellSize: number
  /**
   * Height cap for the frame around the board. Keeping the frame inside the
   * viewport means the page itself never needs to scroll, so wheel scrolling
   * cannot drag the board up and down. Boards too big to fit at a usable cell
   * size scroll inside this frame instead.
   */
  wrapMaxHeight: number
}

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
 * edge instead of assuming a chrome height keeps the whole game on screen, and
 * the same measurement caps the board frame so the page never overflows.
 */
function measureBoard(rows: number, cols: number, wrap: HTMLElement | null): BoardMetrics {
  if (typeof window === 'undefined') {
    return { cellSize: MAX_CELL, wrapMaxHeight: Number.POSITIVE_INFINITY }
  }

  const column = wrap?.closest('.app-main') as HTMLElement | null
  const columnWidth = column?.clientWidth ?? window.innerWidth - 40
  const availableWidth = Math.min(columnWidth, 1080) - HORIZONTAL_CHROME

  const wrapTop = wrap?.getBoundingClientRect().top ?? window.innerHeight * 0.55
  const availableHeight = window.innerHeight - wrapTop - measureBottomChrome(wrap)
  const wrapMaxHeight = Math.max(MIN_WRAP_HEIGHT, availableHeight)
  const boardBudget = wrapMaxHeight - WRAP_PADDING * 2

  const byWidth = Math.max(MIN_CELL_WIDTH, (availableWidth - (cols - 1) * CELL_GAP) / cols)
  const byHeight = Math.max(
    MIN_CELL_HEIGHT,
    (boardBudget - BOARD_PADDING * 2 - (rows - 1) * CELL_GAP) / rows,
  )
  const size = Math.floor(Math.min(byWidth, byHeight, MAX_CELL))

  return { cellSize: size, wrapMaxHeight }
}

function useBoardMetrics(rows: number, cols: number, wrapRef: RefObject<HTMLDivElement | null>): BoardMetrics {
  const [metrics, setMetrics] = useState(() => measureBoard(rows, cols, null))

  useEffect(() => {
    const update = () => setMetrics(measureBoard(rows, cols, wrapRef.current))
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

  return metrics
}

export function Board({ board, onPrimary, onFlag }: BoardProps) {
  const { rows, cols, cells, status } = board
  const wrapRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const { cellSize, wrapMaxHeight } = useBoardMetrics(rows, cols, wrapRef)
  // Roving tabindex: one cell is in the tab order, and it follows the user. It is
  // deliberately not reset by a new game, so keyboard focus survives a restart.
  const [focusIndex, setFocusIndex] = useState(0)

  /**
   * The wheel must never shift the board vertically. The frame is capped so the
   * page cannot scroll, and this stops the wheel from scrolling the board inside
   * its own frame too — an oversized board is reached by dragging its scrollbar,
   * by touch, or by keyboard focus (which scrolls the focused cell into view).
   * Horizontal deltas still pan a board that is wider than its frame.
   *
   * Registered natively because React attaches onWheel passively, which makes
   * preventDefault() a no-op.
   */
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) event.preventDefault()
    }
    wrap.addEventListener('wheel', handleWheel, { passive: false })
    return () => wrap.removeEventListener('wheel', handleWheel)
  }, [])

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
    '--board-max-h': `${wrapMaxHeight}px`,
  } as CSSProperties

  return (
    <div className="board-wrap" ref={wrapRef} style={style}>
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
