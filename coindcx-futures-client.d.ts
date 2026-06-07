import { EventEmitter } from 'events';

export interface CoinDCXOptions {
    apiKey?: string;
    apiSecret?: string;
    debug?: boolean;
    apiBase?: string;
    publicApiBase?: string;
    wsBase?: string;
    autoReconnect?: boolean;
    reconnectDelay?: number;
}

export interface Candle {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    time: number;
    pair: string;
    [key: string]: any;
}

export interface NormalizedCandle {
    channel: string;
    product: string;
    eventTime?: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    openTime: number;
    closeTime: number;
    pair: string;
    symbol: string;
    raw: any;
}

export interface OrderBookLevel {
    price: number;
    quantity: number;
}

export interface NormalizedDepth {
    timestamp: number;
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    raw: any;
}

export interface NormalizedTrade {
    timestamp: number;
    price: number;
    quantity: number;
    isMaker: boolean;
    symbol: string;
    raw: any;
}

export interface BatchPrices {
    timestamp: number;
    prices: Record<string, {
        markPrice: number;
        bmST?: string;
        cmRT?: string;
    }>;
    raw: any;
}

export class CoinDCXFuturesClient extends EventEmitter {
    constructor(options?: CoinDCXOptions);

    static nowSeconds(): number;
    static msToSeconds(ms: number): number;
    static buildPair(base: string, target: string, ecode?: string): string;
    static parsePair(pair: string): { ecode: string; base: string; target: string } | null;

    // Public Futures Market Data
    getActiveInstruments(marginCurrency?: string): Promise<string[]>;
    getInstrumentDetails(pair: string, marginCurrency?: string): Promise<any>;
    getFuturesCandles(pair: string, from?: number, to?: number, resolution?: string, limit?: number): Promise<any[]>;
    getFuturesTradeHistory(pair: string, limit?: number): Promise<any[]>;
    getFuturesOrderBook(pair: string): Promise<any>;
    getFuturesCurrentPrices(): Promise<any>;
    getFundingRateHistory(pair: string, limit?: number): Promise<any>;

    // Public Spot Market Data
    getSpotCandles(pair: string, interval?: string, startTime?: number, endTime?: number, limit?: number): Promise<any[]>;
    getSpotTradeHistory(pair: string, limit?: number): Promise<any[]>;
    getSpotOrderBook(pair: string): Promise<any>;

    // Authenticated Spot Trading
    createOrder(params: any): Promise<any>;
    createMultipleOrders(orders: any[]): Promise<any>;
    getOrderStatus(id: string | number): Promise<any>;
    getOrderStatusMultiple(ids: (string | number)[]): Promise<any>;
    getActiveOrders(): Promise<any[]>;
    cancelOrder(id: string | number): Promise<any>;
    cancelAllOrders(side?: string, market?: string): Promise<any>;
    cancelOrdersByIds(ids: (string | number)[]): Promise<any>;
    editOrder(id: string | number, price: number): Promise<any>;
    getSpotTradeHistory(market: string, limit?: number): Promise<any[]>;

    // Authenticated Legacy Margin Trading
    createMarginOrder(params: any): Promise<any>;
    cancelMarginOrder(id: string | number): Promise<any>;
    exitMarginPosition(id: string | number): Promise<any>;
    editMarginTarget(id: string | number, target_price: number): Promise<any>;
    editMarginPriceOfTargetOrder(id: string | number, price: number): Promise<any>;
    editMarginSL(id: string | number, sl_price: number): Promise<any>;
    editMarginTrailingSL(id: string | number, trailing_sl: any): Promise<any>;
    addMargin(id: string | number, amount: number): Promise<any>;
    removeMargin(id: string | number, amount: number): Promise<any>;
    fetchMarginOrders(params?: any): Promise<any[]>;
    getMarginOrder(id: string | number): Promise<any>;

    // Authenticated Lending
    fetchLendOrders(): Promise<any[]>;
    lend(currency: string, amount: number, side: string): Promise<any>;
    settleLendOrder(id: string | number): Promise<any>;

    // Authenticated Futures Trading
    createFuturesOrder(params: any): Promise<any>;
    listFuturesOrders(filters?: any): Promise<any>;
    getFuturesOrder(id: string | number): Promise<any>;
    cancelFuturesOrder(id: string | number): Promise<any>;
    cancelAllFuturesOrders(pair?: string, side?: string): Promise<any>;
    editFuturesOrder(params: any): Promise<any>;
    getFuturesPositions(filters?: any): Promise<any>;
    closeFuturesPosition(id: string | number): Promise<any>;
    updateLeverage(pair: string, leverage: number): Promise<any>;
    getFuturesTransactions(filters?: any): Promise<any>;
    addFuturesMargin(id: string | number, amount: number): Promise<any>;
    removeFuturesMargin(id: string | number, amount: number): Promise<any>;

    // Wallet & Sub-Account
    getTicker(): Promise<any[]>;
    getMarkets(): Promise<string[]>;
    getMarketsDetails(): Promise<any[]>;
    getBalances(): Promise<any[]>;
    getUserInfo(): Promise<any>;
    walletTransfer(sourceWalletType: string, destinationWalletType: string, currencyShortName: string, amount: number): Promise<any>;
    subAccountTransfer(params: { fromAccountId: string; toAccountId: string; currencyShortName: string; amount: number; [key: string]: any }): Promise<any>;

    // WebSocket
    wsConnect(): Promise<void>;
    wsDisconnect(): void;
    wsSubscribe(channel: string): void;
    wsSubscribeCandles(pair: string, interval?: string): void;
    wsSubscribeOrderBook(pair: string, depth?: number): void;
    wsSubscribeTrades(pair: string): void;
    wsSubscribePrices(pair: string): void;
    wsSubscribeCurrentPricesFutures(): void;
    wsSubscribeAccountFutures(): void;

    // Events
    on(event: 'ws:connect', listener: (data: { socketId: string }) => void): this;
    on(event: 'ws:disconnect', listener: (data: { reason: string }) => void): this;
    on(event: 'ws:error', listener: (data: { type: string, error: any }) => void): this;
    on(event: 'ws:candlestick', listener: (data: NormalizedCandle) => void): this;
    on(event: 'ws:depth-snapshot' | 'ws:depth-update', listener: (data: NormalizedDepth) => void): this;
    on(event: 'ws:new-trade', listener: (data: NormalizedTrade) => void): this;
    on(event: 'ws:price-change', listener: (data: any) => void): this;
    on(event: 'ws:currentPrices@futures#update', listener: (data: BatchPrices) => void): this;
    on(event: 'ws:df-order-update', listener: (data: any) => void): this;
    on(event: 'ws:df-position-update', listener: (data: any) => void): this;
    on(event: 'ws:balance-update', listener: (data: any) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
}
