/**
 * Engine checks. Bundled with esbuild and run under Node:
 *   npx esbuild scripts/engine-check.ts --bundle --format=esm --platform=node --outfile=/tmp/engine-check.mjs
 *   node /tmp/engine-check.mjs
 */
import {
  chordCell,
  countFlags,
  createGame,
  minesRemaining,
  neighborsOf,
  revealCell,
  toggleFlag,
} from '../src/game/engine'
import { maxMinesFor } from '../src/game/config'
import type { GameBoard } from '../src/game/types'

let failures = 0
let checks = 0

function check(name: string, condition: boolean, detail?: unknown): void {
  checks += 1
  if (!condition) {
    failures += 1
    console.error(`FAIL  ${name}`, detail === undefined ? '' : detail)
  }
}

function mineIndexes(board: GameBoard): number[] {
  return board.cells.flatMap((cell, index) => (cell.mine ? [index] : []))
}

function revealedSafe(board: GameBoard): number {
  return board.cells.filter((cell) => cell.revealed && !cell.mine).length
}

function safeCount(board: GameBoard): number {
  return board.cells.length - board.mines
}

/** Recomputes adjacency from the mine map and compares it with what the engine stored. */
function adjacencyIsConsistent(board: GameBoard): boolean {
  return board.cells.every(
    (cell, index) =>
      cell.adjacent === neighborsOf(index, board.rows, board.cols).filter((n) => board.cells[n].mine).length,
  )
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function withSeed<T>(seed: number, body: () => T): T {
  const original = Math.random
  Math.random = mulberry32(seed)
  try {
    return body()
  } finally {
    Math.random = original
  }
}

// --- fresh board -----------------------------------------------------------
{
  const board = createGame({ rows: 9, cols: 9, mines: 10 })
  check('new board has 81 cells', board.cells.length === 81)
  check('new board is ready', board.status === 'ready')
  check('new board places no mines yet', mineIndexes(board).length === 0)
  check('new board starts at full mine count', minesRemaining(board) === 10)
}

// --- first click is safe, over many seeds ----------------------------------
{
  let worst = 0
  for (let seed = 1; seed <= 200; seed += 1) {
    withSeed(seed, () => {
      const board = createGame({ rows: 16, cols: 30, mines: 99 })
      const click = Math.floor(Math.random() * board.cells.length)
      const after = revealCell(board, click)
      const zone = [click, ...neighborsOf(click, 16, 30)]
      const minedInZone = zone.filter((i) => after.cells[i].mine).length
      if (minedInZone > 0) {
        check(`seed ${seed}: first click and its neighbours are mine-free`, false, { click, minedInZone })
      }
      if (after.status !== 'playing') check(`seed ${seed}: game is playing after first click`, false, after.status)
      check(`seed ${seed}: exactly 99 mines placed`, mineIndexes(after).length === 99, mineIndexes(after).length)
      check(`seed ${seed}: adjacency consistent`, adjacencyIsConsistent(after))
      worst = Math.max(worst, zone.length)
    })
  }
  check('safe zone covered 9 cells', worst === 9, worst)
}

// --- dense board: mines cannot be excluded from a full 3x3 zone ------------
{
  const config = { rows: 5, cols: 5, mines: maxMinesFor(5, 5) }
  check('5x5 allows 16 mines', config.mines === 16)
  withSeed(7, () => {
    const after = revealCell(createGame(config), 12)
    check('dense board places every mine', mineIndexes(after).length === 16, mineIndexes(after).length)
    check('dense board wins on the first click', after.status === 'won', after.status)
    check('win auto-flags every mine', after.cells.filter((c) => c.mine && c.flagged).length === 16)
    check('win reveals all safe cells', revealedSafe(after) === safeCount(after), {
      revealed: revealedSafe(after),
      safe: safeCount(after),
    })
    check('no wrong flags on a win', after.cells.every((cell) => !cell.wrongFlag))
  })
}

// --- flags -----------------------------------------------------------------
{
  const board = createGame({ rows: 9, cols: 9, mines: 10 })
  const flagged = toggleFlag(board, 3)
  check('flagging a hidden cell sets it', flagged.cells[3].flagged)
  check('flag count is 1', countFlags(flagged) === 1)
  check('remaining mines drops to 9', minesRemaining(flagged) === 9)
  check('flagging does not start the game', flagged.status === 'ready')

  const unflagged = toggleFlag(flagged, 3)
  check('flagging again clears it', !unflagged.cells[3].flagged)
  check('counter returns to 10', minesRemaining(unflagged) === 10)

  const revealed = revealCell(board, 40)
  const onRevealed = toggleFlag(revealed, 40)
  check('cannot flag an open cell', onRevealed === revealed)

  const revealedFlagged = revealCell(toggleFlag(board, 41), 41)
  check('cannot open a flagged cell', revealedFlagged.status === 'ready')
}

// --- loss ------------------------------------------------------------------
{
  withSeed(11, () => {
    const start = createGame({ rows: 5, cols: 5, mines: 1 })
    // Pre-flag a cell, then confirm after the loss whether it was the mine.
    const flagTarget = 0
    const flagged = toggleFlag(start, flagTarget)
    let lost = flagged
    for (let index = 0; index < flagged.cells.length && lost.status !== 'lost'; index += 1) {
      if (lost.cells[index].flagged) continue
      lost = revealCell(lost, index)
    }
    check('stepping on a mine loses', lost.status === 'lost', lost.status)
    const exploded = lost.cells.filter((cell) => cell.exploded)
    check('exactly one cell exploded', exploded.length === 1, exploded.length)
    check('the exploded cell is a revealed mine', exploded[0]?.mine === true && exploded[0]?.revealed === true)
    check('every mine is revealed after a loss', mineIndexes(lost).every((i) => lost.cells[i].revealed))
    const wasMine = lost.cells[flagTarget].mine
    check(
      'wrong flags are marked, right flags are kept',
      wasMine ? lost.cells[flagTarget].wrongFlag === false : lost.cells[flagTarget].wrongFlag === true,
      { wasMine, wrongFlag: lost.cells[flagTarget].wrongFlag },
    )
    check('reveals after a loss are ignored', revealCell(lost, 5) === lost)
    check('flags after a loss are ignored', toggleFlag(lost, 5) === lost)
  })
}

// --- chording --------------------------------------------------------------
{
  let chorderCount = 0
  for (let seed = 1; seed <= 40; seed += 1) {
    withSeed(seed, () => {
      const start = createGame({ rows: 12, cols: 12, mines: 20 })
      const opened = revealCell(start, 60)
      if (opened.status !== 'playing') return

      const target = opened.cells.findIndex(
        (cell) => cell.revealed && cell.adjacent > 0 && !cell.mine,
      )
      if (target === -1) return
      const around = neighborsOf(target, 12, 12)
      const mineNeighbours = around.filter((n) => opened.cells[n].mine)
      if (mineNeighbours.length === 0 || mineNeighbours.length !== opened.cells[target].adjacent) return

      // Chord with the wrong number of flags must do nothing.
      const untouched = chordCell(opened, target)
      check(`seed ${seed}: chord without matching flags is a no-op`, untouched === opened)

      // Flag exactly the mine neighbours, then chord.
      let flagged = opened
      for (const n of mineNeighbours) flagged = toggleFlag(flagged, n)
      const chorded = chordCell(flagged, target)
      const expected = around.filter((n) => !flagged.cells[n].flagged && !flagged.cells[n].revealed)
      check(
        `seed ${seed}: chord opens every unflagged neighbour`,
        expected.every((n) => chorded.cells[n].revealed),
        { target, expected },
      )
      check(`seed ${seed}: chord never reveals a flagged cell`, chorded.cells.every((c) => !(c.flagged && c.revealed)))
      check(`seed ${seed}: chord keeps the game alive`, chorded.status === 'playing' || chorded.status === 'won')
      chorderCount += 1
    })
  }
  check('chording was exercised', chorderCount >= 20, chorderCount)
}

// --- win through normal play ----------------------------------------------
{
  let wins = 0
  for (let seed = 1; seed <= 30; seed += 1) {
    withSeed(seed, () => {
      // The test can read the mine map, so it can clear the board deliberately.
      let board = revealCell(createGame({ rows: 6, cols: 6, mines: 4 }), 0)
      for (let index = 0; index < board.cells.length && board.status === 'playing'; index += 1) {
        const cell = board.cells[index]
        if (cell.mine || cell.revealed || cell.flagged) continue
        board = revealCell(board, index)
      }
      check(`seed ${seed}: clearing every safe cell wins`, board.status === 'won', board.status)
      if (board.status === 'won') {
        wins += 1
        check(`seed ${seed}: win reveals every safe cell`, revealedSafe(board) === safeCount(board))
        check(`seed ${seed}: win flags every mine`, mineIndexes(board).every((i) => board.cells[i].flagged))
        check(`seed ${seed}: progress readout reaches the total`, revealedSafe(board) === safeCount(board))
      }
    })
  }
  check('every seeded board was winnable', wins === 30, wins)
}

// --- flood reveal ----------------------------------------------------------
{
  withSeed(99, () => {
    const board = revealCell(createGame({ rows: 9, cols: 9, mines: 10 }), 40)
    const zeros = board.cells.filter((cell) => cell.revealed && !cell.mine && cell.adjacent === 0)
    check('flood reveal opens a region of empty cells', zeros.length > 0, zeros.length)
    check('no mine is revealed on a live board', board.cells.every((cell) => !(cell.mine && cell.revealed)))
    check('adjacency still consistent', adjacencyIsConsistent(board))
    check('the opening reveals at least the safe zone', revealedSafe(board) >= 9, revealedSafe(board))
  })
}

console.log(`\n${checks - failures}/${checks} checks passed`)
if (failures > 0) {
  console.error(`${failures} check(s) failed`)
  process.exit(1)
}
console.log('engine OK')
