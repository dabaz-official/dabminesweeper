import { useEffect, useMemo, useRef, useState } from 'react'
import { CUSTOM_LIMITS, maxMinesFor } from '../game/config'
import type { GameConfig } from '../game/types'

interface CustomFormProps {
  initial: GameConfig
  onApply: (config: GameConfig) => void
  onCancel: () => void
}

interface FieldErrors {
  rows?: string
  cols?: string
  mines?: string
}

export function CustomForm({ initial, onApply, onCancel }: CustomFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [rows, setRows] = useState(String(initial.rows))
  const [cols, setCols] = useState(String(initial.cols))
  const [mines, setMines] = useState(String(initial.mines))

  // A native modal dialog: the top layer, focus trapping, initial focus and Esc
  // all come from the platform. The element is only ever mounted while open, so
  // opening it once here is enough.
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const { config, errors } = useMemo(() => {
    const parsedRows = Number(rows)
    const parsedCols = Number(cols)
    const parsedMines = Number(mines)
    const next: FieldErrors = {}

    if (!isValidDimension(parsedRows)) {
      next.rows = `${CUSTOM_LIMITS.minDimension}–${CUSTOM_LIMITS.maxDimension}`
    }
    if (!isValidDimension(parsedCols)) {
      next.cols = `${CUSTOM_LIMITS.minDimension}–${CUSTOM_LIMITS.maxDimension}`
    }

    const limit =
      isValidDimension(parsedRows) && isValidDimension(parsedCols)
        ? maxMinesFor(parsedRows, parsedCols)
        : undefined
    if (!Number.isInteger(parsedMines) || parsedMines < CUSTOM_LIMITS.minMines) {
      next.mines = `at least ${CUSTOM_LIMITS.minMines}`
    } else if (limit !== undefined && parsedMines > limit) {
      next.mines = `at most ${limit}`
    }

    const valid = Object.keys(next).length === 0
    return {
      errors: next,
      config: valid ? { rows: parsedRows, cols: parsedCols, mines: parsedMines } : null,
    }
  }, [cols, mines, rows])

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="custom-board-title"
      onClose={onCancel}
      onClick={(event) => {
        // The dialog element itself is the backdrop area around the panel.
        if (event.target === dialogRef.current) onCancel()
      }}
    >
      <form
        className="modal-body"
        onSubmit={(event) => {
          event.preventDefault()
          if (config) onApply(config)
        }}
      >
        <div className="modal-head">
          <h2 className="modal-title" id="custom-board-title">
            Custom board
          </h2>
          <p className="modal-subtitle">
            Between {CUSTOM_LIMITS.minDimension} × {CUSTOM_LIMITS.minDimension} and{' '}
            {CUSTOM_LIMITS.maxDimension} × {CUSTOM_LIMITS.maxDimension}. Your first click is always
            safe.
          </p>
        </div>

        <div className="modal-fields">
          <Field label="Rows" value={rows} error={errors.rows} onChange={setRows} />
          <Field label="Columns" value={cols} error={errors.cols} onChange={setCols} />
          <Field label="Mines" value={mines} error={errors.mines} onChange={setMines} />
        </div>

        <p className="modal-hint" aria-live="polite">
          {errors.mines && config === null
            ? 'Mines must leave a 3 × 3 safe opening around your first click.'
            : '\u00a0'}
        </p>

        <div className="modal-actions">
          <button type="button" className="button button-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="button button-primary" disabled={!config}>
            Start custom game
          </button>
        </div>
      </form>
    </dialog>
  )
}

function Field({
  label,
  value,
  error,
  onChange,
}: {
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <label className={`field${error ? ' has-error' : ''}`}>
      <span className="field-label">{label}</span>
      <input
        className="field-input"
        type="number"
        inputMode="numeric"
        min={CUSTOM_LIMITS.minDimension}
        max={CUSTOM_LIMITS.maxDimension}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
      />
      <span className="field-error" aria-live="polite">
        {error ?? ''}
      </span>
    </label>
  )
}

function isValidDimension(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= CUSTOM_LIMITS.minDimension &&
    value <= CUSTOM_LIMITS.maxDimension
  )
}
