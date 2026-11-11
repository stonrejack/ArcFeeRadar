import { ARC_DOMAIN, getGatewayContracts, getRouteChains, type Network } from '@/lib/chains'

const MICRO = 1_000_000n

export type ServiceId = 'cctp-standard' | 'cctp-fast' | 'gateway'

/** All amounts are USDC minor units (6 decimals). `forward` is null when the route has no Forwarding Service. */
export interface ServiceQuote {
  id: ServiceId
  protocol: bigint
  base: bigint
  forward: bigint | null
  protocolBps: number | null
}

export interface RouteQuote {
  standard: ServiceQuote | null
  fast: ServiceQuote | null
  gateway: ServiceQuote | null
  errors: { cctp?: string; gateway?: string }
  fetchedAt: number
}

/** Parse a decimal string from a Circle API into USDC minor units, rounding any extra digits up. */
export function decimalToMicro(value: string): bigint {
  const [whole = '0', fraction = ''] = value.trim().split('.')
  const padded = fraction.padEnd(6, '0')
  const base = BigInt(whole || '0') * MICRO + BigInt(padded.slice(0, 6))
  return /[1-9]/.test(padded.slice(6)) ? base + 1n : base
}

/** amount * bps / 10_000, rounded up, with bps allowed to have up to 3 decimals (0.325 bps). */
export function bpsFee(amount: bigint, bps: number): bigint {
  const milli = BigInt(Math.round(bps * 1000))
  const divisor = 10_000_000n
  return (amount * milli + divisor - 1n) / divisor
}

export function totalFor(quote: ServiceQuote, useForwarder: boolean): bigint | null {
  const core = quote.protocol + quote.base
  if (!useForwarder) return core
  return quote.forward === null ? null : core + quote.forward
}

const irisBase = (network: Network) =>
  network === 'mainnet' ? 'https://iris-api.circle.com' : 'https://iris-api-sandbox.circle.com'

const gatewayBase = (network: Network) =>
  network === 'mainnet' ? 'https://gateway-api.circle.com' : 'https://gateway-api-testnet.circle.com'

interface CctpFeeRow {
  finalityThreshold: number
  minimumFee: number
  forwardFee?: { low: number; med: number; high: number }
}

async function fetchCctp(network: Network, src: number, dst: number, amount: bigint, signal?: AbortSignal) {
  const url = `${irisBase(network)}/v2/burn/USDC/fees/${src}/${dst}`
  let forwarded = true
  let res = await fetch(`${url}?forward=true`, { signal })
  if (res.status === 400) {
    // Destinations without the Forwarding Service reject forward=true.
    forwarded = false
    res = await fetch(url, { signal })
  }
  if (!res.ok) throw new Error(`CCTP fee API returned ${res.status}`)
  const rows = (await res.json()) as CctpFeeRow[]
  const fastRow = rows.find((r) => r.finalityThreshold === 1000)
  const stdRow = rows.find((r) => r.finalityThreshold === 2000)
  const forwardMed = (stdRow ?? fastRow)?.forwardFee?.med
  const forward = forwarded && forwardMed !== undefined ? BigInt(Math.round(forwardMed)) : null
  const stdBps = stdRow?.minimumFee ?? 0

  const standard: ServiceQuote = {
    id: 'cctp-standard',
    protocol: bpsFee(amount, stdBps),
    base: 0n,
    forward,
    protocolBps: stdBps,
  }
  // Fast Transfer does not apply when Arc is the source: its standard attestation is already fast.
  const fast: ServiceQuote | null = fastRow && src !== ARC_DOMAIN
    ? { id: 'cctp-fast', protocol: bpsFee(amount, fastRow.minimumFee), base: 0n, forward, protocolBps: fastRow.minimumFee }
    : null
  return { standard, fast }
}

const padBytes32 = (value: string) => `0x${value.slice(2).toLowerCase().padStart(64, '0')}`

// The estimate endpoint needs address-shaped fields but never signs or moves funds.
// A burn address stands in for the depositor, signer and recipient.
const ESTIMATE_PLACEHOLDER = '0x000000000000000000000000000000000000dEaD'

