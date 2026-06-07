const { CoinDCXFuturesClient } = require('../coindcx-futures-client');

// Initialize client (public endpoints only for this example)
const client = new CoinDCXFuturesClient({
    debug: true
});

async function run() {
    try {
        console.log('--- Fetching Active Instruments ---');
        const instruments = await client.getActiveInstruments();
        console.log(`Found ${instruments.length} instruments.`);
        const testPair = 'B-BTC_USDT';

        console.log(`\n--- Fetching ${testPair} Candles ---`);
        const now = Math.floor(Date.now() / 1000);
        const candles = await client.getFuturesCandles(testPair, now - 3600, now, '1m');
        console.log(`Received ${candles.length} candles.`);
        if (candles.length > 0) {
            console.log('Latest Candle Close:', candles[candles.length - 1].close);
        }

        console.log(`\n--- Fetching ${testPair} Order Book ---`);
        const orderbook = await client.getFuturesOrderBook(testPair);
        console.log('Orderbook bids count:', orderbook.bids ? Object.keys(orderbook.bids).length : 0);

        // WebSocket Example
        console.log('\n--- Connecting to WebSocket ---');
        await client.wsConnect();
        
        console.log(`Subscribing to ${testPair} 1m candles...`);
        client.wsSubscribeCandles(testPair, '1m');

        client.on('ws:candlestick', (data) => {
            console.log('WS Candle Update:', data.close, 'at', new Date(data.openTime).toLocaleTimeString());
        });

        // Let it run for 15 seconds to catch a live update
        console.log('Waiting for live updates (15s)...');
        setTimeout(() => {
            console.log('Closing WS...');
            client.wsDisconnect();
            process.exit(0);
        }, 15000);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

run();
