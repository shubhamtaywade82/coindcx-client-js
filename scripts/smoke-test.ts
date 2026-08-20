import { CoinDCXClient } from '../src/index';

const apiKey = process.env.COINDCX_API_KEY;
const apiSecret = process.env.COINDCX_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error('COINDCX_API_KEY and COINDCX_API_SECRET are required');
  process.exit(1);
}

const client = new CoinDCXClient({ apiKey, apiSecret });

async function main(): Promise<void> {
  const instruments = await client.futures.market.getActiveInstruments('USDT');
  console.log(`OK active_instruments: ${instruments.length}`);

  const tickers = await client.futures.market.getTicker();
  console.log(`OK ticker: ${tickers.length} pairs`);

  const wallet = await client.futures.account.getWallet();
  console.log(`OK wallet: ${wallet.length} balances`);

  const positions = await client.futures.account.getPositions();
  console.log(`OK positions: ${positions.length}`);

  const paper = new CoinDCXClient({ paperMode: true, initialBalance: 10000 });
  await paper.futures.trading.createOrder({
    side: 'buy',
    order_type: 'market_order',
    base_currency: 'SOL',
    quote_currency: 'USDT',
    target_quantity: 1,
    price: 120,
    leverage: 10,
    margin_type: 'isolated',
  });
  console.log(`OK paper engine: ${JSON.stringify(paper.paper.getAccount().totalEquity)} equity`);

  console.log('SMOKE PASSED');
}

main().catch((err) => {
  console.error('SMOKE FAILED:', err);
  process.exit(1);
});