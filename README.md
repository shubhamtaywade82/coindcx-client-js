# coindcx-sdk

TypeScript SDK for **CoinDCX** — Spot, Margin and **USD-margined Futures**, REST + Socket.IO
WebSocket, with zod-validated typed responses, a local paper-trading engine, risk ops
(position sizing, bracket orders, account snapshots) and LLM/MCP toolkits for trading agents.

Canonical CoinDCX client for the `trading-workspace` `sdk/` directory (mirrors
`sdk/binance-sdk`'s role for Binance and `sdk/dhanhq-sdk`'s role for DhanHQ).

## Install

```bash
npm install @nemesis-oss/coindcx-sdk
```

## Usage

```typescript
import { CoinDCXClient } from '@nemesis-oss/coindcx-sdk';

const client = new CoinDCXClient({
  apiKey: 'YOUR_API_KEY',     // only needed for authenticated endpoints
  apiSecret: 'YOUR_API_SECRET',
});

// Public market data (no keys needed)
const instruments = await client.futures.market.getActiveInstruments('USDT');
const candles = await client.futures.market.getCandles('B-SOL_USDT', '15m', 200);
const tickers = await client.futures.market.getTicker();
const orderbook = await client.futures.market.getOrderBook('B-BTC_USDT');

// Authenticated account
const wallet = await client.futures.account.getWallet();
const positions = await client.futures.account.getPositions();

// Trading
const order = await client.futures.trading.createOrder({
  side: 'buy',
  order_type: 'limit_order',
  base_currency: 'SOL',
  quote_currency: 'USDT',
  target_quantity: 1,
  price: 120,
  leverage: 10,
  margin_type: 'isolated',
});

// Composite ops — sizing and rounding handled for you
const sizing = await client.ops.sizing.calculatePositionSize({
  accountBalance: 10000,
  riskPercent: 2,
  entryPrice: 120,
  stopLossPrice: 115,
  leverage: 10,
});
await client.ops.bracket.placeBracketOrder({
  pair: 'B-SOL_USDT',
  side: 'buy',
  quantity: sizing.quantity,
  stopLoss: 115,
  takeProfit: 135,
});
const snapshot = await client.ops.snapshot.getAccountOverview();
```

### Paper trading

Every trading/positions call can run against an in-memory simulator instead of the
exchange — nothing is ever sent to CoinDCX:

```typescript
const paper = new CoinDCXClient({ paperMode: true, initialBalance: 10000 });
await paper.futures.trading.createOrder({
  side: 'buy', order_type: 'market_order',
  base_currency: 'SOL', quote_currency: 'USDT',
  target_quantity: 1, price: 120, leverage: 10, margin_type: 'isolated',
});
console.log(paper.paper.getAccount()); // fills at live mark, fees + slippage applied
```

### WebSocket

```typescript
await client.connectWebsocket();
client.publicStreams.on('candle', (pair, candle) => console.log(pair, candle));
client.publicStreams.on('trade', (trade) => console.log(trade));
client.subscribePrivateStreams();
client.privateStreams.on('orderUpdate', (update) => console.log(update));
client.privateStreams.on('positionUpdate', (update) => console.log(update));
client.disconnect();
```

### MCP / LLM toolkits

Zod-free JSON-Schema toolkits ready for OpenAI, Anthropic, or MCP hosts:

```typescript
import { createAllToolkits, toOpenAITool, toToolList } from '@nemesis-oss/coindcx-sdk/mcp';

const tools = createAllToolkits(client);
const openaiTools = toToolList(tools, 'openai'); // or 'anthropic' | 'mcp'
```

### MCP server (stdio)

The package also ships a ready-to-run [MCP](https://modelcontextprotocol.io) server binary that
exposes the full toolkit (`createAllToolkits`) over stdio, for hosts like Claude Desktop or Cursor.
Add it to your MCP host config:

```json
{
  "mcpServers": {
    "coindcx": {
      "command": "npx",
      "args": ["-y", "@nemesis-oss/coindcx-sdk", "mcp"],
      "env": {
        "COINDCX_API_KEY": "your_key",
        "COINDCX_API_SECRET": "your_secret",
        "COINDCX_PAPER_MODE": "true",
        "COINDCX_MAX_ORDER_QUANTITY": "10",
        "COINDCX_MAX_ORDER_NOTIONAL": "500"
      }
    }
  }
}
```

`COINDCX_API_KEY` / `COINDCX_API_SECRET` are required; `COINDCX_PAPER_MODE=true` routes order/position
tool calls through the local paper engine instead of live trading. Run it directly with
`npm run mcp` in this repo, or `coindcx-mcp` once installed globally. Tool errors are returned with
the underlying `CoinDCXError`'s `suggestedAction` appended, so an agent can self-correct (e.g. fetch
balances and resize an order after an insufficient-margin error) without human intervention.

