import { CoinDCXClient } from '../src/index';

const client = new CoinDCXClient({ paperMode: true, initialBalance: 10000, takerFee: 0.0005, slippage: 0.001 });

async function run(): Promise<void> {
  const order = await client.futures.trading.createOrder({
    side: 'buy',
    order_type: 'market_order',
    base_currency: 'SOL',
    quote_currency: 'USDT',
    target_quantity: 1,
    price: 120,
    leverage: 10,
    margin_type: 'isolated',
  });
  console.log('paper order:', order);

  console.log('account:', client.paper.getAccount());
  console.log('positions:', client.paper.getPositions());

  const closed = await client.futures.trading.exitPosition({ pair: 'B-SOL_USDT' });
  console.log('exit result:', closed);
  console.log('account after exit:', client.paper.getAccount());
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});