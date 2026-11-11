import { getChain, getProtocolContractByName, getUsdc } from '@/onchain-facts'

export type Network = 'testnet' | 'mainnet'

/**
 * Circle domain identifiers (shared by CCTP and Gateway) for the chains this app compares,
 * with the matching chain ID so names, USDC addresses and Gateway contracts come from the
 * onchain facts registry. Domains are from Circle's Gateway "supported blockchains" table.
 */
const SPECS: Record<Network, { domain: number; chainId: number }[]> = {
  testnet: [
    { domain: 0, chainId: 11155111 },
    { domain: 1, chainId: 43113 },
    { domain: 2, chainId: 11155420 },
    { domain: 3, chainId: 421614 },
    { domain: 6, chainId: 84532 },
    { domain: 7, chainId: 80002 },
    { domain: 10, chainId: 1301 },
    { domain: 26, chainId: 5042002 },
  ],
  mainnet: [
    { domain: 0, chainId: 1 },
    { domain: 1, chainId: 43114 },
    { domain: 2, chainId: 10 },
    { domain: 3, chainId: 42161 },
    { domain: 6, chainId: 8453 },
    { domain: 7, chainId: 137 },
    { domain: 26, chainId: 5042 },
  ],
}

export const ARC_DOMAIN = 26

export interface RouteChain {
  domain: number
  chainId: number
  name: string
  usdc: string
  isArc: boolean
}

export function getRouteChains(network: Network): RouteChain[] {
  return SPECS[network].flatMap(({ domain, chainId }) => {
    const chain = getChain(chainId)
    const usdc = getUsdc(chainId)
    if (!chain || !usdc) return []
    return [{ domain, chainId, name: chain.name, usdc: usdc.address, isArc: domain === ARC_DOMAIN }]
  })
}

export function getGatewayContracts(network: Network): { wallet: string; minter: string } {
  const wallet = getProtocolContractByName('GatewayWallet', network)
  const minter = getProtocolContractByName('GatewayMinter', network)
  if (!wallet || !minter) throw new Error('Gateway contracts are missing from the onchain facts registry')
  return { wallet: wallet.address, minter: minter.address }
}

/** Short chain labels by Circle domain, used where a route is shown without a network context. */
export const DOMAIN_LABELS: Record<number, string> = {
  0: 'Ethereum',
  1: 'Avalanche',
  2: 'OP',
  3: 'Arbitrum',
  6: 'Base',
  7: 'Polygon',
  10: 'Unichain',
  26: 'Arc',
}
