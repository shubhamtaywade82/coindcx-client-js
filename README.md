# CoinDCX SDK for Node.js

A comprehensive, production-hardened SDK for the CoinDCX API (Version 2.3.0), supporting Futures, Spot, Margin, and Lending.

## Key Features

- **Full Documentation Parity**: Implements all useful endpoints from the official CoinDCX JS documentation.
- **Production Hardened**: 
  - Internal **Token Bucket Rate Limiter** to prevent IP bans.
  - **Exponential Backoff with Jitter** for resilient WebSocket reconnections.
  - **Custom Error Hierarchy** (`CoinDCXAPIError`, `CoinDCXNetworkError`) for intelligent bot logic.
- **WebSocket support**: real-time market data and private account updates (Socket.IO v2.4.0).
- **Authentication**: Automatic HMAC-SHA256 signing and safe timestamp injection.
- **Unified Interface**: One class for REST + Spot/Futures WebSocket.

## Installation

```bash
npm install coindcx-client-js
```

## Feature Categories

### 1. Futures (Derivatives)
- **Trading**: Market/Limit/TPSL orders, Bracket orders.
- **Risk**: Leverage updates (up to 20x), Margin type changes (Isolated/Cross), Liquidation calculation.
- **Positions**: Active position tracking, real-time PnL, automated market-exit.

### 2. Spot Trading
- Create, Cancel, and Edit orders (Single & Multiple).
- Open orders count and full trade history.
- **WebSocket**: Support for real-time Spot candles, trades, and prices.

### 3. Margin & Lending
- Legacy margin order management.
- Lending (Funding) operations and settlement.

### 4. Wallet & Transfers
- Sub-account capital allocation.
- Internal transfers between Spot and Futures wallets.
- Detailed balance snapshots.

## Documentation

### IDE Support (IntelliSense)
The library is fully documented with **JSDoc**. You will get instant parameter descriptions and type hints directly in your IDE.

### API Reference
Generate a searchable HTML reference:
```bash
npm run docs
```

## Quick Start

```javascript
require('dotenv').config();
const { CoinDCXFuturesClient } = require('./coindcx-futures-client');

const client = new CoinDCXFuturesClient({
  apiKey: process.env.COINDCX_API_KEY,
  apiSecret: process.env.COINDCX_API_SECRET,
  debug: true
});

async function main() {
  // REST: Fetch live USDS-M instruments
  const instruments = await client.getActiveInstruments();

  // WS: Connect and stream real-time BTC data
  await client.wsConnect();
  client.wsSubscribeCandles('B-BTC_USDT', '1m'); // Futures
  client.wsSubscribeSpotCandles('I-BTC_INR', '1m'); // Spot
  
  client.on('ws:candlestick', (data) => {
    console.log(`${data.pair} Price: ${data.close}`);
  });
}

main();
```

## License

ISC
