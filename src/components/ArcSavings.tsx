import { TrendingDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Panel } from '@/components/Panel'
import { useRouteQuote } from '@/hooks/useRouteQuote'
import type { Network, RouteChain } from '@/lib/chains'
import { totalFor, type RouteQuote, type ServiceId, type ServiceQuote } from '@/lib/fees'
import { fmtPercent, fmtUsdc } from '@/lib/format'

interface Props {
  network: Network
  chains: RouteChain[]
  src: RouteChain
  dst: RouteChain
  amount: bigint
  useForwarder: boolean
  arcQuote: RouteQuote | undefined
}

const NAMES: Record<ServiceId, string> = {
  gateway: 'Gateway',
  'cctp-fast': 'CCTP Fast',
  'cctp-standard': 'CCTP Standard',
}
const IDS: ServiceId[] = ['gateway', 'cctp-fast', 'cctp-standard']

function pick(q: RouteQuote | undefined, id: ServiceId): ServiceQuote | null {
  if (!q) return null
  return id === 'gateway' ? q.gateway : id === 'cctp-fast' ? q.fast : q.standard
}

export function ArcSavings({ network, chains, src, dst, amount, useForwarder, arcQuote }: Props) {
  const [baselineDomain, setBaselineDomain] = useState<number | null>(null)
  const [selected, setSelected] = useState<ServiceId>('cctp-fast')
  const [perMonth, setPerMonth] = useState('100')

  const options = chains.filter((c) => !c.isArc && c.domain !== src.domain)
  const baseline = options.find((c) => c.domain === baselineDomain) ?? options.find((c) => c.domain === 6) ?? options[0]

  const baseQuery = useRouteQuote(network, src.domain, baseline?.domain ?? -1, amount, dst.isArc && !!baseline)

  const rows = useMemo(
    () =>
      IDS.map((id) => {
        const a = pick(arcQuote, id)
        const b = pick(baseQuery.data, id)
        const at = a ? totalFor(a, useForwarder) : null
        const bt = b ? totalFor(b, useForwarder) : null
        const saved = at !== null && bt !== null ? bt - at : null
        return { id, at, bt, saved }
      }),
    [arcQuote, baseQuery.data, useForwarder],
  )

  const icon = <TrendingDown className="size-4" aria-hidden />

  if (!dst.isArc) {
    return (
      <Panel icon={icon} title="Arc savings">
        <p className="rounded-xl bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">
          Choose Arc as the destination to compare it with another chain.
        </p>
      </Panel>
    )
  }
  if (!baseline) return null

  const sel = rows.find((r) => r.id === selected)
  const count = /^\d{1,7}$/.test(perMonth) ? BigInt(perMonth) : 0n
  const saved = sel?.saved ?? null
  const positive = saved !== null && saved > 0n
  const monthly = positive ? saved * count : 0n

  return (
    <Panel
      icon={icon}
      title="Arc savings"
      right={
        <label className="flex items-center gap-1.5 text-xs text-[var(--subtle)]">
          vs
          <select
            value={baseline.domain}
            onChange={(e) => setBaselineDomain(Number(e.target.value))}
            aria-label="Compare with"
            className="min-h-[36px] rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-2 text-xs font-semibold text-[var(--ink)]"
          >
            {options.map((c) => (
              <option key={c.domain} value={c.domain}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      }
    >
      <div className="rounded-xl bg-[var(--surface-strong)] p-4">
        <p className="text-xs text-[var(--subtle)]">Saved per transfer, {NAMES[selected]}</p>
        <p className={`display mt-1 text-3xl font-semibold tabular-nums ${positive ? 'text-[var(--success)]' : 'text-[var(--ink)]'}`}>
          {saved === null ? (baseQuery.isFetching ? '...' : 'n/a') : positive ? fmtUsdc(saved) : '0.0000'}
          <span className="ml-1.5 text-sm font-medium text-[var(--subtle)]">USDC</span>
        </p>
        <p className="mt-1 text-xs tabular-nums text-[var(--subtle)]">
          {positive && saved !== null && sel?.bt ? (
            <>
              <span className="font-semibold text-[var(--success)]">-{fmtPercent(saved, sel.bt)}</span> of the {baseline.name} fee
            </>
          ) : (
            `Same fee to ${baseline.name} and ${dst.name}`
          )}
        </p>
      </div>

      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => {
          const ratio = r.at !== null && r.bt !== null && r.bt > 0n ? Number((r.at * 1000n) / r.bt) / 10 : 0
          return (
            <li key={r.id}>
              <button
                onClick={() => setSelected(r.id)}
                aria-pressed={selected === r.id}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  selected === r.id ? 'border-[var(--brand)] bg-[var(--surface-strong)]' : 'border-transparent hover:bg-[var(--surface-strong)]'
                }`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--ink-2)]">{NAMES[r.id]}</span>
                  <span className={`text-sm font-semibold tabular-nums ${r.saved !== null && r.saved > 0n ? 'text-[var(--success)]' : 'text-[var(--subtle)]'}`}>
                    {r.saved === null ? 'n/a' : r.saved > 0n && r.bt ? `-${fmtPercent(r.saved, r.bt)}` : 'Same'}
                  </span>
                </span>
                <span className="mt-1 flex justify-between text-xs tabular-nums text-[var(--subtle)]">
                  <span>{baseline.name} {r.bt === null ? 'n/a' : fmtUsdc(r.bt)}</span>
                  <span>Arc {r.at === null ? 'n/a' : fmtUsdc(r.at)}</span>
                </span>
                <span className="mt-2 block h-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.14)]" aria-hidden>
                  <span className="block h-full rounded-full bg-[var(--brand)]" style={{ width: `${Math.min(100, ratio)}%` }} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {baseQuery.isError && <p className="mt-2 text-sm text-[var(--danger)]">Could not load fees for {baseline.name}.</p>}
      {network === 'testnet' && (
        <p className="mt-2 text-xs text-[var(--subtle)]">Reduced Arc pricing is published for mainnet, so testnet fees can differ.</p>
      )}

      <div className="mt-3 flex items-end justify-between gap-3 rounded-xl bg-[var(--surface-strong)] p-4">
        <div>
          <label htmlFor="per-month" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--subtle)]">
            Transfers per month
          </label>
          <input
            id="per-month"
            inputMode="numeric"
            value={perMonth}
            onChange={(e) => setPerMonth(e.target.value.trim())}
            className="mt-1 min-h-[44px] w-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-lg tabular-nums"
          />
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--subtle)]">Saved per month</p>
          <p className="display text-2xl font-semibold tabular-nums text-[var(--success)]">{fmtUsdc(monthly, 2)}</p>
        </div>
      </div>
    </Panel>
  )
}
