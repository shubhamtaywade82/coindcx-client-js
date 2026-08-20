import { CoinDCXClient } from '../src/index';
import { mockPrivateEndpoint, mockPublicEndpoint, nock } from './setup';

describe('CoinDCX SDK - Private Endpoints (Webmocks)', () => {
  let client: CoinDCXClient;

  beforeEach(() => {
    client = new CoinDCXClient({
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      paperMode: false,
    });
  });

  describe('Spot Trading', () => {
    describe('createOrder', () => {
      it('should create a spot market order', async () => {
        const mockResponse = {
          id: '12345',
          client_order_id: 'test-order-1',
          market: 'BTC_USDT',
          side: 'buy',
          order_type: 'market_order',
          price: 0,
          quantity: 0.001,
          filled_quantity: 0.001,
          remaining_quantity: 0,
          status: 'filled',
          time_in_force: 'gtc',
          created_at: Date.now(),
          updated_at: Date.now(),
        };

        mockPrivateEndpoint('post', '/exchange/v1/orders/create', mockResponse);

        const order = await client.spot.createOrder({
          side: 'buy',
          order_type: 'market_order',
          market: 'BTC_USDT',
          quantity: 0.001,
        });

        expect(order.id).toBe('12345');
        expect(order.side).toBe('buy');
        expect(order.status).toBe('filled');
      });

      it('should create a spot limit order', async () => {
        const mockResponse = {
          id: '12346',
          client_order_id: 'test-order-2',
          market: 'BTC_USDT',
          side: 'buy',
          order_type: 'limit_order',
          price: 50000,
          quantity: 0.001,
          filled_quantity: 0,
          remaining_quantity: 0.001,
          status: 'open',
          time_in_force: 'gtc',
          created_at: Date.now(),
          updated_at: Date.now(),
        };

        mockPrivateEndpoint('post', '/exchange/v1/orders/create', mockResponse);

        const order = await client.spot.createOrder({
          side: 'buy',
          order_type: 'limit_order',
          market: 'BTC_USDT',
          price: 50000,
          quantity: 0.001,
        });

        expect(order.price).toBe(50000);
        expect(order.status).toBe('open');
      });

      it('should handle insufficient balance error', async () => {
        mockPrivateEndpoint('post', '/exchange/v1/orders/create', {
          message: 'Insufficient balance',
        }, 400);

        await expect(client.spot.createOrder({
          side: 'buy',
          order_type: 'market_order',
          market: 'BTC_USDT',
          quantity: 100,
        })).rejects.toThrow('Insufficient balance');
      });
    });

    describe('cancelOrder', () => {
      it('should cancel an existing order', async () => {
        mockPrivateEndpoint('post', '/exchange/v1/orders/cancel', {
          success: true,
          message: 'Order cancelled',
        });

        const result = await client.spot.cancelOrder({ id: '12345' });
        expect(result.success).toBe(true);
      });
    });

    describe('getOrderStatus', () => {
      it('should fetch order status', async () => {
        const mockResponse = {
          id: '12345',
          client_order_id: 'test-order-1',
          market: 'BTC_USDT',
          side: 'buy',
          order_type: 'limit_order',
          price: 50000,
          quantity: 0.001,
          filled_quantity: 0.0005,
          remaining_quantity: 0.0005,
          status: 'partially_filled',
          time_in_force: 'gtc',
          created_at: Date.now(),
          updated_at: Date.now(),
        };

        mockPrivateEndpoint('post', '/exchange/v1/orders/status', mockResponse);

        const order = await client.spot.getOrderStatus({ id: '12345' });
        expect(order.status).toBe('partially_filled');
        expect(order.filled_quantity).toBe(0.0005);
      });
    });

    describe('getActiveOrders', () => {
      it('should fetch all active orders', async () => {
        const mockResponse = [
          {
            id: '12345',
            market: 'BTC_USDT',
            side: 'buy',
            order_type: 'limit_order',
            price: 50000,
            quantity: 0.001,
            filled_quantity: 0,
            remaining_quantity: 0.001,
            status: 'open',
            created_at: Date.now(),
          },
        ];

        mockPrivateEndpoint('post', '/exchange/v1/orders/active_orders', mockResponse);

        const orders = await client.spot.getActiveOrders();
        expect(orders.length).toBe(1);
        expect(orders[0].market).toBe('BTC_USDT');
      });
    });
  });

  describe('Futures Trading', () => {
    describe('createOrder', () => {
      it('should create a futures market order', async () => {
        const mockResponse = {
          id: 'fut-12345',
          client_order_id: 'fut-test-1',
          pair: 'B-BTC_USDT',
          base_currency: 'BTC',
          quote_currency: 'USDT',
          side: 'buy',
          order_type: 'market_order',
          target_quantity: 0.01,
          filled_quantity: 0.01,
          remaining_quantity: 0,
          status: 'filled',
          time_in_force: 'gtc',
          created_at: Date.now(),
          updated_at: Date.now(),
          leverage: 10,
          margin_type: 'cross',
        };

        mockPrivateEndpoint('post', '/exchange/v1/derivatives/futures/orders/create', mockResponse);

        const order = await client.futures.trading.createOrder({
          side: 'buy',
          order_type: 'market_order',
          base_currency: 'BTC',
          quote_currency: 'USDT',
          target_quantity: 0.01,
          leverage: 10,
        });

        expect(order.id).toBe('fut-12345');
        expect(order.leverage).toBe(10);
        expect(order.margin_type).toBe('cross');
      });

      it('should create a futures limit order with TP/SL', async () => {
        const mockResponse = {
          id: 'fut-12346',
          client_order_id: 'fut-test-2',
          pair: 'B-ETH_USDT',
          base_currency: 'ETH',
          quote_currency: 'USDT',
          side: 'sell',
          order_type: 'limit_order',
          price: 3000,
          target_quantity: 0.1,
          filled_quantity: 0,
          remaining_quantity: 0.1,
          status: 'open',
          time_in_force: 'gtc',
          created_at: Date.now(),
          updated_at: Date.now(),
          leverage: 20,
          margin_type: 'isolated',
          stop_loss: 3100,
          take_profit: 2800,
        };

        mockPrivateEndpoint('post', '/exchange/v1/derivatives/futures/orders/create', mockResponse);

        const order = await client.futures.trading.createOrder({
          side: 'sell',
          order_type: 'limit_order',
          base_currency: 'ETH',
          quote_currency: 'USDT',
          target_quantity: 0.1,
          price: 3000,
          leverage: 20,
          margin_type: 'isolated',
          stop_loss: 3100,
          take_profit: 2800,
        });

        expect(order.stop_loss).toBe(3100);
        expect(order.take_profit).toBe(2800);
      });
    });

    describe('getPositions', () => {
      it('should fetch open futures positions', async () => {
        const mockResponse = [
          {
            id: 'pos-1',
            pair: 'B-BTC_USDT',
            side: 'long',
            size: 0.01,
            entry_price: 50000,
            mark_price: 51000,
            liquidation_price: 45000,
            unrealized_pnl: 10,
            realized_pnl: 0,
            leverage: 10,
            margin_type: 'cross',
            margin: 50,
            timestamp: Date.now(),
          },
          {
            id: 'pos-2',
            pair: 'B-ETH_USDT',
            side: 'short',
            size: 0.1,
            entry_price: 3000,
            mark_price: 2950,
            liquidation_price: 3300,
            unrealized_pnl: 5,
            realized_pnl: 0,
            leverage: 20,
            margin_type: 'isolated',
            margin: 15,
            timestamp: Date.now(),
          },
        ];

        mockPrivateEndpoint('post', '/exchange/v1/derivatives/futures/positions', mockResponse);

        const positions = await client.futures.trading.getPositions();
        expect(positions.length).toBe(2);
        expect(positions[0].side).toBe('long');
        expect(positions[1].side).toBe('short');
      });

      it('should filter positions by pair', async () => {
        const mockResponse = [
          {
            id: 'pos-1',
            pair: 'B-BTC_USDT',
            side: 'long',
            size: 0.01,
            entry_price: 50000,
            mark_price: 51000,
            liquidation_price: 45000,
            unrealized_pnl: 10,
            realized_pnl: 0,
            leverage: 10,
            margin_type: 'cross',
            margin: 50,
            timestamp: Date.now(),
          },
        ];

        mockPrivateEndpoint('post', '/exchange/v1/derivatives/futures/positions', mockResponse);

        const positions = await client.futures.trading.getPositions({ pair: 'B-BTC_USDT' });
        expect(positions.length).toBe(1);
        expect(positions[0].pair).toBe('B-BTC_USDT');
      });
    });

    describe('closePosition', () => {
      it('should close a position by ID', async () => {
        mockPrivateEndpoint('post', '/exchange/v1/derivatives/futures/positions/close', {
          success: true,
          message: 'Position closed',
        });

        const result = await client.futures.trading.closePosition({ id: 'pos-1' });
        expect(result.success).toBe(true);
      });
    });

    describe('updateLeverage', () => {
      it('should update leverage for a pair', async () => {
        mockPrivateEndpoint('post', '/exchange/v1/derivatives/futures/positions/update_leverage', {
          success: true,
          leverage: 25,
        });

        const result = await client.futures.trading.updateLeverage({
          pair: 'B-BTC_USDT',
          leverage: 25,
        });

        expect(result.leverage).toBe(25);
      });
    });

    describe('createTPSL', () => {
      it('should create take profit and stop loss orders', async () => {
        const mockResponse = [
          {
            id: 'tp-1',
            side: 'sell',
            order_type: 'limit_order',
            price: 55000,
            quantity: 0.01,
            status: 'open',
          },
          {
            id: 'sl-1',
            side: 'sell',
            order_type: 'stop_limit_order',
            price: 48000,
            quantity: 0.01,
            status: 'open',
          },
        ];

        mockPrivateEndpoint('post', '/exchange/v1/derivatives/futures/positions/create_tpsl', mockResponse);

        const result = await client.futures.trading.createTPSL({
          position_id: 'pos-1',
          stop_loss: 48000,
          take_profit: 55000,
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2);
      });
    });
  });

  describe('Account & Wallet', () => {
    describe('getBalances', () => {
      it('should fetch spot balances', async () => {
        const mockResponse = [
          { currency: 'USDT', balance: 10000, locked_balance: 100, available_balance: 9900, wallet_type: 'spot' },
          { currency: 'BTC', balance: 0.5, locked_balance: 0.1, available_balance: 0.4, wallet_type: 'spot' },
        ];

        mockPrivateEndpoint('post', '/exchange/v1/users/balances', mockResponse);

        const balances = await client.spot.getBalances();
        expect(balances.length).toBe(2);
        expect(balances[0].currency).toBe('USDT');
        expect(balances[0].available_balance).toBe(9900);
      });
    });

    describe('getFuturesWallet', () => {
      it('should fetch futures wallet', async () => {
        const mockResponse = [
          { currency: 'USDT', balance: 5000, locked_balance: 500, available_balance: 4500 },
        ];

        mockPrivateEndpoint('get', '/exchange/v1/derivatives/futures/wallets', mockResponse);

        const wallet = await client.futures.account.getWallet();
        expect(wallet[0].currency).toBe('USDT');
        expect(wallet[0].available_balance).toBe(4500);
      });
    });

    describe('getUserInfo', () => {
      it('should fetch user info', async () => {
        const mockResponse = {
          user_id: 'user-123',
          email: 'test@example.com',
          kyc_status: 'verified',
          created_at: Date.now() - 86400000,
        };

        mockPrivateEndpoint('post', '/exchange/v1/users/info', mockResponse);

        const info = await client.spot.getUserInfo();
        expect(info.user_id).toBe('user-123');
        expect(info.kyc_status).toBe('verified');
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit errors', async () => {
      mockPrivateEndpoint('post', '/exchange/v1/orders/create', {
        message: 'Rate limit exceeded',
      }, 429);

      await expect(client.spot.createOrder({
        side: 'buy',
        order_type: 'market_order',
        market: 'BTC_USDT',
        quantity: 0.001,
      })).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Authentication Errors', () => {
    it('should handle invalid API key', async () => {
      mockPrivateEndpoint('post', '/exchange/v1/users/balances', {
        message: 'Invalid API key',
      }, 401);

      await expect(client.spot.getBalances()).rejects.toThrow('Invalid API key');
    });
  });
});