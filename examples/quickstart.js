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
        if (instruments.length > 0) {
            console.log('First instrument:', instruments[0]);
        }

        console.log('\n--- Fetching BTC_USDT Details ---');
        const details = await client.getInstrumentDetails('B-BTC_USDT');
        console.log('BTC_USDT Details:', details);

        console.log('\n--- Fetching Spot Order Book ---');
        const spotOb = await client.getSpotOrderBook('B-BTC_USDT');
        console.log('Spot Best Bid:', Object.keys(spotOb.bids)[0]);

        // WebSocket Example
        console.log('\n--- Connecting to WebSocket ---');
        await client.wsConnect();
        
        console.log('Subscribing to BTC_USDT 1m candles...');
        client.wsSubscribeCandles('B-BTC_USDT', '1m');

        client.on('ws:candlestick', (data) => {
            console.log('New Candle:', data.close, 'at', data.time);
        });

        // Let it run for 10 seconds
        setTimeout(() => {
            console.log('Closing WS...');
            client.wsDisconnect();
            process.exit(0);
        }, 10000);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

run();
