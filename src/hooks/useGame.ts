import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { countFlags, createGame, minesRemaining, revealCell, toggleFlag } from '../game/engine'
import type { GameBoard, GameConfig } from '../game/types'

export interface GameSnapshot {
  board: GameBoard
  /** ms timestamp of the first reveal, or null before the game starts. */
  startedAt: number | null
  /** ms timestamp of the winning reveal / detonated mine. */
  finishedAt: number | null
}

interface State extends GameSnapshot {
  /** Bumped on every reset so the board can re-run its entry animations. */
  round: number
}

type Action =
  | { type: 'reveal'; index: number }
  | { type: 'flag'; index: number }
  | { type: 'reset' }

function reducer(state: State, action: Action): State {
  if (action.type === 'reset') {
    return {
      board: createGame(state.board),
      startedAt: null,
      finishedAt: null,
      round: state.round + 1,
    }
  }

  const next =
    action.type === 'reveal'
      ? revealCell(state.board, action.index)
      : toggleFlag(state.board, action.index)

  if (next === state.board) return state

  const now = Date.now()
  const started = state.startedAt ?? (next.status !== 'ready' ? now : null)
  const finished = state.finishedAt ?? (next.status === 'won' || next.status === 'lost' ? now : null)
  return { ...state, board: next, startedAt: started, finishedAt: finished }
}

/**
 * Owns one game's board plus its clock. Remount the component (or call `reset`)
 * to start over — the timer is derived from timestamps rather than a tick count,
 * so it stays accurate even if the tab is throttled in the background.
 */
export function useGame(config: GameConfig) {
  const [state, dispatch] = useReducer(reducer, config, (initial) => ({
    board: createGame(initial),
    startedAt: null,
    finishedAt: null,
    round: 0,
  }))

  const { board, startedAt, finishedAt } = state
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (board.status !== 'playing') return
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [board.status, state.round])

  const elapsed = startedAt === null ? 0 : Math.floor(((finishedAt ?? now) - startedAt) / 1000)
  const elapsedSeconds = Math.min(999, Math.max(0, elapsed))

  const reveal = useCallback((index: number) => dispatch({ type: 'reveal', index }), [])
  const flag = useCallback((index: number) => dispatch({ type: 'flag', index }), [])
  const reset = useCallback(() => dispatch({ type: 'reset' }), [])

  const stats = useMemo(
    () => ({
      flags: countFlags(board),
      minesLeft: minesRemaining(board),
    }),
    [board],
  )

  return {
    board,
    status: board.status,
    elapsed: elapsedSeconds,
    startedAt,
    finishedAt,
    round: state.round,
    reveal,
    flag,
    /** Chording is just revealing an open cell again. */
    chord: reveal,
    reset,
    ...stats,
  }
}

export type GameController = ReturnType<typeof useGame>
