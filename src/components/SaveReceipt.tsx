import { useQueryClient } from '@tanstack/react-query'
import { ConnectKitButton } from 'connectkit'
import { Check, ExternalLink, Stamp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { parseEventLogs } from 'viem'
import { useAccount, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { DOMAIN_LABELS, type RouteChain } from '@/lib/chains'
import { cheapestService, quoteFor, totalFor, type RouteQuote, type ServiceId } from '@/lib/fees'
import { fmtUsdc } from '@/lib/format'
import {
  feeReceiptRegistryAbi,
  parseTxError,
  RECEIPT_CHAIN_ID,
  RECEIPT_REGISTRY,
  SERVICE_CODE,
} from '@/lib/receiptRegistry'
import { buildTxExplorerUrl, requireChain } from '@/onchain-facts'

interface Props {
  quote: RouteQuote
  stale: boolean
  amount: bigint
  useForwarder: boolean
  src: RouteChain
  dst: RouteChain
}

const IDS: ServiceId[] = ['gateway', 'cctp-fast', 'cctp-standard']

export function SaveReceipt({ quote, stale, amount, useForwarder, src, dst }: Props) {
  const [choice, setChoice] = useState<ServiceId | null>(null)
  const [txError, setTxError] = useState<string | null>(null)
  const { address, isConnected, chainId } = useAccount()
  const { switchChain, isPending: switching } = useSwitchChain()
  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { data: receipt, isLoading: confirming, isError: receiptFailed } = useWaitForTransactionReceipt({ hash })
  const queryClient = useQueryClient()

  const best = cheapestService(quote, useForwarder)
  const id = choice && quoteFor(quote, choice) && totalFor(quoteFor(quote, choice)!, useForwarder) !== null ? choice : best
  const picked = id ? quoteFor(quote, id) : null
  const total = picked ? totalFor(picked, useForwarder) : null

  const saved = receipt?.status === 'success'
  const savedId = saved
    ? parseEventLogs({ abi: feeReceiptRegistryAbi, logs: receipt.logs, eventName: 'FeeRecorded' })[0]?.args.id
    : undefined

  // Refresh "Your receipts" once the transaction is confirmed.
  useEffect(() => {
    if (saved) {
      void queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === 'string' && q.queryKey[0].startsWith('readContract') })
    }
  }, [saved, queryClient])

  const chainName = requireChain(RECEIPT_CHAIN_ID).name
  const wrongChain = isConnected && chainId !== RECEIPT_CHAIN_ID
  const feeTooHigh = total !== null && total > amount
  const blocked = stale || id === null || total === null || feeTooHigh || !RECEIPT_REGISTRY

  const submit = () => {
    if (!RECEIPT_REGISTRY || id === null || total === null) return
    setTxError(null)
    writeContract(
      {
        address: RECEIPT_REGISTRY,
        abi: feeReceiptRegistryAbi,
        functionName: 'record',
        args: [src.domain, dst.domain, SERVICE_CODE[id], useForwarder, amount, total],
        chainId: RECEIPT_CHAIN_ID,
      },
      { onError: (e) => setTxError(parseTxError(e)) },
    )
  }

  const busy = isPending || confirming
  const names: Record<ServiceId, string> = { gateway: 'Gateway', 'cctp-fast': 'CCTP Fast', 'cctp-standard': 'CCTP Standard' }

  return (
    <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
      <div className="flex items-center gap-2">
        <Stamp className="size-4 text-[var(--accent)]" aria-hidden />
        <h3 className="text-sm font-semibold text-[var(--ink-2)]">Save receipt onchain</h3>
      </div>
      <p className="mt-1 text-xs text-[var(--subtle)]">
        Publish this comparison as a permanent public record on {chainName}. It is self-reported, not proof of a transfer.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="receipt-service" className="text-xs text-[var(--subtle)]">
          Service
        </label>
        <select
          id="receipt-service"
          value={id ?? ''}
          onChange={(e) => setChoice(e.target.value as ServiceId)}
          disabled={busy}
          className="min-h-[40px] rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-2 text-sm font-semibold text-[var(--ink)]"
        >
          {IDS.map((s) => {
            const q = quoteFor(quote, s)
            const t = q ? totalFor(q, useForwarder) : null
            return (
              <option key={s} value={s} disabled={t === null}>
                {names[s]}
                {t !== null ? ` (${fmtUsdc(t)} USDC)` : ' (n/a)'}
              </option>
            )
          })}
        </select>
        <span className="text-xs tabular-nums text-[var(--subtle)]">
          {src.name} to {dst.name}, {fmtUsdc(amount, 2)} USDC
          {useForwarder ? ', forwarded' : ''}
        </span>
      </div>

      <div className="mt-3">
        {!RECEIPT_REGISTRY ? (
          <p className="text-sm text-[var(--danger)]">The registry address is not configured.</p>
        ) : !isConnected ? (
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button
                onClick={show}
                className="min-h-[44px] w-full rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-hover)] active:scale-[0.99]"
              >
                Connect wallet to save
              </button>
            )}
          </ConnectKitButton.Custom>
        ) : wrongChain ? (
          <button
            onClick={() => switchChain({ chainId: RECEIPT_CHAIN_ID })}
            disabled={switching}
            className="min-h-[44px] w-full rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-60"
          >
            {switching ? 'Switching...' : `Switch to ${chainName}`}
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={busy || blocked}
            className="min-h-[44px] w-full rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-hover)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Confirm in your wallet...' : confirming ? 'Saving onchain...' : 'Save receipt onchain'}
          </button>
        )}
      </div>

      {feeTooHigh && <p className="mt-2 text-xs text-[var(--danger)]">The total fee is higher than the amount. Increase the amount to save a receipt.</p>}
      {txError && (
        <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
          {txError}
        </p>
      )}
      {receiptFailed && (
        <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
          Could not confirm the transaction. Check the explorer, then try again.
        </p>
      )}
      {receipt?.status === 'reverted' && (
        <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
          The transaction was reverted.
        </p>
      )}
      {saved && hash && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[rgba(74,222,128,0.1)] p-3 text-sm">
          <span className="flex items-center gap-2 font-semibold text-[var(--success)]">
            <Check className="size-4" aria-hidden />
            Receipt {savedId !== undefined ? `#${savedId.toString()} ` : ''}saved
          </span>
          <span className="flex items-center gap-3">
            <a
              href={buildTxExplorerUrl(RECEIPT_CHAIN_ID, hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[32px] items-center gap-1 text-[var(--accent)] underline-offset-2 hover:underline"
            >
              View transaction <ExternalLink className="size-3.5" aria-hidden />
            </a>
            <button onClick={reset} className="min-h-[32px] text-xs text-[var(--subtle)] hover:text-[var(--ink)]">
              Dismiss
            </button>
          </span>
        </div>
      )}
      {address && !saved && (
        <p className="mt-2 text-[11px] text-[var(--subtle)]">
          {DOMAIN_LABELS[src.domain] ?? 'Source'} to {DOMAIN_LABELS[dst.domain] ?? 'destination'} is recorded as domain {src.domain} to {dst.domain}. Gas is paid
          in {chainName} USDC.
        </p>
      )}
    </div>
  )
}
