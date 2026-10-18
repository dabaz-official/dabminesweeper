import { PRESETS } from '../game/config'
import type { BestTimes, DifficultyKey, PresetKey } from '../game/types'
import { formatTime } from '../game/format'

interface DifficultyPickerProps {
  active: DifficultyKey
  bestTimes: BestTimes
  onSelect: (key: PresetKey) => void
}

export function DifficultyPicker({ active, bestTimes, onSelect }: DifficultyPickerProps) {
  return (
    <div className="difficulty-picker" role="tablist" aria-label="Difficulty">
      {PRESETS.map((preset) => {
        const best = bestTimes[preset.key]
        const selected = active === preset.key
        return (
          <button
            key={preset.key}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`difficulty-tab${selected ? ' is-active' : ''}`}
            onClick={() => onSelect(preset.key)}
          >
            <span className="difficulty-name">{preset.label}</span>
            <span className="difficulty-meta">{preset.blurb}</span>
            <span className="difficulty-best">{best === undefined ? 'No record' : `Best ${formatTime(best)}`}</span>
          </button>
        )
      })}
    </div>
  )
}
