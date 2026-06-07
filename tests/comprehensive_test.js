require('dotenv').config();
const { CoinDCXFuturesClient } = require('../coindcx-futures-client');

const client = new CoinDCXFuturesClient({
    apiKey: process.env.COINDCX_API_KEY,
    apiSecret: process.env.COINDCX_API_SECRET,
    debug: false
});

const TEST_PAIR = 'B-BTC_USDT';

async function runTest() {
    console.log('🚀 Starting Full Endpoint Verification...');

    const sections = [
        {
            name: 'Public Market Data',
            tests: [
                { name: 'getActiveInstruments', fn: () => client.getActiveInstruments() },
                { name: 'getMarketsDetails', fn: () => client.getMarketsDetails() },
                { name: 'getInstrumentDetails', fn: () => client.getInstrumentDetails(TEST_PAIR) },
                { name: 'getFuturesCandles', fn: () => client.getFuturesCandles(TEST_PAIR) },
                { name: 'getFuturesOrderBook', fn: () => client.getFuturesOrderBook(TEST_PAIR) },
                { name: 'getTicker', fn: () => client.getTicker() },
                { name: 'getSpotCandles', fn: () => client.getSpotCandles(TEST_PAIR) },
                { name: 'getSpotOrderBook', fn: () => client.getSpotOrderBook(TEST_PAIR) },
                { name: 'getMarkets', fn: () => client.getMarkets() },
            ]
        },
        {
            name: 'Authenticated Account',
            tests: [
                { name: 'getBalances', fn: () => client.getBalances() },
                { name: 'getUserInfo', fn: () => client.getUserInfo() },
                { name: 'listFuturesOrders', fn: () => client.listFuturesOrders() },
                { name: 'getFuturesPositions', fn: () => client.getFuturesPositions() },
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
                console.log(`✅ ${test.name.padEnd(25)}: Success`);
            } catch (err) {
                console.log(`❌ ${test.name.padEnd(25)}: Failed - ${err.message}`);
            }
        }
    }

    console.log('\n--- 🌐 WebSocket Connectivity ---');
    try {
        await client.wsConnect();
        console.log('✅ wsConnect                : Success');
        client.wsSubscribeCandles(TEST_PAIR);
        client.wsSubscribeAccountFutures();
        console.log('✅ Subscriptions Sent       : Success');
        console.log('⌛ Waiting for event...');
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => resolve('Timeout (No events)'), 10000);
            client.on('ws:candlestick', (data) => {
                clearTimeout(timeout);
                console.log('✅ ws:candlestick received  : Success');
                resolve();
            });
        });
        
        client.wsDisconnect();
        console.log('✅ wsDisconnect             : Success');
    } catch (err) {
        console.log(`❌ WebSocket Error: ${err.message}`);
    }

    console.log('\n✨ Verification sequence finished.');
    process.exit(0);
}

runTest();
