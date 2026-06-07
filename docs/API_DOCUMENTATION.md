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

