import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { revealedCount, safeCellCount } from '../game/engine'
import { describeDuration, formatTime } from '../game/format'
import { labelForDifficulty } from '../game/config'
import type { DifficultyKey, GameConfig } from '../game/types'
import { useGame } from '../hooks/useGame'
import { Board } from './Board'
import { Hud } from './Hud'
import { FlagIcon, RestartIcon } from './Icons'

interface GameProps {
  config: GameConfig
  difficulty: DifficultyKey
  bestTime?: number
  onWin: (seconds: number) => void
}

export function Game({ config, difficulty, bestTime, onWin }: GameProps) {
  const game = useGame(config)
  const { board, status, elapsed, reset } = game
  const [flagMode, setFlagMode] = useState(false)
  const [newBest, setNewBest] = useState(false)

  const cleared = useMemo(() => revealedCount(board), [board])
  const total = useMemo(() => safeCellCount(board), [board])

  // Report the win once, and remember whether it beat the record. The ref keeps
  // this from re-firing when the record prop updates in response. Custom boards
  // have no record to beat.
  const reportedWin = useRef(false)
  useEffect(() => {
    if (status !== 'won' || reportedWin.current) return
    reportedWin.current = true
    setNewBest(difficulty !== 'custom' && (bestTime === undefined || elapsed < bestTime))
    onWin(elapsed)
  }, [status, elapsed, bestTime, onWin, difficulty])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      const key = event.key.toLowerCase()
      if (key === 'r') {
        event.preventDefault()
        reset()
      } else if (key === 'f') {
        event.preventDefault()
        setFlagMode((value) => !value)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [reset])

  const handlePrimary = useCallback(
    (index: number) => {
      const cell = board.cells[index]
      if (flagMode && !cell.revealed) game.flag(index)
      else game.reveal(index)
    },
    [board.cells, flagMode, game],
  )

  const statusText = useMemo(() => {
    switch (status) {
      case 'ready':
        return 'First click is safe'
      case 'playing':
        return 'Field is live — good luck'
      case 'won':
        return `Cleared in ${describeDuration(elapsed)}${newBest ? ' · New record!' : ''}`
      case 'lost':
        return 'Boom — you hit a mine'
    }
  }, [status, elapsed, newBest])

  return (
    <section className="game-panel" aria-label={`${labelForDifficulty(difficulty)} game`}>
      <Hud minesLeft={game.minesLeft} elapsed={elapsed} status={status} onReset={reset} />

      <div className="meta-row">
        <p className={`status-pill status-${status}`}>
          <span className="status-dot" aria-hidden="true" />
          <span className="status-text" aria-live="polite">
            {statusText}
          </span>
        </p>
        <p className="meta-stats">
          <span className="meta-progress">
            Cleared {cleared} / {total}
          </span>
          <span className="meta-divider" aria-hidden="true" />
          <span className="meta-best">
            {difficulty === 'custom' || bestTime === undefined
              ? 'No record yet'
              : `Record ${formatTime(bestTime)}`}
          </span>
        </p>
      </div>

      <Board board={board} onPrimary={handlePrimary} onFlag={game.flag} />

      <div className="panel-footer">
        <button
          type="button"
          className={`button button-toggle${flagMode ? ' is-on' : ''}`}
          aria-pressed={flagMode}
          onClick={() => setFlagMode((value) => !value)}
          title="Flag mode (F)"
        >
          <FlagIcon className="button-icon" />
          Flag mode
        </button>

        <p className="footer-hint">
          <span className="hint-pointer">
            Right-click or long-press to flag · click an open number to chord
          </span>
          <span className="hint-touch">Long-press to flag · tap an open number to chord</span>
        </p>

        <button type="button" className="button button-ghost" onClick={reset} title="New game (R)">
          <RestartIcon className="button-icon" />
          New game
        </button>
      </div>
    </section>
  )
}
