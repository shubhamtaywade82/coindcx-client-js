import { RestClient } from '../core/rest-client';
import {
  CreateFuturesOrderRequest,
  ListFuturesOrdersRequest,
  GetFuturesOrderRequest,
  CancelFuturesOrderRequest,
  CancelAllFuturesOrdersRequest,
  EditFuturesOrderRequest,
  GetFuturesPositionsRequest,
  CloseFuturesPositionRequest,
  ExitFuturesPositionRequest,
  CreateFuturesTPSLRequest,
  UpdateFuturesMarginTypeRequest,
  UpdateLeverageRequest,
  GetFuturesTradesRequest,
  AddFuturesMarginRequest,
  RemoveFuturesMarginRequest,
  CancelAllOrdersForPositionRequest,
  GetFuturesTransactionsRequest,
  FuturesOrderResponse,
  PositionResponse,
  FuturesWalletResponse,
  FuturesWalletTransactionResponse,
  InstrumentResponse,
  CandleResponse,
  OrderBookResponse,
  TradeResponse,
  TickerResponse,
  FundingRateResponse,
  FuturesStatsResponse,
  WalletTransferResponse,
} from '../models';

export class FuturesApi extends RestClient {
  constructor(options?: { apiKey?: string; apiSecret?: string; baseUrl?: string; paperMode?: boolean; paperEngineHandler?: (config: any) => Promise<any> }) {
    super(options);
  }

  async createOrder(params: CreateFuturesOrderRequest): Promise<FuturesOrderResponse> {
    if (!params.client_order_id) {
      params.client_order_id = `js_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/orders/create', params);
  }

  async listOrders(params: ListFuturesOrdersRequest = {}): Promise<FuturesOrderResponse[]> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/orders', params);
  }

  async getOrder(params: GetFuturesOrderRequest): Promise<FuturesOrderResponse> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/orders/details', params);
  }

  async cancelOrder(params: CancelFuturesOrderRequest): Promise<any> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/orders/cancel', params);
  }

  async cancelAllOrders(params: CancelAllFuturesOrdersRequest): Promise<any> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/orders/cancel_all', params);
  }

  async editOrder(params: EditFuturesOrderRequest): Promise<FuturesOrderResponse> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/orders/edit', params);
  }

  async getPositions(params: GetFuturesPositionsRequest = {}): Promise<PositionResponse[]> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/positions', params);
  }

  async closePosition(params: CloseFuturesPositionRequest): Promise<any> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/positions/close', params);
  }

  async exitPosition(params: ExitFuturesPositionRequest): Promise<any> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/positions/exit', params);
  }

  async createTPSL(params: CreateFuturesTPSLRequest): Promise<any> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/positions/create_tpsl', params);
  }

  async getCrossMarginDetails(): Promise<any> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/positions/cross_margin_details', {});
  }

  async updateMarginType(params: UpdateFuturesMarginTypeRequest): Promise<any> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/positions/margin_type', params);
  }

  async updateLeverage(params: UpdateLeverageRequest): Promise<any> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/positions/update_leverage', params);
  }

  async getTrades(params: GetFuturesTradesRequest = {}): Promise<any[]> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/trades', params);
  }

  async addMargin(params: AddFuturesMarginRequest): Promise<any> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/positions/add_margin', params);
  }

  async removeMargin(params: RemoveFuturesMarginRequest): Promise<any> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/positions/remove_margin', params);
  }

  async cancelAllOrdersForPosition(params: CancelAllOrdersForPositionRequest): Promise<any> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/positions/cancel_all_open_orders_for_position', params);
  }

  async getTransactions(params: GetFuturesTransactionsRequest = {}): Promise<any[]> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/transactions', params);
  }

  async getWallet(): Promise<FuturesWalletResponse[]> {
    return this.signedRequest('GET', '/exchange/v1/derivatives/futures/wallets', {});
  }

  async getWalletTransactions(): Promise<FuturesWalletTransactionResponse[]> {
    return this.signedRequest('GET', '/exchange/v1/derivatives/futures/wallets/transactions', {});
  }

  async walletTransfer(params: {
    transfer_type: 'spot_to_futures' | 'futures_to_spot';
    currency_short_name: string;
    amount: number;
  }): Promise<WalletTransferResponse> {
    return this.signedRequest('POST', '/exchange/v1/derivatives/futures/wallets/transfer', params);
  }

  async getActiveInstruments(marginCurrency = 'USDT'): Promise<string[]> {
    return this.unsignedRequest('GET', '/exchange/v1/derivatives/futures/data/active_instruments', { margin_currency: marginCurrency });
  }

  async getMarketsDetails(): Promise<InstrumentResponse[]> {
    return this.unsignedRequest('GET', '/exchange/v1/markets_details', {}, true);
  }

  async getInstrumentDetails(pair: string): Promise<InstrumentResponse> {
    const all = await this.getMarketsDetails();
    const found = all.find(m => m.pair === pair || m.symbol === pair);
    if (found) return found;
    const activeFutures = await this.getActiveInstruments();
    if (activeFutures.includes(pair)) {
      return {
        pair,
        symbol: pair.split('-')[1]?.replace('_', '') ?? '',
        ecode: pair.split('-')[0],
        base_currency: pair.split('-')[1]?.split('_')[0],
        quote_currency: pair.split('_')[1],
        margin_currency: 'USDT',
        status: 'active',
        type: 'futures',
        min_quantity: undefined,
        max_quantity: undefined,
        min_price: undefined,
        max_price: undefined,
        tick_size: undefined,
        lot_size: undefined,
        max_leverage: undefined,
        maintenance_margin: undefined,
        initial_margin: undefined,
      };
    }
    throw new Error(`Instrument ${pair} not found`);
  }

  async getCandles(pair: string, interval: string, limit = 500, startTime?: number, endTime?: number): Promise<CandleResponse[]> {
    const params: any = { pair, interval, limit };
    if (startTime) params.startTime = startTime * 1000;
    if (endTime) params.endTime = endTime * 1000;
    const res = await this.unsignedRequest('GET', '/market_data/candles', params, true);
    return Array.isArray(res) ? res.reverse() : (res as CandleResponse[]);
  }

  async getTradeHistory(pair: string, limit = 50): Promise<TradeResponse[]> {
    return this.unsignedRequest('GET', '/market_data/trade_history', { pair, limit }, true);
  }

  async getOrderBook(pair: string, depth = 50): Promise<OrderBookResponse> {
    return this.unsignedRequest('GET', '/market_data/orderbook', { pair, depth }, true);
  }

  async getTicker(): Promise<TickerResponse[]> {
    return this.unsignedRequest('GET', '/exchange/ticker', {}, true);
  }

  async getFundingRateHistory(pair: string, limit = 50): Promise<FundingRateResponse[]> {
    return this.unsignedRequest('GET', '/exchange/v1/derivatives/futures/data/funding_rate', { pair, limit }, true);
  }

  async getStats(): Promise<FuturesStatsResponse> {
    return this.unsignedRequest('GET', '/api/v1/derivatives/futures/data/stats', {}, true);
  }
}