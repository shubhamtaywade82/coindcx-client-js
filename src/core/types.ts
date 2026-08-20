export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export enum OrderType {
  MARKET = 'market_order',
  LIMIT = 'limit_order',
  STOP_LIMIT = 'stop_limit_order',
  MARKET_ORDER = 'market_order',
  LIMIT_ORDER = 'limit_order',
  STOP_LIMIT_ORDER = 'stop_limit_order',
}

export enum TimeInForce {
  GTC = 'gtc',
  IOC = 'ioc',
  FOK = 'fok',
  POST_ONLY = 'post_only',
}

export enum MarginType {
  ISOLATED = 'isolated',
  CROSS = 'cross',
}

export enum PositionSide {
  LONG = 'long',
  SHORT = 'short',
}

export enum TriggerType {
  MARK_PRICE = 'mark_price',
  INDEX_PRICE = 'index_price',
  LAST_PRICE = 'last_price',
}

export enum WalletType {
  SPOT = 'spot',
  MARGIN = 'margin',
  FUTURES = 'futures',
  LENDING = 'lending',
}

export enum TransferType {
  SPOT_TO_FUTURES = 'spot_to_futures',
  FUTURES_TO_SPOT = 'futures_to_spot',
  SPOT_TO_MARGIN = 'spot_to_margin',
  MARGIN_TO_SPOT = 'margin_to_spot',
  SPOT_TO_LENDING = 'spot_to_lending',
  LENDING_TO_SPOT = 'lending_to_spot',
}

export enum KlineInterval {
  '1m' = '1m',
  '3m' = '3m',
  '5m' = '5m',
  '15m' = '15m',
  '30m' = '30m',
  '1h' = '1h',
  '2h' = '2h',
  '4h' = '4h',
  '6h' = '6h',
  '8h' = '8h',
  '12h' = '12h',
  '1d' = '1d',
  '3d' = '3d',
  '1w' = '1w',
  '1M' = '1M',
}

export interface CoinDCXClientOptions {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  publicApiBase?: string;
  wsUrl?: string;
  paperMode?: boolean;
  paperEngineHandler?: (config: any) => Promise<any>;
  debug?: boolean;
  recvWindow?: number;
  maxRetries?: number;
  rateLimitWindow?: number;
  maxRequestsPerWindow?: number;
  binanceClient?: any;
}

export type CoinDCXSDKOptions = CoinDCXClientOptions;

export interface RestClientOptions {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  publicApiBase?: string;
  paperMode?: boolean;
  paperEngineHandler?: (config: any) => Promise<any>;
}

export interface WsClientOptions {
  apiKey?: string;
  apiSecret?: string;
  wsUrl?: string;
}

export interface RateLimitConfig {
  capacity: number;
  refillRate: number;
}

export interface RequestConfig {
  method: 'GET' | 'POST' | 'DELETE';
  endpoint: string;
  data?: Record<string, any>;
  isPublic?: boolean;
}