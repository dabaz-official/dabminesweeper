import { memo, useCallback, useRef } from 'react'
import type { Cell } from '../game/types'
import { CrossIcon, FlagIcon, MineIcon } from './Icons'

interface CellViewProps {
  cell: Cell
  index: number
  row: number
  col: number
  /** Roving tabindex: only one cell is in the tab order at a time. */
  focusable: boolean
  onPrimary: (index: number) => void
  onFlag: (index: number) => void
  onFocus: (index: number) => void
}

const LONG_PRESS_MS = 380
const MOVE_TOLERANCE_PX = 12

function labelFor(cell: Cell, row: number, col: number): string {
  const where = `Row ${row + 1}, column ${col + 1}`
  if (cell.revealed && cell.mine) return `${where}: mine`
  if (cell.revealed) {
    return cell.adjacent === 0
      ? `${where}: clear`
      : `${where}: ${cell.adjacent} adjacent ${cell.adjacent === 1 ? 'mine' : 'mines'}`
  }
  return cell.flagged ? `${where}: flagged` : `${where}: hidden`
}

function CellView({ cell, index, row, col, focusable, onPrimary, onFlag, onFocus }: CellViewProps) {
  const pressTimer = useRef<number | null>(null)
  const pressOrigin = useRef<{ x: number; y: number } | null>(null)
  const longPressed = useRef(false)

  const cancelPress = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    pressOrigin.current = null
  }, [])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      // Touch only: a long press is the mobile equivalent of a right click.
      if (event.pointerType !== 'touch' || cell.revealed || cell.flagged) return
      longPressed.current = false
      pressOrigin.current = { x: event.clientX, y: event.clientY }
      pressTimer.current = window.setTimeout(() => {
        longPressed.current = true
        pressOrigin.current = null
        onFlag(index)
        navigator.vibrate?.(12)
      }, LONG_PRESS_MS)
    },
    [cell.flagged, cell.revealed, index, onFlag],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const origin = pressOrigin.current
      if (!origin) return
      if (
        Math.abs(event.clientX - origin.x) > MOVE_TOLERANCE_PX ||
        Math.abs(event.clientY - origin.y) > MOVE_TOLERANCE_PX
      ) {
        // Treat as a scroll/drag rather than a press.
        cancelPress()
      }
    },
    [cancelPress],
  )

  const handleClick = useCallback(() => {
    if (longPressed.current) {
      longPressed.current = false
      return
    }
    onPrimary(index)
  }, [index, onPrimary])

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      onFlag(index)
    },
    [index, onFlag],
  )

  const handleAuxClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (event.button !== 1) return
      event.preventDefault()
      onPrimary(index)
    },
    [index, onPrimary],
  )

  const classes = ['cell']
  if (cell.revealed) classes.push('revealed')
  if (cell.flagged) classes.push('flagged')
  if (cell.revealed && cell.mine) classes.push('mine')
  if (cell.exploded) classes.push('exploded')
  if (cell.wrongFlag) classes.push('wrong')
  if (cell.revealed && cell.adjacent > 0 && !cell.mine) classes.push(`n${cell.adjacent}`)

  return (
    <button
      type="button"
      className={classes.join(' ')}
      data-index={index}
      tabIndex={focusable ? 0 : -1}
      aria-label={labelFor(cell, row, col)}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onAuxClick={handleAuxClick}
      onFocus={() => onFocus(index)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
    >
      {cell.flagged ? (
        <span className="cell-content flag-content" key="flag">
          <FlagIcon className="cell-icon" />
          {cell.wrongFlag ? <CrossIcon className="cell-cross" /> : null}
        </span>
      ) : cell.revealed && cell.mine ? (
        <span className="cell-content mine-content" key="mine">
          <MineIcon className="cell-icon" />
        </span>
      ) : cell.revealed && cell.adjacent > 0 ? (
        <span className="cell-content number-content" key="number">
          {cell.adjacent}
        </span>
      ) : null}
    </button>
  )
}

export const CellTile = memo(CellView)
