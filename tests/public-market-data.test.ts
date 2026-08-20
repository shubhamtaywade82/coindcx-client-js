import { Polly } from '@pollyjs/core';
import NodeHttpAdapter from '@pollyjs/adapter-node-http';
import FSPersister from '@pollyjs/persister-fs';
import { CoinDCXClient } from '../src/index';

Polly.register(NodeHttpAdapter);
Polly.register(FSPersister);

async function recordCassette(name: string, fn: () => Promise<void>) {
  const testPolly = new Polly(name, {
    adapters: ['node-http'],
    persister: 'fs',
    persisterOptions: {
      fs: {
        recordingsDir: __dirname + '/fixtures/cassettes',
      },
    },
    recordIfMissing: true,
    recordFailedRequests: true,
    matchRequestsBy: {
      headers: {
        exclude: ['authorization', 'x-auth-apikey', 'x-auth-signature', 'x-auth-timestamp'],
      },
    },
  });
  testPolly.record();
  try {
    await fn();
  } finally {
    await testPolly.stop();
  }
}

describe('CoinDCX SDK - Public Market Data (VCR Cassettes)', () => {
  let client: CoinDCXClient;

  beforeEach(() => {
    client = new CoinDCXClient({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      paperMode: true,
    });
  });

  describe('getActiveInstruments', () => {
    it('should fetch active futures instruments', async () => {
      await recordCassette('getActiveInstruments', async () => {
        const instruments = await client.futures.market.getActiveInstruments('USDT');
        expect(Array.isArray(instruments)).toBe(true);
        expect(instruments.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getFuturesCandles', () => {
    it('should fetch candlestick data', async () => {
      await recordCassette('getFuturesCandles', async () => {
        const candles = await client.futures.market.getCandles('B-BTC_USDT', '1m', 10);
        expect(Array.isArray(candles)).toBe(true);
      });
    });
  });

  describe('getFuturesOrderBook', () => {
    it('should fetch order book depth', async () => {
      await recordCassette('getFuturesOrderBook', async () => {
        const orderBook = await client.futures.market.getOrderBook('B-BTC_USDT', 20);
        expect(orderBook).toHaveProperty('bids');
        expect(orderBook).toHaveProperty('asks');
      });
    });
  });

  describe('getTicker', () => {
    it('should fetch ticker data', async () => {
      await recordCassette('getTicker', async () => {
        const tickers = await client.futures.market.getTicker();
        expect(Array.isArray(tickers)).toBe(true);
      });
    });
  });

  describe('getInstrumentDetails', () => {
    it('should fetch instrument details', async () => {
      await recordCassette('getInstrumentDetails', async () => {
        const instrument = await client.futures.market.getInstrumentDetails('B-BTC_USDT');
        expect(instrument).toHaveProperty('pair');
      });
    });
  });

  describe('Spot Market Data', () => {
    it('should fetch spot candlestick data', async () => {
      await recordCassette('getSpotCandles', async () => {
        const candles = await client.marketData.getSpotCandles({
          pair: 'B-BTC_USDT',
          interval: '1m',
          limit: 10,
        });
        expect(Array.isArray(candles)).toBe(true);
      });
    });

    it('should fetch spot order book', async () => {
      await recordCassette('getSpotOrderBook', async () => {
        const orderBook = await client.marketData.getSpotOrderBook({
          pair: 'B-BTC_USDT',
          depth: 20,
        });
        expect(orderBook).toHaveProperty('bids');
        expect(orderBook).toHaveProperty('asks');
      });
    });
  });
});