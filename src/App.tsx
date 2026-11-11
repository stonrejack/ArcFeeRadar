import { Gauge, RefreshCw } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { ArcSavings } from '@/components/ArcSavings'
import { FeeGuide } from '@/components/FeeGuide'
import { HistoryPanel, type HistoryEntry } from '@/components/HistoryPanel'
import { Logo } from '@/components/Logo'
import { MyReceipts } from '@/components/MyReceipts'
import { Panel } from '@/components/Panel'
import { PublishedRates } from '@/components/PublishedRates'
import { RouteForm, type Asset } from '@/components/RouteForm'
import { SaveReceipt } from '@/components/SaveReceipt'
import { ServiceCards } from '@/components/ServiceCards'
import { useDebounced } from '@/hooks/useDebounced'
import { useRouteQuote } from '@/hooks/useRouteQuote'
import { ARC_DOMAIN, getRouteChains, type Network } from '@/lib/chains'
import { ASSET_DECIMALS } from '@/lib/published'
import { parseUnitsExact } from '@/onchain-money'

const MAX_HISTORY = 8

function parseAmount(text: string, asset: Asset): { value: bigint | null; error: string | null } {
  if (text.trim() === '') return { value: null, error: null }
  try {
    const value = parseUnitsExact(text.trim(), asset === 'USDC' ? 6 : ASSET_DECIMALS[asset])
    if (value <= 0n) return { value: null, error: 'Enter an amount above zero.' }
    return { value, error: null }
  } catch {
    return { value: null, error: `Enter a valid ${asset} amount.` }
  }
}

export default function App() {
  const [network, setNetwork] = useState<Network>('testnet')
  const [asset, setAsset] = useState<Asset>('USDC')
  const [srcPick, setSrc] = useState(0)
  const [dstPick, setDst] = useState(ARC_DOMAIN)
  const [amountText, setAmountText] = useState('100')
  const [useForwarder, setUseForwarder] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const chains = useMemo(() => getRouteChains(network), [network])

  // Domains picked on one network may not exist on the other (Unichain is testnet only).
  const src = chains.some((c) => c.domain === srcPick) ? srcPick : (chains.find((c) => c.domain !== dstPick)?.domain ?? 0)
  const dst = chains.some((c) => c.domain === dstPick) ? dstPick : ARC_DOMAIN

  const debouncedText = useDebounced(amountText)
  const typed = parseAmount(amountText, asset)
  const settled = parseAmount(debouncedText, asset)

  const srcChain = chains.find((c) => c.domain === src)
  const dstChain = chains.find((c) => c.domain === dst)

  // Called after a real fee lookup succeeds, so history only lists routes that were actually checked.
  const record = useCallback(() => {
    if (!srcChain || !dstChain) return
    const amount = debouncedText.trim()
    const key = `${network}|${src}|${dst}|${amount}`
    const entry: HistoryEntry = { key, network, src, dst, srcName: srcChain.name, dstName: dstChain.name, amount, at: Date.now() }
    setHistory((prev) => [entry, ...prev.filter((h) => h.key !== key)].slice(0, MAX_HISTORY))
  }, [network, src, dst, srcChain, dstChain, debouncedText])

  const quote = useRouteQuote(network, src, dst, settled.value, asset === 'USDC', record)
  const updated = quote.dataUpdatedAt ? new Date(quote.dataUpdatedAt).toLocaleTimeString('en-US') : null

  const pick = (e: HistoryEntry) => {
    setNetwork(e.network)
    setAsset('USDC')
    setSrc(e.src)
    setDst(e.dst)
    setAmountText(e.amount)
  }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-[1400px] items-center justify-between px-4 pt-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="display text-lg font-semibold">Arc Fee Radar</span>
          <span className="hidden rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)] sm:inline">
            CCTP + Gateway
          </span>
        </div>
        <a
          href="https://developers.circle.com/crosschain-fees"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[40px] items-center rounded-full border border-[var(--border)] px-4 text-sm text-[var(--muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--ink)]"
        >
          Fee docs
        </a>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-5 sm:px-6">
        <h1 className="sr-only">Moving assets to Arc costs less</h1>
        <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_320px]">
          <div className="order-2 space-y-4 lg:order-1">
            {asset === 'USDC' && srcChain && dstChain && settled.value !== null ? (
              <ArcSavings
                network={network}
                chains={chains}
                src={srcChain}
                dst={dstChain}
                amount={settled.value}
                useForwarder={useForwarder}
                arcQuote={quote.isPlaceholderData ? undefined : quote.data}
              />
            ) : (
              <Panel title="Arc savings">
                <p className="rounded-xl bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">
                  {asset === 'USDC' ? 'Enter an amount to compare Arc with another chain.' : 'Savings comparison uses live USDC fees. Pick USDC to see it.'}
                </p>
              </Panel>
            )}
          </div>

          <div className="order-1 space-y-4 lg:order-2">
            <RouteForm
              network={network}
              onNetwork={setNetwork}
              asset={asset}
              onAsset={setAsset}
              chains={chains}
              src={src}
              dst={dst}
              onSrc={setSrc}
              onDst={setDst}
              onSwap={() => {
                setSrc(dst)
                setDst(src)
              }}
              amount={amountText}
              onAmount={setAmountText}
              amountError={typed.error}
              useForwarder={useForwarder}
              onForwarder={setUseForwarder}
            />

            {asset === 'USDC' ? (
              <Panel
                icon={<Gauge className="size-4" aria-hidden />}
                title="Fees"
                right={
                  <button
                    onClick={() => void quote.refetch()}
                    disabled={quote.isFetching || settled.value === null}
                    className="flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs text-[var(--subtle)] transition-colors hover:text-[var(--ink)] disabled:opacity-50"
                  >
                    <RefreshCw className={`size-3.5 ${quote.isFetching ? 'animate-spin' : ''}`} aria-hidden />
                    {updated ? `Updated ${updated}` : 'Refresh'}
                  </button>
                }
              >
                {quote.isError && (
                  <p className="mb-3 rounded-xl bg-[var(--surface-strong)] p-3 text-sm text-[var(--danger)]" role="alert">
                    Could not load fees: {quote.error instanceof Error ? quote.error.message : 'unknown error'}.
                  </p>
                )}
                {settled.value === null || !srcChain || !dstChain ? (
                  <p className="rounded-xl bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">Enter an amount to see live fees for this route.</p>
                ) : (
                  <ServiceCards
                    quote={quote.data}
                    loading={quote.isLoading}
                    stale={quote.isPlaceholderData}
                    amount={settled.value}
                    useForwarder={useForwarder}
                    src={srcChain}
                    dst={dstChain}
                  />
                )}
                {quote.data && settled.value !== null && srcChain && dstChain && (
                  <SaveReceipt
                    quote={quote.data}
                    stale={quote.isPlaceholderData}
                    amount={settled.value}
                    useForwarder={useForwarder}
                    src={srcChain}
                    dst={dstChain}
                  />
                )}
                <p className="mt-3 text-xs text-[var(--subtle)]">Live from Circle's CCTP and Gateway fee APIs. Gas is not included.</p>
              </Panel>
            ) : (
              <PublishedRates asset={asset} network={network} src={src} dst={dst} amount={amountText} />
            )}
          </div>

          <div className="order-3 space-y-4 lg:col-span-2 xl:col-span-1">
            <HistoryPanel entries={history} onPick={pick} onClear={() => setHistory([])} />
            <MyReceipts />
            <FeeGuide />
          </div>
        </div>
      </main>
    </div>
  )
}
