import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { Network } from '@/lib/chains'
import { fetchRouteQuote } from '@/lib/fees'

export function useRouteQuote(network: Network, src: number, dst: number, amount: bigint | null, enabled = true, onResult?: () => void) {
  const valid = enabled && amount !== null && amount > 0n && src !== dst
  return useQuery({
    queryKey: ['route-quote', network, src, dst, amount?.toString() ?? ''],
    queryFn: async ({ signal }) => {
      const result = await fetchRouteQuote(network, src, dst, amount as bigint, signal)
      onResult?.()
      return result
    },
    enabled: valid,
    staleTime: 20_000,
    refetchInterval: 60_000,
    retry: 1,
    placeholderData: keepPreviousData,
  })
}
