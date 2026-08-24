import nock from 'nock';
import { CoinDCXClient } from '../src/index';
import { FuturesApi } from '../src/rest/futures';
import { SpotApi } from '../src/rest/spot';
import { MarginApi } from '../src/rest/margin';
import { assertWithinOrderLimits, CoinDCXOrderLimitError } from '../src/index';

describe('assertWithinOrderLimits (unit)', () => {
  it('is a no-op when no limits are configured', () => {
    expect(() => assertWithinOrderLimits({ quantity: 1_000_000, price: 1_000_000 }, undefined)).not.toThrow();
  });

  it('throws CoinDCXOrderLimitError when quantity exceeds maxOrderQuantity', () => {
    expect(() => assertWithinOrderLimits({ quantity: 10 }, { maxOrderQuantity: 5 })).toThrow(CoinDCXOrderLimitError);
  });

  it('allows a quantity at or below maxOrderQuantity', () => {
    expect(() => assertWithinOrderLimits({ quantity: 5 }, { maxOrderQuantity: 5 })).not.toThrow();
  });

  it('throws CoinDCXOrderLimitError when notional (qty*price) exceeds maxOrderNotional', () => {
    expect(() => assertWithinOrderLimits({ quantity: 10, price: 100 }, { maxOrderNotional: 500 })).toThrow(CoinDCXOrderLimitError);
  });

  it('skips the notional check for a market order (no price)', () => {
    expect(() => assertWithinOrderLimits({ quantity: 10 }, { maxOrderNotional: 1 })).not.toThrow();
  });

  it('carries an actionable suggestedAction', () => {
    try {
      assertWithinOrderLimits({ quantity: 10 }, { maxOrderQuantity: 5 });
      throw new Error('expected assertWithinOrderLimits to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(CoinDCXOrderLimitError);
      expect((error as CoinDCXOrderLimitError).suggestedAction).toMatch(/setSafetyLimits/);
    }
  });
});

describe('order-creation guardrails (integration, no live network call)', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('FuturesApi.createOrder rejects an oversized order before hitting the network', async () => {
    const api = new FuturesApi({ apiKey: 'k', apiSecret: 's', safetyLimits: { maxOrderQuantity: 1 } });
    await expect(
      api.createOrder({
        side: 'buy',
        order_type: 'market_order',
        base_currency: 'SOL',
        quote_currency: 'USDT',
        target_quantity: 100,
        price: undefined,
        leverage: 1,
        client_order_id: undefined,
        time_in_force: undefined,
        stop_loss: undefined,
        take_profit: undefined,
        margin_type: undefined,
      })
    ).rejects.toBeInstanceOf(CoinDCXOrderLimitError);
    // No nock interceptor was registered for this test, and nock.disableNetConnect()
    // is active (see tests/setup.ts) - if the guard hadn't fired before the request,
    // this would reject with a network error instead, not CoinDCXOrderLimitError.
  });

  it('SpotApi.createOrder rejects an order over the notional limit before hitting the network', async () => {
    const api = new SpotApi({ apiKey: 'k', apiSecret: 's', safetyLimits: { maxOrderNotional: 100 } });
    await expect(
      api.createOrder({
        side: 'buy',
        order_type: 'limit_order',
        market: 'BTC_USDT',
        price: 50_000,
        quantity: 1,
      })
    ).rejects.toBeInstanceOf(CoinDCXOrderLimitError);
  });

  it('MarginApi.createOrder rejects an oversized order before hitting the network', async () => {
    const api = new MarginApi({ apiKey: 'k', apiSecret: 's', safetyLimits: { maxOrderQuantity: 1 } });
    await expect(
      api.createOrder({
        side: 'buy',
        order_type: 'market_order',
        market: 'BTC_USDT',
        quantity: 5,
      })
    ).rejects.toBeInstanceOf(CoinDCXOrderLimitError);
  });

  it('allows an order within limits through to the network layer', async () => {
    const api = new FuturesApi({ apiKey: 'k', apiSecret: 's', safetyLimits: { maxOrderQuantity: 10 } });
    nock('https://api.coindcx.com')
      .post('/exchange/v1/derivatives/futures/orders/create')
      .query(true)
      .reply(200, { id: 'order-1' });

    const result = await api.createOrder({
      side: 'buy',
      order_type: 'market_order',
      base_currency: 'SOL',
      quote_currency: 'USDT',
      target_quantity: 5,
      price: undefined,
      leverage: 1,
      client_order_id: undefined,
      time_in_force: undefined,
      stop_loss: undefined,
      take_profit: undefined,
      margin_type: undefined,
    });
    expect(result).toEqual({ id: 'order-1' });
    expect(nock.pendingMocks()).toHaveLength(0);
  });
});

describe('CoinDCXClient safety limits propagation', () => {
  it('setSafetyLimits/getSafetyLimits round-trip and apply across spot/margin/futures', async () => {
    const client = new CoinDCXClient({ apiKey: 'k', apiSecret: 's' });
    expect(client.getSafetyLimits()).toBeUndefined();

    client.setSafetyLimits({ maxOrderQuantity: 2 });
    expect(client.getSafetyLimits()).toEqual({ maxOrderQuantity: 2 });

    await expect(
      client.spot.createOrder({ side: 'buy', order_type: 'market_order', market: 'BTC_USDT', quantity: 10 })
    ).rejects.toBeInstanceOf(CoinDCXOrderLimitError);
    await expect(
      client.margin.createOrder({ side: 'buy', order_type: 'market_order', market: 'BTC_USDT', quantity: 10 })
    ).rejects.toBeInstanceOf(CoinDCXOrderLimitError);
    await expect(
      client.futures.trading.createOrder({
        side: 'buy',
        order_type: 'market_order',
        base_currency: 'SOL',
        quote_currency: 'USDT',
        target_quantity: 10,
        price: undefined,
        leverage: 1,
        client_order_id: undefined,
        time_in_force: undefined,
        stop_loss: undefined,
        take_profit: undefined,
        margin_type: undefined,
      })
    ).rejects.toBeInstanceOf(CoinDCXOrderLimitError);

    client.setSafetyLimits(undefined);
    expect(client.getSafetyLimits()).toBeUndefined();
  });

  it('constructor safetyLimits option is applied from the start', async () => {
    const client = new CoinDCXClient({ apiKey: 'k', apiSecret: 's', safetyLimits: { maxOrderQuantity: 1 } });
    expect(client.getSafetyLimits()).toEqual({ maxOrderQuantity: 1 });
    await expect(
      client.spot.createOrder({ side: 'buy', order_type: 'market_order', market: 'BTC_USDT', quantity: 5 })
    ).rejects.toBeInstanceOf(CoinDCXOrderLimitError);
  });
});
