import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosError } from 'axios';
import crypto from 'crypto';
import { TokenBucket, coinDcxRateLimits } from './rate-limiter';
import { RestClientOptions } from './types';
import {
  CoinDCXAPIError,
  CoinDCXNetworkError,
  CoinDCXRateLimitError,
  CoinDCXAuthenticationError,
  CoinDCXValidationError,
  CoinDCXInsufficientMarginError,
  CoinDCXInvalidPairError,
  CoinDCXOrderError,
} from './errors';
import { defaultLogger } from '../logger';

export class RestClient {
  protected axiosInstance: AxiosInstance;
  protected apiKey: string | undefined;
  protected apiSecret: string | undefined;
  protected paperMode: boolean;
  protected paperEngineHandler: ((config: InternalAxiosRequestConfig) => Promise<any>) | undefined;
  protected rateLimiters: Map<string, TokenBucket> = new Map();
  protected logger = defaultLogger.child('RestClient');

  constructor(options: RestClientOptions = {}) {
    this.apiKey = options.apiKey ?? undefined;
    this.apiSecret = options.apiSecret ?? undefined;
    this.paperMode = options.paperMode ?? false;
    this.paperEngineHandler = options.paperEngineHandler;

    this.axiosInstance = axios.create({
      baseURL: options.baseUrl || 'https://api.coindcx.com',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CoinDCX-SDK/1.0.0',
      },
      timeout: 15000,
    });

    this.initializeRateLimiters();
    this.setupInterceptors();
  }

  private initializeRateLimiters(): void {
    Object.entries(coinDcxRateLimits).forEach(([key, config]) => {
      this.rateLimiters.set(key, new TokenBucket(config));
    });
  }

  private getRateLimiter(endpoint: string): TokenBucket {
    if (endpoint.includes('/orders/create') || endpoint.includes('/orders/cancel') || endpoint.includes('/orders/edit')) {
      return this.rateLimiters.get('orders')!;
    }
    if (endpoint.includes('/positions')) {
      return this.rateLimiters.get('positions')!;
    }
    if (endpoint.includes('/wallets') || endpoint.includes('/balances') || endpoint.includes('/transfer')) {
      return this.rateLimiters.get('wallet')!;
    }
    if (endpoint.includes('/users/') || endpoint.includes('/account')) {
      return this.rateLimiters.get('account')!;
    }
    if (endpoint.includes('/market_data/') || endpoint.includes('/ticker') || endpoint.includes('/candles') || endpoint.includes('/orderbook') || endpoint.includes('/trade_history')) {
      return this.rateLimiters.get('marketData')!;
    }
    return this.rateLimiters.get('default')!;
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      const endpoint = config.url || '';
      const limiter = this.getRateLimiter(endpoint);
      await limiter.consume(1);

      if (this.paperMode && this.paperEngineHandler && (endpoint.includes('/orders') || endpoint.includes('/positions'))) {
        return this.paperEngineHandler(config);
      }

      return config;
    });

    this.axiosInstance.interceptors.response.use(
      response => response,
      (error: AxiosError) => {
        if (error.response) {
          const { status, data, config } = error.response;
          const method = config?.method?.toUpperCase() || 'UNKNOWN';
          const url = config?.url || 'UNKNOWN';
          
          const message = (data as any)?.message || error.message || 'API Error';
          const code = (data as any)?.code;

          if (status === 429) {
            const retryAfter = Number(error.response.headers['retry-after']) || 60;
            throw new CoinDCXRateLimitError(message, status, data, method, url, retryAfter);
          }
          if (status === 401 || status === 403) {
            throw new CoinDCXAuthenticationError(message, status, data, method, url);
          }
          if (status === 400) {
            if (message.includes('insufficient') || message.includes('margin')) {
              throw new CoinDCXInsufficientMarginError(message, status, data, method, url);
            }
            if (message.includes('invalid') && message.includes('pair')) {
              throw new CoinDCXInvalidPairError(message, status, data, method, url);
            }
            if (message.includes('order')) {
              throw new CoinDCXOrderError(message, status, data, method, url);
            }
            throw new CoinDCXValidationError(message, status, data, method, url);
          }
          throw new CoinDCXAPIError(message, status, data, method, url, code);
        }
        throw new CoinDCXNetworkError(error.message, error);
      }
    );
  }

  protected sign(payload: string): string {
    if (!this.apiSecret) throw new Error('API Secret required for signed requests');
    return crypto.createHmac('sha256', this.apiSecret).update(payload).digest('hex');
  }

  protected async signedRequest<T>(
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    data: Record<string, any> = {}
  ): Promise<T> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API Key and Secret required for signed requests');
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = { ...data, timestamp };
    const payloadStr = JSON.stringify(payload);
    const signature = this.sign(payloadStr);

    const config: AxiosRequestConfig = {
      method,
      url: endpoint,
      headers: {
        'X-AUTH-APIKEY': this.apiKey,
        'X-AUTH-SIGNATURE': signature,
      },
    };

    if (method === 'GET') {
      config.params = payload;
    } else {
      config.data = payload;
    }

    this.logger.debug(`${method} ${endpoint}`, data);
    const response = await this.axiosInstance.request<T>(config);
    return response.data;
  }

  protected async unsignedRequest<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    data: Record<string, any> = {},
    usePublicBase: boolean = false
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      method,
      url: endpoint,
    };

    if (usePublicBase) {
      config.baseURL = 'https://public.coindcx.com';
    }

    if (method === 'GET') {
      config.params = data;
    } else {
      config.data = data;
    }

    this.logger.debug(`${method} ${endpoint}`, data);
    const response = await this.axiosInstance.request<T>(config);
    return response.data;
  }

  setPaperMode(enabled: boolean, handler?: (config: InternalAxiosRequestConfig) => Promise<any>): void {
    this.paperMode = enabled;
    if (handler) this.paperEngineHandler = handler;
  }

  getRateLimitStatus(): Record<string, number> {
    const status: Record<string, number> = {};
    this.rateLimiters.forEach((limiter, key) => {
      status[key] = limiter.getAvailableTokens();
    });
    return status;
  }
}