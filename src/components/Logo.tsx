/** Two interlocking rings in Circle blue. An original mark, not Circle's trademark logo. */
export function Logo({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <circle cx="12" cy="16" r="8" stroke="#2775ca" strokeWidth="3.5" />
      <circle cx="20" cy="16" r="8" stroke="#5aa9f5" strokeWidth="3.5" />
    </svg>
  )
}
