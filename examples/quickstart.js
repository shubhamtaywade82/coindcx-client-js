require('dotenv').config();
const { CoinDCXFuturesClient } = require('../coindcx-futures-client');

// Initialize client with credentials from .env
const client = new CoinDCXFuturesClient({
    apiKey: process.env.COINDCX_API_KEY,
    apiSecret: process.env.COINDCX_API_SECRET,
    debug: true
});

async function run() {
    try {
        console.log('--- Fetching Active Instruments ---');
        const instruments = await client.getActiveInstruments();
        console.log(`Found ${instruments.length} instruments.`);
        const testPair = 'B-BTC_USDT';

        // Check if credentials are provided
        if (process.env.COINDCX_API_KEY && process.env.COINDCX_API_SECRET) {
            console.log('\n--- Fetching Account Balances (Authenticated) ---');
            try {
                const balances = await client.getBalances();
                console.log(`Found ${balances.length} balance entries.`);
                // Filter non-zero balances
                const nonZero = balances.filter(b => parseFloat(b.balance) > 0);
                if (nonZero.length > 0) {
                    console.log('Non-zero balances:', nonZero);
                } else {
                    console.log('All balances are zero.');
                }
            } catch (err) {
                console.error('Balance Fetch Error:', err.message);
            }
        } else {
            console.log('\n⚠️ Skipping authenticated tests: COINDCX_API_KEY/SECRET not found in .env');
        }

        console.log(`\n--- Fetching ${testPair} Order Book ---`);
        const orderbook = await client.getFuturesOrderBook(testPair);
        console.log('Orderbook bids count:', orderbook.bids ? Object.keys(orderbook.bids).length : 0);

        // WebSocket Example
        console.log('\n--- Connecting to WebSocket ---');
        await client.wsConnect();
        
        console.log(`Subscribing to ${testPair} 1m candles...`);
        client.wsSubscribeCandles(testPair, '1m');

        if (process.env.COINDCX_API_KEY && process.env.COINDCX_API_SECRET) {
            console.log('Subscribing to Private Account Streams...');
            client.wsSubscribeAccountFutures();
        }

        client.on('ws:candlestick', (data) => {
            console.log('WS Candle Update:', data.close, 'at', new Date(data.openTime).toLocaleTimeString());
        });

        client.on('ws:balance-update', (data) => {
            console.log('💰 WS Balance Update:', data);
        });

        client.on('ws:df-order-update', (data) => {
            console.log('🔔 WS Order Update:', data);
        });

        // Let it run for 20 seconds to catch updates
        console.log('Waiting for live updates (20s)...');
        setTimeout(() => {
            console.log('Closing WS...');
            client.wsDisconnect();
            process.exit(0);
        }, 20000);

    } catch (error) {
        console.error('Main Error:', error.message);
        process.exit(1);
    }
}

run();
