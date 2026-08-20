import { CoinDCXClient } from '../src/index';

const apiKey = process.env.COINDCX_API_KEY;
const apiSecret = process.env.COINDCX_API_SECRET;

const client = new CoinDCXClient({ apiKey, apiSecret });

async function run(): Promise<void> {
  await client.connectWebsocket();

  client.publicStreams.on('candle', (pair, candle) => {
    console.log('candle', pair, candle);
  });
  client.publicStreams.on('trade', (trade) => {
    console.log('trade', trade);
  });

  if (apiKey && apiSecret) {
    client.privateStreams.on('orderUpdate', (update) => {
      console.log('orderUpdate', update);
    });
    client.privateStreams.on('positionUpdate', (update) => {
      console.log('positionUpdate', update);
    });
    client.subscribePrivateStreams();
  }

  console.log('streaming... press Ctrl+C to stop');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});