/** Seconds → "0:07" / "1:42" for records and results. */
export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

/** Spoken-friendly duration used in status messages. */
export function describeDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  if (safe < 60) return `${safe} second${safe === 1 ? '' : 's'}`
  return formatTime(safe)
}
