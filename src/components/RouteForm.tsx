import { ArrowDownUp, ArrowLeftRight } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Network, RouteChain } from '@/lib/chains'
import { Panel } from '@/components/Panel'

export type Asset = 'USDC' | 'EURC' | 'cirBTC'

const ASSETS: Asset[] = ['USDC', 'EURC', 'cirBTC']
const QUICK_AMOUNTS = ['10', '100', '1000', '10000']

interface Props {
  network: Network
  onNetwork: (n: Network) => void
  asset: Asset
  onAsset: (a: Asset) => void
  chains: RouteChain[]
  src: number
  dst: number
  onSrc: (d: number) => void
  onDst: (d: number) => void
  onSwap: () => void
  amount: string
  onAmount: (v: string) => void
  amountError: string | null
  useForwarder: boolean
  onForwarder: (v: boolean) => void
}

const labelCls = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--subtle)]'
const pillSelect =
  'min-h-[44px] max-w-full rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-[15px] font-semibold text-[var(--ink)] transition-colors hover:border-[var(--border-strong)]'

function Tabs<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
}: {
  value: T
  options: { id: T; label: ReactNode }[]
  onChange: (v: T) => void
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex gap-1">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-lg font-semibold transition-colors ${size === 'sm' ? 'min-h-[32px] px-2.5 text-xs' : 'min-h-[40px] px-3 text-sm'} ${
            value === o.id ? 'bg-[var(--surface-muted)] text-[var(--ink)]' : 'text-[var(--subtle)] hover:text-[var(--ink-2)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function RouteForm(p: Props) {
  return (
    <Panel
      icon={<ArrowLeftRight className="size-4" aria-hidden />}
      title="Route"
      right={
        <Tabs
          size="sm"
          label="Network"
          value={p.network}
          onChange={p.onNetwork}
          options={[
            { id: 'testnet', label: 'Testnet' },
            { id: 'mainnet', label: 'Mainnet' },
          ]}
        />
      }
    >
      <Tabs label="Asset" value={p.asset} onChange={p.onAsset} options={ASSETS.map((a) => ({ id: a, label: a }))} />
      {p.network === 'mainnet' && (
        <p className="mt-1 text-xs text-[var(--subtle)]">Mainnet shows fee data only. This app never sends transactions.</p>
      )}

      <div className="mt-3 space-y-1">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="amount" className={labelCls}>
              You send
            </label>
            <label htmlFor="src" className="sr-only">
              From
            </label>
            <select id="src" className={pillSelect} value={p.src} onChange={(e) => p.onSrc(Number(e.target.value))}>
              {p.chains.map((c) => (
                <option key={c.domain} value={c.domain} disabled={c.domain === p.dst}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <input
            id="amount"
            inputMode="decimal"
            autoComplete="off"
            value={p.amount}
            onChange={(e) => p.onAmount(e.target.value)}
            aria-invalid={p.amountError !== null}
            placeholder="0"
            className="display mt-2 w-full bg-transparent text-4xl font-semibold tabular-nums text-[var(--ink)] placeholder:text-[var(--subtle)] focus-visible:outline-none"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            {p.amountError ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {p.amountError}
              </p>
            ) : (
              <span className="text-xs text-[var(--subtle)]">{p.asset}</span>
            )}
            <div className="flex gap-1.5">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  onClick={() => p.onAmount(q)}
                  className="min-h-[32px] rounded-md bg-[var(--surface-muted)] px-2 text-xs font-semibold tabular-nums text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
                >
                  {Number(q).toLocaleString('en-US')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 -my-3.5 flex justify-center">
          <button
            onClick={p.onSwap}
            aria-label="Swap source and destination"
            className="grid size-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)] transition-transform hover:border-[var(--border-strong)] active:scale-95"
          >
            <ArrowDownUp className="size-4" aria-hidden />
          </button>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="dst" className={labelCls}>
              You get on
            </label>
            <select id="dst" className={pillSelect} value={p.dst} onChange={(e) => p.onDst(Number(e.target.value))}>
              {p.chains.map((c) => (
                <option key={c.domain} value={c.domain} disabled={c.domain === p.src}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <label className="mt-3 flex min-h-[44px] cursor-pointer items-center justify-between gap-4 rounded-xl px-1">
        <span>
          <span className="block text-sm font-medium text-[var(--ink-2)]">Forwarding Service</span>
          <span className="block text-xs text-[var(--subtle)]">Circle submits the mint, so you skip destination gas.</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={p.useForwarder}
          onChange={(e) => p.onForwarder(e.target.checked)}
          className="size-5 shrink-0 accent-[#2775ca]"
        />
      </label>
    </Panel>
  )
}
