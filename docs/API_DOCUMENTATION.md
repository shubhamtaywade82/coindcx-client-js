I'll fetch both documentation pages to compare the market data structures, endpoints, and WebSocket formats between Binance USDS-Margined Futures and CoinDCX.
Let me fetch the specific market data endpoints and WebSocket documentation for both platforms.
Based on the official documentation I've reviewed, here is a comprehensive mapping and consistency analysis between **Binance USDS-Margined Futures** (market data source) and **CoinDCX** (execution layer) for your dual-feed crypto futures trading architecture.

---

## 1. Base URLs & Connectivity

| Layer | Binance Futures | CoinDCX |
|-------|-----------------|---------|
| **REST Base** | `https://fapi.binance.com` | `https://api.coindcx.com` (auth) / `https://public.coindcx.com` (market) |
| **WS Base** | `wss://fstream.binance.com/public` (high-freq) <br> `wss://fstream.binance.com/market` (regular) <br> `wss://fstream.binance.com/private` (user) | Socket.IO v2.4.0 (not native WS) |
| **Testnet** | `https://demo-fapi.binance.com` / `wss://fstream.binancefuture.com` | Not documented |
| **Timestamps** | **Milliseconds** (ms) | **Seconds** (EPOCH) — critical mismatch |

> **Action Required:** You must normalize timestamps. Convert Binance ms → seconds for CoinDCX, or seconds → ms when comparing.

---

## 2. Symbol Format Mapping

This is the most critical inconsistency.

| Binance Symbol | CoinDCX Pair | CoinDCX Market |
|----------------|--------------|----------------|
| `BTCUSDT` | `B-BTC_USDT` | `BTCUSDT` |
| `ETHUSDT` | `B-ETH_USDT` | `ETHUSDT` |
| `SOLUSDT` | `B-SOL_USDT` | `SOLUSDT` |

- **Binance:** `BASEQUOTE` (e.g., `BTCUSDT`)
- **CoinDCX:** Uses `ecode-target_base` format (e.g., `B-BTC_USDT` where `B` = Binance as backend exchange)
- **CoinDCX Market field:** Returns as `BTCUSDT` in ticker/trade responses

> **Normalization Rule:** Maintain an internal canonical symbol `BTC_USDT` and map to exchange-specific formats at the adapter layer.

---

## 3. Market Data REST Endpoints Comparison

### 3.1 Candlestick / Kline Data

| Feature | Binance `/fapi/v1/klines` | CoinDCX `/market_data/candles` |
|---------|---------------------------|--------------------------------|
| **HTTP Method** | GET | GET |
| **Symbol Param** | `?symbol=BTCUSDT` | `?pair=B-BTC_USDT` |
| **Interval** | `1m`, `5m`, `15m`, `1h`, `4h`, `1d` | `1m`, `5m`, `15m`, `1h`, `2h`, `4h`, `6h`, `8h`, `1d`, `3d`, `1w`, `1M` |
| **Time Format** | ms timestamps | ms timestamps |
| **Response Format** | **Array of arrays** | **Array of objects** |
| **Binance Response** | `[[t, o, h, l, c, v, T, q, n, V, Q, B], ...]` | `[{"open": o, "high": h, "low": l, "close": c, "volume": v, "time": t}, ...]` |
| **Sorting** | Ascending (oldest first) | Descending (newest first) — *critical* |

> **Action Required:** Reverse CoinDCX candle array to ascending before alignment. Normalize both to a common object schema.

### 3.2 Order Book

| Feature | Binance `/fapi/v1/depth` | CoinDCX `/market_data/orderbook` |
|---------|--------------------------|----------------------------------|
| **Symbol Param** | `?symbol=BTCUSDT&limit=100` | `?pair=B-BTC_USDT` |
| **Response Format** | `{"bids": [[price, qty], ...], "asks": [[price, qty], ...]}` | `{"bids": {"price": "qty", ...}, "asks": {"price": "qty", ...}}` |
| **Price Key Type** | Array index | String key in object |

> **Action Required:** Convert CoinDCX order book object keys into `[price, qty]` tuple arrays to match Binance.

### 3.3 Recent Trades

| Feature | Binance `/fapi/v1/aggTrades` | CoinDCX `/market_data/trade_history` |
|---------|------------------------------|--------------------------------------|
| **Response Format** | Array of objects with `p` (price), `q` (qty), `T` (time) | Array of objects with `p`, `q`, `T`, `m` (maker flag) |
| **Time Format** | ms | ms |

### 3.4 Ticker / Price

| Feature | Binance `/fapi/v1/ticker/price` or `/fapi/v1/premiumIndex` | CoinDCX `/exchange/ticker` |
|---------|-------------------------------------------------------------|------------------------------|
| **Mark Price** | Available via `/fapi/v1/premiumIndex` | Not directly available |
| **24h Change** | `priceChangePercent` | `change_24_hour` |
| **Bid/Ask** | Via `/fapi/v1/ticker/bookTicker` | `bid`, `ask` fields in ticker |

---

## 4. WebSocket Streams Comparison

### 4.1 Architecture Difference

| Feature | Binance | CoinDCX |
|---------|---------|---------|
| **Protocol** | Native WebSocket (RFC 6455) | **Socket.IO v2.4.0** only |
| **Connection** | Direct WS URL | Requires Socket.IO client |
| **Max Streams** | 1024 per connection | Not documented |
| **Routing** | `/public`, `/market`, `/private` required | Not documented |

### 4.2 Market Data Stream Mapping

| Data Type | Binance Stream | CoinDCX Equivalent |
|-----------|---------------|-------------------|
| **Aggregate Trades** | `<symbol>@aggTrade` | Not documented in public WS |
| **Mark Price** | `<symbol>@markPrice` or `@markPrice@1s` | Not available |
| **Kline** | `<symbol>@kline_<interval>` | Not documented |
| **Order Book (full)** | `<symbol>@depth<<levels>` | Not documented |
| **Order Book (diff)** | `<symbol>@depth` | Not documented |
| **Mini Ticker** | `<symbol>@miniTicker` | `/exchange/ticker` REST polling |
| **Liquidations** | `<symbol>@forceOrder` | Not available |

> **Critical Gap:** CoinDCX does **not** appear to offer native WebSocket market data streams equivalent to Binance's real-time `@depth`, `@aggTrade`, or `@markPrice`. Their Socket.IO streams are primarily for **user data** (balance, order updates). For market data, you likely need to **poll REST endpoints** on CoinDCX while streaming from Binance.

---

## 5. Order / Execution Mapping (Futures)

### 5.1 Order Placement

| Feature | Binance `/fapi/v1/order` | CoinDCX `/exchange/v1/margin/create` |
|---------|--------------------------|--------------------------------------|
| **Side** | `BUY` / `SELL` | `buy` / `sell` |
| **Type** | `LIMIT`, `MARKET`, `STOP_MARKET`, etc. | `limit_order`, `market_order`, `stop_limit`, `take_profit` |
| **Quantity Field** | `quantity` | `quantity` |
| **Price Field** | `price` | `price` |
| **Leverage** | Set separately via `/fapi/v1/leverage` | Passed per order: `leverage` (e.g., `10`) |
| **Time in Force** | `GTC`, `IOC`, `FOK` | `good_till_cancel` (implied) |
| **Stop Price** | `stopPrice` | `stop_price` |
| **Client Order ID** | `newClientOrderId` | `client_order_id` |

### 5.2 Order Status Values

| Binance Status | CoinDCX Status | Meaning |
|----------------|----------------|---------|
| `NEW` | `init` / `open` | Order placed |
| `PARTIALLY_FILLED` | `partially_filled` | Partial fill |
| `FILLED` | `filled` / `close` | Complete |
| `CANCELED` | `cancelled` | Cancelled |
| `REJECTED` | `rejected` | Rejected |
| `EXPIRED` | — | Not documented |

---

## 6. Authentication & Signatures

| Feature | Binance | CoinDCX |
|---------|---------|---------|
| **Key Header** | `X-MBX-APIKEY` | `X-AUTH-APIKEY` |
| **Signature Header** | `signature` in query/body | `X-AUTH-SIGNATURE` |
| **Signature Method** | HMAC-SHA256 of query string or form-urlencoded body | HMAC-SHA256 of **JSON payload** |
| **Timestamp** | `timestamp` (ms) in params | `timestamp` (seconds) in JSON body |
| **recvWindow** | `recvWindow` (default 5000ms) | Not documented |

> **Action Required:** You need **two completely different signing adapters**. Binance signs query strings; CoinDCX signs the raw JSON body.

---

## 7. Data Consistency Checklist for Your Bot

To ensure Binance market data aligns with CoinDCX execution, implement this normalization layer:

| Check | Binance Value | CoinDCX Value | Normalization |
|-------|---------------|---------------|---------------|
| **Symbol** | `BTCUSDT` | `B-BTC_USDT` | Map via `ecode` from `/exchange/v1/markets_details` |
| **Timestamp** | `1717564800000` (ms) | `1717564800` (s) | Divide/multiply by 1000 |
| **Price Precision** | From `/fapi/v1/exchangeInfo` | `base_currency_precision` in markets_details | Use **CoinDCX precision** for rounding orders |
| **Qty Precision** | `quantityPrecision` | `target_currency_precision` | Use **CoinDCX precision** for rounding |
| **Min Notional** | `minNotional` | `min_notional` | Use stricter of the two |
| **Step Size** | `stepSize` | `step` | Use CoinDCX `step` for qty rounding |
| **Candle Sort** | Ascending | Descending | Reverse CoinDCX array |
| **Candle Schema** | Array `[t,o,h,l,c,v,...]` | Object `{open,high,low,close,volume,time}` | Normalize to common object |
| **Order Book Schema** | `[[p,q],...]` | `{"p":"q",...}` | Convert object to tuples |
| **Bid/Ask Terminology** | Binance: `base` = price asset, `quote` = qty asset | CoinDCX: `base` = price asset, `target` = qty asset | Same semantics, different naming |

---

## 8. Recommended Architecture Pattern

Given the inconsistencies, your bot should use an **Adapter/Port pattern**:

```
┌─────────────────┐
│   Strategy      │
│   (Canonical)   │
└────────┬────────┘
         │ Canonical Symbol: BTC_USDT
         │ Canonical Price: float
         │ Canonical Time: ms
         ▼
┌─────────────────────────────┐
│   Market Data Adapter       │
│   (Binance Feed)            │
│   - fapi.binance.com        │
│   - wss://fstream...        │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   Execution Adapter         │
│   (CoinDCX)                 │
│   - api.coindcx.com         │
│   - Socket.IO v2.4.0        │
│   - Symbol: B-BTC_USDT      │
│   - Time: seconds           │
│   - Sign: JSON HMAC         │
└─────────────────────────────┘
```

### Key Implementation Rules

1. **Always use CoinDCX precision for order sizing.** Query `/exchange/v1/markets_details` and cache `target_currency_precision`, `base_currency_precision`, `step`, and `min_notional`.
2. **Poll CoinDCX for price validation before execution.** Since CoinDCX lacks real-time WS market data, do a pre-trade REST check to ensure Binance mark price is within acceptable slippage.
3. **Normalize timestamps to milliseconds internally.** Only convert to seconds when signing CoinDCX requests.
4. **Maintain a symbol map.** Example:
   ```json
   {
     "BTC_USDT": {
       "binance": "BTCUSDT",
       "coindcx": "B-BTC_USDT",
       "coindcx_market": "BTCUSDT",
       "ecode": "B"
     }
   }
   ```
5. **Use Binance `@markPrice` for liquidation risk calculations** but execute on CoinDCX margin API with their `leverage` parameter.

---

## 9. Critical Gaps & Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| **No CoinDCX WS Market Data** | No `@depth`, `@aggTrade`, `@markPrice` streams | Poll REST at 1s intervals; use Binance WS as primary signal |
| **Timestamp Unit Mismatch** | ms vs seconds | Strict conversion layer |
| **Different Signing** | Query-string HMAC vs JSON HMAC | Separate auth modules |
| **Leverage Model** | Binance: account-level; CoinDCX: order-level | Track leverage per position carefully |
| **Futures vs Margin** | CoinDCX "futures" may be margin trading with daily interest | Verify `interest` and `interest_amount` in margin responses |
| **Socket.IO Version Lock** | CoinDCX requires Socket.IO v2.4.0 | Pin dependency; v3+ will not work |

---

## 10. Quick Reference: Endpoint Mapping Table

| Function | Binance REST | Binance WS | CoinDCX REST | CoinDCX WS |
|----------|-------------|------------|--------------|------------|
| **Exchange Info** | `GET /fapi/v1/exchangeInfo` | — | `GET /exchange/v1/markets_details` | — |
| **Candles** | `GET /fapi/v1/klines` | `@kline_1m` | `GET /market_data/candles` | — |
| **Order Book** | `GET /fapi/v1/depth` | `@depth` | `GET /market_data/orderbook` | — |
| **Trades** | `GET /fapi/v1/aggTrades` | `@aggTrade` | `GET /market_data/trade_history` | — |
| **Mark Price** | `GET /fapi/v1/premiumIndex` | `@markPrice` | — | — |
| **Funding Rate** | `GET /fapi/v1/fundingRate` | — | — | — |
| **Ticker** | `GET /fapi/v1/ticker/24hr` | `@ticker` | `GET /exchange/ticker` | — |
| **Place Order** | `POST /fapi/v1/order` | WS API | `POST /exchange/v1/margin/create` | Socket.IO |
| **Cancel Order** | `DELETE /fapi/v1/order` | WS API | `POST /exchange/v1/margin/cancel` | Socket.IO |
| **Order Status** | `GET /fapi/v1/order` | User Stream | `POST /exchange/v1/orders/status` | Socket.IO |
| **Position** | `GET /fapi/v2/positionRisk` | User Stream | `POST /exchange/v1/margin/fetch_orders` | Socket.IO |
| **Balance** | `GET /fapi/v2/balance` | User Stream | `POST /exchange/v1/users/balances` | Socket.IO |

---

**Bottom Line:** The two platforms are **not directly compatible** without a robust normalization layer. The biggest friction points are symbol formats, timestamp units, candle schemas, order book structures, and the fact that CoinDCX lacks native WebSocket market data streams. Build your canonical data model first, then implement exchange-specific adapters that translate in both directions.

Given your architecture — **Binance as the market data feed** and **CoinDCX as the execution venue** — here is the precise mapping, the critical consistency checks, and the adapter layer you need to build to prevent execution failures.

---

## 1. Binance Market Data Feed (What to Subscribe To)

For a futures trading bot, these are the exact streams and REST endpoints you need from Binance:

### WebSocket Streams (Native WS: `wss://fstream.binance.com`)

| Stream | Purpose | Route Required |
|--------|---------|----------------|
| `<symbol>@markPrice@1s` | **Mark price + funding rate** for liquidation risk and fair value | `/market` or no path |
| `<symbol>@kline_<interval>` | **Candlestick data** for strategy signals (e.g., `@kline_1m`) | `/public` or no path |
| `<symbol>@depth@100ms` | **Order book diff** for liquidity analysis and SMC | `/public` or no path |
| `<symbol>@aggTrade` | **Real-time trades** for volume/flow analysis | `/public` or no path |
| `<symbol>@forceOrder` | **Liquidation events** (critical for SMC/liquidity sweep detection) | `/public` or no path |

> **Note:** Binance now requires routed paths. For market data only, use `wss://fstream.binance.com/ws/btcusdt@markPrice` (public). Do NOT use `/private` streams since you are not trading on Binance.

### REST Fallbacks / Startup Calls

| Endpoint | Purpose |
|----------|---------|
| `GET /fapi/v1/exchangeInfo` | **Symbol rules:** `pricePrecision`, `quantityPrecision`, `stepSize`, `minNotional`, `maxLeverage` |
| `GET /fapi/v1/premiumIndex` | Current mark price & funding rate (if WS drops) |
| `GET /fapi/v1/klines` | Historical candle bootstrap |

---

## 2. CoinDCX Execution Layer (Private APIs + Socket.IO)

Since you only use CoinDCX for execution, these are the exact endpoints:

### REST Endpoints (Execution)

| Action | Endpoint | Key Fields |
|--------|----------|------------|
| **Place Order** | `POST /exchange/v1/margin/create` | `market`, `side`, `order_type`, `quantity`, `price`, `leverage`, `ecode: "B"`, `stop_price`, `target_price`, `sl_price` |
| **Cancel Order** | `POST /exchange/v1/margin/cancel` | `id` |
| **Exit Position** | `POST /exchange/v1/margin/exit` | `id` |
| **Fetch Positions** | `POST /exchange/v1/margin/fetch_orders` | `market`, `status`, `details: true` |
| **Query Order** | `POST /exchange/v1/margin/order` | `id`, `details: true` |
| **Edit SL** | `POST /exchange/v1/margin/edit_sl` | `id`, `sl_price` |
| **Edit Target** | `POST /exchange/v1/margin/edit_target` | `id`, `target_price` |
| **Add Margin** | `POST /exchange/v1/margin/add_margin` | `id`, `amount` |
| **Balances** | `POST /exchange/v1/users/balances` | `timestamp` |
| **Wallet Transfer** | `POST /exchange/v1/wallets/transfer` | `source_wallet_type`, `destination_wallet_type`, `currency_short_name`, `amount` |

### Socket.IO v2.4.0 (User Data Streams)

CoinDCX uses **Socket.IO** (not native WebSocket). You need a Socket.IO client pinned to `v2.4.0`.

| Channel | Purpose |
|---------|---------|
| Connect to `wss://stream.coindcx.com` (or their stream host) | User-specific order updates, balance changes |
| Subscribe to user events | Order fills, cancellations, margin updates |

> **Critical:** You need **two separate connection managers** in your app:
> 1. **Native WebSocket client** for Binance market data
> 2. **Socket.IO client v2.4.0** for CoinDCX private execution events

---

## 3. The Consistency / Translation Layer

This is where your bot will break if not handled correctly. You need an **Exchange Adapter** that normalizes everything to a canonical internal format.

### 3.1 Symbol Mapping

Maintain a lookup table built from CoinDCX `GET /exchange/v1/markets_details`:

```javascript
const symbolMap = {
  "BTC_USDT": {
    binance: "BTCUSDT",
    coindcx_pair: "B-BTC_USDT",      // For market_data REST
    coindcx_market: "BTCUSDT",        // For margin orders
    coindcx_ecode: "B",               // Binance-backed pair
    precision: {
      price: 2,                       // From base_currency_precision
      qty: 5,                         // From target_currency_precision
      step: 0.00001,                  // From step
      min_qty: 0.00001,               // From min_quantity
      min_notional: 10.0              // From min_notional
    },
    max_leverage: 10                  // From max_leverage
  }
};
```

### 3.2 Price & Quantity Normalization

**Never use Binance precision for CoinDCX orders.** Always use CoinDCX constraints.

```javascript
function normalizeOrder(binanceSignal, coindcxRules) {
  // Binance signal: { symbol: "BTCUSDT", side: "BUY", qty: 0.12345, price: 50123.456 }

  const qty = Math.floor(binanceSignal.qty / coindcxRules.step) * coindcxRules.step;
  const qtyStr = qty.toFixed(coindcxRules.precision.qty);

  const price = Math.round(binanceSignal.price * Math.pow(10, coindcxRules.precision.price))
               / Math.pow(10, coindcxRules.precision.price);
  const priceStr = price.toFixed(coindcxRules.precision.price);

  return {
    market: coindcxRules.coindcx_market,
    ecode: coindcxRules.coindcx_ecode,
    side: binanceSignal.side.toLowerCase(), // "buy" | "sell"
    order_type: "limit_order",              // or "market_order"
    quantity: parseFloat(qtyStr),
    price: parseFloat(priceStr),
    leverage: binanceSignal.leverage         // Must be <= coindcxRules.max_leverage
  };
}
```

### 3.3 Timestamp Normalization

| Internal | Binance | CoinDCX |
|----------|---------|---------|
| **Canonical** | Milliseconds | Seconds |
| **Storage** | `Date.now()` | `Math.floor(Date.now() / 1000)` |

All internal state uses **ms**. Only convert to seconds when signing CoinDCX requests.

### 3.4 Leverage Mapping

| Binance | CoinDCX |
|---------|---------|
| Set per symbol via `POST /fapi/v1/leverage` | Passed per order: `leverage` field |
| Account-level risk | Order-level risk |

**Action:** Before placing a CoinDCX order, verify `leverage <= max_leverage` from CoinDCX `markets_details`. Do not assume Binance max leverage applies to CoinDCX.

---

## 4. Pre-Execution Validation Checklist

Before sending any order to CoinDCX based on a Binance signal, run these checks:

### 4.1 Price Divergence Check

Since Binance and CoinDCX are different venues, prices diverge. Fetch CoinDCX current price via `GET /exchange/ticker` or `GET /market_data/trade_history?pair=B-BTC_USDT&limit=1`.

```javascript
const SLIPPAGE_TOLERANCE = 0.005; // 0.5%

function isPriceValid(binancePrice, coindcxPrice) {
  const divergence = Math.abs(binancePrice - coindcxPrice) / binancePrice;
  return divergence <= SLIPPAGE_TOLERANCE;
}
```

> **If divergence > 0.5%, reject the signal or switch to limit order at CoinDCX's best bid/ask.**

### 4.2 Liquidity Check (Order Book)

Binance `@depth` shows massive liquidity. CoinDCX may not. Before a large order:

