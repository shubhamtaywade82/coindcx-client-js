import { CoinDCXClient } from '../index';
import { CreateFuturesOrderRequest, CreateSpotOrderRequest } from '../models';
import { PositionSizingParams, BracketOrderParams } from '../ops';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
}

export function createFuturesToolkit(client: CoinDCXClient): MCPTool[] {
  return [
    {
      name: 'futures_create_order',
      description: 'Create a futures order on CoinDCX',
      inputSchema: {
        type: 'object',
        properties: {
          side: { type: 'string', enum: ['buy', 'sell'], description: 'Order side' },
          order_type: { type: 'string', enum: ['market_order', 'limit_order', 'stop_limit_order'], description: 'Order type' },
          base_currency: { type: 'string', description: 'Base currency (e.g., SOL)' },
          quote_currency: { type: 'string', description: 'Quote currency (e.g., USDT)' },
          target_quantity: { type: 'number', description: 'Quantity to trade' },
          price: { type: 'number', description: 'Limit price (required for limit orders)' },
          leverage: { type: 'number', description: 'Leverage (1-100)', minimum: 1, maximum: 100 },
          stop_loss: { type: 'number', description: 'Stop loss price' },
          take_profit: { type: 'number', description: 'Take profit price' },
          margin_type: { type: 'string', enum: ['isolated', 'cross'], description: 'Margin type' },
        },
        required: ['side', 'order_type', 'base_currency', 'quote_currency', 'target_quantity'],
      },
      handler: async (args: CreateFuturesOrderRequest) => {
        return client.futures.trading.createOrder(args);
      },
    },
    {
      name: 'futures_get_positions',
      description: 'Get all open futures positions',
      inputSchema: {
        type: 'object',
        properties: {
          pair: { type: 'string', description: 'Filter by pair (e.g., B-SOL_USDT)' },
        },
      },
      handler: async (args: { pair?: string }) => {
        return client.futures.trading.getPositions(args);
      },
    },
    {
      name: 'futures_close_position',
      description: 'Close a futures position by pair',
      inputSchema: {
        type: 'object',
        properties: {
          pair: { type: 'string', description: 'Pair to close (e.g., B-SOL_USDT)' },
        },
        required: ['pair'],
      },
      handler: async (args: { pair: string }) => {
        return client.futures.trading.exitPosition({ pair: args.pair });
      },
    },
    {
      name: 'futures_get_balance',
      description: 'Get futures wallet balance',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        return client.futures.account.getWallet();
      },
    },
    {
      name: 'futures_get_ticker',
      description: 'Get futures ticker for a pair',
      inputSchema: {
        type: 'object',
        properties: {
          pair: { type: 'string', description: 'Pair (e.g., B-SOL_USDT)' },
        },
        required: ['pair'],
      },
      handler: async (args: { pair: string }) => {
        const tickers = await client.futures.market.getTicker();
        return tickers.find((t: any) => t.pair === args.pair);
      },
    },
    {
      name: 'futures_get_klines',
      description: 'Get futures candlestick data',
      inputSchema: {
        type: 'object',
        properties: {
          pair: { type: 'string', description: 'Pair (e.g., B-SOL_USDT)' },
          interval: { type: 'string', description: 'Interval (1m, 5m, 15m, 1h, 4h, 1d)' },
          limit: { type: 'number', description: 'Number of candles', default: 100 },
        },
        required: ['pair', 'interval'],
      },
      handler: async (args: { pair: string; interval: string; limit?: number }) => {
        return client.futures.market.getCandles(args.pair, args.interval, args.limit || 100);
      },
    },
    {
      name: 'futures_place_bracket_order',
      description: 'Place a bracket order (entry + stop loss + take profit)',
      inputSchema: {
        type: 'object',
        properties: {
          pair: { type: 'string', description: 'Pair (e.g., B-SOL_USDT)' },
          side: { type: 'string', enum: ['buy', 'sell'] },
          quantity: { type: 'number', description: 'Quantity to trade' },
          entryPrice: { type: 'number', description: 'Entry price (optional, market if not provided)' },
          stopLoss: { type: 'number', description: 'Stop loss price' },
          takeProfit: { type: 'number', description: 'Take profit price' },
          leverage: { type: 'number', description: 'Leverage', minimum: 1, maximum: 100 },
        },
        required: ['pair', 'side', 'quantity', 'stopLoss', 'takeProfit'],
      },
      handler: async (args: BracketOrderParams) => {
        return client.ops.bracket.placeBracketOrder(args);
      },
    },
    {
      name: 'futures_calculate_position_size',
      description: 'Calculate position size based on risk parameters',
      inputSchema: {
        type: 'object',
        properties: {
          accountBalance: { type: 'number', description: 'Account balance in USDT' },
          riskPercent: { type: 'number', description: 'Risk percentage per trade (e.g., 2 for 2%)' },
          entryPrice: { type: 'number', description: 'Planned entry price' },
          stopLossPrice: { type: 'number', description: 'Stop loss price' },
          leverage: { type: 'number', description: 'Leverage', minimum: 1, maximum: 100 },
          maxPositionSize: { type: 'number', description: 'Maximum position size' },
        },
        required: ['accountBalance', 'riskPercent', 'entryPrice', 'stopLossPrice', 'leverage'],
      },
      handler: async (args: PositionSizingParams) => {
        return client.ops.sizing.calculatePositionSize(args);
      },
    },
    {
      name: 'futures_get_orderbook',
      description: 'Get futures order book depth',
      inputSchema: {
        type: 'object',
        properties: {
          pair: { type: 'string', description: 'Pair (e.g., B-SOL_USDT)' },
          depth: { type: 'number', description: 'Order book depth', default: 20 },
        },
        required: ['pair'],
      },
      handler: async (args: { pair: string; depth?: number }) => {
        return client.futures.market.getOrderBook(args.pair, args.depth || 20);
      },
    },
    {
      name: 'futures_update_leverage',
      description: 'Update leverage for a futures pair',
      inputSchema: {
        type: 'object',
        properties: {
          pair: { type: 'string', description: 'Pair (e.g., B-SOL_USDT)' },
          leverage: { type: 'number', description: 'New leverage (1-100)', minimum: 1, maximum: 100 },
        },
        required: ['pair', 'leverage'],
      },
      handler: async (args: { pair: string; leverage: number }) => {
        return client.futures.trading.updateLeverage({ pair: args.pair, leverage: args.leverage });
      },
    },
    {
      name: 'futures_get_funding_rate',
      description: 'Get funding rate history for a pair',
      inputSchema: {
        type: 'object',
        properties: {
          pair: { type: 'string', description: 'Pair (e.g., B-SOL_USDT)' },
          limit: { type: 'number', description: 'Number of records', default: 50 },
        },
        required: ['pair'],
      },
      handler: async (args: { pair: string; limit?: number }) => {
        return client.futures.market.getFundingRateHistory(args.pair, args.limit || 50);
      },
    },
  ];
}

