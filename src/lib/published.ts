import { ARC_DOMAIN } from '@/lib/chains'

export type PublishedAsset = 'EURC' | 'cirBTC'

export const ASSET_DECIMALS: Record<PublishedAsset, number> = { EURC: 6, cirBTC: 8 }

export type Discount = 'none' | 'reduced' | 'waived'

export interface PublishedService {
  id: 'cctp-standard' | 'cctp-fast' | 'gateway'
  /** null: the service does not apply to this route. */
  available: boolean
  /** Rate part of the fee in basis points, as a [low, high] range. */
  bps: [number, number] | null
  /** Fixed per-transfer fee in USD, when one is published. */
  fixedUsd: string | null
  discount: Discount
  note?: string
}

export interface PublishedRoute {
  supported: boolean
  reason?: string
  services: PublishedService[]
}

// Domains from Circle's Gateway "supported blockchains" table.
const EURC_DOMAINS = new Set([0, 1, 6, 26]) // Ethereum, Avalanche, Base, Arc
const CIRBTC_DOMAINS = new Set([0, 26]) // Ethereum, Arc

/**
 * Published (documented) EURC and cirBTC transfer fees on CCTP and Gateway.
 * Source: developers.circle.com/crosschain-fees, /cctp/expanded-assets/references/fees, /gateway/references/fees.
 * Gas, Gateway base fee and forwarding fees vary by route and are not included here.
 */
export function publishedRoute(asset: PublishedAsset, src: number, dst: number): PublishedRoute {
  const domains = asset === 'EURC' ? EURC_DOMAINS : CIRBTC_DOMAINS
  if (!domains.has(src) || !domains.has(dst)) {
    return { supported: false, reason: `${asset} is not available on this route.`, services: [] }
  }
  const arc = src === ARC_DOMAIN || dst === ARC_DOMAIN
  if (asset === 'cirBTC' && !arc) {
    return { supported: false, reason: 'cirBTC moves between Ethereum and Arc only.', services: [] }
  }

  if (asset === 'cirBTC') {
    return {
      supported: true,
      services: [
        { id: 'cctp-standard', available: true, bps: [0, 0], fixedUsd: null, discount: 'none', note: 'No transfer fee' },
        src === ARC_DOMAIN
          ? { id: 'cctp-fast', available: false, bps: null, fixedUsd: null, discount: 'none', note: 'Fast Transfer is not applicable from Arc' }
          : { id: 'cctp-fast', available: true, bps: [0.25, 0.25], fixedUsd: null, discount: 'reduced' },
        { id: 'gateway', available: true, bps: [0, 0], fixedUsd: null, discount: 'waived', note: 'Waived to and from Arc' },
      ],
    }
  }

  // EURC
  const standard: PublishedService = {
    id: 'cctp-standard',
    available: true,
    bps: null,
    fixedUsd: arc ? '0' : '0.25',
    discount: arc ? 'waived' : 'none',
  }
  let fast: PublishedService
  if (src === ARC_DOMAIN || src === 1) {
    fast = { id: 'cctp-fast', available: false, bps: null, fixedUsd: null, discount: 'none', note: 'Fast Transfer is not applicable from this blockchain' }
  } else if (src === 6) {
    fast = {
      id: 'cctp-fast',
      available: true,
      bps: dst === ARC_DOMAIN ? [0.325, 0.325] : [1, 1.3],
      fixedUsd: arc ? '0' : '0.25',
      discount: dst === ARC_DOMAIN ? 'reduced' : 'none',
    }
  } else {
    fast = {
      id: 'cctp-fast',
      available: true,
      bps: dst === ARC_DOMAIN ? [0.25, 0.25] : [1, 1],
      fixedUsd: arc ? '0' : '0.25',
      discount: dst === ARC_DOMAIN ? 'reduced' : 'none',
    }
  }
  const gateway: PublishedService = {
    id: 'gateway',
    available: true,
    bps: arc ? [0, 0] : [1, 1],
    fixedUsd: null,
    discount: arc ? 'waived' : 'none',
  }
  return { supported: true, services: [standard, fast, gateway] }
}
