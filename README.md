# Arc Fee Radar

Compare crosschain transfer fees for CCTP Standard, CCTP Fast and Gateway on any route, and see how much Arc saves on the same transfer. Fees come live from Circle's public fee APIs, based on [developers.circle.com/crosschain-fees](https://developers.circle.com/crosschain-fees).

Built with [Arc Studio](https://studio.arc.io)

## Features

- Live USDC fees for CCTP Standard, CCTP Fast and Gateway, with or without the Forwarding Service.
- "What Arc saves you": the same transfer to Arc versus another chain, plus a monthly savings estimate.
- Connect a wallet and save a fee comparison as a public receipt on Arc Testnet ("Save receipt onchain"), then see your receipts in the app.
- A History panel listing the routes you checked this session.
- Published EURC and cirBTC rates for supported routes (mainnet).
- Testnet by default; Mainnet is read-only fee data. The only transaction the app sends is saving a receipt on Arc Testnet.

## Tech stack

Vite, React, TypeScript, Tailwind CSS, TanStack Query, wagmi and viem. A small Solidity contract (`contracts/FeeReceiptRegistry.sol`) stores the receipts.

## Development

Prerequisites: [Bun](https://bun.sh).

```bash
bun install
bun run dev      # start the dev server
bun run check    # lint and typecheck
```

To build the contract, install Foundry and its test library first:

```bash
forge install foundry-rs/forge-std
forge build
```

### Environment variables

- `VITE_FEE_RECEIPT_REGISTRY`: address of the deployed FeeReceiptRegistry contract on Arc Testnet.
