import { ExternalLink, Stamp } from 'lucide-react'
import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { Panel } from '@/components/Panel'
import { DOMAIN_LABELS } from '@/lib/chains'
import { fmtUsdc } from '@/lib/format'
import { feeReceiptRegistryAbi, RECEIPT_CHAIN_ID, RECEIPT_REGISTRY, SERVICE_BY_CODE } from '@/lib/receiptRegistry'
import { buildAddressExplorerUrl } from '@/onchain-facts'

const SHOWN = 5

export function MyReceipts() {
  const { address, isConnected } = useAccount()

  const ids = useReadContract({
    address: RECEIPT_REGISTRY,
    abi: feeReceiptRegistryAbi,
    functionName: 'receiptIdsOf',
    args: address ? [address, 0n, 100n] : undefined,
    chainId: RECEIPT_CHAIN_ID,
    query: { enabled: !!RECEIPT_REGISTRY && !!address },
  })
  const latest = ids.data ? [...ids.data].slice(-SHOWN).reverse() : []

  const receipts = useReadContracts({
    contracts: latest.map((id) => ({
      address: RECEIPT_REGISTRY!,
      abi: feeReceiptRegistryAbi,
      functionName: 'getReceipt' as const,
      args: [id] as const,
      chainId: RECEIPT_CHAIN_ID,
    })),
    query: { enabled: !!RECEIPT_REGISTRY && latest.length > 0 },
  })

  return (
    <Panel
      icon={<Stamp className="size-4" aria-hidden />}
      title="Your onchain receipts"
      right={
        RECEIPT_REGISTRY ? (
          <a
            href={buildAddressExplorerUrl(RECEIPT_CHAIN_ID, RECEIPT_REGISTRY)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View the registry contract on the explorer"
            className="grid size-8 place-items-center rounded-md text-[var(--subtle)] hover:text-[var(--ink)]"
          >
            <ExternalLink className="size-4" aria-hidden />
          </a>
        ) : undefined
      }
    >
      {!isConnected ? (
        <p className="rounded-xl bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">Connect your wallet to see receipts you saved on Arc Testnet.</p>
      ) : ids.isLoading ? (
        <div className="h-16 animate-pulse rounded-xl bg-[var(--surface-strong)]" aria-busy="true" />
      ) : ids.isError ? (
        <p className="rounded-xl bg-[var(--surface-strong)] p-4 text-sm text-[var(--danger)]" role="alert">
          Could not load your receipts.
        </p>
      ) : latest.length === 0 ? (
        <p className="rounded-xl bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">No receipts yet. Save one from a fee comparison.</p>
      ) : (
        <ul className="space-y-1.5">
          {latest.map((id, i) => {
            const r = receipts.data?.[i]?.result
            return (
              <li key={id.toString()} className="rounded-xl bg-[var(--surface-strong)] p-3">
                {r ? (
                  <>
                    <p className="flex items-baseline justify-between gap-2 text-sm font-semibold text-[var(--ink-2)]">
                      <span>
                        #{id.toString()} {DOMAIN_LABELS[r.srcDomain] ?? r.srcDomain} to {DOMAIN_LABELS[r.dstDomain] ?? r.dstDomain}
                      </span>
                      <span className="text-xs font-medium text-[var(--accent)]">{SERVICE_BY_CODE[r.service] ?? 'Service'}</span>
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-[var(--subtle)]">
                      {fmtUsdc(r.amount, 2)} USDC, fee {fmtUsdc(r.totalFee)} USDC{r.forwarded ? ', forwarded' : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-[var(--subtle)]">#{id.toString()} loading...</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
