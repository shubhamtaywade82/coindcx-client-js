import { CoinDCXClient } from '../src/index';

const apiKey = process.env.COINDCX_API_KEY;
const apiSecret = process.env.COINDCX_API_SECRET;

const client = new CoinDCXClient({ apiKey, apiSecret });

async function run(): Promise<void> {
  const instruments = await client.futures.market.getActiveInstruments('USDT');
  console.log(`active instruments: ${instruments.length}`);

  const tickers = await client.futures.market.getTicker();
  console.log(`tickers: ${tickers.length}`);
  const sol = tickers.find((t) => t.pair === 'B-SOL_USDT');
  console.log('SOL ticker:', sol);

  const candles = await client.futures.market.getCandles('B-BTC_USDT', '15m', 100);
  console.log(`BTC 15m candles: ${candles.length}`);

  const sizing = client.ops.sizing.calculatePositionSize({
    accountBalance: 10000,
    riskPercent: 2,
    entryPrice: 120,
    stopLossPrice: 115,
    leverage: 10,
  });
  console.log('position sizing:', sizing);

  if (apiKey && apiSecret) {
    const wallet = await client.futures.account.getWallet();
    console.log('futures wallet:', wallet);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});