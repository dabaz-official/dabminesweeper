# Minesweeper

A complete Minesweeper built with **Vite + React + TypeScript + CSS**. No game
libraries — the board is a shuffled array and the rules live in a small, pure
engine.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # typecheck + production bundle into dist/
npm run preview  # serve the production build
npm run lint     # oxlint
```

## How to play

| Action | Mouse | Keyboard | Touch |
| --- | --- | --- | --- |
| Open a cell | Left-click | `Enter` / `Space` on the focused cell | Tap |
| Flag a cell | Right-click | `F` for flag mode, then open | Long-press, or flag mode |
| Chord (open all unflagged neighbours of a number) | Click an open number, or middle-click | `Enter` on an open number | Tap an open number |
| Move focus | — | Arrow keys, `Home`, `End` | — |
| New game | Smiley face / **New game** | `R` | Smiley face |

Your **first click is always safe**: mines are placed after it, keeping the
clicked cell and its eight neighbours clear. The mine counter, timer, cleared
count, and per-difficulty records are all live.

## Features

- **Three presets** — Beginner 9×9/10, Intermediate 16×16/40, Expert 30×16/99 —
  plus a **custom** board builder (5×5 up to 30×30) with validated mine counts.
- **Classic rules** — flood reveal from empty cells, flags, chording, wrong-flag
  marking, all mines revealed on a loss, auto-flagging on a win.
- **Records** saved to `localStorage` per difficulty, with a "New record!" note
  when you beat one.
- **Dark and light themes**, following your system preference on first visit and
  remembered afterwards.
- **Responsive board sizing** — cell size is measured from the space the board
  actually has, so the whole field fits without page scrolling on a laptop, and
  large boards scroll inside their own frame on a phone.
- **Accessible** — real buttons with descriptive labels, a roving tabindex, arrow
  key navigation, live status text, and `prefers-reduced-motion` support.
- **No backend, no tracking** — the only stored data is your best times and theme.

## Design

The interface is Notion-inspired: an Inter/Notion Sans type stack, a navy hero band
with dotted texture and pastel sticky notes, a purple primary call to action, pastel
status tags, hairline borders, 8px buttons and 12px cards, and 44px inputs with a
2px purple focus border.

The board tiles are deliberately **not** restyled. Cell gradients, bevels, press
feedback, flag/mine artwork, number colours and the wrong-flag cross keep their
original values in both themes, so the board still feels like the classic game while
everything around it does not. `src/index.css` marks that preserved block with a
comment, and the light/dark token sets carry the original cell values.

## Project layout

```
src/
  game/
    types.ts      Cell, board, and config types
    config.ts     Difficulty presets, custom limits, clamping
    engine.ts     Pure game rules: placement, flood reveal, flags, chording, win/lose
    format.ts     Time and duration formatting
    storage.ts    localStorage for records and theme (fails soft)
  hooks/
    useGame.ts    Reducer for the board plus a timestamp-derived clock
    useTheme.ts   Theme state applied to <html data-theme>
  components/
    App pieces: Game (HUD + board + footer), Board, Cell, Hud, Face, Icons,
    DifficultyPicker, CustomForm
scripts/
  engine-check.ts Engine test suite (see below)
```

### The engine is pure

Every rule lives in `src/game/engine.ts` as a function from a board to a board:
`revealCell`, `toggleFlag`, `chordCell`. React only renders the result, which
keeps the tricky parts (mine placement, flood fill, chording, win detection)
testable without a DOM.

```bash
npx esbuild scripts/engine-check.ts --bundle --format=esm --platform=node \
  --outfile=/tmp/engine-check.mjs && node /tmp/engine-check.mjs
```

712 checks run against seeded randomness: first-click safety over 200 boards,
exact mine counts, adjacency consistency, flood reveal, flag rules, chording
(with and without matching flags), wins, losses, wrong-flag marking, and
auto-flagging.

### Board sizing

`src/components/Board.tsx` measures the column width and the distance from the
board's top edge to the bottom of the viewport, subtracting the measured height
of everything below it (panel footer, hints, page footer). Cell size is the
larger constraint of width and height, clamped to 20–42px. Short viewports and
phones hide the decorative lines, and those hidden elements measure as zero, so
the board reclaims the space automatically.

## License

[MIT](LICENSE) © 2026 DabAZ
