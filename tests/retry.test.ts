import nock from 'nock';
import { FuturesApi } from '../src/rest/futures';
import {
  CoinDCXAPIError,
  CoinDCXRateLimitError,
  isRetryableError,
} from '../src/core/errors';

const API = 'https://api.coindcx.com';
const KEY = 'test-key';
const SECRET = 'test-secret';

function client(opts: Record<string, number> = {}): FuturesApi {
  return new FuturesApi({ apiKey: KEY, apiSecret: SECRET, ...opts });
}

describe('retry with exponential backoff', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('retries a retryable GET until success', async () => {
    const api = client({ maxRetries: 2, retryBaseDelayMs: 5, retryMaxDelayMs: 50 });
    nock(API)
      .get('/exchange/v1/derivatives/futures/data/active_instruments')
      .query(true)
      .times(2)
      .reply(500, { message: 'server error' })
      .get('/exchange/v1/derivatives/futures/data/active_instruments')
      .query(true)
      .reply(200, [{ pair: 'B-BTC_USDT' }]);

    const result = await api.getActiveInstruments('USDT');
    expect(result).toHaveLength(1);
    expect(nock.pendingMocks()).toHaveLength(0);
  });

  it('fails fast on a retryable POST with no client_order_id (never double-submits)', async () => {
    const api = client({ maxRetries: 2, retryBaseDelayMs: 5 });
    nock(API)
      .post('/exchange/v1/derivatives/futures/orders/cancel_all')
      .query(true)
      .reply(500, { message: 'server error' });

    await expect(
      api.cancelAllOrders({ side: 'buy' } as any)
    ).rejects.toBeInstanceOf(CoinDCXAPIError);
    expect(nock.pendingMocks()).toHaveLength(0);
  });

  it('retries a retryable POST that carries a client_order_id until success', async () => {
    const api = client({ maxRetries: 2, retryBaseDelayMs: 5 });
    nock(API)
      .post('/exchange/v1/derivatives/futures/orders/create')
      .query(true)
      .reply(500, { message: 'server error' })
      .post('/exchange/v1/derivatives/futures/orders/create')
      .query(true)
      .reply(200, { id: 'order-1', status: 'open' });

    const result = await api.createOrder({
      side: 'buy',
      order_type: 'market_order',
      base_currency: 'SOL',
      quote_currency: 'USDT',
      target_quantity: 1,
      price: 0,
      leverage: 1,
      client_order_id: 'fixed-client-order-id',
      time_in_force: 'gtc',
      stop_loss: 0,
      take_profit: 0,
      margin_type: 'isolated',
    });
    expect(result).toEqual({ id: 'order-1', status: 'open' });
    expect(nock.pendingMocks()).toHaveLength(0);
  });

  it('does not loop on a duplicate client_order_id rejection (non-retryable 400)', async () => {
    const api = client({ maxRetries: 2, retryBaseDelayMs: 5 });
    nock(API)
      .post('/exchange/v1/derivatives/futures/orders/create')
      .query(true)
      .reply(400, { message: 'client_order_id already exists' });

    await expect(
      api.createOrder({
        side: 'buy',
        order_type: 'market_order',
        base_currency: 'SOL',
        quote_currency: 'USDT',
        target_quantity: 1,
        price: 0,
        leverage: 1,
        client_order_id: 'reused-client-order-id',
        time_in_force: 'gtc',
        stop_loss: 0,
        take_profit: 0,
        margin_type: 'isolated',
      })
    ).rejects.toBeInstanceOf(CoinDCXAPIError);
    expect(nock.pendingMocks()).toHaveLength(0);
  });

  it('honors retry-after on 429 for a GET', async () => {
    const api = client({ maxRetries: 1, retryBaseDelayMs: 5, retryMaxDelayMs: 2000 });
    nock(API)
      .get('/exchange/v1/derivatives/futures/data/active_instruments')
      .query(true)
      .reply(429, { message: 'rate limited' }, { 'retry-after': '1' })
      .get('/exchange/v1/derivatives/futures/data/active_instruments')
      .query(true)
      .reply(200, []);

    const start = Date.now();
    await api.getActiveInstruments('USDT');
    // 1s retry-after wins over the 5ms backoff, but stays under the cap.
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(900);
    expect(elapsed).toBeLessThan(1900);
  });

  it('gives up and rethrows after exhausting retries', async () => {
    const api = client({ maxRetries: 1, retryBaseDelayMs: 5, retryMaxDelayMs: 50 });
    nock(API)
      .get('/exchange/v1/derivatives/futures/data/active_instruments')
      .query(true)
      .times(2)
      .reply(500, { message: 'server error' });

    await expect(api.getActiveInstruments('USDT')).rejects.toBeInstanceOf(CoinDCXAPIError);
  });

  it('classifies retryable errors', () => {
    const err = new CoinDCXAPIError('boom', 503, {}, 'GET', '/x');
    const rate = new CoinDCXRateLimitError('slow down', 429, {}, 'GET', '/x', 5);
    expect(isRetryableError(err)).toBe(true);
    expect(isRetryableError(rate)).toBe(true);
    expect(isRetryableError(new Error('plain'))).toBe(false);
  });
});