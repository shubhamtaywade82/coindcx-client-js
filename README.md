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
  (`retry-after` honored, capped). Writes (POST/DELETE) are **never retried automatically**,
  so a timed-out order can't be double-submitted. Tune with `maxRetries`, `retryBaseDelayMs`,
  `retryMaxDelayMs`, `retryFactor` or `client.configureRetry(...)`.
- **Errors** — typed hierarchy: `CoinDCXError` → `CoinDCXAPIError`,
  `CoinDCXNetworkError`, `CoinDCXRateLimitError`, `CoinDCXAuthenticationError`,
  `CoinDCXValidationError`, `CoinDCXInsufficientMarginError`, `CoinDCXInvalidPairError`,
  `CoinDCXOrderError`, `CoinDCXWebSocketError`. Guards: `isRetryableError`, `isRateLimitError`,
  `isAuthenticationError`, `isInsufficientMarginError`.
- **WebSocket** — auto-reconnect with exponential backoff + jitter.

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

## License

ISC