export function createSpotToolkit(client: CoinDCXClient): MCPTool[] {
  return [
    {
      name: 'spot_create_order',
      description: 'Create a spot order on CoinDCX',
      inputSchema: {
        type: 'object',
        properties: {
          side: { type: 'string', enum: ['buy', 'sell'] },
          order_type: { type: 'string', enum: ['market_order', 'limit_order', 'stop_limit_order'] },
          market: { type: 'string', description: 'Market pair (e.g., BTC_USDT)' },
          price: { type: 'number', description: 'Limit price' },
          quantity: { type: 'number', description: 'Quantity to trade' },
        },
        required: ['side', 'order_type', 'market', 'quantity'],
      },
      handler: async (args: CreateSpotOrderRequest) => {
        return client.spot.createOrder(args);
      },
    },
    {
      name: 'spot_get_balances',
      description: 'Get spot wallet balances',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        return client.spot.getBalances();
      },
    },
    {
      name: 'spot_get_ticker',
      description: 'Get spot ticker',
      inputSchema: {
        type: 'object',
        properties: {
          market: { type: 'string', description: 'Market pair (e.g., BTC_USDT)' },
        },
        required: ['market'],
      },
      handler: async (args: { market: string }) => {
        const tickers = await client.marketData.getSpotTicker();
        return tickers.find((t: any) => t.pair === args.market);
      },
    },
  ];
}

