# CoinDCX Futures Client (Node.js)

A comprehensive Node.js library for the CoinDCX Futures (Derivatives) API, supporting both REST and WebSocket (Socket.IO).

## Installation

```bash
npm install socket.io-client@2.4.0 axios
```

## Features

- **REST API Support**: Comprehensive coverage of public and authenticated futures endpoints.
- **WebSocket Support**: Real-time market data and account updates using Socket.IO v2.4.0.
- **Authentication**: HMAC-SHA256 signing for secure requests.
- **Normalization**: Standardized response formats for candles, order books, and trades.
- **TypeScript Definitions**: Full type support included.

## Authentication

Create a `.env` file in your project root to securely store your credentials:

```env
COINDCX_API_KEY=your_api_key_here
COINDCX_API_SECRET=your_api_secret_here
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
```

async function main() {
  // REST Example
  const instruments = await client.getActiveInstruments();
  console.log(instruments);

  // WebSocket Example
  await client.wsConnect();
  client.wsSubscribeCandles('B-BTC_USDT', '1m');
  
  client.on('ws:candlestick', (data) => {
    console.log('New Candle:', data.close);
  });
}

main();
```

## Documentation

Refer to `docs/API_DOCUMENTATION.md` for detailed information on endpoints and mapping.

## License

ISC