interface GatewayEstimate {
  fees: {
    perIntent: { baseFee: string; transferFee?: string }[]
    forwardingFee?: string
  }
}

async function fetchGateway(network: Network, src: number, dst: number, amount: bigint, signal?: AbortSignal) {
  const chains = getRouteChains(network)
  const from = chains.find((c) => c.domain === src)
  const to = chains.find((c) => c.domain === dst)
  if (!from || !to) throw new Error('Route is not supported by Gateway')
  const { wallet, minter } = getGatewayContracts(network)

  const body = [
    {
      spec: {
        version: 1,
        sourceDomain: src,
        destinationDomain: dst,
        sourceContract: padBytes32(wallet),
        destinationContract: padBytes32(minter),
        sourceToken: padBytes32(from.usdc),
        destinationToken: padBytes32(to.usdc),
        sourceDepositor: padBytes32(ESTIMATE_PLACEHOLDER),
        destinationRecipient: padBytes32(ESTIMATE_PLACEHOLDER),
        sourceSigner: padBytes32(ESTIMATE_PLACEHOLDER),
        destinationCaller: padBytes32('0x0'),
        value: amount.toString(),
        salt: padBytes32('0x1'),
      },
    },
  ]
  const res = await fetch(`${gatewayBase(network)}/v1/estimate?enableForwarder=true`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  }).catch((err: unknown) => {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new Error('Could not reach the Gateway fee API')
  })
  if (!res.ok) throw new Error(`Gateway estimate returned ${res.status}`)
  const data = (await res.json()) as GatewayEstimate
  const intent = data.fees.perIntent[0]
  const base = decimalToMicro(intent?.baseFee ?? '0')
  const transfer = decimalToMicro(intent?.transferFee ?? '0')
  const forward = data.fees.forwardingFee !== undefined ? decimalToMicro(data.fees.forwardingFee) : null
  const gateway: ServiceQuote = {
    id: 'gateway',
    protocol: transfer,
    base,
    forward,
    protocolBps: amount > 0n ? Number((transfer * 10_000_000n) / amount) / 1000 : 0,
  }
  return gateway
}

export async function fetchRouteQuote(
  network: Network,
  src: number,
  dst: number,
  amount: bigint,
  signal?: AbortSignal,
): Promise<RouteQuote> {
  const [cctp, gateway] = await Promise.allSettled([
    fetchCctp(network, src, dst, amount, signal),
    fetchGateway(network, src, dst, amount, signal),
  ])
  const errors: RouteQuote['errors'] = {}
  if (cctp.status === 'rejected') errors.cctp = cctp.reason instanceof Error ? cctp.reason.message : 'CCTP fees unavailable'
  if (gateway.status === 'rejected')
    errors.gateway = gateway.reason instanceof Error ? gateway.reason.message : 'Gateway fees unavailable'
  if (cctp.status === 'rejected' && gateway.status === 'rejected') {
    throw new Error(errors.cctp ?? 'Fee APIs are unavailable')
  }
  return {
    standard: cctp.status === 'fulfilled' ? cctp.value.standard : null,
    fast: cctp.status === 'fulfilled' ? cctp.value.fast : null,
    gateway: gateway.status === 'fulfilled' ? gateway.value : null,
    errors,
    fetchedAt: Date.now(),
  }
}

export function quoteFor(quote: RouteQuote, id: ServiceId): ServiceQuote | null {
  return id === 'gateway' ? quote.gateway : id === 'cctp-fast' ? quote.fast : quote.standard
}

/** Lowest total fee wins; ties go to the faster service (Gateway, then Fast, then Standard). */
export function cheapestService(quote: RouteQuote, useForwarder: boolean): ServiceId | null {
  let bestId: ServiceId | null = null
  let bestTotal: bigint | null = null
  for (const id of ['gateway', 'cctp-fast', 'cctp-standard'] as const) {
    const q = quoteFor(quote, id)
    const total = q ? totalFor(q, useForwarder) : null
    if (total !== null && (bestTotal === null || total < bestTotal)) {
      bestTotal = total
      bestId = id
    }
  }
  return bestId
}