export function createMarketDataToolkit(client: CoinDCXClient): MCPTool[] {
  return [
    {
      name: 'market_get_instruments',
      description: 'Get all active futures instruments',
      inputSchema: {
        type: 'object',
        properties: {
          marginCurrency: { type: 'string', description: 'Margin currency', default: 'USDT' },
        },
      },
      handler: async (args: { marginCurrency?: string }) => {
        return client.futures.market.getActiveInstruments(args.marginCurrency || 'USDT');
      },
    },
    {
      name: 'market_get_instrument_details',
      description: 'Get detailed instrument information',
      inputSchema: {
        type: 'object',
        properties: {
          pair: { type: 'string', description: 'Pair (e.g., B-SOL_USDT)' },
        },
        required: ['pair'],
      },
      handler: async (args: { pair: string }) => {
        return client.futures.market.getInstrumentDetails(args.pair);
      },
    },
  ];
}

export function createAccountToolkit(client: CoinDCXClient): MCPTool[] {
  return [
    {
      name: 'account_get_overview',
      description: 'Get complete account overview (balances, positions, equity)',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        return client.ops.snapshot.getAccountOverview();
      },
    },
    {
      name: 'account_get_balances',
      description: 'Get all wallet balances',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        const [spot, futures] = await Promise.all([
          client.spot.getBalances(),
          client.futures.account.getWallet(),
        ]);
        return { spot, futures };
      },
    },
  ];
}

export function createPaperToolkit(client: CoinDCXClient): MCPTool[] {
  return [
    {
      name: 'paper_place_order',
      description: 'Place a paper trading order',
      inputSchema: {
        type: 'object',
        properties: {
          side: { type: 'string', enum: ['buy', 'sell'] },
          order_type: { type: 'string', enum: ['market_order', 'limit_order', 'stop_limit_order'] },
          base_currency: { type: 'string' },
          quote_currency: { type: 'string' },
          target_quantity: { type: 'number' },
          price: { type: 'number' },
          leverage: { type: 'number' },
          stop_loss: { type: 'number' },
          take_profit: { type: 'number' },
        },
        required: ['side', 'order_type', 'base_currency', 'quote_currency', 'target_quantity'],
      },
      handler: async (args: CreateFuturesOrderRequest) => {
        return client.paper.placeOrder(args);
      },
    },
    {
      name: 'paper_get_account',
      description: 'Get paper trading account status',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        return client.paper.getAccount();
      },
    },
    {
      name: 'paper_get_positions',
      description: 'Get paper trading positions',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        return client.paper.getPositions();
      },
    },
    {
      name: 'paper_reset',
      description: 'Reset paper trading engine',
      inputSchema: {
        type: 'object',
        properties: {
          initialBalance: { type: 'number' },
        },
      },
      handler: async (args: { initialBalance?: number }) => {
        client.paper.reset(args.initialBalance ? { initialBalance: args.initialBalance } : undefined);
        return { success: true };
      },
    },
  ];
}

export function createAllToolkits(client: CoinDCXClient): MCPTool[] {
  return [
    ...createFuturesToolkit(client),
    ...createSpotToolkit(client),
    ...createMarketDataToolkit(client),
    ...createAccountToolkit(client),
    ...createPaperToolkit(client),
  ];
}