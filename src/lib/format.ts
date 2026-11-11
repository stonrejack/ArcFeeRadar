import { formatUnitsFixed } from '@/onchain-money'

/** Display a USDC minor-unit amount with a sensible number of decimals. */
export function fmtUsdc(raw: bigint, digits = 4): string {
  return formatUnitsFixed(raw, 6, digits)
}

export function fmtPercent(fee: bigint, amount: bigint): string {
  if (amount <= 0n) return '0.000%'
  const basis = (fee * 10_000_000n) / amount // thousandths of a bp
  const pct = Number(basis) / 100_000
  return `${pct.toFixed(pct < 0.01 ? 4 : 3)}%`
}
