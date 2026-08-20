import { CoinDCXClient } from '../src/index';
import { polly, mockPublicEndpoint, mockPrivateEndpoint, nock } from './setup';

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
      const cassette = await polly.record('getActiveInstruments', async () => {
        const instruments = await client.futures.market.getActiveInstruments('USDT');
        
        expect(Array.isArray(instruments)).toBe(true);
        expect(instruments.length).toBeGreaterThan(0);
        expect(instruments[0]).toMatch(/^B-[A-Z]+_[A-Z]+$/);
      });
    });

    it('should use cached cassette on subsequent runs', async () => {
      const instruments = await client.futures.market.getActiveInstruments('USDT');
      
      expect(Array.isArray(instruments)).toBe(true);
    });
  });

  describe('getFuturesCandles', () => {
    it('should fetch candlestick data using VCR cassette', async () => {
      await polly.record('getFuturesCandles', async () => {
        const candles = await client.futures.market.getCandles('B-BTC_USDT', '1m', 10);
        
        expect(Array.isArray(candles)).toBe(true);
        expect(candles.length).toBeLessThanOrEqual(10);
        
        if (candles.length > 0) {
          const candle = candles[0];
          expect(candle).toHaveProperty('open');
          expect(candle).toHaveProperty('high');
          expect(candle).toHaveProperty('low');
          expect(candle).toHaveProperty('close');
          expect(candle).toHaveProperty('volume');
          expect(candle).toHaveProperty('open_time');
          expect(candle).toHaveProperty('close_time');
        }
      });
    });
  });

  describe('getFuturesOrderBook', () => {
    it('should fetch order book depth', async () => {
      await polly.record('getFuturesOrderBook', async () => {
        const orderBook = await client.futures.market.getOrderBook('B-BTC_USDT', 20);
        
        expect(orderBook).toHaveProperty('bids');
        expect(orderBook).toHaveProperty('asks');
        expect(Array.isArray(orderBook.bids)).toBe(true);
        expect(Array.isArray(orderBook.asks)).toBe(true);
      });
    });
  });

  describe('getTicker', () => {
    it('should fetch ticker data', async () => {
      await polly.record('getTicker', async () => {
        const tickers = await client.futures.market.getTicker();
        
        expect(Array.isArray(tickers)).toBe(true);
        const btcTicker = tickers.find(t => t.pair === 'B-BTC_USDT');
        if (btcTicker) {
          expect(btcTicker).toHaveProperty('last_price');
          expect(typeof btcTicker.last_price).toBe('number');
        }
      });
    });
  });

  describe('getInstrumentDetails', () => {
    it('should fetch instrument details', async () => {
      await polly.record('getInstrumentDetails', async () => {
        const instrument = await client.futures.market.getInstrumentDetails('B-BTC_USDT');
        
        expect(instrument).toHaveProperty('pair');
        expect(instrument.pair).toBe('B-BTC_USDT');
        expect(instrument).toHaveProperty('max_leverage');
        expect(instrument).toHaveProperty('tick_size');
        expect(instrument).toHaveProperty('lot_size');
      });
    });
  });
});

describe('CoinDCX SDK - Spot Market Data (VCR Cassettes)', () => {
  let client: CoinDCXClient;

  beforeEach(() => {
    client = new CoinDCXClient({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      paperMode: true,
    });
  });

  describe('getSpotCandles', () => {
    it('should fetch spot candlestick data', async () => {
      await polly.record('getSpotCandles', async () => {
        const candles = await client.marketData.getSpotCandles({
          pair: 'BTC_USDT',
          interval: '1m',
          limit: 10,
        });
        
        expect(Array.isArray(candles)).toBe(true);
      });
    });
  });

  describe('getSpotOrderBook', () => {
    it('should fetch spot order book', async () => {
      await polly.record('getSpotOrderBook', async () => {
        const orderBook = await client.marketData.getSpotOrderBook({
          pair: 'BTC_USDT',
          depth: 20,
        });
        
        expect(orderBook).toHaveProperty('bids');
        expect(orderBook).toHaveProperty('asks');
      });
    });
  });
});