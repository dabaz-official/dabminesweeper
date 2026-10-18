import { useMemo, useState } from 'react'
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
  const [rows, setRows] = useState(String(initial.rows))
  const [cols, setCols] = useState(String(initial.cols))
  const [mines, setMines] = useState(String(initial.mines))

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
    <form
      className="custom-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (config) onApply(config)
      }}
    >
      <div className="custom-fields">
        <Field label="Rows" value={rows} error={errors.rows} onChange={setRows} />
        <Field label="Columns" value={cols} error={errors.cols} onChange={setCols} />
        <Field label="Mines" value={mines} error={errors.mines} onChange={setMines} />
      </div>

      <div className="custom-actions">
        <p className="custom-hint">
          {errors.mines && config === null
            ? 'Mines must leave a 3 × 3 safe opening around your first click.'
            : 'Up to 30 × 30. Your first click is always safe.'}
        </p>
        <div className="custom-buttons">
          <button type="button" className="button button-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="button button-primary" disabled={!config}>
            Start custom game
          </button>
        </div>
      </div>
    </form>
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
