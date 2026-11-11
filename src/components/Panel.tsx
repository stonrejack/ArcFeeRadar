import type { ReactNode } from 'react'

interface Props {
  icon?: ReactNode
  title: string
  right?: ReactNode
  children: ReactNode
  className?: string
}

/** Dashboard panel: dark card with a small icon + title header, as on dense trading dashboards. */
export function Panel({ icon, title, right, children, className = '' }: Props) {
  return (
    <section className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] ${className}`} aria-label={title}>
      <header className="flex min-h-[48px] items-center justify-between gap-3 px-4 pt-2">
        <h2 className="flex items-center gap-2 text-[13px] font-medium text-[var(--muted)]">
          {icon && <span className="text-[var(--subtle)]">{icon}</span>}
          {title}
        </h2>
        {right}
      </header>
      <div className="px-4 pb-4 pt-1">{children}</div>
    </section>
  )
}