**Guardrails for autonomous/agent use:**

- `COINDCX_MAX_ORDER_QUANTITY` / `COINDCX_MAX_ORDER_NOTIONAL` cap the size of any order the server
  will forward to the exchange (see [Order-size guardrails](#order-size-guardrails) below). If
  neither is set, the server logs a startup warning to stderr and imposes no limit — set at least
  one before pointing an autonomous agent at a live account. `account_get_safety_limits` lets the
  agent introspect the active limits at any time.
- Every order-creation tool (`futures_create_order`, `spot_create_order`,
  `futures_place_bracket_order`, `paper_place_order`) accepts a `dry_run: true` argument that
  validates the order — including the guardrails above — and returns what would be submitted,
  without placing it.
- Every tool is annotated per the [MCP tool annotations spec](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#annotations)
  (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`), so a compliant MCP host
  can gate order-creation, position-closing, leverage-change, and paper-reset calls behind
  confirmation while letting read-only calls through freely.

## Pair format

CoinDCX uses exchange-prefixed pairs: `B-BTC_USDT` (futures), `BTC_USDT` (spot market).
Helpers are provided:

```typescript
CoinDCXClient.buildPair('BTC', 'USDT');               // 'B-BTC_USDT'
CoinDCXClient.parsePair('B-SOL_USDT');                // { ecode: 'B', base: 'SOL', target: 'USDT' }
CoinDCXClient.calculateLiquidationPrice(60000, 10, 'buy'); // approximate liq price
```

## Reliability

- **Rate limiting** — per-endpoint token buckets prevent IP bans; status via `client.getRateLimitStatus()`.
- **Retries** — idempotent GETs retry on 429/5xx/network errors with exponential backoff
  (`retry-after` honored, capped). A POST/DELETE also retries **only** when it carries a
  `client_order_id` (auto-generated for every order-create call): CoinDCX rejects a reused
  `client_order_id` instead of executing it twice, so the retry either succeeds (the original
  request never reached the exchange) or surfaces a duplicate-id error — it never double-submits
  the order. Any other write path still fails fast. Tune with `maxRetries`, `retryBaseDelayMs`,
  `retryMaxDelayMs`, `retryFactor` or `client.configureRetry(...)`.
- **Order-size guardrails** — see [Order-size guardrails](#order-size-guardrails) below.
- **Errors** — typed hierarchy: `CoinDCXError` → `CoinDCXAPIError`,
  `CoinDCXNetworkError`, `CoinDCXRateLimitError`, `CoinDCXAuthenticationError`,
  `CoinDCXValidationError`, `CoinDCXInsufficientMarginError`, `CoinDCXInvalidPairError`,
  `CoinDCXOrderError`, `CoinDCXOrderLimitError`, `CoinDCXWebSocketError`. Every error carries a `suggestedAction` string
  hinting how to recover (e.g. which endpoint to call to check balance or valid pairs) — useful
  for agent/LLM callers driving the SDK autonomously. Guards: `isRetryableError`, `isRateLimitError`,
  `isAuthenticationError`, `isInsufficientMarginError`.
- **WebSocket** — auto-reconnect with exponential backoff + jitter.

### Order-size guardrails

Optional, client-side, enforced before any order-create request reaches the network:

```typescript
const client = new CoinDCXClient({
  apiKey, apiSecret,
  safetyLimits: { maxOrderQuantity: 10, maxOrderNotional: 5000 },
});
// or at any time:
client.setSafetyLimits({ maxOrderQuantity: 10 });
client.getSafetyLimits(); // introspect current limits
```

Applies to `client.spot.createOrder`, `client.margin.createOrder`, `client.futures.trading.createOrder`
(and therefore `client.ops.bracket.placeBracketOrder`, which calls it). An oversized order throws
`CoinDCXOrderLimitError` — a subclass of `CoinDCXError`, never retried — instead of ever being sent.
Unset by default (no limit); recommended for any agent/LLM-driven deployment — see the
[MCP server](#mcp-server-stdio) section above, which wires this up via
`COINDCX_MAX_ORDER_QUANTITY` / `COINDCX_MAX_ORDER_NOTIONAL`.

## Development

```bash
npm run build       # tsup: ESM + CJS + .d.ts
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # jest (nock + recorded HAR cassettes)
npm run verify      # typecheck + lint + test + build + check:types
npm run check:types # @arethetypeswrong: validates published exports
```

## Package entry points

- `@nemesis-oss/coindcx-sdk` — full SDK (REST, WS, ops, paper engine)
- `@nemesis-oss/coindcx-sdk/mcp` — toolkits + format converters only
- `coindcx-mcp` / `npx @nemesis-oss/coindcx-sdk mcp` — standalone MCP stdio server binary

## License

ISC