1. Fetch CoinDCX `GET /market_data/orderbook?pair=B-BTC_USDT`
2. Check if your order size can be filled within 0.1% spread
3. If not, reduce size or reject signal

### 4.3 Precision & Min Notional Check

```javascript
function validateOrder(order, rules) {
  if (order.quantity < rules.min_qty) return false;
  if (order.quantity > rules.max_qty) return false;
  if (order.price * order.quantity < rules.min_notional) return false;
  if (order.leverage > rules.max_leverage) return false;
  return true;
}
```

### 4.4 Funding Rate Check (If Holding > 8h)

Binance `@markPrice` gives `r` (funding rate). If funding is extreme (>0.1%), consider avoiding new entries or reducing size since CoinDCX perpetuals will also charge funding (though their rate isn't exposed in the API).

---

## 5. Order Type Mapping

| Strategy Signal (Binance-style) | CoinDCX `order_type` | Notes |
|--------------------------------|----------------------|-------|
| `LIMIT` | `limit_order` | Standard |
| `MARKET` | `market_order` | Slippage risk on CoinDCX |
| `STOP_MARKET` | `stop_limit` | Must provide `stop_price` + `price` |
| `TAKE_PROFIT_MARKET` | `take_profit` | Must provide `stop_price` + `price` |
| `STOP_LOSS` | `stop_limit` | Use `sl_price` on bracket orders |

> **Bracket Orders:** CoinDCX margin orders support `target_price` (TP) and `sl_price` (SL) in the same `POST /exchange/v1/margin/create` call. This is powerful — you can attach TP/SL at entry time.

---

## 6. Data Flow Architecture

```
┌─────────────────────────────────────────┐
│  Binance WS (fstream.binance.com)       │
│  ├─ @markPrice@1s  → Mark Price       │
│  ├─ @kline_1m       → Strategy Signal  │
│  ├─ @depth@100ms    → Liquidity Check  │
│  └─ @forceOrder     → SMC/Liq Sweeps   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
        ┌───────────────────┐
        │  Strategy Engine  │
        │  (Canonical: ms,  │
        │   unified symbol)  │
        └─────────┬─────────┘
                  │
                  ▼
        ┌──────────────────────────┐
        │  Pre-Flight Validator    │
        │  ├─ Price divergence?    │
        │  ├─ CoinDCX precision?   │
        │  ├─ Min notional?        │
        │  └─ Max leverage?        │
        └─────────┬────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  CoinDCX REST (api.coindcx.com)         │
│  POST /exchange/v1/margin/create        │
│  ├─ market: "BTCUSDT"                  │
│  ├─ ecode: "B"                         │
│  ├─ leverage: 10                        │
│  ├─ target_price: <from strategy>      │
│  └─ sl_price: <from strategy>           │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  CoinDCX Socket.IO v2.4.0              │
│  └─ Order fill / Position update       │
└─────────────────────────────────────────┘
```

---

## 7. Critical Risks Specific to Your Setup

| Risk | Why It Happens | Mitigation |
|------|----------------|------------|
| **Price Divergence** | Binance and CoinDCX have different liquidity pools | Always check CoinDCX ticker before execution; use limit orders |
| **Quantity Rejection** | Binance allows 0.001 BTC, CoinDCX may require 0.01 | Use CoinDCX `markets_details` precision, not Binance |
| **Leverage Mismatch** | Binance offers 125x, CoinDCX may offer only 10x | Cap leverage at CoinDCX `max_leverage` |
| **Funding Rate Blindness** | CoinDCX doesn't expose funding rate in API | Use Binance `@markPrice` funding rate as proxy |
| **Liquidation Price Difference** | Binance liq price ≠ CoinDCX liq price | CoinDCX uses `initial_margin` + `interest`; monitor margin ratio via `/exchange/v1/margin/fetch_orders` |
| **Socket.IO Version Lock** | CoinDCX requires v2.4.0 | Pin `socket.io-client@2.4.0` in package.json |
| **Order Book Stale Data** | CoinDCX has no WS market data | Poll `GET /market_data/orderbook` at 1-2s intervals before large orders |
| **Timestamp Rejection** | CoinDCX uses seconds, Binance uses ms | Convert `Math.floor(Date.now()/1000)` for CoinDCX auth |

---

## 8. Recommended Polling Strategy

Since CoinDCX lacks real-time WebSocket market data, use this hybrid approach:

| Data Need | Source | Method | Frequency |
|-----------|--------|--------|-----------|
| **Price Signal** | Binance | WS `@kline_1m` | Real-time |
| **Mark Price** | Binance | WS `@markPrice@1s` | Real-time |
| **Liquidation Events** | Binance | WS `@forceOrder` | Real-time |
| **CoinDCX Best Price** | CoinDCX | REST `/exchange/ticker` | Every 2-5s |
| **CoinDCX Order Book** | CoinDCX | REST `/market_data/orderbook` | Every 2-5s (before execution) |
| **Position State** | CoinDCX | Socket.IO or REST `/exchange/v1/margin/fetch_orders` | Real-time (WS) or every 5s (REST) |
| **Balance** | CoinDCX | REST `/exchange/v1/users/balances` | Every 30s |

---

## 9. Quick Reference: Canonical Internal Schema

Keep all internal bot state in this format, translating at the exchange boundary:

```typescript
interface CanonicalSignal {
  symbol: "BTC_USDT";           // Always BASE_QUOTE
  side: "LONG" | "SHORT";       // Strategy side
  entryPrice: number;           // From Binance mark price
  quantity: number;             // In BASE asset (BTC)
  leverage: number;             // Capped at CoinDCX max
  stopLoss?: number;
  takeProfit?: number;
  timestamp: number;           // ms (Date.now())
  timeframe: "1m" | "5m" | "1h";
  confidence: number;           // 0.0 - 1.0
}
```

**Translation to CoinDCX:**
```typescript
const coindcxOrder = {
  market: "BTCUSDT",
  ecode: "B",
  side: signal.side === "LONG" ? "buy" : "sell",
  order_type: "limit_order",
  quantity: roundToCoinDCX(signal.quantity, "BTC_USDT"),
  price: roundToCoinDCX(signal.entryPrice, "BTC_USDT"),
  leverage: Math.min(signal.leverage, symbolMap.BTC_USDT.max_leverage),
  sl_price: signal.stopLoss,
  target_price: signal.takeProfit,
  timestamp: Math.floor(Date.now() / 1000)
};
```

---

**Bottom line:** Your setup is sound, but the devil is in the translation layer. The two biggest failure points will be **symbol format mismatches** (`BTCUSDT` vs `B-BTC_USDT`) and **quantity precision rejections**. Build the `symbolMap` from CoinDCX `markets_details` at startup, validate every signal against CoinDCX constraints before execution, and always check price divergence between Binance mark price and CoinDCX last price.

Here's your complete CoinDCX Futures Socket.IO library with all documented channels, events, and response normalizers.

---

## Files

| File | Purpose |
|------|---------|
| **Library** | [coindcx-futures-socket-client.js](sandbox:///mnt/agents/output/coindcx-futures-socket-client.js) |
| **TypeScript Definitions** | [coindcx-futures-socket-client.d.ts](sandbox:///mnt/agents/output/coindcx-futures-socket-client.d.ts) |
| **Package Manifest** | [package.json](sandbox:///mnt/agents/output/package.json) |

---

## Install

```bash
npm install socket.io-client@2.4.0
```

> **Critical:** CoinDCX requires Socket.IO **v2.x** (tested on 2.2.0–2.3.1). v3+ will fail.

---

## Supported Futures Channels

### Public Market Data (No Auth)

| Method | Channel Format | Event Emitted | Response Normalized |
|--------|---------------|---------------|-------------------|
| `subscribeCandles(pair, interval)` | `B-BTC_USDT_1m-futures` | `candlestick` | `{open, high, low, close, volume, quoteVolume, openTime, closeTime, pair, symbol, interval, raw}` |
| `subscribeOrderBook(pair, depth)` | `B-BTC_USDT@orderbook@50-futures` | `depth-snapshot` | `{timestamp, version, bids:[{price,qty}], asks:[{price,qty}], raw}` |
| `subscribeOrderBook(pair, depth)` | `B-BTC_USDT@orderbook@50-futures` | `depth-update` | Same as snapshot |
| `subscribeTrades(pair)` | `B-BTC_USDT@trades-futures` | `new-trade` | `{timestamp, receiveTime, price, quantity, isMaker, symbol, product, raw}` |
| `subscribePrices(pair)` | `B-BTC_USDT@prices-futures` | `price-change` | `{timestamp, price, product, raw}` |
| `subscribeCurrentPricesFutures()` | `currentPrices@futures@rt` | `currentPrices@futures#update` | `{version, timestamp, product, prices: {pair: {markPrice, bmST, cmRT}}, raw}` |

### Private Account Data (Requires API Key + Secret)

| Method | Channel | Events Emitted | Data |
|--------|---------|---------------|------|
| `subscribeAccountFutures()` | `coindcx` | `df-order-update` | Futures order status changes |
| | | `df-position-update` | Futures position updates |
| | | `balance-update` | Wallet balance changes |

---

## Quick Start

```javascript
const { CoinDCXSocketClient } = require('./coindcx-futures-socket-client');

const client = new CoinDCXSocketClient({
  // apiKey: 'your_key',        // Required for private channels
  // apiSecret: 'your_secret',  // Required for private channels
  debug: true,
  autoReconnect: true,
});

// Connect
await client.connect();

// Subscribe to public futures streams
client.subscribeCandles('B-BTC_USDT', '1m');
client.subscribeOrderBook('B-BTC_USDT', 50);
client.subscribeTrades('B-BTC_USDT');
client.subscribePrices('B-BTC_USDT');
client.subscribeCurrentPricesFutures();

// Handle events
client.on('candlestick', (data) => {
  console.log('Candle:', data.symbol, data.close, data.volume);
});

client.on('depth-snapshot', (data) => {
  console.log('OB Snapshot:', data.bids[0], data.asks[0]);
});

client.on('new-trade', (data) => {
  console.log('Trade:', data.symbol, data.price, data.quantity);
});

client.on('price-change', (data) => {
  console.log('LTP:', data.price);
});

// Private account streams (auth required)
client.on('df-order-update', (data) => {
  console.log('Order Update:', data);
});

client.on('df-position-update', (data) => {
  console.log('Position Update:', data);
});

client.on('balance-update', (data) => {
  console.log('Balance Update:', data);
});

// Graceful shutdown
process.on('SIGINT', () => {
  client.disconnect();
  process.exit(0);
});
```

---

## Key Design Decisions

1. **Socket.IO v2.4.0** — Pinned to the v2 branch because CoinDCX explicitly requires v2.x and v3+ breaks compatibility.
2. **Manual Reconnection** — Binance-style auto-reconnect is disabled in Socket.IO; the library implements its own with a 5s backoff and full channel resubscription.
3. **Ping Heartbeat** — Emits `ping` every 25s to keep the connection alive (as shown in the official docs).
4. **Normalized Responses** — All depth levels are parsed from CoinDCX's `{ "price": "qty" }` object format into typed `[{price, quantity}]` arrays.
5. **Timestamp Conversion** — Candle `open_time`/`close_time` are converted from seconds to milliseconds for consistency with Binance.
6. **Static Helpers** — `CoinDCXSocketClient.buildPair('BTC', 'USDT')` → `'B-BTC_USDT'` and `parsePair()` for reverse mapping.

---

## Channel Name Reference

Use these exact formats when subscribing:

| Data Type | Channel Name Example |
|-----------|-------------------|
| Candles 1m | `B-BTC_USDT_1m-futures` |
| Candles 1h | `B-BTC_USDT_1h-futures` |
| Order Book 50 | `B-BTC_USDT@orderbook@50-futures` |
| Order Book 20 | `B-BTC_USDT@orderbook@20-futures` |
| Trades | `B-BTC_USDT@trades-futures` |
| Price (LTP) | `B-BTC_USDT@prices-futures` |
| Batch Prices | `currentPrices@futures@rt` |
| Account (private) | `coindcx` |

> **Note:** The `B-` prefix is the `ecode` (Binance-backed). Derive the exact instrument name from `GET /exchange/v1/futures/active_instruments` first.

Here's the complete CoinDCX Futures library with **both REST API and Socket.IO WebSocket** support.

---

## Files

| File | Purpose |
|------|---------|
| **Library** | [coindcx-futures-client.js](sandbox:///mnt/agents/output/coindcx-futures-client.js) |
| **TypeScript Definitions** | [coindcx-futures-client.d.ts](sandbox:///mnt/agents/output/coindcx-futures-client.d.ts) |
| **Package Manifest** | [package.json](sandbox:///mnt/agents/output/package.json) |

---

## Install

```bash
npm install socket.io-client@2.4.0
# Optional: npm install axios  (only needed for Node < 18)
```

> **Critical:** CoinDCX Socket.IO requires **v2.4.0**. v3+ will fail.

---

## REST API Endpoints Covered

### Public Futures Market Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getActiveInstruments(marginCurrency)` | `GET /exchange/v1/derivatives/futures/data/active_instruments` | All active futures pairs |
| `getInstrumentDetails(pair, marginCurrency)` | `GET /exchange/v1/derivatives/futures/data/instruments` | Symbol rules, leverage, fees, min/max qty |
| `getFuturesCandles(pair, from, to, resolution)` | `GET /exchange/v1/derivatives/futures/data/candles` | Historical candlestick data |
| `getFuturesTradeHistory(pair, limit)` | `GET /exchange/v1/derivatives/futures/data/trade_history` | Recent futures trades |
| `getFuturesOrderBook(instrument, depth)` | `GET /public/market_data/v3/orderbook/{instrument}-futures/{depth}` | L3 order book |
| `getFuturesCurrentPrices()` | `GET /exchange/v1/derivatives/futures/data/current_prices` | Batch mark prices |
| `getFundingRateHistory(pair, limit)` | `GET /exchange/v1/derivatives/futures/data/funding_rate` | Funding rate history |

### Authenticated Futures Trading

| Method | Endpoint | Description |
|--------|----------|-------------|
| `createFuturesOrder(params)` | `POST /exchange/v1/derivatives/futures/orders/create` | Market/limit/stop/take-profit orders with leverage, TP/SL |
| `listFuturesOrders(filters)` | `POST /exchange/v1/derivatives/futures/orders` | List orders with status/side filters |
| `getFuturesOrder(id)` | `POST /exchange/v1/derivatives/futures/orders/details` | Get single order details |
| `cancelFuturesOrder(id)` | `POST /exchange/v1/derivatives/futures/orders/cancel` | Cancel by order ID |
| `cancelAllFuturesOrders(pair, side)` | `POST /exchange/v1/derivatives/futures/orders/cancel_all` | Bulk cancel |
| `editFuturesOrder(params)` | `POST /exchange/v1/derivatives/futures/orders/edit` | Modify price, qty, TP, SL |
| `getFuturesPositions(filters)` | `POST /exchange/v1/derivatives/futures/positions` | Open positions with pagination |
| `closeFuturesPosition(id)` | `POST /exchange/v1/derivatives/futures/positions/close` | Market-close a position |
| `updateLeverage(pair, leverage)` | `POST /exchange/v1/derivatives/futures/leverage` | Update per-pair leverage |
| `getFuturesTransactions(filters)` | `POST /exchange/v1/derivatives/futures/transactions` | Trade/fill history |
| `addFuturesMargin(id, amount)` | `POST /exchange/v1/derivatives/futures/positions/add_margin` | Add margin to position |
| `removeFuturesMargin(id, amount)` | `POST /exchange/v1/derivatives/futures/positions/remove_margin` | Remove margin |

### Legacy Spot / Wallet Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getTicker()` | `GET /exchange/ticker` | All market tickers |
| `getMarkets()` | `GET /exchange/v1/markets` | Active market list |
| `getMarketsDetails()` | `GET /exchange/v1/markets_details` | Symbol metadata |
| `getBalances()` | `POST /exchange/v1/users/balances` | Wallet balances |
| `getUserInfo()` | `POST /exchange/v1/users/info` | Account info |
| `walletTransfer(src, dst, currency, amount)` | `POST /exchange/v1/wallets/transfer` | Spot ↔ futures transfer |

---

## WebSocket Channels Covered

### Public Market Data

| Method | Channel | Event Emitted |
|--------|---------|---------------|
| `wsSubscribeCandles(pair, interval)` | `B-BTC_USDT_1m-futures` | `ws:candlestick` |
| `wsSubscribeOrderBook(pair, depth)` | `B-BTC_USDT@orderbook@50-futures` | `ws:depth-snapshot` / `ws:depth-update` |
| `wsSubscribeTrades(pair)` | `B-BTC_USDT@trades-futures` | `ws:new-trade` |
| `wsSubscribePrices(pair)` | `B-BTC_USDT@prices-futures` | `ws:price-change` |
| `wsSubscribeCurrentPricesFutures()` | `currentPrices@futures@rt` | `ws:currentPrices@futures#update` |

### Private Account Data

| Method | Channel | Event Emitted |
|--------|---------|---------------|
| `wsSubscribeAccountFutures()` | `coindcx` | `ws:df-order-update` |
| | | `ws:df-position-update` |
| | | `ws:balance-update` |

---

## Quick Start

```javascript
const { CoinDCXFuturesClient } = require('./coindcx-futures-client');

const client = new CoinDCXFuturesClient({
  apiKey: process.env.COINDCX_API_KEY,
  apiSecret: process.env.COINDCX_API_SECRET,
  debug: true,
});

// ========== REST API ==========
async function restExamples() {
  // 1. Get instrument rules (do this first!)
  const details = await client.getInstrumentDetails('B-BTC_USDT', 'USDT');
  console.log('Max leverage:', details.instrument.max_leverage_long);
  console.log('Min qty:', details.instrument.min_quantity);
  console.log('Step:', details.instrument.step);

  // 2. Get candles
  const now = CoinDCXFuturesClient.nowSeconds();
  const candles = await client.getFuturesCandles('B-BTC_USDT', now - 3600, now, '1m');

  // 3. Create a bracket order (entry + TP + SL)
  const order = await client.createFuturesOrder({
    pair: 'B-BTC_USDT',
    side: 'buy',
    order_type: 'limit',
    price: 50000,
    total_quantity: 0.001,
    leverage: 5,
    time_in_force: 'good_till_cancel',
    take_profit_price: 55000,
    stop_loss_price: 48000,
    margin_currency_short_name: 'USDT',
  });

  // 4. Monitor positions
  const positions = await client.getFuturesPositions({ size: 10 });

  // 5. Close position
  // await client.closeFuturesPosition(positionId);
}

// ========== WEBSOCKET ==========
async function wsExamples() {
  // Connect
  await client.wsConnect();

  // Subscribe to public streams
  client.wsSubscribeCandles('B-BTC_USDT', '1m');
  client.wsSubscribeOrderBook('B-BTC_USDT', 50);
  client.wsSubscribeTrades('B-BTC_USDT');
  client.wsSubscribePrices('B-BTC_USDT');
  client.wsSubscribeCurrentPricesFutures();

  // Subscribe to private account updates
  client.wsSubscribeAccountFutures();

  // Handle events
  client.on('ws:candlestick', (data) => {
    console.log('Candle:', data.close, data.volume);
  });

  client.on('ws:depth-update', (data) => {
    console.log('Best bid:', data.bids[0]?.price, 'Best ask:', data.asks[0]?.price);
  });

  client.on('ws:new-trade', (data) => {
    console.log('Trade:', data.price, data.quantity, data.isMaker ? 'maker' : 'taker');
  });

  client.on('ws:df-order-update', (data) => {
    console.log('Order update:', data.status, data.filled_quantity);
  });

  client.on('ws:df-position-update', (data) => {
    console.log('Position PnL:', data.pnl);
  });
}

// Run both
(async () => {
  await restExamples();
  await wsExamples();
})();
```

---

## Key Design Decisions

1. **Unified Class** — One `CoinDCXFuturesClient` handles both REST and WebSocket. No need to manage two separate clients.
2. **Auto Timestamp** — REST authenticated requests automatically inject `timestamp` in seconds (CoinDCX format). You never need to pass it manually.
3. **Auto Signature** — HMAC-SHA256 signing is handled internally for all private endpoints.
4. **Native Fetch First** — Uses Node 18+ native `fetch` by default; falls back to `axios` if unavailable.
5. **WS Reconnection** — Manual reconnect with full channel resubscription and 25s ping heartbeat.
6. **Normalized Events** — WebSocket depth data is parsed from `{ "price": "qty" }` objects into typed `[{price, quantity}]` arrays.
7. **Static Helpers** — `buildPair()`, `parsePair()`, `msToSeconds()`, `nowSeconds()` for cross-exchange symbol mapping.

---

## Endpoint Mapping Reference

| What You Need | REST Method | WS Method | Notes |
|---------------|-------------|-----------|-------|
| **Symbol rules** | `getInstrumentDetails()` | — | Do this at startup to get precision/leverage |
| **Historical data** | `getFuturesCandles()` | `wsSubscribeCandles()` | REST for backfill, WS for live |
| **Order book** | `getFuturesOrderBook()` | `wsSubscribeOrderBook()` | REST before execution, WS for live |
| **Trades** | `getFuturesTradeHistory()` | `wsSubscribeTrades()` | |
| **Mark price** | `getFuturesCurrentPrices()` | `wsSubscribeCurrentPricesFutures()` | |
| **Place order** | `createFuturesOrder()` | — | Use `take_profit_price` + `stop_loss_price` for bracket |
| **Cancel order** | `cancelFuturesOrder()` | — | |
| **Position state** | `getFuturesPositions()` | `wsSubscribeAccountFutures()` | REST for sync, WS for real-time |
| **Balance** | `getBalances()` | `wsSubscribeAccountFutures()` | |
| **Wallet transfer** | `walletTransfer()` | — | Spot ↔ futures before trading |

Based on the full CoinDCX documentation, here is the gap analysis of what's documented vs. what our library currently covers.

---

## What's Already Covered (Futures-Complete)

Your library already has **more futures endpoints than the official Python SDK** (which marks several as "coming soon"). Here's what you have:

| Category | Endpoint | Status |
|----------|----------|--------|
| **Futures Public** | `active_instruments`, `instrument_details`, `candles`, `trade_history`, `orderbook`, `current_prices`, `funding_rate` | ✅ |
| **Futures Orders** | `create`, `list`, `get`, `cancel`, `cancel_all`, `edit` | ✅ |
| **Futures Positions** | `list`, `close`, `add_margin`, `remove_margin` | ✅ |
| **Futures Account** | `update_leverage`, `transactions` | ✅ |
| **Futures WS** | candles, depth, trades, prices, batch prices, account updates | ✅ |
| **Legacy** | `getTicker`, `getMarkets`, `getMarketsDetails`, `getBalances`, `getUserInfo`, `walletTransfer` | ✅ |

---

## What's Documented But Missing

The original docs at `docs.coindcx.com` include these **non-futures** endpoints that we did not add:

### 1. Spot Market Data (Public)

These are useful for **price cross-validation** before executing futures orders:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /market_data/candles?pair={}&interval={}` | Public | Spot candlestick data |
| `GET /market_data/trade_history?pair={}&limit={}` | Public | Spot recent trades |
| `GET /market_data/orderbook?pair={}` | Public | Spot order book (L2) |

### 2. Spot Order Execution (Authenticated)

Only relevant if you ever trade spot through CoinDCX:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /exchange/v1/orders/create` | Auth | Create spot order |
| `POST /exchange/v1/orders/create_multiple` | Auth | Batch spot orders |
| `POST /exchange/v1/orders/status` | Auth | Get spot order status |
| `POST /exchange/v1/orders/status_multiple` | Auth | Batch status check |
| `POST /exchange/v1/orders/active_orders` | Auth | List active spot orders |
| `POST /exchange/v1/orders/cancel` | Auth | Cancel spot order |
| `POST /exchange/v1/orders/cancel_all` | Auth | Cancel all spot orders |
| `POST /exchange/v1/orders/cancel_by_ids` | Auth | Cancel multiple by ID |
| `POST /exchange/v1/orders/edit` | Auth | Edit spot order price |
| `POST /exchange/v1/orders/trade_history` | Auth | Spot trade history |

### 3. Legacy Margin Trading (Authenticated)

This is the **old margin API** (not the new futures API). CoinDCX still supports it, but if you're using the new `/derivatives/futures/` endpoints, you don't need these:

| Endpoint | Purpose |
|----------|---------|
| `POST /exchange/v1/margin/create` | Place margin order |
| `POST /exchange/v1/margin/cancel` | Cancel margin order |
| `POST /exchange/v1/margin/exit` | Exit margin position |
| `POST /exchange/v1/margin/edit_target` | Edit TP price |
| `POST /exchange/v1/margin/edit_price_of_target_order` | Edit target order price |
| `POST /exchange/v1/margin/edit_sl` | Edit SL price |
| `POST /exchange/v1/margin/edit_trailing_sl` | Edit trailing SL |
| `POST /exchange/v1/margin/add_margin` | Add margin |
| `POST /exchange/v1/margin/remove_margin` | Remove margin |
| `POST /exchange/v1/margin/fetch_orders` | List margin orders |
| `POST /exchange/v1/margin/order` | Get margin order details |

### 4. Lending (Authenticated)

Not needed for trading:

| Endpoint | Purpose |
|----------|---------|
| `POST /exchange/v1/funding/fetch_orders` | List lend orders |
| `POST /exchange/v1/funding/lend` | Create lend order |
| `POST /exchange/v1/funding/settle` | Settle lend order |

### 5. Sub-Account Management (Authenticated)

Useful if you use master/sub-account structure:

| Endpoint | Purpose |
|----------|---------|
| `POST /exchange/v1/wallets/sub_account_transfer` | Transfer between master/sub accounts |

---

## Recommendation for Your Architecture

Given your setup (**Binance for market data → CoinDCX for futures execution**), here is what you actually need:

| Priority | Endpoint | Why |
|----------|----------|-----|
| **Must** | `walletTransfer` | ✅ Already have — move USDT from spot → futures wallet |
| **Must** | `getBalances` | ✅ Already have — check futures wallet balance |
| **Must** | All futures order/position endpoints | ✅ Already have |
| **Should** | Spot market data (candles, orderbook, trades) | For **price divergence checks** before executing futures orders |
| **Should** | `sub_account_transfer` | If you use sub-accounts for capital allocation |
| **Don't need** | Spot orders, margin orders, lending | Out of scope for futures-only bot |

---

## Spot Market Data — Why You Might Want It

Even though you use Binance for signals, fetching CoinDCX's **spot** order book before a large futures order helps you:

1. **Detect price divergence** — If Binance spot is at $50,000 but CoinDCX spot is at $50,200, your futures execution will slip.
2. **Validate liquidity** — CoinDCX futures liquidity may differ from Binance.
3. **Cross-check mark price** — CoinDCX's futures mark price is derived from their spot market.

---

## Decision

**For your futures-only bot, the library is essentially complete.** The only additions I'd recommend are:

1. **Spot market data endpoints** (`getCandles`, `getTradeHistory`, `getOrderBook`) for pre-flight validation
2. **Sub-account transfer** if you use that feature

Would you like me to add:
- **A)** Spot market data helpers (candles, orderbook, trades)
- **B)** Sub-account transfer endpoint
- **C)** Both
- **D)** Nothing — the library is complete for your use case

Library updated to **v2.1.0** with both additions. All methods verified and present.

---

## Updated Files

| File | Version | Link |
|------|---------|------|
| **Library** | v2.1.0 | [coindcx-futures-client.js](sandbox:///mnt/agents/output/coindcx-futures-client.js) |
| **TypeScript** | v2.1.0 | [coindcx-futures-client.d.ts](sandbox:///mnt/agents/output/coindcx-futures-client.d.ts) |
| **Package** | v2.1.0 | [package.json](sandbox:///mnt/agents/output/package.json) |

---

## New Additions

### A) Spot Market Data (Public REST)

Use these for **pre-flight price divergence checks** before executing futures orders:

| Method | Endpoint | Returns | Use Case |
|--------|----------|---------|----------|
| `getSpotCandles(pair, interval, startTime?, endTime?, limit?)` | `GET /market_data/candles` | `[{open, high, low, close, volume, time}]` | Compare spot vs futures trend alignment |
| `getSpotTradeHistory(pair, limit?)` | `GET /market_data/trade_history` | `[{p, q, s, T, m}]` | Check recent spot volume/flow |
| `getSpotOrderBook(pair)` | `GET /market_data/orderbook` | `{bids: {}, asks: {}}` | Cross-check liquidity before large futures orders |

**Example — Price Divergence Check:**
```javascript
const client = new CoinDCXFuturesClient({ debug: true });

// Before executing a futures order, check spot-futures divergence
const spotOb = await client.getSpotOrderBook('B-BTC_USDT');
const futuresOb = await client.getFuturesOrderBook('BTCUSDT', 10);

const spotBestAsk = parseFloat(Object.keys(spotOb.asks)[0]);
const futuresBestAsk = futuresOb.asks[0]?.price;

const divergence = Math.abs(spotBestAsk - futuresBestAsk) / spotBestAsk;
if (divergence > 0.005) {
  console.warn('⚠️ Divergence > 0.5% — delay execution or use limit order');
}
```

---

### B) Sub-Account Transfer (Authenticated REST)

| Method | Endpoint | Supported Transfers |
|--------|----------|---------------------|
| `subAccountTransfer(params)` | `POST /exchange/v1/wallets/sub_account_transfer` | Main ↔ Sub, Sub ↔ Sub |

**Parameters:**
```javascript
await client.subAccountTransfer({
  fromAccountId: 'main-account-id',      // or sub-account ID
  toAccountId: 'sub-account-id',         // or main-account ID
  currencyShortName: 'USDT',
  amount: 5000
});
```

**Important constraints:**
- Only for API keys created **after 12th August 2024**
- Transfers happen between **spot wallets** only
- You must still use `walletTransfer('spot', 'futures', ...)` to move funds to futures wallet after sub-account transfer

---

## Complete Endpoint Map (v2.1.0)

```
REST API
├── Public Futures Market Data
│   ├── getActiveInstruments()
│   ├── getInstrumentDetails()
│   ├── getFuturesCandles()
│   ├── getFuturesTradeHistory()
│   ├── getFuturesOrderBook()
│   ├── getFuturesCurrentPrices()
│   └── getFundingRateHistory()
│
├── Public Spot Market Data (NEW)
│   ├── getSpotCandles()           ← NEW
│   ├── getSpotTradeHistory()     ← NEW
│   └── getSpotOrderBook()         ← NEW
│
├── Authenticated Futures Trading
│   ├── createFuturesOrder()
│   ├── listFuturesOrders()
│   ├── getFuturesOrder()
│   ├── cancelFuturesOrder()
│   ├── cancelAllFuturesOrders()
│   ├── editFuturesOrder()
│   ├── getFuturesPositions()
│   ├── closeFuturesPosition()
│   ├── updateLeverage()
│   ├── getFuturesTransactions()
│   ├── addFuturesMargin()
│   └── removeFuturesMargin()
│
├── Legacy Spot / Wallet
│   ├── getTicker()
│   ├── getMarkets()
│   ├── getMarketsDetails()
│   ├── getBalances()
│   ├── getUserInfo()
│   ├── walletTransfer()
│   └── subAccountTransfer()       ← NEW
│
└── WebSocket (Socket.IO v2.4.0)
    ├── Public Futures Streams
    │   ├── wsSubscribeCandles()
    │   ├── wsSubscribeOrderBook()
    │   ├── wsSubscribeTrades()
    │   ├── wsSubscribePrices()
    │   └── wsSubscribeCurrentPricesFutures()
    └── Private Account Streams
        ├── wsSubscribeAccountFutures()
        └── (emits: df-order-update, df-position-update, balance-update)
```

---

## When to Use What

| Scenario | Method | Why |
|----------|--------|-----|
| **Signal generation** | Binance WS `@kline_1m` | Primary data feed |
| **Pre-trade validation** | `getSpotOrderBook()` + `getFuturesOrderBook()` | Detect divergence, check liquidity |
| **Position sizing** | `getInstrumentDetails()` | Get `min_quantity`, `step`, `max_leverage_long` |
| **Entry execution** | `createFuturesOrder()` with `take_profit_price` + `stop_loss_price` | Bracket order in one call |
| **Real-time PnL** | `wsSubscribeAccountFutures()` | Instant position updates |
| **Capital allocation** | `subAccountTransfer()` + `walletTransfer()` | Move USDT between accounts and into futures wallet |
| **Risk management** | `getFuturesPositions()` + `updateLeverage()` | Monitor and adjust exposure |

The library is now **complete** for your Binance → CoinDCX futures trading architecture.

```
/**
 * CoinDCX Futures Socket.IO Client Library
 * Supports all documented futures WebSocket channels from docs.coindcx.com
 *
 * Requirements: socket.io-client@2.4.0 (CoinDCX requires v2.x)
 *
 * @example
 * const client = new CoinDCXSocketClient({ apiKey: 'xxx', apiSecret: 'xxx' });
 * await client.connect();
 *
 * // Public futures channels
 * client.subscribeCandles('B-BTC_USDT', '1m');
 * client.subscribeOrderBook('B-BTC_USDT', 50);
 * client.subscribeTrades('B-BTC_USDT');
 * client.subscribePrices('B-BTC_USDT');
 * client.subscribeCurrentPricesFutures();
 *
 * // Private futures channels (requires auth)
 * client.subscribeAccountFutures();
 */

const io = require('socket.io-client');
const crypto = require('crypto');
const EventEmitter = require('events');

class CoinDCXSocketClient extends EventEmitter {
  /**
   * @param {Object} options
   * @param {string} [options.endpoint='wss://stream.coindcx.com'] - Socket endpoint
   * @param {string} [options.apiKey] - API key for authenticated channels
   * @param {string} [options.apiSecret] - API secret for authenticated channels
   * @param {boolean} [options.autoReconnect=true] - Auto reconnect on disconnect
   * @param {number} [options.reconnectDelay=5000] - Reconnect delay in ms
   * @param {boolean} [options.debug=false] - Enable debug logging
   */
  constructor(options = {}) {
    super();

    this.endpoint = options.endpoint || 'wss://stream.coindcx.com';
    this.apiKey = options.apiKey || '';
    this.apiSecret = options.apiSecret || '';
    this.autoReconnect = options.autoReconnect !== false;
    this.reconnectDelay = options.reconnectDelay || 5000;
    this.debug = options.debug || false;

    this.socket = null;
    this.connected = false;
    this.subscribedChannels = new Set();
    this.pendingSubscriptions = new Set();
    this.reconnectTimer = null;
    this.pingInterval = null;
    this.isReconnecting = false;

    // Event mappings for futures
    this.futuresEvents = {
      candles: 'candlestick',
      orderBookSnapshot: 'depth-snapshot',
      orderBookUpdate: 'depth-update',
      trades: 'new-trade',
      prices: 'price-change',
      currentPrices: 'currentPrices@futures#update',
      accountOrder: 'df-order-update',
      accountPosition: 'df-position-update',
      accountBalance: 'balance-update',
    };
  }

  _log(...args) {
    if (this.debug) {
      console.log('[CoinDCX-WS]', ...args);
    }
  }

  _error(...args) {
    console.error('[CoinDCX-WS]', ...args);
  }

  /**
   * Generate HMAC-SHA256 signature for authenticated channels
   * @param {Object} body - Payload to sign
   * @returns {string} Hex signature
   */
  _generateSignature(body) {
    if (!this.apiSecret) {
      throw new Error('API secret required for authenticated channels');
    }
    const payload = JSON.stringify(body);
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Connect to the CoinDCX Socket.IO stream
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.socket && this.connected) {
      this._log('Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.endpoint, {
          transports: ['websocket'],
          reconnection: false, // We handle reconnection manually
          timeout: 30000,
        });

        this.socket.on('connect', () => {
          this.connected = true;
          this.isReconnecting = false;
          this._log('Connected:', this.socket.id);

          // Resubscribe to pending channels
          this._resubscribeAll();

          // Start ping interval (CoinDCX requires ping every ~25s)
          this._startPing();

          this.emit('connect', { socketId: this.socket.id });
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          this.connected = false;
          this._stopPing();
          this._log('Disconnected:', reason);
          this.emit('disconnect', { reason });

          if (this.autoReconnect && !this.isReconnecting) {
            this._scheduleReconnect();
          }
        });

        this.socket.on('connect_error', (err) => {
          this._error('Connection error:', err.message);
          this.emit('error', { type: 'connect_error', error: err });

          if (!this.connected) {
            reject(err);
          }
        });

        this.socket.on('error', (err) => {
          this._error('Socket error:', err);
          this.emit('error', { type: 'socket_error', error: err });
        });

        // Setup all event listeners
        this._setupEventListeners();

      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Setup all documented event listeners
   */
  _setupEventListeners() {
    // --- PUBLIC FUTURES EVENTS ---

    // Candlestick data
    this.socket.on(this.futuresEvents.candles, (response) => {
      this._log('Candlestick:', response.channel || response.i);
      this.emit('candlestick', this._normalizeCandlestick(response));
    });

    // Order book snapshot
    this.socket.on(this.futuresEvents.orderBookSnapshot, (response) => {
      this._log('Depth Snapshot:', response.channel);
      this.emit('depth-snapshot', this._normalizeDepth(response));
    });

    // Order book update
    this.socket.on(this.futuresEvents.orderBookUpdate, (response) => {
      this._log('Depth Update:', response.channel);
      this.emit('depth-update', this._normalizeDepth(response));
    });

    // New trades
    this.socket.on(this.futuresEvents.trades, (response) => {
      this._log('New Trade:', response.s);
      this.emit('new-trade', this._normalizeTrade(response));
    });

    // Price change (LTP)
    this.socket.on(this.futuresEvents.prices, (response) => {
      this._log('Price Change:', response.p);
      this.emit('price-change', this._normalizePriceChange(response));
    });

    // Current prices batch update
    this.socket.on(this.futuresEvents.currentPrices, (response) => {
      this._log('Current Prices Update:', Object.keys(response.prices || {}).length, 'pairs');
      this.emit('currentPrices@futures#update', this._normalizeCurrentPrices(response));
    });

    // --- PRIVATE FUTURES EVENTS ---

    // Order updates
    this.socket.on(this.futuresEvents.accountOrder, (response) => {
      this._log('Account Order Update');
      this.emit('df-order-update', response.data || response);
    });

    // Position updates
    this.socket.on(this.futuresEvents.accountPosition, (response) => {
      this._log('Account Position Update');
      this.emit('df-position-update', response.data || response);
    });

    // Balance updates
    this.socket.on(this.futuresEvents.accountBalance, (response) => {
      this._log('Balance Update');
      this.emit('balance-update', response.data || response);
    });
  }

  // ==================== NORMALIZERS ====================

  _normalizeCandlestick(response) {
    const data = response.data || response;
    const candle = Array.isArray(data) ? data[0] : data;
    return {
      channel: response.channel || response.i,
      product: response.pr || 'futures',
      eventTime: response.Ets,
      interval: response.i,
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume),
      quoteVolume: parseFloat(candle.quote_volume),
      openTime: candle.open_time * 1000, // Convert to ms
      closeTime: candle.close_time * 1000,
      pair: candle.pair,
      symbol: candle.symbol,
      duration: candle.duration,
      raw: response,
    };
  }

  _normalizeDepth(response) {
    return {
      timestamp: response.ts,
      version: response.vs,
      product: response.pr || 'futures',
      bids: this._parseDepthLevels(response.bids),
      asks: this._parseDepthLevels(response.asks),
      raw: response,
    };
  }

  _parseDepthLevels(levels) {
    if (!levels) return [];
    // CoinDCX returns { "price": "qty", ... }
    return Object.entries(levels).map(([price, qty]) => ({
      price: parseFloat(price),
      quantity: parseFloat(qty),
    }));
  }

  _normalizeTrade(response) {
    return {
      timestamp: response.T,
      receiveTime: response.RT,
      price: parseFloat(response.p),
      quantity: parseFloat(response.q),
      isMaker: response.m === 1,
      symbol: response.s,
      product: response.pr === 'f' ? 'futures' : response.pr,
      raw: response,
    };
  }

  _normalizePriceChange(response) {
    return {
      timestamp: response.T,
      price: parseFloat(response.p),
      product: response.pr === 'f' ? 'futures' : response.pr,
      raw: response,
    };
  }

  _normalizeCurrentPrices(response) {
    const prices = {};
    if (response.prices) {
      for (const [pair, data] of Object.entries(response.prices)) {
        prices[pair] = {
          markPrice: data.mp ? parseFloat(data.mp) : undefined,
          bmST: data.bmST,
          cmRT: data.cmRT,
        };
      }
    }
    return {
      version: response.vs,
      timestamp: response.ts,
      product: response.pr || 'futures',
      pST: response.pST,
      prices,
      raw: response,
    };
  }

  // ==================== SUBSCRIPTION METHODS ====================

  /**
   * Subscribe to futures candlestick stream
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {string} interval - '1m', '5m', '15m', '30m', '1h', '4h', '8h', '1d', '3d', '1w', '1M'
   */
  subscribeCandles(pair, interval = '1m') {
    const channel = `${pair}_${interval}-futures`;
    this._joinChannel(channel);
  }

  /**
   * Unsubscribe from futures candlestick stream
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {string} interval - candle interval
   */
  unsubscribeCandles(pair, interval = '1m') {
    const channel = `${pair}_${interval}-futures`;
    this._leaveChannel(channel);
  }

  /**
   * Subscribe to futures order book depth
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {number} depth - 10, 20, or 50
   */
  subscribeOrderBook(pair, depth = 50) {
    const channel = `${pair}@orderbook@${depth}-futures`;
    this._joinChannel(channel);
  }

  /**
   * Unsubscribe from futures order book
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {number} depth - 10, 20, or 50
   */
  unsubscribeOrderBook(pair, depth = 50) {
    const channel = `${pair}@orderbook@${depth}-futures`;
    this._leaveChannel(channel);
  }

  /**
   * Subscribe to futures trades stream
   * @param {string} pair - e.g. 'B-BTC_USDT'
   */
  subscribeTrades(pair) {
    const channel = `${pair}@trades-futures`;
    this._joinChannel(channel);
  }

  /**
   * Unsubscribe from futures trades
   * @param {string} pair - e.g. 'B-BTC_USDT'
   */
  unsubscribeTrades(pair) {
    const channel = `${pair}@trades-futures`;
    this._leaveChannel(channel);
  }

  /**
   * Subscribe to futures price change (LTP) stream
   * @param {string} pair - e.g. 'B-BTC_USDT'
   */
  subscribePrices(pair) {
    const channel = `${pair}@prices-futures`;
    this._joinChannel(channel);
  }

  /**
   * Unsubscribe from futures price change
   * @param {string} pair - e.g. 'B-BTC_USDT'
   */
  unsubscribePrices(pair) {
    const channel = `${pair}@prices-futures`;
    this._leaveChannel(channel);
  }

  /**
   * Subscribe to all futures current prices batch update
   */
  subscribeCurrentPricesFutures() {
    this._joinChannel('currentPrices@futures@rt');
  }

  /**
   * Unsubscribe from futures current prices
   */
  unsubscribeCurrentPricesFutures() {
    this._leaveChannel('currentPrices@futures@rt');
  }

  /**
   * Subscribe to private account futures updates (orders, positions, balances)
   * Requires apiKey and apiSecret
   */
  subscribeAccountFutures() {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('apiKey and apiSecret required for account streams');
    }
    const channel = 'coindcx';
    const body = { channel };
    const signature = this._generateSignature(body);

    this._joinChannel(channel, { authSignature: signature, apiKey: this.apiKey });
  }

  /**
   * Unsubscribe from private account updates
   */
  unsubscribeAccountFutures() {
    this._leaveChannel('coindcx');
  }

  // ==================== CHANNEL MANAGEMENT ====================

  _joinChannel(channelName, authPayload = null) {
    this.pendingSubscriptions.add(channelName);

    if (!this.connected) {
      this._log('Pending subscription (not connected):', channelName);
      return;
    }

    const payload = { channelName, ...authPayload };
    this.socket.emit('join', payload);
    this.subscribedChannels.add(channelName);
    this.pendingSubscriptions.delete(channelName);
    this._log('Joined channel:', channelName);
  }

  _leaveChannel(channelName) {
    if (!this.connected) return;

    this.socket.emit('leave', { channelName });
    this.subscribedChannels.delete(channelName);
    this.pendingSubscriptions.delete(channelName);
    this._log('Left channel:', channelName);
  }

  _resubscribeAll() {
    // Resubscribe all previously active channels
    const channels = Array.from(this.subscribedChannels);
    const pending = Array.from(this.pendingSubscriptions);

    this.subscribedChannels.clear();
    this.pendingSubscriptions.clear();

    // Re-join all
    for (const channel of [...channels, ...pending]) {
      if (channel === 'coindcx') {
        this.subscribeAccountFutures();
      } else {
        this._joinChannel(channel);
      }
    }
  }

  // ==================== PING / HEARTBEAT ====================

  _startPing() {
    this._stopPing();
    this.pingInterval = setInterval(() => {
      if (this.connected && this.socket) {
        this.socket.emit('ping', { data: 'Ping message' });
        this._log('Ping sent');
      }
    }, 25000);
  }

  _stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // ==================== RECONNECTION ====================

  _scheduleReconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;

    this._log(`Reconnecting in ${this.reconnectDelay}ms...`);
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (err) {
        this._error('Reconnect failed:', err.message);
        this.isReconnecting = false;
        if (this.autoReconnect) {
          this._scheduleReconnect();
        }
      }
    }, this.reconnectDelay);
  }

  // ==================== UTILITY ====================

  /**
   * Disconnect from the stream
   */
  disconnect() {
    this.autoReconnect = false;
    this._stopPing();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connected = false;
    this.subscribedChannels.clear();
    this.pendingSubscriptions.clear();
    this._log('Disconnected manually');
  }

  /**
   * Get list of currently subscribed channels
   * @returns {string[]}
   */
  getSubscribedChannels() {
    return Array.from(this.subscribedChannels);
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Static helper to build futures pair string
   * @param {string} base - e.g. 'BTC'
   * @param {string} quote - e.g. 'USDT'
   * @param {string} ecode - exchange code, default 'B' (Binance)
   * @returns {string} e.g. 'B-BTC_USDT'
   */
  static buildPair(base, quote, ecode = 'B') {
    return `${ecode}-${base}_${quote}`;
  }

  /**
   * Static helper to parse futures pair
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @returns {Object} { ecode, base, quote }
   */
  static parsePair(pair) {
    const match = pair.match(/^([A-Z])-([A-Z0-9]+)_([A-Z0-9]+)$/);
    if (!match) return null;
    return { ecode: match[1], base: match[2], quote: match[3] };
  }
}

// ==================== EXAMPLE USAGE ====================

async function main() {
  // Initialize client
  const client = new CoinDCXSocketClient({
    // apiKey: 'your_api_key',      // Required for private channels
    // apiSecret: 'your_api_secret', // Required for private channels
    debug: true,
    autoReconnect: true,
  });

  // Event listeners
  client.on('connect', (data) => {
    console.log('✅ Connected:', data.socketId);
  });

  client.on('disconnect', (data) => {
    console.log('❌ Disconnected:', data.reason);
  });

  client.on('error', (data) => {
    console.error('💥 Error:', data.type, data.error?.message);
  });

  // Public futures market data
  client.on('candlestick', (data) => {
    console.log('📊 Candle:', data.symbol, data.interval,
      `O:${data.open} H:${data.high} L:${data.low} C:${data.close} V:${data.volume}`);
  });

  client.on('depth-snapshot', (data) => {
    console.log('📗 OB Snapshot:', data.bids.length, 'bids,', data.asks.length, 'asks');
  });

  client.on('depth-update', (data) => {
    console.log('📘 OB Update:', data.bids.length, 'bids,', data.asks.length, 'asks');
  });

  client.on('new-trade', (data) => {
    console.log('💰 Trade:', data.symbol, `@ ${data.price}`, `Qty: ${data.quantity}`,
      data.isMaker ? '(Maker)' : '(Taker)');
  });

  client.on('price-change', (data) => {
    console.log('📈 Price:', data.price, 'Time:', new Date(data.timestamp).toISOString());
  });

  client.on('currentPrices@futures#update', (data) => {
    console.log('📋 Batch Prices:', Object.keys(data.prices).length, 'pairs updated');
  });

  // Private account futures events
  client.on('df-order-update', (data) => {
    console.log('🔔 Futures Order Update:', data);
  });

  client.on('df-position-update', (data) => {
    console.log('📍 Futures Position Update:', data);
  });

  client.on('balance-update', (data) => {
    console.log('💳 Balance Update:', data);
  });

  // Connect
  await client.connect();

  // Subscribe to public futures channels
  const pair = 'B-BTC_USDT';

  client.subscribeCandles(pair, '1m');
  client.subscribeOrderBook(pair, 50);
  client.subscribeTrades(pair);
  client.subscribePrices(pair);
  client.subscribeCurrentPricesFutures();

  // For private channels (uncomment if you have API credentials):
  // client.subscribeAccountFutures();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    client.disconnect();
    process.exit(0);
  });
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CoinDCXSocketClient };
```
```
/**
 * CoinDCX Futures Socket.IO Client TypeScript Declarations
 */

export interface CoinDCXSocketOptions {
  endpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  debug?: boolean;
}

export interface CandlestickData {
  channel: string;
  product: string;
  eventTime?: number;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  openTime: number;
  closeTime: number;
  pair: string;
  symbol: string;
  duration: string;
  raw: any;
}

export interface DepthLevel {
  price: number;
  quantity: number;
}

export interface DepthData {
  timestamp: number;
  version: number;
  product: string;
  bids: DepthLevel[];
  asks: DepthLevel[];
  raw: any;
}

export interface TradeData {
  timestamp: number;
  receiveTime?: number;
  price: number;
  quantity: number;
  isMaker: boolean;
  symbol: string;
  product: string;
  raw: any;
}

export interface PriceChangeData {
  timestamp: number;
  price: number;
  product: string;
  raw: any;
}

export interface CurrentPricesData {
  version: number;
  timestamp: number;
  product: string;
  pST?: number;
  prices: Record<string, {
    markPrice?: number;
    bmST?: number;
    cmRT?: number;
  }>;
  raw: any;
}

export interface ConnectEvent {
  socketId: string;
}

export interface DisconnectEvent {
  reason: string;
}

export interface ErrorEvent {
  type: string;
  error: Error;
}

export type FuturesInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '8h' | '1d' | '3d' | '1w' | '1M';
export type OrderBookDepth = 10 | 20 | 50;

export declare class CoinDCXSocketClient extends EventEmitter {
  constructor(options?: CoinDCXSocketOptions);

  connect(): Promise<void>;
  disconnect(): void;

  subscribeCandles(pair: string, interval?: FuturesInterval): void;
  unsubscribeCandles(pair: string, interval?: FuturesInterval): void;

  subscribeOrderBook(pair: string, depth?: OrderBookDepth): void;
  unsubscribeOrderBook(pair: string, depth?: OrderBookDepth): void;

  subscribeTrades(pair: string): void;
  unsubscribeTrades(pair: string): void;

  subscribePrices(pair: string): void;
  unsubscribePrices(pair: string): void;

  subscribeCurrentPricesFutures(): void;
  unsubscribeCurrentPricesFutures(): void;

  subscribeAccountFutures(): void;
  unsubscribeAccountFutures(): void;

  getSubscribedChannels(): string[];
  isConnected(): boolean;

  static buildPair(base: string, quote: string, ecode?: string): string;
  static parsePair(pair: string): { ecode: string; base: string; quote: string } | null;

  // EventEmitter overloads
  on(event: 'connect', listener: (data: ConnectEvent) => void): this;
  on(event: 'disconnect', listener: (data: DisconnectEvent) => void): this;
  on(event: 'error', listener: (data: ErrorEvent) => void): this;
  on(event: 'candlestick', listener: (data: CandlestickData) => void): this;
  on(event: 'depth-snapshot', listener: (data: DepthData) => void): this;
  on(event: 'depth-update', listener: (data: DepthData) => void): this;
  on(event: 'new-trade', listener: (data: TradeData) => void): this;
  on(event: 'price-change', listener: (data: PriceChangeData) => void): this;
  on(event: 'currentPrices@futures#update', listener: (data: CurrentPricesData) => void): this;
  on(event: 'df-order-update', listener: (data: any) => void): this;
  on(event: 'df-position-update', listener: (data: any) => void): this;
  on(event: 'balance-update', listener: (data: any) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;

  emit(event: 'connect', data: ConnectEvent): boolean;
  emit(event: 'disconnect', data: DisconnectEvent): boolean;
  emit(event: 'error', data: ErrorEvent): boolean;
  emit(event: 'candlestick', data: CandlestickData): boolean;
  emit(event: 'depth-snapshot', data: DepthData): boolean;
  emit(event: 'depth-update', data: DepthData): boolean;
  emit(event: 'new-trade', data: TradeData): boolean;
  emit(event: 'price-change', data: PriceChangeData): boolean;
  emit(event: 'currentPrices@futures#update', data: CurrentPricesData): boolean;
  emit(event: 'df-order-update', data: any): boolean;
  emit(event: 'df-position-update', data: any): boolean;
  emit(event: 'balance-update', data: any): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;
}
```
```
{
  "name": "coindcx-futures-client",
  "version": "2.1.0",
  "description": "Complete CoinDCX Futures Client - REST API + Socket.IO WebSocket with all documented endpoints",
  "main": "coindcx-futures-client.js",
  "types": "coindcx-futures-client.d.ts",
  "scripts": {
    "start": "node coindcx-futures-client.js",
    "test": "node -e "const {CoinDCXFuturesClient} = require('./coindcx-futures-client'); console.log('Module loaded OK')""
  },
  "keywords": [
    "coindcx",
    "futures",
    "websocket",
    "socket.io",
    "rest-api",
    "crypto",
    "trading",
    "api",
    "derivatives"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "socket.io-client": "2.4.0"
  },
  "optionalDependencies": {
    "axios": "^1.6.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```
```
/**
 * CoinDCX Futures Complete Client Library
 * Supports all documented futures WebSocket channels and REST API endpoints
 *
 * Requirements: socket.io-client@2.4.0 (CoinDCX requires v2.x)
 *                 axios or node-fetch for REST calls
 *
 * @example
 * const { CoinDCXFuturesClient } = require('./coindcx-futures-client');
 *
 * // Initialize with API credentials for private endpoints
 * const client = new CoinDCXFuturesClient({
 *   apiKey: 'your_api_key',
 *   apiSecret: 'your_api_secret',
 *   debug: true
 * });
 *
 * // REST API Examples
 * const instruments = await client.getActiveInstruments('USDT');
 * const candles = await client.getFuturesCandles('B-BTC_USDT', fromTime, toTime, '1m');
 * const order = await client.createFuturesOrder({
 *   pair: 'B-BTC_USDT',
 *   side: 'buy',
 *   order_type: 'limit',
 *   price: 50000,
 *   total_quantity: 0.01,
 *   leverage: 10
 * });
 *
 * // WebSocket Examples
 * await client.wsConnect();
 * client.wsSubscribeCandles('B-BTC_USDT', '1m');
 * client.wsSubscribeOrderBook('B-BTC_USDT', 50);
 * client.wsSubscribeAccountFutures();
 */

const io = require('socket.io-client');
const crypto = require('crypto');
const EventEmitter = require('events');

// Use native fetch if available (Node 18+), otherwise require axios
let httpClient;
try {
  if (globalThis.fetch) {
    httpClient = 'fetch';
  } else {
    httpClient = 'axios';
    require('axios');
  }
} catch (e) {
  httpClient = 'axios';
}

class CoinDCXFuturesClient extends EventEmitter {
  /**
   * @param {Object} options
   * @param {string} [options.restBaseUrl='https://api.coindcx.com'] - REST API base URL
   * @param {string} [options.publicBaseUrl='https://public.coindcx.com'] - Public data base URL
   * @param {string} [options.wsEndpoint='wss://stream.coindcx.com'] - WebSocket endpoint
   * @param {string} [options.apiKey] - API key for authenticated endpoints
   * @param {string} [options.apiSecret] - API secret for authenticated endpoints
   * @param {boolean} [options.autoReconnect=true] - Auto reconnect WS on disconnect
   * @param {number} [options.reconnectDelay=5000] - WS reconnect delay in ms
   * @param {boolean} [options.debug=false] - Enable debug logging
   * @param {number} [options.timeout=30000] - HTTP request timeout in ms
   */
  constructor(options = {}) {
    super();

    this.restBaseUrl = options.restBaseUrl || 'https://api.coindcx.com';
    this.publicBaseUrl = options.publicBaseUrl || 'https://public.coindcx.com';
    this.wsEndpoint = options.wsEndpoint || 'wss://stream.coindcx.com';
    this.apiKey = options.apiKey || '';
    this.apiSecret = options.apiSecret || '';
    this.autoReconnect = options.autoReconnect !== false;
    this.reconnectDelay = options.reconnectDelay || 5000;
    this.debug = options.debug || false;
    this.timeout = options.timeout || 30000;

    // WebSocket state
    this.socket = null;
    this.wsConnected = false;
    this.subscribedChannels = new Set();
    this.pendingSubscriptions = new Set();
    this.reconnectTimer = null;
    this.pingInterval = null;
    this.isReconnecting = false;

    // Futures event mappings
    this.futuresEvents = {
      candles: 'candlestick',
      orderBookSnapshot: 'depth-snapshot',
      orderBookUpdate: 'depth-update',
      trades: 'new-trade',
      prices: 'price-change',
      currentPrices: 'currentPrices@futures#update',
      accountOrder: 'df-order-update',
      accountPosition: 'df-position-update',
      accountBalance: 'balance-update',
    };
  }

  _log(...args) {
    if (this.debug) {
      console.log('[CoinDCX-Futures]', ...args);
    }
  }

  _error(...args) {
    console.error('[CoinDCX-Futures]', ...args);
  }

  // ==================== AUTHENTICATION HELPERS ====================

  /**
   * Generate HMAC-SHA256 signature for authenticated requests
   * @param {Object} body - Payload to sign
   * @returns {string} Hex signature
   */
  _generateSignature(body) {
    if (!this.apiSecret) {
      throw new Error('API secret required for authenticated endpoints');
    }
    const payload = JSON.stringify(body);
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Build authenticated headers
   * @param {Object} body - Request body
   * @returns {Object} Headers object
   */
  _buildAuthHeaders(body) {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('apiKey and apiSecret required for authenticated endpoints');
    }
    const signature = this._generateSignature(body);
    return {
      'Content-Type': 'application/json',
      'X-AUTH-APIKEY': this.apiKey,
      'X-AUTH-SIGNATURE': signature,
    };
  }

  /**
   * Add timestamp to body if not present
   * @param {Object} body
   * @returns {Object} Body with timestamp
   */
  _addTimestamp(body) {
    if (!body.timestamp) {
      body.timestamp = Math.floor(Date.now() / 1000); // CoinDCX uses seconds
    }
    return body;
  }

  // ==================== HTTP CLIENT ====================

  async _httpRequest(method, url, body = null, isPublic = false) {
    const fullUrl = url.startsWith('http') ? url : `${this.restBaseUrl}${url}`;

    let headers = { 'Content-Type': 'application/json' };

    if (!isPublic && body) {
      body = this._addTimestamp(body);
      headers = { ...headers, ...this._buildAuthHeaders(body) };
    }

    if (httpClient === 'fetch') {
      const response = await fetch(fullUrl, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }
      return await response.json();
    } else {
      const axios = require('axios');
      const response = await axios({
        method,
        url: fullUrl,
        headers,
        data: body,
        timeout: this.timeout,
      });
      return response.data;
    }
  }

  async _get(url, params = {}, isPublic = false) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    return this._httpRequest('GET', fullUrl, null, isPublic);
  }

  async _post(url, body = {}, isPublic = false) {
    return this._httpRequest('POST', url, body, isPublic);
  }

  // ==================== PUBLIC FUTURES REST ENDPOINTS ====================

  /**
   * Get all active futures instruments
   * @param {string} marginCurrencyShortName - e.g. 'USDT', 'INR'
   * @returns {Promise<Object[]>} Array of active instruments
   */
  async getActiveInstruments(marginCurrencyShortName = 'USDT') {
    const url = `/exchange/v1/derivatives/futures/data/active_instruments`;
    const params = { 'margin_currency_short_name[]': marginCurrencyShortName };
    return this._get(url, params, true);
  }

  /**
   * Get detailed information for a specific futures instrument
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {string} marginCurrencyShortName - e.g. 'USDT'
   * @returns {Promise<Object>} Instrument details
   */
  async getInstrumentDetails(pair, marginCurrencyShortName = 'USDT') {
    const url = `/exchange/v1/derivatives/futures/data/instruments`;
    const params = { pair, margin_currency_short_name: marginCurrencyShortName };
    return this._get(url, params, true);
  }

  /**
   * Get futures candlestick data
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {number} fromTime - Start timestamp in seconds
   * @param {number} toTime - End timestamp in seconds
   * @param {string} resolution - '1m', '5m', '15m', '30m', '1h', '4h', '8h', '1D', '3D', '1W', '1M'
   * @returns {Promise<Object>} { data: Candle[], instrument: string, pair: string }
   */
  async getFuturesCandles(pair, fromTime, toTime, resolution = '1m') {
    const url = `/exchange/v1/derivatives/futures/data/candles`;
    const params = { pair, from_time: fromTime, to_time: toTime, resolution };
    return this._get(url, params, true);
  }

  /**
   * Get futures trade history
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {number} [limit=50] - Number of trades to fetch
   * @returns {Promise<Object[]>} Array of trades
   */
  async getFuturesTradeHistory(pair, limit = 50) {
    const url = `/exchange/v1/derivatives/futures/data/trade_history`;
    const params = { pair, limit };
    return this._get(url, params, true);
  }

  /**
   * Get futures order book (L3)
   * @param {string} instrument - Instrument name (from getActiveInstruments)
   * @param {number} [depth=50] - Depth levels (10, 20, 50)
   * @returns {Promise<Object>} { bids: {}, asks: {}, timestamp, version }
   */
  async getFuturesOrderBook(instrument, depth = 50) {
    const url = `${this.publicBaseUrl}/public/market_data/v3/orderbook/${instrument}-futures/${depth}`;
    return this._get(url, {}, true);
  }

  /**
   * Get futures current prices (batch)
   * @returns {Promise<Object>} Current prices for all futures pairs
   */
  async getFuturesCurrentPrices() {
    const url = `/exchange/v1/derivatives/futures/data/current_prices`;
    return this._get(url, {}, true);
  }

  /**
   * Get funding rate history
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {number} [limit=100] - Number of records
   * @returns {Promise<Object[]>}
   */
  async getFundingRateHistory(pair, limit = 100) {
    const url = `/exchange/v1/derivatives/futures/data/funding_rate`;
    const params = { pair, limit };
    return this._get(url, params, true);
  }


  // ==================== SPOT MARKET DATA REST ENDPOINTS (Public) ====================

  /**
   * Get spot candlestick data
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {string} interval - '1m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '1d', '3d', '1w', '1M'
   * @param {number} [startTime] - Start timestamp in ms
   * @param {number} [endTime] - End timestamp in ms
   * @param {number} [limit=500] - Max 1000
   * @returns {Promise<Object[]>} Array of candle objects
   */
  async getSpotCandles(pair, interval = '1m', startTime, endTime, limit = 500) {
    const url = `${this.publicBaseUrl}/market_data/candles`;
    const params = { pair, interval };
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    if (limit) params.limit = limit;
    return this._get(url, params, true);
  }

  /**
   * Get spot trade history
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {number} [limit=50] - Max 500
   * @returns {Promise<Object[]>} Array of trades
   */
  async getSpotTradeHistory(pair, limit = 50) {
    const url = `${this.publicBaseUrl}/market_data/trade_history`;
    const params = { pair, limit };
    return this._get(url, params, true);
  }

  /**
   * Get spot order book (L2)
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @returns {Promise<Object>} { bids: {}, asks: {} }
   */
  async getSpotOrderBook(pair) {
    const url = `${this.publicBaseUrl}/market_data/orderbook`;
    const params = { pair };
    return this._get(url, params, true);
  }

  // ==================== AUTHENTICATED FUTURES REST ENDPOINTS ====================

  /**
   * Create a new futures order
   * @param {Object} params
   * @param {string} params.pair - e.g. 'B-BTC_USDT'
   * @param {string} params.side - 'buy' or 'sell'
   * @param {string} params.order_type - 'market', 'limit', 'stop_limit', 'stop_market', 'take_profit_limit', 'take_profit_market'
   * @param {number} params.total_quantity - Order quantity
   * @param {number} params.leverage - Leverage multiplier
   * @param {number} [params.price] - Order price (required for limit orders)
   * @param {number} [params.stop_price] - Trigger price (for stop/take_profit orders)
   * @param {string} [params.time_in_force] - 'good_till_cancel', 'fill_or_kill', 'immediate_or_cancel'
   * @param {number} [params.take_profit_price] - Take profit trigger price
   * @param {number} [params.stop_loss_price] - Stop loss trigger price
   * @param {boolean} [params.post_only] - Maker-only order
   * @param {boolean} [params.hidden] - Hidden order
   * @param {string} [params.client_order_id] - Custom order ID
   * @param {string} [params.margin_currency_short_name] - 'USDT' or 'INR'
   * @returns {Promise<Object>} Created order details
   */
  async createFuturesOrder(params) {
    const url = `/exchange/v1/derivatives/futures/orders/create`;
    const body = {
      side: params.side,
      pair: params.pair,
      order_type: params.order_type,
      total_quantity: params.total_quantity,
      leverage: params.leverage,
      ...(params.price && { price: params.price }),
      ...(params.stop_price && { stop_price: params.stop_price }),
      ...(params.time_in_force && { time_in_force: params.time_in_force }),
      ...(params.take_profit_price && { take_profit_price: params.take_profit_price }),
      ...(params.stop_loss_price && { stop_loss_price: params.stop_loss_price }),
      ...(params.post_only !== undefined && { post_only: params.post_only }),
      ...(params.hidden !== undefined && { hidden: params.hidden }),
      ...(params.client_order_id && { client_order_id: params.client_order_id }),
      ...(params.margin_currency_short_name && { margin_currency_short_name: params.margin_currency_short_name }),
    };
    return this._post(url, body);
  }

  /**
   * List futures orders
   * @param {Object} filters
   * @param {string} [filters.side] - 'buy' or 'sell'
   * @param {string} [filters.status] - 'open', 'partially_filled', 'filled', 'cancelled', 'rejected'
   * @param {string[]} [filters.margin_currency_short_name] - ['USDT'] or ['INR']
   * @param {string} [filters.pair] - e.g. 'B-BTC_USDT'
   * @param {number} [filters.page=1] - Page number
   * @param {number} [filters.size=10] - Records per page
   * @returns {Promise<Object>} Paginated orders list
   */
  async listFuturesOrders(filters = {}) {
    const url = `/exchange/v1/derivatives/futures/orders`;
    const body = {
      ...(filters.side && { side: filters.side }),
      ...(filters.status && { status: filters.status }),
      ...(filters.margin_currency_short_name && { margin_currency_short_name: filters.margin_currency_short_name }),
      ...(filters.pair && { pair: filters.pair }),
      ...(filters.page && { page: filters.page }),
      ...(filters.size && { size: filters.size }),
    };
    return this._post(url, body);
  }

  /**
   * Get futures order details
   * @param {string} id - Order ID
   * @returns {Promise<Object>} Order details
   */
  async getFuturesOrder(id) {
    const url = `/exchange/v1/derivatives/futures/orders/details`;
    return this._post(url, { id });
  }

  /**
   * Cancel a futures order
   * @param {string} id - Order ID to cancel
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelFuturesOrder(id) {
    const url = `/exchange/v1/derivatives/futures/orders/cancel`;
    return this._post(url, { id });
  }

  /**
   * Cancel all futures orders for a pair
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {string} [side] - 'buy' or 'sell' (optional)
   * @returns {Promise<Object>}
   */
  async cancelAllFuturesOrders(pair, side) {
    const url = `/exchange/v1/derivatives/futures/orders/cancel_all`;
    const body = { pair };
    if (side) body.side = side;
    return this._post(url, body);
  }

  /**
   * Edit an existing futures order
   * @param {Object} params
   * @param {string} params.id - Order ID
   * @param {number} [params.total_quantity] - New quantity
   * @param {number} [params.price] - New price
   * @param {number} [params.take_profit_price] - New TP price
   * @param {number} [params.stop_loss_price] - New SL price
   * @returns {Promise<Object>} Updated order
   */
  async editFuturesOrder(params) {
    const url = `/exchange/v1/derivatives/futures/orders/edit`;
    const body = {
      id: params.id,
      ...(params.total_quantity !== undefined && { total_quantity: params.total_quantity }),
      ...(params.price !== undefined && { price: params.price }),
      ...(params.take_profit_price !== undefined && { take_profit_price: params.take_profit_price }),
      ...(params.stop_loss_price !== undefined && { stop_loss_price: params.stop_loss_price }),
    };
    return this._post(url, body);
  }

  /**
   * Get open futures positions
   * @param {Object} filters
   * @param {number} [filters.page=1] - Page number
   * @param {number} [filters.size=10] - Records per page
   * @param {string} [filters.pair] - Filter by pair
   * @param {string} [filters.margin_currency_short_name] - 'USDT' or 'INR'
   * @returns {Promise<Object>} Paginated positions list
   */
  async getFuturesPositions(filters = {}) {
    const url = `/exchange/v1/derivatives/futures/positions`;
    const body = {
      ...(filters.page && { page: filters.page }),
      ...(filters.size && { size: filters.size }),
      ...(filters.pair && { pair: filters.pair }),
      ...(filters.margin_currency_short_name && { margin_currency_short_name: filters.margin_currency_short_name }),
    };
    return this._post(url, body);
  }

  /**
   * Close a futures position (market close)
   * @param {string} id - Position ID
   * @returns {Promise<Object>}
   */
  async closeFuturesPosition(id) {
    const url = `/exchange/v1/derivatives/futures/positions/close`;
    return this._post(url, { id });
  }

  /**
   * Update leverage for a futures pair
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {number} leverage - New leverage value
   * @returns {Promise<Object>}
   */
  async updateLeverage(pair, leverage) {
    const url = `/exchange/v1/derivatives/futures/leverage`;
    return this._post(url, { pair, leverage });
  }

  /**
   * Get futures transactions / trade history
   * @param {Object} filters
   * @param {string} [filters.pair] - Filter by pair
   * @param {number} [filters.from_time] - Start timestamp (seconds)
   * @param {number} [filters.to_time] - End timestamp (seconds)
   * @param {number} [filters.page=1] - Page number
   * @param {number} [filters.size=10] - Records per page
   * @returns {Promise<Object>}
   */
  async getFuturesTransactions(filters = {}) {
    const url = `/exchange/v1/derivatives/futures/transactions`;
    const body = {
      ...(filters.pair && { pair: filters.pair }),
      ...(filters.from_time && { from_time: filters.from_time }),
      ...(filters.to_time && { to_time: filters.to_time }),
      ...(filters.page && { page: filters.page }),
      ...(filters.size && { size: filters.size }),
    };
    return this._post(url, body);
  }

  /**
   * Add margin to a futures position
   * @param {string} id - Position ID
   * @param {number} amount - Amount to add
   * @returns {Promise<Object>}
   */
  async addFuturesMargin(id, amount) {
    const url = `/exchange/v1/derivatives/futures/positions/add_margin`;
    return this._post(url, { id, amount });
  }

  /**
   * Remove margin from a futures position
   * @param {string} id - Position ID
   * @param {number} amount - Amount to remove
   * @returns {Promise<Object>}
   */
  async removeFuturesMargin(id, amount) {
    const url = `/exchange/v1/derivatives/futures/positions/remove_margin`;
    return this._post(url, { id, amount });
  }

  // ==================== SPOT/MARGIN REST ENDPOINTS (Legacy) ====================

  /**
   * Get all market tickers (spot)
   * @returns {Promise<Object[]>}
   */
  async getTicker() {
    return this._get('/exchange/ticker', {}, true);
  }

  /**
   * Get all markets (spot)
   * @returns {Promise<string[]>}
   */
  async getMarkets() {
    return this._get('/exchange/v1/markets', {}, true);
  }

  /**
   * Get market details (spot)
   * @returns {Promise<Object[]>}
   */
  async getMarketsDetails() {
    return this._get('/exchange/v1/markets_details', {}, true);
  }

  /**
   * Get user balances
   * @returns {Promise<Object[]>}
   */
  async getBalances() {
    return this._post('/exchange/v1/users/balances', {});
  }

  /**
   * Get user info
   * @returns {Promise<Object>}
   */
  async getUserInfo() {
    return this._post('/exchange/v1/users/info', {});
  }

  /**
   * Transfer between wallets (spot <-> futures)
   * @param {string} sourceWalletType - 'spot' or 'futures'
   * @param {string} destinationWalletType - 'spot' or 'futures'
   * @param {string} currencyShortName - e.g. 'USDT'
   * @param {number} amount - Amount to transfer
   * @returns {Promise<Object>}
   */
  async walletTransfer(sourceWalletType, destinationWalletType, currencyShortName, amount) {
    return this._post('/exchange/v1/wallets/transfer', {
      source_wallet_type: sourceWalletType,
      destination_wallet_type: destinationWalletType,
      currency_short_name: currencyShortName,
      amount,
    });
  }

  // ==================== SUB-ACCOUNT MANAGEMENT ====================

  /**
   * Transfer funds between master account and sub-accounts
   * @param {Object} params
   * @param {string} params.fromAccountId - Source account ID (main or sub-account)
   * @param {string} params.toAccountId - Destination account ID (main or sub-account)
   * @param {string} params.currencyShortName - Asset type e.g. 'USDT', 'BTC'
   * @param {number} params.amount - Amount to transfer
   * @returns {Promise<Object>} { status, message, code }
   *
   * Supported transfers:
   * - Main spot wallet → Sub-account spot wallet
   * - Sub-account spot wallet → Main spot wallet
   * - Sub-account spot wallet → Another sub-account spot wallet
   *
   * Note: Only available for API keys created after 12th August 2024
   */
  async subAccountTransfer(params) {
    const url = `/exchange/v1/wallets/sub_account_transfer`;
    const body = {
      from_account_id: params.fromAccountId,
      to_account_id: params.toAccountId,
      currency_short_name: params.currencyShortName,
      amount: params.amount,
    };
    return this._post(url, body);
  }



  // ==================== WEBSOCKET METHODS ====================

  /**
   * Connect to the CoinDCX Socket.IO stream
   * @returns {Promise<void>}
   */
  async wsConnect() {
    if (this.socket && this.wsConnected) {
      this._log('WS Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.wsEndpoint, {
          transports: ['websocket'],
          reconnection: false,
          timeout: 30000,
        });

        this.socket.on('connect', () => {
          this.wsConnected = true;
          this.isReconnecting = false;
          this._log('WS Connected:', this.socket.id);
          this._wsResubscribeAll();
          this._wsStartPing();
          this.emit('ws:connect', { socketId: this.socket.id });
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          this.wsConnected = false;
          this._wsStopPing();
          this._log('WS Disconnected:', reason);
          this.emit('ws:disconnect', { reason });
          if (this.autoReconnect && !this.isReconnecting) {
            this._wsScheduleReconnect();
          }
        });

        this.socket.on('connect_error', (err) => {
          this._error('WS Connection error:', err.message);
          this.emit('ws:error', { type: 'connect_error', error: err });
          if (!this.wsConnected) reject(err);
        });

        this.socket.on('error', (err) => {
          this._error('WS Socket error:', err);
          this.emit('ws:error', { type: 'socket_error', error: err });
        });

        this._setupWsEventListeners();

      } catch (err) {
        reject(err);
      }
    });
  }

  _setupWsEventListeners() {
    // Public futures events
    this.socket.on(this.futuresEvents.candles, (response) => {
      this._log('WS Candlestick:', response.channel || response.i);
      this.emit('ws:candlestick', this._normalizeCandlestick(response));
    });

    this.socket.on(this.futuresEvents.orderBookSnapshot, (response) => {
      this._log('WS Depth Snapshot:', response.channel);
      this.emit('ws:depth-snapshot', this._normalizeDepth(response));
    });

    this.socket.on(this.futuresEvents.orderBookUpdate, (response) => {
      this._log('WS Depth Update:', response.channel);
      this.emit('ws:depth-update', this._normalizeDepth(response));
    });

    this.socket.on(this.futuresEvents.trades, (response) => {
      this._log('WS New Trade:', response.s);
      this.emit('ws:new-trade', this._normalizeTrade(response));
    });

    this.socket.on(this.futuresEvents.prices, (response) => {
      this._log('WS Price Change:', response.p);
      this.emit('ws:price-change', this._normalizePriceChange(response));
    });

    this.socket.on(this.futuresEvents.currentPrices, (response) => {
      this._log('WS Current Prices:', Object.keys(response.prices || {}).length, 'pairs');
      this.emit('ws:currentPrices@futures#update', this._normalizeCurrentPrices(response));
    });

    // Private futures events
    this.socket.on(this.futuresEvents.accountOrder, (response) => {
      this._log('WS Account Order Update');
      this.emit('ws:df-order-update', response.data || response);
    });

    this.socket.on(this.futuresEvents.accountPosition, (response) => {
      this._log('WS Account Position Update');
      this.emit('ws:df-position-update', response.data || response);
    });

    this.socket.on(this.futuresEvents.accountBalance, (response) => {
      this._log('WS Balance Update');
      this.emit('ws:balance-update', response.data || response);
    });
  }

  // WS Normalizers
  _normalizeCandlestick(response) {
    const data = response.data || response;
    const candle = Array.isArray(data) ? data[0] : data;
    return {
      channel: response.channel || response.i,
      product: response.pr || 'futures',
      eventTime: response.Ets,
      interval: response.i,
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume),
      quoteVolume: parseFloat(candle.quote_volume),
      openTime: candle.open_time * 1000,
      closeTime: candle.close_time * 1000,
      pair: candle.pair,
      symbol: candle.symbol,
      duration: candle.duration,
      raw: response,
    };
  }

  _normalizeDepth(response) {
    return {
      timestamp: response.ts,
      version: response.vs,
      product: response.pr || 'futures',
      bids: this._parseDepthLevels(response.bids),
      asks: this._parseDepthLevels(response.asks),
      raw: response,
    };
  }

  _parseDepthLevels(levels) {
    if (!levels) return [];
    return Object.entries(levels).map(([price, qty]) => ({
      price: parseFloat(price),
      quantity: parseFloat(qty),
    }));
  }

  _normalizeTrade(response) {
    return {
      timestamp: response.T,
      receiveTime: response.RT,
      price: parseFloat(response.p),
      quantity: parseFloat(response.q),
      isMaker: response.m === 1,
      symbol: response.s,
      product: response.pr === 'f' ? 'futures' : response.pr,
      raw: response,
    };
  }

  _normalizePriceChange(response) {
    return {
      timestamp: response.T,
      price: parseFloat(response.p),
      product: response.pr === 'f' ? 'futures' : response.pr,
      raw: response,
    };
  }

  _normalizeCurrentPrices(response) {
    const prices = {};
    if (response.prices) {
      for (const [pair, data] of Object.entries(response.prices)) {
        prices[pair] = {
          markPrice: data.mp ? parseFloat(data.mp) : undefined,
          bmST: data.bmST,
          cmRT: data.cmRT,
        };
      }
    }
    return {
      version: response.vs,
      timestamp: response.ts,
      product: response.pr || 'futures',
      pST: response.pST,
      prices,
      raw: response,
    };
  }

  // WS Subscription Methods
  wsSubscribeCandles(pair, interval = '1m') {
    this._wsJoinChannel(`${pair}_${interval}-futures`);
  }

  wsUnsubscribeCandles(pair, interval = '1m') {
    this._wsLeaveChannel(`${pair}_${interval}-futures`);
  }

  wsSubscribeOrderBook(pair, depth = 50) {
    this._wsJoinChannel(`${pair}@orderbook@${depth}-futures`);
  }

  wsUnsubscribeOrderBook(pair, depth = 50) {
    this._wsLeaveChannel(`${pair}@orderbook@${depth}-futures`);
  }

  wsSubscribeTrades(pair) {
    this._wsJoinChannel(`${pair}@trades-futures`);
  }

  wsUnsubscribeTrades(pair) {
    this._wsLeaveChannel(`${pair}@trades-futures`);
  }

  wsSubscribePrices(pair) {
    this._wsJoinChannel(`${pair}@prices-futures`);
  }

  wsUnsubscribePrices(pair) {
    this._wsLeaveChannel(`${pair}@prices-futures`);
  }

  wsSubscribeCurrentPricesFutures() {
    this._wsJoinChannel('currentPrices@futures@rt');
  }

  wsUnsubscribeCurrentPricesFutures() {
    this._wsLeaveChannel('currentPrices@futures@rt');
  }

  wsSubscribeAccountFutures() {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('apiKey and apiSecret required for account streams');
    }
    const channel = 'coindcx';
    const body = { channel };
    const signature = this._generateSignature(body);
    this._wsJoinChannel(channel, { authSignature: signature, apiKey: this.apiKey });
  }

  wsUnsubscribeAccountFutures() {
    this._wsLeaveChannel('coindcx');
  }

  // WS Channel Management
  _wsJoinChannel(channelName, authPayload = null) {
    this.pendingSubscriptions.add(channelName);
    if (!this.wsConnected) {
      this._log('WS Pending subscription:', channelName);
      return;
    }
    const payload = { channelName, ...authPayload };
    this.socket.emit('join', payload);
    this.subscribedChannels.add(channelName);
    this.pendingSubscriptions.delete(channelName);
    this._log('WS Joined channel:', channelName);
  }

  _wsLeaveChannel(channelName) {
    if (!this.wsConnected) return;
    this.socket.emit('leave', { channelName });
    this.subscribedChannels.delete(channelName);
    this.pendingSubscriptions.delete(channelName);
    this._log('WS Left channel:', channelName);
  }

  _wsResubscribeAll() {
    const channels = Array.from(this.subscribedChannels);
    const pending = Array.from(this.pendingSubscriptions);
    this.subscribedChannels.clear();
    this.pendingSubscriptions.clear();
    for (const channel of [...channels, ...pending]) {
      if (channel === 'coindcx') {
        this.wsSubscribeAccountFutures();
      } else {
        this._wsJoinChannel(channel);
      }
    }
  }

  _wsStartPing() {
    this._wsStopPing();
    this.pingInterval = setInterval(() => {
      if (this.wsConnected && this.socket) {
        this.socket.emit('ping', { data: 'Ping message' });
        this._log('WS Ping sent');
      }
    }, 25000);
  }

  _wsStopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  _wsScheduleReconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    this._log(`WS Reconnecting in ${this.reconnectDelay}ms...`);
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.wsConnect();
      } catch (err) {
        this._error('WS Reconnect failed:', err.message);
        this.isReconnecting = false;
        if (this.autoReconnect) this._wsScheduleReconnect();
      }
    }, this.reconnectDelay);
  }

  /**
   * Disconnect WebSocket
   */
  wsDisconnect() {
    this.autoReconnect = false;
    this._wsStopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.wsConnected = false;
    this.subscribedChannels.clear();
    this.pendingSubscriptions.clear();
    this._log('WS Disconnected manually');
  }

  /**
   * Get list of currently subscribed WS channels
   * @returns {string[]}
   */
  wsGetSubscribedChannels() {
    return Array.from(this.subscribedChannels);
  }

  /**
   * Check if WS is connected
   * @returns {boolean}
   */
  wsIsConnected() {
    return this.wsConnected;
  }

  // ==================== STATIC HELPERS ====================

  /**
   * Build futures pair string
   * @param {string} base - e.g. 'BTC'
   * @param {string} quote - e.g. 'USDT'
   * @param {string} ecode - exchange code, default 'B'
   * @returns {string} e.g. 'B-BTC_USDT'
   */
  static buildPair(base, quote, ecode = 'B') {
    return `${ecode}-${base}_${quote}`;
  }

  /**
   * Parse futures pair
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @returns {Object|null} { ecode, base, quote }
   */
  static parsePair(pair) {
    const match = pair.match(/^([A-Z])-([A-Z0-9]+)_([A-Z0-9]+)$/);
    if (!match) return null;
    return { ecode: match[1], base: match[2], quote: match[3] };
  }

  /**
   * Convert milliseconds to seconds (for CoinDCX timestamps)
   * @param {number} ms
   * @returns {number}
   */
  static msToSeconds(ms) {
    return Math.floor(ms / 1000);
  }

  /**
   * Convert seconds to milliseconds
   * @param {number} seconds
   * @returns {number}
   */
  static secondsToMs(seconds) {
    return seconds * 1000;
  }

  /**
   * Get current timestamp in seconds (CoinDCX format)
   * @returns {number}
   */
  static nowSeconds() {
    return Math.floor(Date.now() / 1000);
  }
}

// ==================== EXAMPLE USAGE ====================

async function main() {
  const client = new CoinDCXFuturesClient({
    apiKey: process.env.COINDCX_API_KEY || 'your_key',
    apiSecret: process.env.COINDCX_API_SECRET || 'your_secret',
    debug: true,
    autoReconnect: true,
  });

  // ========== REST API EXAMPLES ==========

  try {
    // 1. Get active instruments
    const instruments = await client.getActiveInstruments('USDT');
    console.log('\n✅ Active Instruments:', instruments.length);

    // 2. Get instrument details
    const details = await client.getInstrumentDetails('B-BTC_USDT', 'USDT');
    console.log('\n✅ BTC/USDT Details:', details?.instrument?.max_leverage_long, 'x max leverage');

    // 3. Get futures candles
    const toTime = CoinDCXFuturesClient.nowSeconds();
    const fromTime = toTime - 3600; // 1 hour ago
    const candles = await client.getFuturesCandles('B-BTC_USDT', fromTime, toTime, '1m');
    console.log('\n✅ Candles:', candles.data?.length, 'bars');

    // 4. Get futures trade history
    const trades = await client.getFuturesTradeHistory('B-BTC_USDT', 5);
    console.log('\n✅ Recent Trades:', trades.length);

    // 5. Get order book
    const ob = await client.getFuturesOrderBook('BTCUSDT', 10);
    console.log('\n✅ Order Book:', Object.keys(ob.bids || {}).length, 'bid levels');

    // 6. Get balances
    const balances = await client.getBalances();
    console.log('\n✅ Balances:', balances.filter(b => parseFloat(b.balance) > 0).map(b => `${b.currency}: ${b.balance}`));

    // 7. Create a futures order (uncomment with real credentials)
    // const order = await client.createFuturesOrder({
    //   pair: 'B-BTC_USDT',
    //   side: 'buy',
    //   order_type: 'limit',
    //   price: 50000,
    //   total_quantity: 0.001,
    //   leverage: 5,
    //   time_in_force: 'good_till_cancel',
    //   take_profit_price: 55000,
    //   stop_loss_price: 48000,
    // });
    // console.log('\n✅ Order Created:', order.id);

    // 8. List open orders
    // const orders = await client.listFuturesOrders({ status: 'open', margin_currency_short_name: ['USDT'] });
    // console.log('\n✅ Open Orders:', orders.length);

    // 9. Get positions
    // const positions = await client.getFuturesPositions({ size: 10 });
    // console.log('\n✅ Positions:', positions.length);

  } catch (err) {
    console.error('\n❌ REST Error:', err.message);
  }

  // ========== WEBSOCKET EXAMPLES ==========

  client.on('ws:connect', (data) => {
    console.log('\n🔌 WS Connected:', data.socketId);
  });

  client.on('ws:disconnect', (data) => {
    console.log('\n🔌 WS Disconnected:', data.reason);
  });

  client.on('ws:candlestick', (data) => {
    console.log('\n📊 Candle:', data.pair, data.interval,
      `O:${data.open} H:${data.high} L:${data.low} C:${data.close} V:${data.volume}`);
  });

  client.on('ws:depth-snapshot', (data) => {
    console.log('\n📗 OB Snapshot:', data.bids.length, 'bids,', data.asks.length, 'asks');
  });

  client.on('ws:depth-update', (data) => {
    console.log('\n📘 OB Update:', data.bids.length, 'bids,', data.asks.length, 'asks');
  });

  client.on('ws:new-trade', (data) => {
    console.log('\n💰 Trade:', data.symbol, `@ ${data.price}`, `Qty: ${data.quantity}`,
      data.isMaker ? '(Maker)' : '(Taker)');
  });

  client.on('ws:price-change', (data) => {
    console.log('\n📈 Price:', data.price, 'Time:', new Date(data.timestamp).toISOString());
  });

  client.on('ws:currentPrices@futures#update', (data) => {
    console.log('\n📋 Batch Prices:', Object.keys(data.prices).length, 'pairs updated');
  });

  client.on('ws:df-order-update', (data) => {
    console.log('\n🔔 Futures Order Update:', data);
  });

  client.on('ws:df-position-update', (data) => {
    console.log('\n📍 Futures Position Update:', data);
  });

  client.on('ws:balance-update', (data) => {
    console.log('\n💳 Balance Update:', data);
  });

  // Connect and subscribe
  await client.wsConnect();

  const pair = 'B-BTC_USDT';
  client.wsSubscribeCandles(pair, '1m');
  client.wsSubscribeOrderBook(pair, 50);
  client.wsSubscribeTrades(pair);
  client.wsSubscribePrices(pair);
  client.wsSubscribeCurrentPricesFutures();

  // Private account stream (requires auth)
  // client.wsSubscribeAccountFutures();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    client.wsDisconnect();
    process.exit(0);
  });
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CoinDCXFuturesClient };
```
```
/**
 * CoinDCX Futures Complete Client TypeScript Declarations
 * REST API + Socket.IO WebSocket
 */

export interface CoinDCXFuturesOptions {
  restBaseUrl?: string;
  publicBaseUrl?: string;
  wsEndpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  debug?: boolean;
  timeout?: number;
}

// ==================== REST API TYPES ====================

export interface ActiveInstrument {
  pair: string;
  instrument: string;
  status: string;
  max_leverage_long: number;
  max_leverage_short: number;
  min_quantity: number;
  max_quantity: number;
  step: number;
  tick_size: number;
  maker_fee: number;
  taker_fee: number;
  [key: string]: any;
}

export interface InstrumentDetails {
  instrument: ActiveInstrument;
  [key: string]: any;
}

export interface FuturesCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quote_volume: number;
  open_time: number;
  close_time: number;
  pair: string;
  symbol: string;
  duration: string;
}


export interface SpotCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
}

export interface SpotTrade {
  p: number;
  q: number;
  s: string;
  T: number;
  m: boolean;
}

export interface SpotOrderBook {
  bids: Record<string, string>;
  asks: Record<string, string>;
}

export interface FuturesCandlesResponse {
  data: FuturesCandle[];
  instrument: string;
  pair: string;
}

export interface FuturesTrade {
  price: number;
  quantity: number;
  is_maker: boolean;
  timestamp: number;
  [key: string]: any;
}

export interface FuturesOrderBook {
  bids: Record<string, string>;
  asks: Record<string, string>;
  timestamp: number;
  version: number;
}

export interface CreateFuturesOrderParams {
  pair: string;
  side: 'buy' | 'sell';
  order_type: 'market' | 'limit' | 'stop_limit' | 'stop_market' | 'take_profit_limit' | 'take_profit_market';
  total_quantity: number;
  leverage: number;
  price?: number;
  stop_price?: number;
  time_in_force?: 'good_till_cancel' | 'fill_or_kill' | 'immediate_or_cancel';
  take_profit_price?: number;
  stop_loss_price?: number;
  post_only?: boolean;
  hidden?: boolean;
  client_order_id?: string;
  margin_currency_short_name?: string;
}

export interface FuturesOrder {
  id: string;
  pair: string;
  side: string;
  order_type: string;
  status: string;
  total_quantity: number;
  remaining_quantity: number;
  price: number;
  leverage: number;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface ListFuturesOrdersFilters {
  side?: 'buy' | 'sell';
  status?: 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected';
  margin_currency_short_name?: string[];
  pair?: string;
  page?: number;
  size?: number;
}

export interface FuturesPosition {
  id: string;
  pair: string;
  side: string;
  quantity: number;
  entry_price: number;
  leverage: number;
  pnl: number;
  margin: number;
  status: string;
  [key: string]: any;
}


export interface SubAccountTransferParams {
  fromAccountId: string;
  toAccountId: string;
  currencyShortName: string;
  amount: number;
}

export interface SubAccountTransferResult {
  status: string;
  message: string | number;
  code: number;
}

export interface WalletTransferParams {
  sourceWalletType: 'spot' | 'futures';
  destinationWalletType: 'spot' | 'futures';
  currencyShortName: string;
  amount: number;
}

export interface Balance {
  currency: string;
  balance: string;
  locked_balance: string;
}

export interface UserInfo {
  coindcx_id: string;
  first_name: string;
  last_name: string;
  mobile_number: string;
  email: string;
}

// ==================== WEBSOCKET TYPES ====================

export interface CandlestickData {
  channel: string;
  product: string;
  eventTime?: number;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  openTime: number;
  closeTime: number;
  pair: string;
  symbol: string;
  duration: string;
  raw: any;
}

export interface DepthLevel {
  price: number;
  quantity: number;
}

export interface DepthData {
  timestamp: number;
  version: number;
  product: string;
  bids: DepthLevel[];
  asks: DepthLevel[];
  raw: any;
}

export interface TradeData {
  timestamp: number;
  receiveTime?: number;
  price: number;
  quantity: number;
  isMaker: boolean;
  symbol: string;
  product: string;
  raw: any;
}

export interface PriceChangeData {
  timestamp: number;
  price: number;
  product: string;
  raw: any;
}

export interface CurrentPricesData {
  version: number;
  timestamp: number;
  product: string;
  pST?: number;
  prices: Record<string, {
    markPrice?: number;
    bmST?: number;
    cmRT?: number;
  }>;
  raw: any;
}

export interface WSConnectEvent {
  socketId: string;
}

export interface WSDisconnectEvent {
  reason: string;
}

export interface WSErrorEvent {
  type: string;
  error: Error;
}

export type FuturesInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '8h' | '1D' | '3D' | '1W' | '1M';
export type OrderBookDepth = 10 | 20 | 50;
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected';

// ==================== MAIN CLASS ====================

export declare class CoinDCXFuturesClient extends EventEmitter {
  constructor(options?: CoinDCXFuturesOptions);

  // ---------- REST: Public Futures Endpoints ----------

  getActiveInstruments(marginCurrencyShortName?: string): Promise<ActiveInstrument[]>;
  getInstrumentDetails(pair: string, marginCurrencyShortName?: string): Promise<InstrumentDetails>;
  getFuturesCandles(pair: string, fromTime: number, toTime: number, resolution?: string): Promise<FuturesCandlesResponse>;
  getFuturesTradeHistory(pair: string, limit?: number): Promise<FuturesTrade[]>;
  getFuturesOrderBook(instrument: string, depth?: number): Promise<FuturesOrderBook>;
  getFuturesCurrentPrices(): Promise<Record<string, any>>;
  getFundingRateHistory(pair: string, limit?: number): Promise<any[]>;

  // ---------- REST: Spot Market Data (Public) ----------

  getSpotCandles(pair: string, interval?: string, startTime?: number, endTime?: number, limit?: number): Promise<SpotCandle[]>;
  getSpotTradeHistory(pair: string, limit?: number): Promise<SpotTrade[]>;
  getSpotOrderBook(pair: string): Promise<SpotOrderBook>;

  // ---------- REST: Authenticated Futures Endpoints ----------

  createFuturesOrder(params: CreateFuturesOrderParams): Promise<FuturesOrder>;
  listFuturesOrders(filters?: ListFuturesOrdersFilters): Promise<{ orders: FuturesOrder[]; pagination: any }>;
  getFuturesOrder(id: string): Promise<FuturesOrder>;
  cancelFuturesOrder(id: string): Promise<{ status: string; message: string }>;
  cancelAllFuturesOrders(pair: string, side?: OrderSide): Promise<{ status: string; message: string }>;
  editFuturesOrder(params: { id: string; total_quantity?: number; price?: number; take_profit_price?: number; stop_loss_price?: number }): Promise<FuturesOrder>;
  getFuturesPositions(filters?: { page?: number; size?: number; pair?: string; margin_currency_short_name?: string }): Promise<{ positions: FuturesPosition[]; pagination: any }>;
  closeFuturesPosition(id: string): Promise<{ status: string; message: string }>;
  updateLeverage(pair: string, leverage: number): Promise<{ status: string; message: string }>;
  getFuturesTransactions(filters?: { pair?: string; from_time?: number; to_time?: number; page?: number; size?: number }): Promise<any>;
  addFuturesMargin(id: string, amount: number): Promise<{ status: string; message: string }>;
  removeFuturesMargin(id: string, amount: number): Promise<{ status: string; message: string }>;

  // ---------- REST: Legacy Spot/Margin Endpoints ----------

  getTicker(): Promise<any[]>;
  getMarkets(): Promise<string[]>;
  getMarketsDetails(): Promise<any[]>;
  getBalances(): Promise<Balance[]>;
  getUserInfo(): Promise<UserInfo>;
  walletTransfer(sourceWalletType: string, destinationWalletType: string, currencyShortName: string, amount: number): Promise<{ status: string; message: string; code: number }>;
  subAccountTransfer(params: SubAccountTransferParams): Promise<SubAccountTransferResult>;


  // ---------- WebSocket Methods ----------

  wsConnect(): Promise<void>;
  wsDisconnect(): void;
  wsIsConnected(): boolean;
  wsGetSubscribedChannels(): string[];

  wsSubscribeCandles(pair: string, interval?: FuturesInterval): void;
  wsUnsubscribeCandles(pair: string, interval?: FuturesInterval): void;
  wsSubscribeOrderBook(pair: string, depth?: OrderBookDepth): void;
  wsUnsubscribeOrderBook(pair: string, depth?: OrderBookDepth): void;
  wsSubscribeTrades(pair: string): void;
  wsUnsubscribeTrades(pair: string): void;
  wsSubscribePrices(pair: string): void;
  wsUnsubscribePrices(pair: string): void;
  wsSubscribeCurrentPricesFutures(): void;
  wsUnsubscribeCurrentPricesFutures(): void;
  wsSubscribeAccountFutures(): void;
  wsUnsubscribeAccountFutures(): void;

  // ---------- Static Helpers ----------

  static buildPair(base: string, quote: string, ecode?: string): string;
  static parsePair(pair: string): { ecode: string; base: string; quote: string } | null;
  static msToSeconds(ms: number): number;
  static secondsToMs(seconds: number): number;
  static nowSeconds(): number;

  // ---------- EventEmitter Overloads ----------

  on(event: 'ws:connect', listener: (data: WSConnectEvent) => void): this;
  on(event: 'ws:disconnect', listener: (data: WSDisconnectEvent) => void): this;
  on(event: 'ws:error', listener: (data: WSErrorEvent) => void): this;
  on(event: 'ws:candlestick', listener: (data: CandlestickData) => void): this;
  on(event: 'ws:depth-snapshot', listener: (data: DepthData) => void): this;
  on(event: 'ws:depth-update', listener: (data: DepthData) => void): this;
  on(event: 'ws:new-trade', listener: (data: TradeData) => void): this;
  on(event: 'ws:price-change', listener: (data: PriceChangeData) => void): this;
  on(event: 'ws:currentPrices@futures#update', listener: (data: CurrentPricesData) => void): this;
  on(event: 'ws:df-order-update', listener: (data: any) => void): this;
  on(event: 'ws:df-position-update', listener: (data: any) => void): this;
  on(event: 'ws:balance-update', listener: (data: any) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;

  emit(event: 'ws:connect', data: WSConnectEvent): boolean;
  emit(event: 'ws:disconnect', data: WSDisconnectEvent): boolean;
  emit(event: 'ws:error', data: WSErrorEvent): boolean;
  emit(event: 'ws:candlestick', data: CandlestickData): boolean;
  emit(event: 'ws:depth-snapshot', data: DepthData): boolean;
  emit(event: 'ws:depth-update', data: DepthData): boolean;
  emit(event: 'ws:new-trade', data: TradeData): boolean;
  emit(event: 'ws:price-change', data: PriceChangeData): boolean;
  emit(event: 'ws:currentPrices@futures#update', data: CurrentPricesData): boolean;
  emit(event: 'ws:df-order-update', data: any): boolean;
  emit(event: 'ws:df-position-update', data: any): boolean;
  emit(event: 'ws:balance-update', data: any): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;
}
```
```
{
  "name": "coindcx-futures-client",
  "version": "2.1.0",
  "description": "Complete CoinDCX Futures Client - REST API + Socket.IO WebSocket with all documented endpoints",
  "main": "coindcx-futures-client.js",
  "types": "coindcx-futures-client.d.ts",
  "scripts": {
    "start": "node coindcx-futures-client.js",
    "test": "node -e "const {CoinDCXFuturesClient} = require('./coindcx-futures-client'); console.log('Module loaded OK')""
  },
  "keywords": [
    "coindcx",
    "futures",
    "websocket",
    "socket.io",
    "rest-api",
    "crypto",
    "trading",
    "api",
    "derivatives"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "socket.io-client": "2.4.0"
  },
  "optionalDependencies": {
    "axios": "^1.6.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```
```
/**
 * CoinDCX Futures Complete Client Library
 * Supports all documented futures WebSocket channels and REST API endpoints
 *
 * Requirements: socket.io-client@2.4.0 (CoinDCX requires v2.x)
 *                 axios or node-fetch for REST calls
 *
 * @example
 * const { CoinDCXFuturesClient } = require('./coindcx-futures-client');
 *
 * // Initialize with API credentials for private endpoints
 * const client = new CoinDCXFuturesClient({
 *   apiKey: 'your_api_key',
 *   apiSecret: 'your_api_secret',
 *   debug: true
 * });
 *
 * // REST API Examples
 * const instruments = await client.getActiveInstruments('USDT');
 * const candles = await client.getFuturesCandles('B-BTC_USDT', fromTime, toTime, '1m');
 * const order = await client.createFuturesOrder({
 *   pair: 'B-BTC_USDT',
 *   side: 'buy',
 *   order_type: 'limit',
 *   price: 50000,
 *   total_quantity: 0.01,
 *   leverage: 10
 * });
 *
 * // WebSocket Examples
 * await client.wsConnect();
 * client.wsSubscribeCandles('B-BTC_USDT', '1m');
 * client.wsSubscribeOrderBook('B-BTC_USDT', 50);
 * client.wsSubscribeAccountFutures();
 */

const io = require('socket.io-client');
const crypto = require('crypto');
const EventEmitter = require('events');

// Use native fetch if available (Node 18+), otherwise require axios
let httpClient;
try {
  if (globalThis.fetch) {
    httpClient = 'fetch';
  } else {
    httpClient = 'axios';
    require('axios');
  }
} catch (e) {
  httpClient = 'axios';
}

class CoinDCXFuturesClient extends EventEmitter {
  /**
   * @param {Object} options
   * @param {string} [options.restBaseUrl='https://api.coindcx.com'] - REST API base URL
   * @param {string} [options.publicBaseUrl='https://public.coindcx.com'] - Public data base URL
   * @param {string} [options.wsEndpoint='wss://stream.coindcx.com'] - WebSocket endpoint
   * @param {string} [options.apiKey] - API key for authenticated endpoints
   * @param {string} [options.apiSecret] - API secret for authenticated endpoints
   * @param {boolean} [options.autoReconnect=true] - Auto reconnect WS on disconnect
   * @param {number} [options.reconnectDelay=5000] - WS reconnect delay in ms
   * @param {boolean} [options.debug=false] - Enable debug logging
   * @param {number} [options.timeout=30000] - HTTP request timeout in ms
   */
  constructor(options = {}) {
    super();

    this.restBaseUrl = options.restBaseUrl || 'https://api.coindcx.com';
    this.publicBaseUrl = options.publicBaseUrl || 'https://public.coindcx.com';
    this.wsEndpoint = options.wsEndpoint || 'wss://stream.coindcx.com';
    this.apiKey = options.apiKey || '';
    this.apiSecret = options.apiSecret || '';
    this.autoReconnect = options.autoReconnect !== false;
    this.reconnectDelay = options.reconnectDelay || 5000;
    this.debug = options.debug || false;
    this.timeout = options.timeout || 30000;

    // WebSocket state
    this.socket = null;
    this.wsConnected = false;
    this.subscribedChannels = new Set();
    this.pendingSubscriptions = new Set();
    this.reconnectTimer = null;
    this.pingInterval = null;
    this.isReconnecting = false;

    // Futures event mappings
    this.futuresEvents = {
      candles: 'candlestick',
      orderBookSnapshot: 'depth-snapshot',
      orderBookUpdate: 'depth-update',
      trades: 'new-trade',
      prices: 'price-change',
      currentPrices: 'currentPrices@futures#update',
      accountOrder: 'df-order-update',
      accountPosition: 'df-position-update',
      accountBalance: 'balance-update',
    };
  }

  _log(...args) {
    if (this.debug) {
      console.log('[CoinDCX-Futures]', ...args);
    }
  }

  _error(...args) {
    console.error('[CoinDCX-Futures]', ...args);
  }

  // ==================== AUTHENTICATION HELPERS ====================

  /**
   * Generate HMAC-SHA256 signature for authenticated requests
   * @param {Object} body - Payload to sign
   * @returns {string} Hex signature
   */
  _generateSignature(body) {
    if (!this.apiSecret) {
      throw new Error('API secret required for authenticated endpoints');
    }
    const payload = JSON.stringify(body);
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Build authenticated headers
   * @param {Object} body - Request body
   * @returns {Object} Headers object
   */
  _buildAuthHeaders(body) {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('apiKey and apiSecret required for authenticated endpoints');
    }
    const signature = this._generateSignature(body);
    return {
      'Content-Type': 'application/json',
      'X-AUTH-APIKEY': this.apiKey,
      'X-AUTH-SIGNATURE': signature,
    };
  }

  /**
   * Add timestamp to body if not present
   * @param {Object} body
   * @returns {Object} Body with timestamp
   */
  _addTimestamp(body) {
    if (!body.timestamp) {
      body.timestamp = Math.floor(Date.now() / 1000); // CoinDCX uses seconds
    }
    return body;
  }

  // ==================== HTTP CLIENT ====================

  async _httpRequest(method, url, body = null, isPublic = false) {
    const fullUrl = url.startsWith('http') ? url : `${this.restBaseUrl}${url}`;

    let headers = { 'Content-Type': 'application/json' };

    if (!isPublic && body) {
      body = this._addTimestamp(body);
      headers = { ...headers, ...this._buildAuthHeaders(body) };
    }

    if (httpClient === 'fetch') {
      const response = await fetch(fullUrl, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }
      return await response.json();
    } else {
      const axios = require('axios');
      const response = await axios({
        method,
        url: fullUrl,
        headers,
        data: body,
        timeout: this.timeout,
      });
      return response.data;
    }
  }

  async _get(url, params = {}, isPublic = false) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    return this._httpRequest('GET', fullUrl, null, isPublic);
  }

  async _post(url, body = {}, isPublic = false) {
    return this._httpRequest('POST', url, body, isPublic);
  }

  // ==================== PUBLIC FUTURES REST ENDPOINTS ====================

  /**
   * Get all active futures instruments
   * @param {string} marginCurrencyShortName - e.g. 'USDT', 'INR'
   * @returns {Promise<Object[]>} Array of active instruments
   */
  async getActiveInstruments(marginCurrencyShortName = 'USDT') {
    const url = `/exchange/v1/derivatives/futures/data/active_instruments`;
    const params = { 'margin_currency_short_name[]': marginCurrencyShortName };
    return this._get(url, params, true);
  }

  /**
   * Get detailed information for a specific futures instrument
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {string} marginCurrencyShortName - e.g. 'USDT'
   * @returns {Promise<Object>} Instrument details
   */
  async getInstrumentDetails(pair, marginCurrencyShortName = 'USDT') {
    const url = `/exchange/v1/derivatives/futures/data/instruments`;
    const params = { pair, margin_currency_short_name: marginCurrencyShortName };
    return this._get(url, params, true);
  }

  /**
   * Get futures candlestick data
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {number} fromTime - Start timestamp in seconds
   * @param {number} toTime - End timestamp in seconds
   * @param {string} resolution - '1m', '5m', '15m', '30m', '1h', '4h', '8h', '1D', '3D', '1W', '1M'
   * @returns {Promise<Object>} { data: Candle[], instrument: string, pair: string }
   */
  async getFuturesCandles(pair, fromTime, toTime, resolution = '1m') {
    const url = `/exchange/v1/derivatives/futures/data/candles`;
    const params = { pair, from_time: fromTime, to_time: toTime, resolution };
    return this._get(url, params, true);
  }

  /**
   * Get futures trade history
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {number} [limit=50] - Number of trades to fetch
   * @returns {Promise<Object[]>} Array of trades
   */
  async getFuturesTradeHistory(pair, limit = 50) {
    const url = `/exchange/v1/derivatives/futures/data/trade_history`;
    const params = { pair, limit };
    return this._get(url, params, true);
  }

  /**
   * Get futures order book (L3)
   * @param {string} instrument - Instrument name (from getActiveInstruments)
   * @param {number} [depth=50] - Depth levels (10, 20, 50)
   * @returns {Promise<Object>} { bids: {}, asks: {}, timestamp, version }
   */
  async getFuturesOrderBook(instrument, depth = 50) {
    const url = `${this.publicBaseUrl}/public/market_data/v3/orderbook/${instrument}-futures/${depth}`;
    return this._get(url, {}, true);
  }

  /**
   * Get futures current prices (batch)
   * @returns {Promise<Object>} Current prices for all futures pairs
   */
  async getFuturesCurrentPrices() {
    const url = `/exchange/v1/derivatives/futures/data/current_prices`;
    return this._get(url, {}, true);
  }

  /**
   * Get funding rate history
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {number} [limit=100] - Number of records
   * @returns {Promise<Object[]>}
   */
  async getFundingRateHistory(pair, limit = 100) {
    const url = `/exchange/v1/derivatives/futures/data/funding_rate`;
    const params = { pair, limit };
    return this._get(url, params, true);
  }


  // ==================== SPOT MARKET DATA REST ENDPOINTS (Public) ====================

  /**
   * Get spot candlestick data
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {string} interval - '1m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '1d', '3d', '1w', '1M'
   * @param {number} [startTime] - Start timestamp in ms
   * @param {number} [endTime] - End timestamp in ms
   * @param {number} [limit=500] - Max 1000
   * @returns {Promise<Object[]>} Array of candle objects
   */
  async getSpotCandles(pair, interval = '1m', startTime, endTime, limit = 500) {
    const url = `${this.publicBaseUrl}/market_data/candles`;
    const params = { pair, interval };
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    if (limit) params.limit = limit;
    return this._get(url, params, true);
  }

  /**
   * Get spot trade history
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {number} [limit=50] - Max 500
   * @returns {Promise<Object[]>} Array of trades
   */
  async getSpotTradeHistory(pair, limit = 50) {
    const url = `${this.publicBaseUrl}/market_data/trade_history`;
    const params = { pair, limit };
    return this._get(url, params, true);
  }

  /**
   * Get spot order book (L2)
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @returns {Promise<Object>} { bids: {}, asks: {} }
   */
  async getSpotOrderBook(pair) {
    const url = `${this.publicBaseUrl}/market_data/orderbook`;
    const params = { pair };
    return this._get(url, params, true);
  }

  // ==================== AUTHENTICATED FUTURES REST ENDPOINTS ====================

  /**
   * Create a new futures order
   * @param {Object} params
   * @param {string} params.pair - e.g. 'B-BTC_USDT'
   * @param {string} params.side - 'buy' or 'sell'
   * @param {string} params.order_type - 'market', 'limit', 'stop_limit', 'stop_market', 'take_profit_limit', 'take_profit_market'
   * @param {number} params.total_quantity - Order quantity
   * @param {number} params.leverage - Leverage multiplier
   * @param {number} [params.price] - Order price (required for limit orders)
   * @param {number} [params.stop_price] - Trigger price (for stop/take_profit orders)
   * @param {string} [params.time_in_force] - 'good_till_cancel', 'fill_or_kill', 'immediate_or_cancel'
   * @param {number} [params.take_profit_price] - Take profit trigger price
   * @param {number} [params.stop_loss_price] - Stop loss trigger price
   * @param {boolean} [params.post_only] - Maker-only order
   * @param {boolean} [params.hidden] - Hidden order
   * @param {string} [params.client_order_id] - Custom order ID
   * @param {string} [params.margin_currency_short_name] - 'USDT' or 'INR'
   * @returns {Promise<Object>} Created order details
   */
  async createFuturesOrder(params) {
    const url = `/exchange/v1/derivatives/futures/orders/create`;
    const body = {
      side: params.side,
      pair: params.pair,
      order_type: params.order_type,
      total_quantity: params.total_quantity,
      leverage: params.leverage,
      ...(params.price && { price: params.price }),
      ...(params.stop_price && { stop_price: params.stop_price }),
      ...(params.time_in_force && { time_in_force: params.time_in_force }),
      ...(params.take_profit_price && { take_profit_price: params.take_profit_price }),
      ...(params.stop_loss_price && { stop_loss_price: params.stop_loss_price }),
      ...(params.post_only !== undefined && { post_only: params.post_only }),
      ...(params.hidden !== undefined && { hidden: params.hidden }),
      ...(params.client_order_id && { client_order_id: params.client_order_id }),
      ...(params.margin_currency_short_name && { margin_currency_short_name: params.margin_currency_short_name }),
    };
    return this._post(url, body);
  }

  /**
   * List futures orders
   * @param {Object} filters
   * @param {string} [filters.side] - 'buy' or 'sell'
   * @param {string} [filters.status] - 'open', 'partially_filled', 'filled', 'cancelled', 'rejected'
   * @param {string[]} [filters.margin_currency_short_name] - ['USDT'] or ['INR']
   * @param {string} [filters.pair] - e.g. 'B-BTC_USDT'
   * @param {number} [filters.page=1] - Page number
   * @param {number} [filters.size=10] - Records per page
   * @returns {Promise<Object>} Paginated orders list
   */
  async listFuturesOrders(filters = {}) {
    const url = `/exchange/v1/derivatives/futures/orders`;
    const body = {
      ...(filters.side && { side: filters.side }),
      ...(filters.status && { status: filters.status }),
      ...(filters.margin_currency_short_name && { margin_currency_short_name: filters.margin_currency_short_name }),
      ...(filters.pair && { pair: filters.pair }),
      ...(filters.page && { page: filters.page }),
      ...(filters.size && { size: filters.size }),
    };
    return this._post(url, body);
  }

  /**
   * Get futures order details
   * @param {string} id - Order ID
   * @returns {Promise<Object>} Order details
   */
  async getFuturesOrder(id) {
    const url = `/exchange/v1/derivatives/futures/orders/details`;
    return this._post(url, { id });
  }

  /**
   * Cancel a futures order
   * @param {string} id - Order ID to cancel
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelFuturesOrder(id) {
    const url = `/exchange/v1/derivatives/futures/orders/cancel`;
    return this._post(url, { id });
  }

  /**
   * Cancel all futures orders for a pair
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {string} [side] - 'buy' or 'sell' (optional)
   * @returns {Promise<Object>}
   */
  async cancelAllFuturesOrders(pair, side) {
    const url = `/exchange/v1/derivatives/futures/orders/cancel_all`;
    const body = { pair };
    if (side) body.side = side;
    return this._post(url, body);
  }

  /**
   * Edit an existing futures order
   * @param {Object} params
   * @param {string} params.id - Order ID
   * @param {number} [params.total_quantity] - New quantity
   * @param {number} [params.price] - New price
   * @param {number} [params.take_profit_price] - New TP price
   * @param {number} [params.stop_loss_price] - New SL price
   * @returns {Promise<Object>} Updated order
   */
  async editFuturesOrder(params) {
    const url = `/exchange/v1/derivatives/futures/orders/edit`;
    const body = {
      id: params.id,
      ...(params.total_quantity !== undefined && { total_quantity: params.total_quantity }),
      ...(params.price !== undefined && { price: params.price }),
      ...(params.take_profit_price !== undefined && { take_profit_price: params.take_profit_price }),
      ...(params.stop_loss_price !== undefined && { stop_loss_price: params.stop_loss_price }),
    };
    return this._post(url, body);
  }

  /**
   * Get open futures positions
   * @param {Object} filters
   * @param {number} [filters.page=1] - Page number
   * @param {number} [filters.size=10] - Records per page
   * @param {string} [filters.pair] - Filter by pair
   * @param {string} [filters.margin_currency_short_name] - 'USDT' or 'INR'
   * @returns {Promise<Object>} Paginated positions list
   */
  async getFuturesPositions(filters = {}) {
    const url = `/exchange/v1/derivatives/futures/positions`;
    const body = {
      ...(filters.page && { page: filters.page }),
      ...(filters.size && { size: filters.size }),
      ...(filters.pair && { pair: filters.pair }),
      ...(filters.margin_currency_short_name && { margin_currency_short_name: filters.margin_currency_short_name }),
    };
    return this._post(url, body);
  }

  /**
   * Close a futures position (market close)
   * @param {string} id - Position ID
   * @returns {Promise<Object>}
   */
  async closeFuturesPosition(id) {
    const url = `/exchange/v1/derivatives/futures/positions/close`;
    return this._post(url, { id });
  }

  /**
   * Update leverage for a futures pair
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @param {number} leverage - New leverage value
   * @returns {Promise<Object>}
   */
  async updateLeverage(pair, leverage) {
    const url = `/exchange/v1/derivatives/futures/leverage`;
    return this._post(url, { pair, leverage });
  }

  /**
   * Get futures transactions / trade history
   * @param {Object} filters
   * @param {string} [filters.pair] - Filter by pair
   * @param {number} [filters.from_time] - Start timestamp (seconds)
   * @param {number} [filters.to_time] - End timestamp (seconds)
   * @param {number} [filters.page=1] - Page number
   * @param {number} [filters.size=10] - Records per page
   * @returns {Promise<Object>}
   */
  async getFuturesTransactions(filters = {}) {
    const url = `/exchange/v1/derivatives/futures/transactions`;
    const body = {
      ...(filters.pair && { pair: filters.pair }),
      ...(filters.from_time && { from_time: filters.from_time }),
      ...(filters.to_time && { to_time: filters.to_time }),
      ...(filters.page && { page: filters.page }),
      ...(filters.size && { size: filters.size }),
    };
    return this._post(url, body);
  }

  /**
   * Add margin to a futures position
   * @param {string} id - Position ID
   * @param {number} amount - Amount to add
   * @returns {Promise<Object>}
   */
  async addFuturesMargin(id, amount) {
    const url = `/exchange/v1/derivatives/futures/positions/add_margin`;
    return this._post(url, { id, amount });
  }

  /**
   * Remove margin from a futures position
   * @param {string} id - Position ID
   * @param {number} amount - Amount to remove
   * @returns {Promise<Object>}
   */
  async removeFuturesMargin(id, amount) {
    const url = `/exchange/v1/derivatives/futures/positions/remove_margin`;
    return this._post(url, { id, amount });
  }

  // ==================== SPOT/MARGIN REST ENDPOINTS (Legacy) ====================

  /**
   * Get all market tickers (spot)
   * @returns {Promise<Object[]>}
   */
  async getTicker() {
    return this._get('/exchange/ticker', {}, true);
  }

  /**
   * Get all markets (spot)
   * @returns {Promise<string[]>}
   */
  async getMarkets() {
    return this._get('/exchange/v1/markets', {}, true);
  }

  /**
   * Get market details (spot)
   * @returns {Promise<Object[]>}
   */
  async getMarketsDetails() {
    return this._get('/exchange/v1/markets_details', {}, true);
  }

  /**
   * Get user balances
   * @returns {Promise<Object[]>}
   */
  async getBalances() {
    return this._post('/exchange/v1/users/balances', {});
  }

  /**
   * Get user info
   * @returns {Promise<Object>}
   */
  async getUserInfo() {
    return this._post('/exchange/v1/users/info', {});
  }

  /**
   * Transfer between wallets (spot <-> futures)
   * @param {string} sourceWalletType - 'spot' or 'futures'
   * @param {string} destinationWalletType - 'spot' or 'futures'
   * @param {string} currencyShortName - e.g. 'USDT'
   * @param {number} amount - Amount to transfer
   * @returns {Promise<Object>}
   */
  async walletTransfer(sourceWalletType, destinationWalletType, currencyShortName, amount) {
    return this._post('/exchange/v1/wallets/transfer', {
      source_wallet_type: sourceWalletType,
      destination_wallet_type: destinationWalletType,
      currency_short_name: currencyShortName,
      amount,
    });
  }

  // ==================== SUB-ACCOUNT MANAGEMENT ====================

  /**
   * Transfer funds between master account and sub-accounts
   * @param {Object} params
   * @param {string} params.fromAccountId - Source account ID (main or sub-account)
   * @param {string} params.toAccountId - Destination account ID (main or sub-account)
   * @param {string} params.currencyShortName - Asset type e.g. 'USDT', 'BTC'
   * @param {number} params.amount - Amount to transfer
   * @returns {Promise<Object>} { status, message, code }
   *
   * Supported transfers:
   * - Main spot wallet → Sub-account spot wallet
   * - Sub-account spot wallet → Main spot wallet
   * - Sub-account spot wallet → Another sub-account spot wallet
   *
   * Note: Only available for API keys created after 12th August 2024
   */
  async subAccountTransfer(params) {
    const url = `/exchange/v1/wallets/sub_account_transfer`;
    const body = {
      from_account_id: params.fromAccountId,
      to_account_id: params.toAccountId,
      currency_short_name: params.currencyShortName,
      amount: params.amount,
    };
    return this._post(url, body);
  }



  // ==================== WEBSOCKET METHODS ====================

  /**
   * Connect to the CoinDCX Socket.IO stream
   * @returns {Promise<void>}
   */
  async wsConnect() {
    if (this.socket && this.wsConnected) {
      this._log('WS Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.wsEndpoint, {
          transports: ['websocket'],
          reconnection: false,
          timeout: 30000,
        });

        this.socket.on('connect', () => {
          this.wsConnected = true;
          this.isReconnecting = false;
          this._log('WS Connected:', this.socket.id);
          this._wsResubscribeAll();
          this._wsStartPing();
          this.emit('ws:connect', { socketId: this.socket.id });
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          this.wsConnected = false;
          this._wsStopPing();
          this._log('WS Disconnected:', reason);
          this.emit('ws:disconnect', { reason });
          if (this.autoReconnect && !this.isReconnecting) {
            this._wsScheduleReconnect();
          }
        });

        this.socket.on('connect_error', (err) => {
          this._error('WS Connection error:', err.message);
          this.emit('ws:error', { type: 'connect_error', error: err });
          if (!this.wsConnected) reject(err);
        });

        this.socket.on('error', (err) => {
          this._error('WS Socket error:', err);
          this.emit('ws:error', { type: 'socket_error', error: err });
        });

        this._setupWsEventListeners();

      } catch (err) {
        reject(err);
      }
    });
  }

  _setupWsEventListeners() {
    // Public futures events
    this.socket.on(this.futuresEvents.candles, (response) => {
      this._log('WS Candlestick:', response.channel || response.i);
      this.emit('ws:candlestick', this._normalizeCandlestick(response));
    });

    this.socket.on(this.futuresEvents.orderBookSnapshot, (response) => {
      this._log('WS Depth Snapshot:', response.channel);
      this.emit('ws:depth-snapshot', this._normalizeDepth(response));
    });

    this.socket.on(this.futuresEvents.orderBookUpdate, (response) => {
      this._log('WS Depth Update:', response.channel);
      this.emit('ws:depth-update', this._normalizeDepth(response));
    });

    this.socket.on(this.futuresEvents.trades, (response) => {
      this._log('WS New Trade:', response.s);
      this.emit('ws:new-trade', this._normalizeTrade(response));
    });

    this.socket.on(this.futuresEvents.prices, (response) => {
      this._log('WS Price Change:', response.p);
      this.emit('ws:price-change', this._normalizePriceChange(response));
    });

    this.socket.on(this.futuresEvents.currentPrices, (response) => {
      this._log('WS Current Prices:', Object.keys(response.prices || {}).length, 'pairs');
      this.emit('ws:currentPrices@futures#update', this._normalizeCurrentPrices(response));
    });

    // Private futures events
    this.socket.on(this.futuresEvents.accountOrder, (response) => {
      this._log('WS Account Order Update');
      this.emit('ws:df-order-update', response.data || response);
    });

    this.socket.on(this.futuresEvents.accountPosition, (response) => {
      this._log('WS Account Position Update');
      this.emit('ws:df-position-update', response.data || response);
    });

    this.socket.on(this.futuresEvents.accountBalance, (response) => {
      this._log('WS Balance Update');
      this.emit('ws:balance-update', response.data || response);
    });
  }

  // WS Normalizers
  _normalizeCandlestick(response) {
    const data = response.data || response;
    const candle = Array.isArray(data) ? data[0] : data;
    return {
      channel: response.channel || response.i,
      product: response.pr || 'futures',
      eventTime: response.Ets,
      interval: response.i,
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume),
      quoteVolume: parseFloat(candle.quote_volume),
      openTime: candle.open_time * 1000,
      closeTime: candle.close_time * 1000,
      pair: candle.pair,
      symbol: candle.symbol,
      duration: candle.duration,
      raw: response,
    };
  }

  _normalizeDepth(response) {
    return {
      timestamp: response.ts,
      version: response.vs,
      product: response.pr || 'futures',
      bids: this._parseDepthLevels(response.bids),
      asks: this._parseDepthLevels(response.asks),
      raw: response,
    };
  }

  _parseDepthLevels(levels) {
    if (!levels) return [];
    return Object.entries(levels).map(([price, qty]) => ({
      price: parseFloat(price),
      quantity: parseFloat(qty),
    }));
  }

  _normalizeTrade(response) {
    return {
      timestamp: response.T,
      receiveTime: response.RT,
      price: parseFloat(response.p),
      quantity: parseFloat(response.q),
      isMaker: response.m === 1,
      symbol: response.s,
      product: response.pr === 'f' ? 'futures' : response.pr,
      raw: response,
    };
  }

  _normalizePriceChange(response) {
    return {
      timestamp: response.T,
      price: parseFloat(response.p),
      product: response.pr === 'f' ? 'futures' : response.pr,
      raw: response,
    };
  }

  _normalizeCurrentPrices(response) {
    const prices = {};
    if (response.prices) {
      for (const [pair, data] of Object.entries(response.prices)) {
        prices[pair] = {
          markPrice: data.mp ? parseFloat(data.mp) : undefined,
          bmST: data.bmST,
          cmRT: data.cmRT,
        };
      }
    }
    return {
      version: response.vs,
      timestamp: response.ts,
      product: response.pr || 'futures',
      pST: response.pST,
      prices,
      raw: response,
    };
  }

  // WS Subscription Methods
  wsSubscribeCandles(pair, interval = '1m') {
    this._wsJoinChannel(`${pair}_${interval}-futures`);
  }

  wsUnsubscribeCandles(pair, interval = '1m') {
    this._wsLeaveChannel(`${pair}_${interval}-futures`);
  }

  wsSubscribeOrderBook(pair, depth = 50) {
    this._wsJoinChannel(`${pair}@orderbook@${depth}-futures`);
  }

  wsUnsubscribeOrderBook(pair, depth = 50) {
    this._wsLeaveChannel(`${pair}@orderbook@${depth}-futures`);
  }

  wsSubscribeTrades(pair) {
    this._wsJoinChannel(`${pair}@trades-futures`);
  }

  wsUnsubscribeTrades(pair) {
    this._wsLeaveChannel(`${pair}@trades-futures`);
  }

  wsSubscribePrices(pair) {
    this._wsJoinChannel(`${pair}@prices-futures`);
  }

  wsUnsubscribePrices(pair) {
    this._wsLeaveChannel(`${pair}@prices-futures`);
  }

  wsSubscribeCurrentPricesFutures() {
    this._wsJoinChannel('currentPrices@futures@rt');
  }

  wsUnsubscribeCurrentPricesFutures() {
    this._wsLeaveChannel('currentPrices@futures@rt');
  }

  wsSubscribeAccountFutures() {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('apiKey and apiSecret required for account streams');
    }
    const channel = 'coindcx';
    const body = { channel };
    const signature = this._generateSignature(body);
    this._wsJoinChannel(channel, { authSignature: signature, apiKey: this.apiKey });
  }

  wsUnsubscribeAccountFutures() {
    this._wsLeaveChannel('coindcx');
  }

  // WS Channel Management
  _wsJoinChannel(channelName, authPayload = null) {
    this.pendingSubscriptions.add(channelName);
    if (!this.wsConnected) {
      this._log('WS Pending subscription:', channelName);
      return;
    }
    const payload = { channelName, ...authPayload };
    this.socket.emit('join', payload);
    this.subscribedChannels.add(channelName);
    this.pendingSubscriptions.delete(channelName);
    this._log('WS Joined channel:', channelName);
  }

  _wsLeaveChannel(channelName) {
    if (!this.wsConnected) return;
    this.socket.emit('leave', { channelName });
    this.subscribedChannels.delete(channelName);
    this.pendingSubscriptions.delete(channelName);
    this._log('WS Left channel:', channelName);
  }

  _wsResubscribeAll() {
    const channels = Array.from(this.subscribedChannels);
    const pending = Array.from(this.pendingSubscriptions);
    this.subscribedChannels.clear();
    this.pendingSubscriptions.clear();
    for (const channel of [...channels, ...pending]) {
      if (channel === 'coindcx') {
        this.wsSubscribeAccountFutures();
      } else {
        this._wsJoinChannel(channel);
      }
    }
  }

  _wsStartPing() {
    this._wsStopPing();
    this.pingInterval = setInterval(() => {
      if (this.wsConnected && this.socket) {
        this.socket.emit('ping', { data: 'Ping message' });
        this._log('WS Ping sent');
      }
    }, 25000);
  }

  _wsStopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  _wsScheduleReconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    this._log(`WS Reconnecting in ${this.reconnectDelay}ms...`);
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.wsConnect();
      } catch (err) {
        this._error('WS Reconnect failed:', err.message);
        this.isReconnecting = false;
        if (this.autoReconnect) this._wsScheduleReconnect();
      }
    }, this.reconnectDelay);
  }

  /**
   * Disconnect WebSocket
   */
  wsDisconnect() {
    this.autoReconnect = false;
    this._wsStopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.wsConnected = false;
    this.subscribedChannels.clear();
    this.pendingSubscriptions.clear();
    this._log('WS Disconnected manually');
  }

  /**
   * Get list of currently subscribed WS channels
   * @returns {string[]}
   */
  wsGetSubscribedChannels() {
    return Array.from(this.subscribedChannels);
  }

  /**
   * Check if WS is connected
   * @returns {boolean}
   */
  wsIsConnected() {
    return this.wsConnected;
  }

  // ==================== STATIC HELPERS ====================

  /**
   * Build futures pair string
   * @param {string} base - e.g. 'BTC'
   * @param {string} quote - e.g. 'USDT'
   * @param {string} ecode - exchange code, default 'B'
   * @returns {string} e.g. 'B-BTC_USDT'
   */
  static buildPair(base, quote, ecode = 'B') {
    return `${ecode}-${base}_${quote}`;
  }

  /**
   * Parse futures pair
   * @param {string} pair - e.g. 'B-BTC_USDT'
   * @returns {Object|null} { ecode, base, quote }
   */
  static parsePair(pair) {
    const match = pair.match(/^([A-Z])-([A-Z0-9]+)_([A-Z0-9]+)$/);
    if (!match) return null;
    return { ecode: match[1], base: match[2], quote: match[3] };
  }

  /**
   * Convert milliseconds to seconds (for CoinDCX timestamps)
   * @param {number} ms
   * @returns {number}
   */
  static msToSeconds(ms) {
    return Math.floor(ms / 1000);
  }

  /**
   * Convert seconds to milliseconds
   * @param {number} seconds
   * @returns {number}
   */
  static secondsToMs(seconds) {
    return seconds * 1000;
  }

  /**
   * Get current timestamp in seconds (CoinDCX format)
   * @returns {number}
   */
  static nowSeconds() {
    return Math.floor(Date.now() / 1000);
  }
}

// ==================== EXAMPLE USAGE ====================

async function main() {
  const client = new CoinDCXFuturesClient({
    apiKey: process.env.COINDCX_API_KEY || 'your_key',
    apiSecret: process.env.COINDCX_API_SECRET || 'your_secret',
    debug: true,
    autoReconnect: true,
  });

  // ========== REST API EXAMPLES ==========

  try {
    // 1. Get active instruments
    const instruments = await client.getActiveInstruments('USDT');
    console.log('\n✅ Active Instruments:', instruments.length);

    // 2. Get instrument details
    const details = await client.getInstrumentDetails('B-BTC_USDT', 'USDT');
    console.log('\n✅ BTC/USDT Details:', details?.instrument?.max_leverage_long, 'x max leverage');

    // 3. Get futures candles
    const toTime = CoinDCXFuturesClient.nowSeconds();
    const fromTime = toTime - 3600; // 1 hour ago
    const candles = await client.getFuturesCandles('B-BTC_USDT', fromTime, toTime, '1m');
    console.log('\n✅ Candles:', candles.data?.length, 'bars');

    // 4. Get futures trade history
    const trades = await client.getFuturesTradeHistory('B-BTC_USDT', 5);
    console.log('\n✅ Recent Trades:', trades.length);

    // 5. Get order book
    const ob = await client.getFuturesOrderBook('BTCUSDT', 10);
    console.log('\n✅ Order Book:', Object.keys(ob.bids || {}).length, 'bid levels');

    // 6. Get balances
    const balances = await client.getBalances();
    console.log('\n✅ Balances:', balances.filter(b => parseFloat(b.balance) > 0).map(b => `${b.currency}: ${b.balance}`));

    // 7. Create a futures order (uncomment with real credentials)
    // const order = await client.createFuturesOrder({
    //   pair: 'B-BTC_USDT',
    //   side: 'buy',
    //   order_type: 'limit',
    //   price: 50000,
    //   total_quantity: 0.001,
    //   leverage: 5,
    //   time_in_force: 'good_till_cancel',
    //   take_profit_price: 55000,
    //   stop_loss_price: 48000,
    // });
    // console.log('\n✅ Order Created:', order.id);

    // 8. List open orders
    // const orders = await client.listFuturesOrders({ status: 'open', margin_currency_short_name: ['USDT'] });
    // console.log('\n✅ Open Orders:', orders.length);

    // 9. Get positions
    // const positions = await client.getFuturesPositions({ size: 10 });
    // console.log('\n✅ Positions:', positions.length);

  } catch (err) {
    console.error('\n❌ REST Error:', err.message);
  }

  // ========== WEBSOCKET EXAMPLES ==========

  client.on('ws:connect', (data) => {
    console.log('\n🔌 WS Connected:', data.socketId);
  });

  client.on('ws:disconnect', (data) => {
    console.log('\n🔌 WS Disconnected:', data.reason);
  });

  client.on('ws:candlestick', (data) => {
    console.log('\n📊 Candle:', data.pair, data.interval,
      `O:${data.open} H:${data.high} L:${data.low} C:${data.close} V:${data.volume}`);
  });

  client.on('ws:depth-snapshot', (data) => {
    console.log('\n📗 OB Snapshot:', data.bids.length, 'bids,', data.asks.length, 'asks');
  });

  client.on('ws:depth-update', (data) => {
    console.log('\n📘 OB Update:', data.bids.length, 'bids,', data.asks.length, 'asks');
  });

  client.on('ws:new-trade', (data) => {
    console.log('\n💰 Trade:', data.symbol, `@ ${data.price}`, `Qty: ${data.quantity}`,
      data.isMaker ? '(Maker)' : '(Taker)');
  });

  client.on('ws:price-change', (data) => {
    console.log('\n📈 Price:', data.price, 'Time:', new Date(data.timestamp).toISOString());
  });

  client.on('ws:currentPrices@futures#update', (data) => {
    console.log('\n📋 Batch Prices:', Object.keys(data.prices).length, 'pairs updated');
  });

  client.on('ws:df-order-update', (data) => {
    console.log('\n🔔 Futures Order Update:', data);
  });

  client.on('ws:df-position-update', (data) => {
    console.log('\n📍 Futures Position Update:', data);
  });

  client.on('ws:balance-update', (data) => {
    console.log('\n💳 Balance Update:', data);
  });

  // Connect and subscribe
  await client.wsConnect();

  const pair = 'B-BTC_USDT';
  client.wsSubscribeCandles(pair, '1m');
  client.wsSubscribeOrderBook(pair, 50);
  client.wsSubscribeTrades(pair);
  client.wsSubscribePrices(pair);
  client.wsSubscribeCurrentPricesFutures();

  // Private account stream (requires auth)
  // client.wsSubscribeAccountFutures();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    client.wsDisconnect();
    process.exit(0);
  });
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CoinDCXFuturesClient };
```
```
/**
 * CoinDCX Futures Complete Client TypeScript Declarations
 * REST API + Socket.IO WebSocket
 */

export interface CoinDCXFuturesOptions {
  restBaseUrl?: string;
  publicBaseUrl?: string;
  wsEndpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  debug?: boolean;
  timeout?: number;
}

// ==================== REST API TYPES ====================

export interface ActiveInstrument {
  pair: string;
  instrument: string;
  status: string;
  max_leverage_long: number;
  max_leverage_short: number;
  min_quantity: number;
  max_quantity: number;
  step: number;
  tick_size: number;
  maker_fee: number;
  taker_fee: number;
  [key: string]: any;
}

export interface InstrumentDetails {
  instrument: ActiveInstrument;
  [key: string]: any;
}

export interface FuturesCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quote_volume: number;
  open_time: number;
  close_time: number;
  pair: string;
  symbol: string;
  duration: string;
}


export interface SpotCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
}

export interface SpotTrade {
  p: number;
  q: number;
  s: string;
  T: number;
  m: boolean;
}

export interface SpotOrderBook {
  bids: Record<string, string>;
  asks: Record<string, string>;
}

export interface FuturesCandlesResponse {
  data: FuturesCandle[];
  instrument: string;
  pair: string;
}

export interface FuturesTrade {
  price: number;
  quantity: number;
  is_maker: boolean;
  timestamp: number;
  [key: string]: any;
}

export interface FuturesOrderBook {
  bids: Record<string, string>;
  asks: Record<string, string>;
  timestamp: number;
  version: number;
}

export interface CreateFuturesOrderParams {
  pair: string;
  side: 'buy' | 'sell';
  order_type: 'market' | 'limit' | 'stop_limit' | 'stop_market' | 'take_profit_limit' | 'take_profit_market';
  total_quantity: number;
  leverage: number;
  price?: number;
  stop_price?: number;
  time_in_force?: 'good_till_cancel' | 'fill_or_kill' | 'immediate_or_cancel';
  take_profit_price?: number;
  stop_loss_price?: number;
  post_only?: boolean;
  hidden?: boolean;
  client_order_id?: string;
  margin_currency_short_name?: string;
}

export interface FuturesOrder {
  id: string;
  pair: string;
  side: string;
  order_type: string;
  status: string;
  total_quantity: number;
  remaining_quantity: number;
  price: number;
  leverage: number;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface ListFuturesOrdersFilters {
  side?: 'buy' | 'sell';
  status?: 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected';
  margin_currency_short_name?: string[];
  pair?: string;
  page?: number;
  size?: number;
}

export interface FuturesPosition {
  id: string;
  pair: string;
  side: string;
  quantity: number;
  entry_price: number;
  leverage: number;
  pnl: number;
  margin: number;
  status: string;
  [key: string]: any;
}


export interface SubAccountTransferParams {
  fromAccountId: string;
  toAccountId: string;
  currencyShortName: string;
  amount: number;
}

export interface SubAccountTransferResult {
  status: string;
  message: string | number;
  code: number;
}

export interface WalletTransferParams {
  sourceWalletType: 'spot' | 'futures';
  destinationWalletType: 'spot' | 'futures';
  currencyShortName: string;
  amount: number;
}

export interface Balance {
  currency: string;
  balance: string;
  locked_balance: string;
}

export interface UserInfo {
  coindcx_id: string;
  first_name: string;
  last_name: string;
  mobile_number: string;
  email: string;
}

// ==================== WEBSOCKET TYPES ====================

export interface CandlestickData {
  channel: string;
  product: string;
  eventTime?: number;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  openTime: number;
  closeTime: number;
  pair: string;
  symbol: string;
  duration: string;
  raw: any;
}

export interface DepthLevel {
  price: number;
  quantity: number;
}

export interface DepthData {
  timestamp: number;
  version: number;
  product: string;
  bids: DepthLevel[];
  asks: DepthLevel[];
  raw: any;
}

export interface TradeData {
  timestamp: number;
  receiveTime?: number;
  price: number;
  quantity: number;
  isMaker: boolean;
  symbol: string;
  product: string;
  raw: any;
}

export interface PriceChangeData {
  timestamp: number;
  price: number;
  product: string;
  raw: any;
}

export interface CurrentPricesData {
  version: number;
  timestamp: number;
  product: string;
  pST?: number;
  prices: Record<string, {
    markPrice?: number;
    bmST?: number;
    cmRT?: number;
  }>;
  raw: any;
}

export interface WSConnectEvent {
  socketId: string;
}

export interface WSDisconnectEvent {
  reason: string;
}

export interface WSErrorEvent {
  type: string;
  error: Error;
}

export type FuturesInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '8h' | '1D' | '3D' | '1W' | '1M';
export type OrderBookDepth = 10 | 20 | 50;
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected';

// ==================== MAIN CLASS ====================

export declare class CoinDCXFuturesClient extends EventEmitter {
  constructor(options?: CoinDCXFuturesOptions);

  // ---------- REST: Public Futures Endpoints ----------

  getActiveInstruments(marginCurrencyShortName?: string): Promise<ActiveInstrument[]>;
  getInstrumentDetails(pair: string, marginCurrencyShortName?: string): Promise<InstrumentDetails>;
  getFuturesCandles(pair: string, fromTime: number, toTime: number, resolution?: string): Promise<FuturesCandlesResponse>;
  getFuturesTradeHistory(pair: string, limit?: number): Promise<FuturesTrade[]>;
  getFuturesOrderBook(instrument: string, depth?: number): Promise<FuturesOrderBook>;
  getFuturesCurrentPrices(): Promise<Record<string, any>>;
  getFundingRateHistory(pair: string, limit?: number): Promise<any[]>;

  // ---------- REST: Spot Market Data (Public) ----------

  getSpotCandles(pair: string, interval?: string, startTime?: number, endTime?: number, limit?: number): Promise<SpotCandle[]>;
  getSpotTradeHistory(pair: string, limit?: number): Promise<SpotTrade[]>;
  getSpotOrderBook(pair: string): Promise<SpotOrderBook>;

  // ---------- REST: Authenticated Futures Endpoints ----------

  createFuturesOrder(params: CreateFuturesOrderParams): Promise<FuturesOrder>;
  listFuturesOrders(filters?: ListFuturesOrdersFilters): Promise<{ orders: FuturesOrder[]; pagination: any }>;
  getFuturesOrder(id: string): Promise<FuturesOrder>;
  cancelFuturesOrder(id: string): Promise<{ status: string; message: string }>;
  cancelAllFuturesOrders(pair: string, side?: OrderSide): Promise<{ status: string; message: string }>;
  editFuturesOrder(params: { id: string; total_quantity?: number; price?: number; take_profit_price?: number; stop_loss_price?: number }): Promise<FuturesOrder>;
  getFuturesPositions(filters?: { page?: number; size?: number; pair?: string; margin_currency_short_name?: string }): Promise<{ positions: FuturesPosition[]; pagination: any }>;
  closeFuturesPosition(id: string): Promise<{ status: string; message: string }>;
  updateLeverage(pair: string, leverage: number): Promise<{ status: string; message: string }>;
  getFuturesTransactions(filters?: { pair?: string; from_time?: number; to_time?: number; page?: number; size?: number }): Promise<any>;
  addFuturesMargin(id: string, amount: number): Promise<{ status: string; message: string }>;
  removeFuturesMargin(id: string, amount: number): Promise<{ status: string; message: string }>;

  // ---------- REST: Legacy Spot/Margin Endpoints ----------

  getTicker(): Promise<any[]>;
  getMarkets(): Promise<string[]>;
  getMarketsDetails(): Promise<any[]>;
  getBalances(): Promise<Balance[]>;
  getUserInfo(): Promise<UserInfo>;
  walletTransfer(sourceWalletType: string, destinationWalletType: string, currencyShortName: string, amount: number): Promise<{ status: string; message: string; code: number }>;
  subAccountTransfer(params: SubAccountTransferParams): Promise<SubAccountTransferResult>;


  // ---------- WebSocket Methods ----------

  wsConnect(): Promise<void>;
  wsDisconnect(): void;
  wsIsConnected(): boolean;
  wsGetSubscribedChannels(): string[];

  wsSubscribeCandles(pair: string, interval?: FuturesInterval): void;
  wsUnsubscribeCandles(pair: string, interval?: FuturesInterval): void;
  wsSubscribeOrderBook(pair: string, depth?: OrderBookDepth): void;
  wsUnsubscribeOrderBook(pair: string, depth?: OrderBookDepth): void;
  wsSubscribeTrades(pair: string): void;
  wsUnsubscribeTrades(pair: string): void;
  wsSubscribePrices(pair: string): void;
  wsUnsubscribePrices(pair: string): void;
  wsSubscribeCurrentPricesFutures(): void;
  wsUnsubscribeCurrentPricesFutures(): void;
  wsSubscribeAccountFutures(): void;
  wsUnsubscribeAccountFutures(): void;

  // ---------- Static Helpers ----------

  static buildPair(base: string, quote: string, ecode?: string): string;
  static parsePair(pair: string): { ecode: string; base: string; quote: string } | null;
  static msToSeconds(ms: number): number;
  static secondsToMs(seconds: number): number;
  static nowSeconds(): number;

  // ---------- EventEmitter Overloads ----------

  on(event: 'ws:connect', listener: (data: WSConnectEvent) => void): this;
  on(event: 'ws:disconnect', listener: (data: WSDisconnectEvent) => void): this;
  on(event: 'ws:error', listener: (data: WSErrorEvent) => void): this;
  on(event: 'ws:candlestick', listener: (data: CandlestickData) => void): this;
  on(event: 'ws:depth-snapshot', listener: (data: DepthData) => void): this;
  on(event: 'ws:depth-update', listener: (data: DepthData) => void): this;
  on(event: 'ws:new-trade', listener: (data: TradeData) => void): this;
  on(event: 'ws:price-change', listener: (data: PriceChangeData) => void): this;
  on(event: 'ws:currentPrices@futures#update', listener: (data: CurrentPricesData) => void): this;
  on(event: 'ws:df-order-update', listener: (data: any) => void): this;
  on(event: 'ws:df-position-update', listener: (data: any) => void): this;
  on(event: 'ws:balance-update', listener: (data: any) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;

  emit(event: 'ws:connect', data: WSConnectEvent): boolean;
  emit(event: 'ws:disconnect', data: WSDisconnectEvent): boolean;
  emit(event: 'ws:error', data: WSErrorEvent): boolean;
  emit(event: 'ws:candlestick', data: CandlestickData): boolean;
  emit(event: 'ws:depth-snapshot', data: DepthData): boolean;
  emit(event: 'ws:depth-update', data: DepthData): boolean;
  emit(event: 'ws:new-trade', data: TradeData): boolean;
  emit(event: 'ws:price-change', data: PriceChangeData): boolean;
  emit(event: 'ws:currentPrices@futures#update', data: CurrentPricesData): boolean;
  emit(event: 'ws:df-order-update', data: any): boolean;
  emit(event: 'ws:df-position-update', data: any): boolean;
  emit(event: 'ws:balance-update', data: any): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;
}
```
```
{
  "name": "coindcx-futures-client",
  "version": "2.1.0",
  "description": "Complete CoinDCX Futures Client - REST API + Socket.IO WebSocket with all documented endpoints",
  "main": "coindcx-futures-client.js",
  "types": "coindcx-futures-client.d.ts",
  "scripts": {
    "start": "node coindcx-futures-client.js",
    "test": "node -e "const {CoinDCXFuturesClient} = require('./coindcx-futures-client'); console.log('Module loaded OK')""
  },
  "keywords": [
    "coindcx",
    "futures",
    "websocket",
    "socket.io",
    "rest-api",
    "crypto",
    "trading",
    "api",
    "derivatives"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "socket.io-client": "2.4.0"
  },
  "optionalDependencies": {
    "axios": "^1.6.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```