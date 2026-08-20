import { CoinDCXClient } from '../src/index';
import { mockPrivateEndpoint } from './setup';

describe('CoinDCX SDK - Operations & Paper Engine', () => {
  let client: CoinDCXClient;

  beforeEach(() => {
    client = new CoinDCXClient({
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      paperMode: true,
    });
  });

  describe('Sizing Operations', () => {
    it('should calculate position size correctly', () => {
      const result = client.ops.sizing.calculatePositionSize({
        accountBalance: 10000,
        riskPercent: 2,
        entryPrice: 50000,
        stopLossPrice: 49000,
        leverage: 10,
      });

      expect(result.quantity).toBeCloseTo(0.02, 2);
      expect(result.riskAmount).toBe(200);
    });

    it('should calculate liquidation price for long position', () => {
      const liqPrice = client.ops.sizing.calculateLiquidationPrice(
        50000, 10, 'long', 0.005
      );
      expect(liqPrice).toBeCloseTo(45250, 0);
    });

    it('should calculate PnL correctly', () => {
      const pnlLong = client.ops.sizing.calculatePnL(50000, 51000, 0.01, 'long');
      expect(pnlLong).toBe(10);

      const pnlShort = client.ops.sizing.calculatePnL(50000, 49000, 0.01, 'short');
      expect(pnlShort).toBe(10);
    });

    it('should calculate ROE correctly', () => {
      const roe = client.ops.sizing.calculateROE(50000, 51000, 0.01, 'long', 10);
      expect(roe).toBe(20);
    });
  });

  describe('Bracket Orders', () => {
    it('should place bracket order with market entry', async () => {
      const mockEntryOrder = {
        id: 'bracket-1',
        client_order_id: 'bracket_123_entry',
        pair: 'B-BTC_USDT',
        base_currency: 'BTC',
        quote_currency: 'USDT',
        side: 'buy' as const,
        order_type: 'market_order' as const,
        target_quantity: 0.01,
        filled_quantity: 0.01,
        remaining_quantity: 0,
        status: 'filled',
        time_in_force: 'gtc',
        created_at: Date.now(),
        updated_at: Date.now(),
        leverage: 10,
        margin_type: 'cross' as const,
        price: undefined,
        stop_loss: undefined,
        take_profit: undefined,
      };

      mockPrivateEndpoint('post', '/exchange/v1/derivatives/futures/orders/create', mockEntryOrder);
      mockPrivateEndpoint('post', '/exchange/v1/derivatives/futures/positions/create_tpsl', [
        { id: 'sl-1', side: 'sell', order_type: 'stop_limit_order', price: 48000, quantity: 0.01, status: 'open' },
        { id: 'tp-1', side: 'sell', order_type: 'limit_order', price: 55000, quantity: 0.01, status: 'open' },
      ]);

      const result = await client.ops.bracket.placeBracketOrder({
        pair: 'B-BTC_USDT',
        side: 'buy',
        quantity: 0.01,
        stopLoss: 48000,
        takeProfit: 55000,
        leverage: 10,
        entryPrice: undefined,
        marginType: undefined,
        clientOrderId: undefined,
      });

      expect(result.entryOrder).toBeDefined();
    });
  });

  describe('Account Snapshot', () => {
    it('should get account overview', async () => {
      const spotBalances = [
        { currency: 'USDT', balance: 10000, locked_balance: 100, available_balance: 9900, wallet_type: 'spot' },
      ];
      const futuresWallet = [
        { currency: 'USDT', balance: 5000, locked_balance: 500, available_balance: 4500 },
      ];
      const futuresPositions = [
        {
          id: 'pos-1',
          pair: 'B-BTC_USDT',
          side: 'long' as const,
          size: 0.01,
          entry_price: 50000,
          mark_price: 51000,
          liquidation_price: 45000,
          unrealized_pnl: 10,
          realized_pnl: 0,
          leverage: 10,
          margin_type: 'cross' as const,
          margin: 50,
          timestamp: Date.now(),
        },
      ];

      mockPrivateEndpoint('post', '/exchange/v1/users/balances', spotBalances);
      mockPrivateEndpoint('get', '/exchange/v1/derivatives/futures/wallets', futuresWallet);
      mockPrivateEndpoint('post', '/exchange/v1/derivatives/futures/positions', futuresPositions);

      const overview = await client.ops.snapshot.getAccountOverview();

      expect(overview.totalEquity).toBe(15010);
      expect(overview.futuresPositions.length).toBe(1);
    });
  });

  describe('Paper Trading Engine', () => {
    it('should place paper market order', async () => {
      client.paper.updatePrice('B-BTC_USDT', 50000, 50100);

      const order = await client.paper.placeOrder({
        side: 'buy',
        order_type: 'market_order',
        base_currency: 'BTC',
        quote_currency: 'USDT',
        target_quantity: 0.01,
        leverage: 10,
        price: undefined,
        client_order_id: undefined,
        time_in_force: undefined,
        stop_loss: undefined,
        take_profit: undefined,
        margin_type: undefined,
      });

      expect(order.id).toContain('paper_');
      expect(order.status).toBe('filled');
    });

    it('should place paper limit order', async () => {
      client.paper.updatePrice('B-BTC_USDT', 49000, 49100);

      const order = await client.paper.placeOrder({
        side: 'buy',
        order_type: 'limit_order',
        base_currency: 'BTC',
        quote_currency: 'USDT',
        target_quantity: 0.01,
        price: 49000,
        leverage: 10,
        client_order_id: undefined,
        time_in_force: undefined,
        stop_loss: undefined,
        take_profit: undefined,
        margin_type: undefined,
      });

      expect(order.status).toBe('new');

      client.paper.updatePrice('B-BTC_USDT', 48900, 49000);

      const filledOrder = client.paper.getOrder(order.id);
      expect(filledOrder?.status).toBe('filled');
    });

    it('should track paper positions and PnL', async () => {
      client.paper.updatePrice('B-BTC_USDT', 50000, 50100);

      await client.paper.placeOrder({
        side: 'buy',
        order_type: 'market_order',
        base_currency: 'BTC',
        quote_currency: 'USDT',
        target_quantity: 0.01,
        leverage: 10,
        price: undefined,
        client_order_id: undefined,
        time_in_force: undefined,
        stop_loss: undefined,
        take_profit: undefined,
        margin_type: undefined,
      });

      client.paper.updatePrice('B-BTC_USDT', 51000, 51100);

      const positions = client.paper.getPositions();
      expect(positions.length).toBe(1);
    });

    it('should track paper account equity', async () => {
      const initialAccount = client.paper.getAccount();
      expect(initialAccount.totalEquity).toBe(20000);

      client.paper.updatePrice('B-BTC_USDT', 50000, 50100);
      await client.paper.placeOrder({
        side: 'buy',
        order_type: 'market_order',
        base_currency: 'BTC',
        quote_currency: 'USDT',
        target_quantity: 0.01,
        leverage: 10,
        price: undefined,
        client_order_id: undefined,
        time_in_force: undefined,
        stop_loss: undefined,
        take_profit: undefined,
        margin_type: undefined,
      });

      client.paper.updatePrice('B-BTC_USDT', 51000, 51100);

      const account = client.paper.getAccount();
      expect(account.totalEquity).toBe(20010);
    });

    it('should reject orders with insufficient margin', async () => {
      client.paper.reset({ initialBalance: 100, initialFuturesBalance: 100 });
      client.paper.updatePrice('B-BTC_USDT', 50000, 50100);

      await expect(client.paper.placeOrder({
        side: 'buy',
        order_type: 'market_order',
        base_currency: 'BTC',
        quote_currency: 'USDT',
        target_quantity: 10,
        leverage: 10,
        price: undefined,
        client_order_id: undefined,
        time_in_force: undefined,
        stop_loss: undefined,
        take_profit: undefined,
        margin_type: undefined,
      })).rejects.toThrow('Insufficient margin');
    });

    it('should cancel paper orders', async () => {
      client.paper.updatePrice('B-BTC_USDT', 49000, 49100);

      const order = await client.paper.placeOrder({
        side: 'buy',
        order_type: 'limit_order',
        base_currency: 'BTC',
        quote_currency: 'USDT',
        target_quantity: 0.01,
        price: 49000,
        leverage: 10,
        client_order_id: undefined,
        time_in_force: undefined,
        stop_loss: undefined,
        take_profit: undefined,
        margin_type: undefined,
      });

      const cancelled = await client.paper.cancelOrder(order.id);
      expect(cancelled).toBe(true);
    });
  });
});