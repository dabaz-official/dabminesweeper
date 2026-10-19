import type { GameStatus } from '../game/types'
import { Face } from './Face'

interface HudProps {
  minesLeft: number
  elapsed: number
  status: GameStatus
  onReset: () => void
}

/** Classic three-digit LED readout, sign-aware so over-flagging reads as "-02". */
function formatCounter(value: number): string {
  const clamped = Math.max(-99, Math.min(999, Math.round(value)))
  const sign = clamped < 0 ? '-' : ''
  return sign + String(Math.abs(clamped)).padStart(sign ? 2 : 3, '0')
}

function Counter({ label, value, tone }: { label: string; value: string; tone: 'mines' | 'time' }) {
  return (
    <div className={`counter counter-${tone}`}>
      <span className="counter-label">{label}</span>
      <span className="counter-value" role="img" aria-label={`${label}: ${value}`}>
        {value}
      </span>
    </div>
  )
}

export function Hud({ minesLeft, elapsed, status, onReset }: HudProps) {
  const faceLabel =
    status === 'lost' ? 'You hit a mine. Start a new game' : 'Start a new game'

  return (
    <div className="hud">
      <Counter label="Mines" value={formatCounter(minesLeft)} tone="mines" />

      <button type="button" className="face-button" onClick={onReset} aria-label={faceLabel} title="New game (R)">
        <Face status={status} />
      </button>

      <Counter label="Time" value={formatCounter(elapsed)} tone="time" />
    </div>
  )
}
