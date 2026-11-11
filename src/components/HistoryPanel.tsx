import { Clock } from 'lucide-react'
import { Panel } from '@/components/Panel'
import type { Network } from '@/lib/chains'

export interface HistoryEntry {
  key: string
  network: Network
  src: number
  dst: number
  srcName: string
  dstName: string
  amount: string
  at: number
}

interface Props {
  entries: HistoryEntry[]
  onPick: (e: HistoryEntry) => void
  onClear: () => void
}

export function HistoryPanel({ entries, onPick, onClear }: Props) {
  return (
    <Panel
      icon={<Clock className="size-4" aria-hidden />}
      title="History"
      right={
        entries.length > 0 ? (
          <button onClick={onClear} className="min-h-[32px] rounded-md px-2 text-xs text-[var(--subtle)] hover:text-[var(--ink)]">
            Clear
          </button>
        ) : undefined
      }
    >
      {entries.length === 0 ? (
        <div className="grid min-h-[160px] place-items-center rounded-xl border border-[var(--border)] px-6 py-8 text-center">
          <div>
            <span className="mx-auto mb-3 grid size-10 place-items-center rounded-full border border-[var(--border)] text-[var(--subtle)]">
              <Clock className="size-4" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-[var(--ink-2)]">No activity yet</p>
            <p className="mt-1 text-xs text-[var(--subtle)]">Routes you check show here, newest first.</p>
          </div>
        </div>
      ) : (
        <ul className="space-y-1">
          {entries.map((e) => (
            <li key={e.key}>
              <button
                onClick={() => onPick(e)}
                className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[var(--surface-strong)]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--ink-2)]">
                    {e.srcName} to {e.dstName}
                  </span>
                  <span className="block text-xs text-[var(--subtle)]">
                    {e.network === 'mainnet' ? 'Mainnet' : 'Testnet'} · {new Date(e.at).toLocaleTimeString('en-US')}
                  </span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-[var(--muted)]">{e.amount} USDC</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
