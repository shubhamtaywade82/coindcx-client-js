require('dotenv').config();
const { CoinDCXFuturesClient } = require('../coindcx-futures-client');

/**
 * Advanced Example: Trailing Stop Loss for Futures
 * 
 * Logic:
 * 1. Connects to WebSocket for real-time price updates.
 * 2. Monitors the Last Traded Price (LTP).
 * 3. If price moves in favor (up for Long), it "trails" the stop loss.
 * 4. Uses `editFuturesOrder` to update the existing SL order.
 */

// Configuration
const CONFIG = {
    pair: 'B-BTC_USDT',
    side: 'LONG', // LONG or SHORT
    trailingPercent: 0.01, // 1% trailing
    slOrderId: '12345', // Replace with your actual SL order ID
};

const client = new CoinDCXFuturesClient({
    apiKey: process.env.COINDCX_API_KEY,
    apiSecret: process.env.COINDCX_API_SECRET,
    debug: false
});

let highestPrice = 0;
let currentSLPrice = 0;

async function startTrailing() {
    try {
        console.log(`🚀 Starting Trailing SL for ${CONFIG.pair} (${CONFIG.side})`);
        
        // 1. Connect to WebSocket
        await client.wsConnect();
        client.wsSubscribePrices(CONFIG.pair);

        // 2. Handle price updates
        client.on('ws:price-change', async (data) => {
            const ltp = data.price;
            
            if (CONFIG.side === 'LONG') {
                // For Long: Trail SL upwards
                if (ltp > highestPrice) {
                    highestPrice = ltp;
                    const newSL = highestPrice * (1 - CONFIG.trailingPercent);
                    
                    // Only update if the new SL is significantly higher (e.g., > 0.1% change)
                    if (newSL > currentSLPrice * 1.001) {
                        await updateSL(newSL);
                    }
                }
            } else {
                // For Short: Trail SL downwards
                // (Logic would be inverse: lowestPrice, ltp < lowestPrice, newSL = lowestPrice * (1 + trailingPercent))
            }
        });

    } catch (err) {
        console.error('Error starting trailing SL:', err.message);
    }
}

async function updateSL(newPrice) {
    try {
        console.log(`🔄 Updating Stop Loss to: ${newPrice.toFixed(2)} (Highest: ${highestPrice.toFixed(2)})`);
        
        // In a real scenario, you'd call:
        // await client.editFuturesOrder({
        //     id: CONFIG.slOrderId,
        //     stop_loss_price: parseFloat(newPrice.toFixed(2))
        // });
        
        currentSLPrice = newPrice;
    } catch (err) {
        console.error('Failed to update SL order:', err.response ? err.response.data : err.message);
    }
}

// Check for credentials
if (!process.env.COINDCX_API_KEY) {
    console.error('❌ Error: COINDCX_API_KEY is missing in .env');
    process.exit(1);
}

startTrailing();
