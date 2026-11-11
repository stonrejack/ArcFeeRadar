import { BookOpen } from 'lucide-react'
import { Panel } from '@/components/Panel'

const ROWS = [
  {
    service: 'CCTP Standard',
    fee: 'USDC and cirBTC: no transfer fee. EURC: $0.25 per transfer.',
    arc: 'EURC fee waived to and from Arc.',
  },
  {
    service: 'CCTP Fast',
    fee: 'USDC: 1 to 2 bps on most chains, varies by route. EURC and cirBTC: varies by route.',
    arc: '75% lower Fast Transfer fees into Arc.',
  },
  {
    service: 'Gateway',
    fee: 'USDC: 0.5 bp. EURC and cirBTC: 1 bp. Plus a flat source burn fee.',
    arc: 'Transfer fees waived to and from Arc for all supported assets.',
  },
]

export function FeeGuide() {
  return (
    <Panel icon={<BookOpen className="size-4" aria-hidden />} title="Fee guide">
      <ul className="space-y-2">
        {ROWS.map((r) => (
          <li key={r.service} className="rounded-xl bg-[var(--surface-strong)] p-3">
            <p className="text-sm font-semibold text-[var(--ink-2)]">{r.service}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{r.fee}</p>
            <p className="mt-1 text-xs font-medium text-[var(--success)]">{r.arc}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-[var(--subtle)]">
        1 bp is 0.01%. Gas is paid separately and is not in any total. Source:{' '}
        <a
          className="underline decoration-[var(--border-strong)] underline-offset-2 hover:text-[var(--ink)]"
          href="https://developers.circle.com/crosschain-fees"
          target="_blank"
          rel="noopener noreferrer"
        >
          developers.circle.com/crosschain-fees
        </a>
      </p>
    </Panel>
  )
}
