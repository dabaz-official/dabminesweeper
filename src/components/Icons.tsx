interface IconProps {
  className?: string
}

export function MineIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
        <path d="M12 1.8v3.4M12 18.8v3.4M1.8 12h3.4M18.8 12h3.4" />
        <path d="M4.8 4.8l2.4 2.4M16.8 16.8l2.4 2.4M19.2 4.8l-2.4 2.4M7.2 16.8l-2.4 2.4" />
      </g>
      <circle cx="12" cy="12" r="6.6" fill="currentColor" />
      <circle cx="9.9" cy="9.9" r="1.9" fill="rgba(255,255,255,0.72)" />
    </svg>
  )
}

export function FlagIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M7.4 3.2h9.9l-2.6 4.3 2.6 4.3H7.4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M7.4 2.6v18.8M4.6 21.4h5.6"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function CrossIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5.5 5.5l13 13M18.5 5.5l-13 13"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4.6" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6M4.8 4.8l1.9 1.9M17.3 17.3l1.9 1.9M19.2 4.8l-1.9 1.9M6.7 17.3l-1.9 1.9" />
      </g>
    </svg>
  )
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M20.2 15.1A8.6 8.6 0 0 1 8.9 3.8a8.8 8.8 0 1 0 11.3 11.3z"
        fill="currentColor"
      />
    </svg>
  )
}

export function RestartIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M20 12a8 8 0 1 1-2.6-5.9M20 3.6V9h-5.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SlidersIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
        <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      </g>
      <circle cx="15" cy="7" r="2.3" fill="none" stroke="currentColor" strokeWidth="2.1" />
      <circle cx="9" cy="17" r="2.3" fill="none" stroke="currentColor" strokeWidth="2.1" />
    </svg>
  )
}

