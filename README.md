# TestRaptor x402 MCP

MCP server exposing TestRaptor's paid APIs with **per-call x402 payments** (USDC on Solana, gas sponsored): no account, no API key, no subscription. An AI agent calls the tool, pays a few cents, and receives the result.

## Tools (5)

| Tool | Endpoint | Price |
|---|---|---|
| `certs_check_now` | `POST /certs/v1/certs/check-now` | **$0.002** |
| `heartbeat_create_monitor` | `POST /heartbeat/v1/heartbeat/monitors` | **$0.003** |
| `pixeldrift_lancer_captures` | `POST /pixeldrift/api/captures/lancer` | **$0.005** |
| `bundle_check` | `POST /v1/bundle/check` | **$0.008** |
| `credit_topup` | `POST /v1/credit/topup` | flexible (min $0.008) |

## Payment modes

The server reads its configuration from the environment. **Two modes** (in priority order):

1. **Prepaid credit** — `X402_CREDIT_TOKEN`: an opaque token obtained via a top-up
   (`credit_topup` or `bundle_check`). Each call debits the credit **without** a Solana
   transaction. Ideal for high volume.
2. **Payer wallet** — `X402_PAYER_KEY_B64`: a Solana private key (64 bytes, base64) of a
   wallet **funded in USDC** (no SOL required: gas is sponsored by the facilitator).
   Each call settles its x402 transaction automatically.

With neither, the tools return the **decoded 402 challenge** (amount, `payTo` address,
network) so the agent understands what is being requested.

### Environment variables

| Variable | Role | Default |
|---|---|---|
| `X402_BASE_URL` | Paid API base URL | `https://testraptor.com` |
| `X402_NETWORK` | `mainnet` \| `devnet` | `mainnet` |
| `X402_PAYER_KEY_B64` | Payer wallet (64-byte secret key, base64) | — |
| `X402_CREDIT_TOKEN` | Prepaid credit token | — |
| `X402_TRUSTED_PAYTO` | Locks the recipient (anti-misdirection) | — |
| `X402_FACILITATOR_URL` | x402 facilitator (Dexter) | `https://x402.dexter.cash` |
| `X402_RPC_URL` | Solana RPC (blockhash fallback) | public mainnet-beta |

## Installation

### Claude Desktop

```json
{
  "mcpServers": {
    "testraptor": {
      "command": "npx",
      "args": ["-y", "testraptor-x402-mcp"],
      "env": {
        "X402_PAYER_KEY_B64": "<your base64 private key>",
        "X402_TRUSTED_PAYTO": "84uuBKFPR5rYMCrJQkW5unKUebozV1xwdY5UPxBWyFvr"
      }
    }
  }
}
```

### Cursor / other stdio clients

Add the same `command: npx`, `args: ["-y", "testraptor-x402-mcp"]` entry with your `env`.

### Local

```bash
git clone https://github.com/maximethemens-code/testraptor-x402-mcp && cd testraptor-x402-mcp && npm install
X402_PAYER_KEY_B64=... npm start   # npm start = node src/index.js
```

## Example call

```
certs_check_now { domain: "example.ca" }
→ { "ok": true, ... TLS check report ... }   ($0.002 USDC debited)
```

## Security

- `X402_PAYER_KEY_B64` is **never** sent to the server: it is only used to sign the
  transaction locally.
- `X402_TRUSTED_PAYTO` is strongly recommended: it prevents the wallet from paying an
  unexpected recipient (e.g. if `X402_BASE_URL` points to a malicious server).
- The payment wallet must be distinct from the receiving wallet (`payTo`).

## Known limitations

- `heartbeat_create_monitor` requires a signed-in TestRaptor account (SSO) on the backend:
  an anonymous agent will receive `401` **after** payment.
- Real on-chain settlement (verify/settle via Dexter) is only exercised with a wallet
  actually funded in USDC.
