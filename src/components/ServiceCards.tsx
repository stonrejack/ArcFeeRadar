import { Gauge, Zap, Hourglass, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { RouteChain } from '@/lib/chains'
import { totalFor, type RouteQuote, type ServiceId, type ServiceQuote } from '@/lib/fees'
import { fmtPercent, fmtUsdc } from '@/lib/format'

interface Props {
  quote: RouteQuote | undefined
  loading: boolean
  stale: boolean
  amount: bigint
  useForwarder: boolean
  src: RouteChain
  dst: RouteChain
}

const META: Record<ServiceId, { name: string; speed: string; icon: ReactNode }> = {
  gateway: { name: 'Gateway', speed: 'Under 500 ms', icon: <Zap className="size-4" aria-hidden /> },
  'cctp-fast': { name: 'CCTP Fast', speed: 'About 8 to 20 seconds', icon: <Gauge className="size-4" aria-hidden /> },
  'cctp-standard': { name: 'CCTP Standard', speed: 'Waits for finality', icon: <Hourglass className="size-4" aria-hidden /> },
}

// When fees tie, prefer the faster service.
const ORDER: ServiceId[] = ['gateway', 'cctp-fast', 'cctp-standard']

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-[var(--subtle)]">{label}</dt>
      <dd className={`tabular-nums ${muted ? 'text-[var(--subtle)]' : 'text-[var(--ink-2)]'}`}>{value}</dd>
    </div>
  )
}

function Chip({ children, tone }: { children: ReactNode; tone: 'accent' | 'success' }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        tone === 'success' ? 'bg-[rgba(74,222,128,0.12)] text-[var(--success)]' : 'bg-[rgba(90,169,245,0.16)] text-[var(--accent)]'
      }`}
    >
      {children}
    </span>
  )
}

function Card({
  id,
  q,
  amount,
  useForwarder,
  best,
  arcInvolved,
  dstIsArc,
  error,
  unavailableNote,
}: {
  id: ServiceId
  q: ServiceQuote | null | undefined
  amount: bigint
  useForwarder: boolean
  best: boolean
  arcInvolved: boolean
  dstIsArc: boolean
  error?: string
  unavailableNote: string
}) {
  const meta = META[id]
  const total = q ? totalFor(q, useForwarder) : null

  return (
    <article
      className={`glass flex flex-col gap-4 rounded-2xl p-4 ${best ? 'border-[var(--brand)]' : ''}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-2)]">
            <span className="text-[var(--accent)]">{meta.icon}</span>
            {meta.name}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--subtle)]">{meta.speed}</p>
        </div>
        {best && total !== null && <Chip tone="accent">Lowest fee</Chip>}
      </header>

      {error ? (
        <p className="flex items-start gap-2 text-sm text-[var(--danger)]" role="alert">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : !q ? (
        <p className="text-sm text-[var(--subtle)]">{unavailableNote}</p>
      ) : total === null ? (
        <p className="text-sm text-[var(--subtle)]">The Forwarding Service is not offered on this destination. Turn it off to compare.</p>
      ) : (
        <>
          <div>
            <p className="display text-2xl font-semibold tabular-nums">
              {fmtUsdc(total)} <span className="text-base font-medium text-[var(--subtle)]">USDC</span>
            </p>
            <p className="text-xs tabular-nums text-[var(--subtle)]">{fmtPercent(total, amount)} of the amount</p>
          </div>
          <dl className="space-y-1.5 border-t border-[var(--border)] pt-3">
            <Row label="Transfer fee" value={`${fmtUsdc(q.protocol)} USDC`} />
            {id === 'gateway' && <Row label="Source burn (flat)" value={`${fmtUsdc(q.base)} USDC`} />}
            <Row
              label="Forwarding"
              value={useForwarder ? `${fmtUsdc(q.forward ?? 0n)} USDC` : 'Not used'}
              muted={!useForwarder}
            />
          </dl>
          <div className="flex flex-wrap gap-1.5">
            {id === 'cctp-fast' && dstIsArc && <Chip tone="success">Reduced Arc rate</Chip>}
            {id === 'gateway' && arcInvolved && q.protocol === 0n && <Chip tone="success">Transfer fee waived on Arc</Chip>}
            {id === 'cctp-standard' && q.protocol === 0n && <Chip tone="accent">No transfer fee</Chip>}
          </div>
        </>
      )}
    </article>
  )
}

export function ServiceCards({ quote, loading, stale, amount, useForwarder, src, dst }: Props) {
  if (loading && !quote) {
    return (
      <div className="grid gap-3 sm:grid-cols-3" aria-busy="true" aria-label="Loading fees">
        {ORDER.map((id) => (
          <div key={id} className="glass h-48 animate-pulse rounded-2xl" />
        ))}
      </div>
    )
  }
  if (!quote) return null

  const entries: [ServiceId, ServiceQuote | null][] = [
    ['gateway', quote.gateway],
    ['cctp-fast', quote.fast],
    ['cctp-standard', quote.standard],
  ]
  let bestId: ServiceId | null = null
  let bestTotal: bigint | null = null
  for (const id of ORDER) {
    const q = entries.find(([k]) => k === id)?.[1]
    const t = q ? totalFor(q, useForwarder) : null
    if (t !== null && (bestTotal === null || t < bestTotal)) {
      bestTotal = t
      bestId = id
    }
  }
  const arcInvolved = src.isArc || dst.isArc

  return (
    <div className={`grid gap-4 transition-opacity md:grid-cols-3 ${stale ? 'opacity-60' : ''}`} aria-busy={stale}>
      {entries.map(([id, q]) => (
        <Card
          key={id}
          id={id}
          q={q}
          amount={amount}
          useForwarder={useForwarder}
          best={bestId === id}
          arcInvolved={arcInvolved}
          dstIsArc={dst.isArc}
          error={id === 'gateway' ? quote.errors.gateway : quote.errors.cctp}
          unavailableNote={id === 'cctp-fast' ? `Fast Transfer is not offered from ${src.name}.` : 'Not available on this route.'}
        />
      ))}
    </div>
  )
}
