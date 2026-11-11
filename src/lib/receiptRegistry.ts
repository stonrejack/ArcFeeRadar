import { arcTestnet } from 'viem/chains'
import type { ServiceId } from '@/lib/fees'

export { feeReceiptRegistryAbi } from '@/lib/feeReceiptRegistryAbi'

/** Chain the FeeReceiptRegistry is deployed on. */
export const RECEIPT_CHAIN_ID = arcTestnet.id

const raw = import.meta.env.VITE_FEE_RECEIPT_REGISTRY as string | undefined
export const RECEIPT_REGISTRY: `0x${string}` | undefined = raw && /^0x[0-9a-fA-F]{40}$/.test(raw) ? (raw as `0x${string}`) : undefined

/** Service codes used by the contract: 0 = Gateway, 1 = CCTP Fast, 2 = CCTP Standard. */
export const SERVICE_CODE: Record<ServiceId, number> = { gateway: 0, 'cctp-fast': 1, 'cctp-standard': 2 }
export const SERVICE_BY_CODE: Record<number, string> = { 0: 'Gateway', 1: 'CCTP Fast', 2: 'CCTP Standard' }

export function parseTxError(error: unknown): string | null {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase()
  if (message.includes('user rejected') || message.includes('user denied')) return null
  if (message.includes('insufficient funds') || message.includes('exceeds balance')) {
    return 'Not enough Arc Testnet USDC for gas. Use "Get test USDC" in the sidebar, then try again.'
  }
  if (message.includes('feeexceedsamount')) return 'The total fee is higher than the amount, so the contract rejects this receipt.'
  if (message.includes('network') || message.includes('timeout')) return 'Network issue. Check your connection and try again.'
  return 'The transaction failed. Please try again.'
}
