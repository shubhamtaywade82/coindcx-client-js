require('dotenv').config();
const { CoinDCXFuturesClient } = require('../coindcx-futures-client');

const client = new CoinDCXFuturesClient({
    apiKey: process.env.COINDCX_API_KEY,
    apiSecret: process.env.COINDCX_API_SECRET,
    debug: false // Keep clean for this test
});

const TEST_FUTURES_PAIR = 'B-BTC_USDT';
const TEST_SPOT_PAIR = 'I-BTC_INR';

async function runTest() {
    console.log('🚀 Starting Version 2.3.0 Complete SDK Verification...');

    const sections = [
        {
            name: 'Public Market Data (Spot & Futures)',
            tests: [
                { name: 'getActiveInstruments', fn: () => client.getActiveInstruments() },
                { name: 'getMarketsDetails', fn: () => client.getMarketsDetails() },
                { name: 'getInstrumentDetails', fn: () => client.getInstrumentDetails(TEST_FUTURES_PAIR) },
                { name: 'getFuturesCandles', fn: () => client.getFuturesCandles(TEST_FUTURES_PAIR) },
                { name: 'getFuturesOrderBook', fn: () => client.getFuturesOrderBook(TEST_FUTURES_PAIR) },
                { name: 'getTicker', fn: () => client.getTicker() },
                { name: 'getFuturesStats', fn: () => client.getFuturesStats() },
                { name: 'getSpotCandles', fn: () => client.getSpotCandles(TEST_SPOT_PAIR) },
                { name: 'getSpotOrderBook', fn: () => client.getSpotOrderBook(TEST_SPOT_PAIR) },
            ]
        },
        {
            name: 'Authenticated Account & Wallets',
            tests: [
                { name: 'getBalances', fn: () => client.getBalances() },
                { name: 'getUserInfo', fn: () => client.getUserInfo() },
                { name: 'getFuturesWallet', fn: () => client.getFuturesWallet() },
                { name: 'getFuturesWalletTransactions', fn: () => client.getFuturesWalletTransactions() },
                { name: 'getActiveOrdersCount (Spot)', fn: () => client.getActiveOrdersCount() },
            ]
        },
        {
            name: 'Pro Derivatives (Read-Only Checks)',
            tests: [
                { name: 'listFuturesOrders', fn: () => client.listFuturesOrders() },
                { name: 'getFuturesPositions', fn: () => client.getFuturesPositions() },
                { name: 'getFuturesCrossMarginDetails', fn: () => client.getFuturesCrossMarginDetails() },
                { name: 'getFuturesTrades (History)', fn: () => client.getFuturesTrades() },
            ]
        },
        {
            name: 'Spot & Legacy (Read-Only Checks)',
            tests: [
                { name: 'getActiveOrders (Spot)', fn: () => client.getActiveOrders() },
                { name: 'fetchMarginOrders', fn: () => client.fetchMarginOrders() },
                { name: 'fetchLendOrders', fn: () => client.fetchLendOrders() },
            ]
        }
    ];

    for (const section of sections) {
        console.log(`\n--- 📂 Section: ${section.name} ---`);
        for (const test of section.tests) {
            try {
                const res = await test.fn();
                const items = Array.isArray(res) ? `${res.length} items` : 'Object';
                console.log(`✅ ${test.name.padEnd(30)}: Success (${items})`);
            } catch (err) {
                // If it's a 404 but we have signatures, it might just be the account state
                console.log(`❌ ${test.name.padEnd(30)}: Failed - ${err.message}`);
                if (err.data) console.log(`   └─ Response: ${JSON.stringify(err.data)}`);
            }
        }
    }

    console.log('\n--- 🌐 Unified WebSocket Connectivity (Spot + Futures) ---');
    try {
        await client.wsConnect();
        console.log('✅ wsConnect                    : Success');
        
        // Subscribe to a mix of feeds
        client.wsSubscribeCandles(TEST_FUTURES_PAIR);
        client.wsSubscribeSpotCandles(TEST_SPOT_PAIR);
        client.wsSubscribeAccountFutures();
        
        console.log('✅ Subscriptions Sent           : Success');
        console.log('⌛ Waiting 15s for incoming events...');
        
        const events = { futures: 0, spot: 0 };
        
        client.on('ws:candlestick', (data) => {
            if (data && data.pair) {
                if (data.pair.includes('BTC_USDT')) events.futures++;
                if (data.pair.includes('BTC_INR')) events.spot++;
            }
        });

        await new Promise(resolve => setTimeout(resolve, 15000));
        
        console.log(`\n📈 WebSocket Statistics:`);
        console.log(`- Futures Events Received      : ${events.futures}`);
        console.log(`- Spot Events Received         : ${events.spot}`);
        
        if (events.futures > 0 || events.spot > 0) {
            console.log('✅ Real-time Data Receipt      : Success');
        } else {
            console.log('⚠️ No live events received (Market might be quiet or pair inactive)');
        }

        client.wsDisconnect();
        console.log('✅ wsDisconnect                 : Success');
    } catch (err) {
        console.log(`❌ WebSocket Error: ${err.message}`);
    }

    console.log('\n✨ Full SDK Verification Finished.');
    process.exit(0);
}

runTest();
