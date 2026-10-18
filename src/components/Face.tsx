import type { GameStatus } from '../game/types'

interface FaceProps {
  status: GameStatus
}

/**
 * The classic smiley reset button. Rendered as SVG rather than an emoji so it
 * looks identical across platforms.
 */
export function Face({ status }: FaceProps) {
  const dead = status === 'lost'
  const cool = status === 'won'

  return (
    <svg className="face-svg" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="face-shine" cx="35%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#ffe89a" />
          <stop offset="55%" stopColor="#ffcc33" />
          <stop offset="100%" stopColor="#f0a413" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18.4" fill="url(#face-shine)" stroke="#b4740c" strokeWidth="1.2" />

      {dead ? (
        <g stroke="#4a2a05" strokeWidth="2.5" strokeLinecap="round">
          <path d="M11.6 12.6l5.2 5.2M16.8 12.6l-5.2 5.2" />
          <path d="M23.2 12.6l5.2 5.2M28.4 12.6l-5.2 5.2" />
        </g>
      ) : cool ? (
        <g>
          <path d="M8.6 13.4h9.2v4.4a2.6 2.6 0 0 1-2.6 2.6h-4a2.6 2.6 0 0 1-2.6-2.6z" fill="#22262e" />
          <path d="M22.2 13.4h9.2v4.4a2.6 2.6 0 0 1-2.6 2.6h-4a2.6 2.6 0 0 1-2.6-2.6z" fill="#22262e" />
          <path d="M17.8 15.4h4.4" stroke="#22262e" strokeWidth="2" strokeLinecap="round" />
          <path d="M11 15.2l3.6 3.4M24.4 15.2l3.6 3.4" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ) : (
        <g fill="#3a2408">
          <ellipse cx="14.2" cy="15.4" rx="2.1" ry="2.5" />
          <ellipse cx="25.8" cy="15.4" rx="2.1" ry="2.5" />
        </g>
      )}

      {dead ? (
        <path
          d="M12.6 29.4c2.1-3.4 4.6-5 7.4-5s5.3 1.6 7.4 5"
          fill="none"
          stroke="#4a2a05"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M12.4 24.4c1.9 4 4.5 6 7.6 6s5.7-2 7.6-6"
          fill="none"
          stroke="#4a2a05"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}
