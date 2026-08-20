import { SpotApi } from './rest/spot';
import { MarginApi } from './rest/margin';
import { FuturesApi } from './rest/futures';
import { MarketDataApi } from './rest/market-data';
import { WsClient } from './core/ws-client';
import { PublicStreams } from './websocket/public-streams';
import { PrivateStreams } from './websocket/private-streams';
import { SizingOps } from './ops/sizing';
import { BracketOps } from './ops/bracket';
import { SnapshotOps } from './ops/snapshot';
import { PaperTradingEngine } from './paper/engine';
import { CoinDCXSDKOptions } from './core/types';

export { CoinDCXSDKOptions } from './core/types';

export class CoinDCXClient {
  public readonly spot: SpotApi;
  public readonly margin: MarginApi;
  public readonly futures: {
    trading: FuturesApi;
    account: FuturesApi;
    market: FuturesApi;
  };
  public readonly marketData: MarketDataApi;
  public readonly ws: WsClient;
  public readonly publicStreams: PublicStreams;
  public readonly privateStreams: PrivateStreams;
  public readonly ops: {
    sizing: SizingOps;
    bracket: BracketOps;
    snapshot: SnapshotOps;
  };
  public readonly paper: PaperTradingEngine;

  private paperMode: boolean;
  private paperEngineHandler: ((config: any) => Promise<any>) | undefined;

  constructor(options: CoinDCXSDKOptions = {}) {
    this.paperMode = options.paperMode ?? false;
    this.paperEngineHandler = options.paperEngineHandler;

    this.paper = new PaperTradingEngine({
      initialBalance: options.initialBalance ?? 10000,
      initialFuturesBalance: options.initialFuturesBalance ?? options.initialBalance ?? 10000,
      makerFee: options.makerFee,
      takerFee: options.takerFee,
      slippage: options.slippage,
      binanceWs: options.binanceClient?.futures?.ws,
    });

    const restOptions = {
      apiKey: options.apiKey ?? undefined,
      apiSecret: options.apiSecret ?? undefined,
      baseUrl: options.baseUrl ?? undefined,
      paperMode: this.paperMode,
      paperEngineHandler: this.paperEngineHandler ?? this.handlePaperRequest,
    };

    this.spot = new SpotApi(restOptions);
    this.margin = new MarginApi(restOptions);

    const futuresApi = new FuturesApi(restOptions);
    this.futures = {
      trading: futuresApi,
      account: futuresApi,
      market: futuresApi,
    };

    this.marketData = new MarketDataApi({ baseUrl: options.publicApiBase ?? 'https://public.coindcx.com' });

    this.ws = new WsClient({
      apiKey: options.apiKey ?? undefined,
      apiSecret: options.apiSecret ?? undefined,
      wsUrl: options.wsUrl ?? undefined,
    });

    this.publicStreams = new PublicStreams(this.ws);
    this.privateStreams = new PrivateStreams(this.ws);

    this.ops = {
      sizing: new SizingOps(futuresApi),
      bracket: new BracketOps(futuresApi),
      snapshot: new SnapshotOps(futuresApi, this.spot, this.marketData),
    };
  }

  private handlePaperRequest = async (config: any): Promise<any> => {
    const url: string = config.url || '';
    const data: any = config.data || {};

    let payload: any;
    if (url.includes('/orders/create')) {
      payload = await this.paper.placeOrder(data);
    } else if (url.includes('/orders/details')) {
      payload = this.paper.getOrder(String(data.id ?? data.order_id ?? ''));
    } else if (url.includes('/orders/cancel_all')) {
      payload = [];
    } else if (url.includes('/orders/cancel')) {
      payload = await this.paper.cancelOrder(String(data.id ?? data.order_id ?? ''));
    } else if (url.includes('/orders/update') || url.includes('/orders/edit')) {
      payload = this.paper.getOrder(String(data.id ?? data.order_id ?? ''));
    } else if (url.includes('/orders')) {
      payload = this.paper.getOrders();
    } else if (url.includes('/positions/exit')) {
      payload = [];
    } else if (url.includes('/positions/close')) {
      payload = [];
    } else if (url.includes('/positions/create_tpsl')) {
      payload = [];
    } else if (url.includes('/positions/update_leverage')) {
      payload = {};
    } else if (url.includes('/positions')) {
      payload = this.paper.getPositions();
    } else if (url.includes('/wallets/transfer')) {
      payload = { success: true };
    } else {
      payload = {};
    }

    return {
      data: payload,
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      config,
    };
  };

  async connectWebsocket(): Promise<void> {
    await this.ws.connect();
  }

  subscribePrivateStreams(): void {
    this.privateStreams.subscribe();
  }

  setPaperMode(enabled: boolean, handler?: (config: any) => Promise<any>): void {
    this.paperMode = enabled;
    if (handler) this.paperEngineHandler = handler;

    this.spot.setPaperMode(enabled, handler);
    this.margin.setPaperMode(enabled, handler);
    this.futures.trading.setPaperMode(enabled, handler);
  }

  getRateLimitStatus(): Record<string, number> {
    return this.futures.trading.getRateLimitStatus();
  }

  disconnect(): void {
    this.ws.disconnect();
  }

  static nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  static buildPair(base: string, target: string, ecode = 'B'): string {
    return `${ecode}-${base}_${target}`;
  }

  static parsePair(pair: string): { ecode: string; base: string; target: string } | null {
    const match = pair.match(/^([A-Z])-([A-Z0-9]+)_([A-Z0-9]+)$/);
    if (match) return { ecode: match[1]!, base: match[2]!, target: match[3]! };
    return null;
  }

  static calculateLiquidationPrice(
    entryPrice: number,
    leverage: number,
    side: string,
    mm = 0.005
  ): number {
    const dir = side.toLowerCase() === 'buy' || side.toLowerCase() === 'long' ? 1 : -1;
    return dir === 1
      ? entryPrice * (1 - (1 / leverage) + mm)
      : entryPrice * (1 + (1 / leverage) - mm);
  }
}

export * from './core/types';
export * from './core/errors';
export * from './core/rate-limiter';
export {
  OrderSideSchema,
  OrderTypeSchema,
  TimeInForceSchema,
  MarginTypeSchema,
  PositionSideSchema,
  WalletTypeSchema,
  PairSchema,
  SymbolSchema,
  PriceSchema,
  QuantitySchema,
  LeverageSchema,
  CreateOrderRequestSchema,
  CreateFuturesOrderRequestSchema,
  CandleSchema,
  OrderBookLevelSchema,
  OrderBookSchema,
  TradeSchema,
  TickerSchema,
  BalanceSchema,
  PositionSchema,
  OrderSchema,
  FundingRateSchema,
  InstrumentSchema,
  WalletTransactionSchema,
  WsCandleDataSchema,
  WsDepthDataSchema,
  WsTradeDataSchema,
  WsOrderUpdateSchema,
  WsPositionUpdateSchema,
  WsBalanceUpdateSchema,
  type CreateOrderRequest,
  type CreateFuturesOrderRequest,
  type Candle,
  type OrderBook,
  type Trade,
  type Ticker,
  type Balance,
  type Position,
  type Order,
  type FundingRate,
  type Instrument,
  type WalletTransaction,
  type WsCandleData,
  type WsDepthData,
  type WsTradeData,
  type WsOrderUpdate,
  type WsPositionUpdate,
  type WsBalanceUpdate,
} from './core/schemas';
export * from './models';
export * from './ops';
export * from './paper';
export * from './mcp';

export default CoinDCXClient;