import { EventEmitter } from 'events';

export interface CoinDCXOptions {
    apiKey?: string;
    apiSecret?: string;
    debug?: boolean;
    apiBase?: string;
    publicApiBase?: string;
    wsBase?: string;
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

export interface OrderBookLevel {
    price: number;
    quantity: number;
}

export interface OrderBook {
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    timestamp: number;
    [key: string]: any;
}

export interface Trade {
    price: number;
    quantity: number;
    timestamp: number;
    isMaker: boolean;
    [key: string]: any;
}

export class CoinDCXFuturesClient extends EventEmitter {
    constructor(options?: CoinDCXOptions);

    static nowSeconds(): number;
    static msToSeconds(ms: number): number;
    static buildPair(base: string, target: string): string;
    static parsePair(pair: string): { ecode: string; base: string; target: string } | null;

    // Public Futures Market Data
    getActiveInstruments(marginCurrency?: string): Promise<any>;
    getInstrumentDetails(pair: string, marginCurrency?: string): Promise<any>;
    getFuturesCandles(pair: string, from: number, to: number, resolution?: string): Promise<any>;
    getFuturesTradeHistory(pair: string, limit?: number): Promise<any>;
    getFuturesOrderBook(instrument: string, depth?: number): Promise<any>;
    getFuturesCurrentPrices(): Promise<any>;
    getFundingRateHistory(pair: string, limit?: number): Promise<any>;

    // Public Spot Market Data
    getSpotCandles(pair: string, interval?: string, startTime?: number, endTime?: number, limit?: number): Promise<Candle[]>;
    getSpotTradeHistory(pair: string, limit?: number): Promise<Trade[]>;
    getSpotOrderBook(pair: string): Promise<any>;

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

    // Legacy / Wallet
    getTicker(): Promise<any>;
    getMarkets(): Promise<any>;
    getMarketsDetails(): Promise<any>;
    getBalances(): Promise<any>;
    getUserInfo(): Promise<any>;
    walletTransfer(sourceWalletType: string, destinationWalletType: string, currencyShortName: string, amount: number): Promise<any>;
    subAccountTransfer(params: any): Promise<any>;

    // WebSocket
    wsConnect(): Promise<void>;
    wsSubscribe(channel: string): void;
    wsSubscribeCandles(pair: string, interval?: string): void;
    wsSubscribeOrderBook(pair: string, depth?: number): void;
    wsSubscribeTrades(pair: string): void;
    wsSubscribePrices(pair: string): void;
    wsSubscribeCurrentPricesFutures(): void;
    wsSubscribeAccountFutures(): void;
    wsDisconnect(): void;

    // Events
    on(event: 'ws:disconnected', listener: (reason: string) => void): this;
    on(event: 'ws:error', listener: (error: any) => void): this;
    on(event: 'ws:candlestick', listener: (data: Candle) => void): this;
    on(event: 'ws:depth-snapshot' | 'ws:depth-update', listener: (data: OrderBook) => void): this;
    on(event: 'ws:new-trade', listener: (data: Trade) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
}
