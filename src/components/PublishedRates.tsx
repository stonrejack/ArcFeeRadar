import { BookOpen } from 'lucide-react'
import { Panel } from '@/components/Panel'
import { ASSET_DECIMALS, publishedRoute, type Discount, type PublishedAsset, type PublishedService } from '@/lib/published'
import { bpsFee } from '@/lib/fees'
import { formatUnitsFixed, parseUnitsExact } from '@/onchain-money'
import type { Network } from '@/lib/chains'

interface Props {
  asset: PublishedAsset
  network: Network
  src: number
  dst: number
  amount: string
}

const NAMES = { gateway: 'Gateway', 'cctp-fast': 'CCTP Fast', 'cctp-standard': 'CCTP Standard' } as const
const ORDER: PublishedService['id'][] = ['gateway', 'cctp-fast', 'cctp-standard']

function discountLabel(d: Discount): string | null {
  return d === 'waived' ? 'Waived on Arc' : d === 'reduced' ? 'Reduced on Arc' : null
}

export function PublishedRates({ asset, network, src, dst, amount }: Props) {
  const decimals = ASSET_DECIMALS[asset]
  let raw: bigint | null = null
  try {
    raw = parseUnitsExact(amount, decimals)
  } catch {
    raw = null
  }
  const route = publishedRoute(asset, src, dst)

  return (
    <Panel icon={<BookOpen className="size-4" aria-hidden />} title={`${asset} published rates`}>
      <p className="text-sm text-[var(--subtle)]">
        {asset} fees come from Circle's published tables, not a live quote. Gas, Gateway source burn and forwarding fees vary by route and are not
        included.
      </p>

      {network === 'testnet' ? (
        <p className="mt-4 rounded-xl bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">
          These rates are published for mainnet. Switch to Mainnet to view them.
        </p>
      ) : !route.supported ? (
        <p className="mt-4 rounded-xl bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">{route.reason}</p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {ORDER.map((id) => {
            const s = route.services.find((x) => x.id === id)
            if (!s) return null
            const label = discountLabel(s.discount)
            const est =
              s.bps && raw !== null && raw > 0n
                ? [bpsFee(raw, s.bps[0]), bpsFee(raw, s.bps[1])]
                : null
            const fmt = (v: bigint) => formatUnitsFixed(v, decimals, asset === 'cirBTC' ? 8 : 6)
            return (
              <article key={id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                <h3 className="flex items-center justify-between gap-2 text-sm font-semibold text-[var(--ink-2)]">
                  {NAMES[id]}
                  {label && (
                    <span className="rounded-full bg-[rgba(74,222,128,0.12)] px-2.5 py-1 text-[11px] font-semibold text-[var(--success)]">
                      {label}
                    </span>
                  )}
                </h3>
                {!s.available ? (
                  <p className="mt-3 text-sm text-[var(--subtle)]">{s.note}</p>
                ) : (
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--subtle)]">Rate</dt>
                      <dd className="tabular-nums">
                        {s.bps ? (s.bps[0] === s.bps[1] ? `${s.bps[0]} bps` : `${s.bps[0]} to ${s.bps[1]} bps`) : 'None'}
                      </dd>
                    </div>
                    {s.fixedUsd !== null && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--subtle)]">Fixed fee</dt>
                        <dd className="tabular-nums">${s.fixedUsd}</dd>
                      </div>
                    )}
                    {est && (
                      <div className="flex justify-between gap-3 border-t border-[var(--border)] pt-1.5">
                        <dt className="text-[var(--subtle)]">Rate part on your amount</dt>
                        <dd className="tabular-nums">
                          {est[0] === est[1] ? fmt(est[0]) : `${fmt(est[0])} to ${fmt(est[1])}`} {asset}
                        </dd>
                      </div>
                    )}
                    {s.note && <p className="pt-1 text-xs text-[var(--subtle)]">{s.note}</p>}
                  </dl>
                )}
              </article>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
