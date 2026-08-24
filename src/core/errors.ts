export class CoinDCXError extends Error {
  /** A human-readable hint for how to recover from this error, aimed at LLM/agent callers. */
  public readonly suggestedAction: string | undefined;

  constructor(message: string, suggestedAction?: string) {
    super(message);
    this.name = this.constructor.name;
    this.suggestedAction = suggestedAction;
    Object.setPrototypeOf(this, CoinDCXError.prototype);
  }
}

export class CoinDCXAPIError extends CoinDCXError {
  public readonly status: number;
  public readonly data: any;
  public readonly method: string;
  public readonly url: string;
  public readonly isRetryable: boolean;
  public readonly code: string | undefined;

  constructor(
    message: string,
    status: number,
    data: any,
    method: string,
    url: string,
    code: string | undefined = undefined,
    suggestedAction?: string
  ) {
    super(message, suggestedAction);
    this.name = 'CoinDCXAPIError';
    this.status = status;
    this.data = data;
    this.method = method;
    this.url = url;
    this.code = code;
    this.isRetryable = [429, 500, 502, 503, 504].includes(status);
    Object.setPrototypeOf(this, CoinDCXAPIError.prototype);
  }
}

export class CoinDCXNetworkError extends CoinDCXError {
  public readonly originalError: Error;
  public readonly isRetryable = true;

  constructor(
    message: string,
    originalError: Error,
    suggestedAction = 'Check your internet connection and retry. The SDK will automatically retry idempotent requests.'
  ) {
    super(message, suggestedAction);
    this.name = 'CoinDCXNetworkError';
    this.originalError = originalError;
    Object.setPrototypeOf(this, CoinDCXNetworkError.prototype);
  }
}

export class CoinDCXRateLimitError extends CoinDCXAPIError {
  public readonly retryAfter: number;

  constructor(
    message: string,
    status: number,
    data: any,
    method: string,
    url: string,
    retryAfter: number,
    suggestedAction?: string
  ) {
    super(
      message,
      status,
      data,
      method,
      url,
      undefined,
      suggestedAction ??
        `Wait ${retryAfter} second(s) before retrying. GET requests are retried automatically by the SDK; POST/DELETE requests must be retried manually after the delay.`
    );
    this.name = 'CoinDCXRateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, CoinDCXRateLimitError.prototype);
  }
}

export class CoinDCXAuthenticationError extends CoinDCXAPIError {
  constructor(message: string, status: number, data: any, method: string, url: string, suggestedAction?: string) {
    super(
      message,
      status,
      data,
      method,
      url,
      undefined,
      suggestedAction ??
        'Verify COINDCX_API_KEY and COINDCX_API_SECRET are set correctly, and that the API key has the required permissions and is not IP-restricted.'
    );
    this.name = 'CoinDCXAuthenticationError';
    Object.setPrototypeOf(this, CoinDCXAuthenticationError.prototype);
  }
}

function deriveValidationSuggestedAction(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('leverage')) {
    return 'Ensure the leverage value is within the allowed range (typically 1-100) for this pair.';
  }
  if (m.includes('quantity') || m.includes('min')) {
    return 'Check min_quantity and min_notional for this pair using client.marketData.getMarketsDetails() or client.futures.market.getInstrumentDetails().';
  }
  return 'Check the request parameters against the API documentation.';
}

export class CoinDCXValidationError extends CoinDCXAPIError {
  constructor(message: string, status: number, data: any, method: string, url: string, suggestedAction?: string) {
    super(message, status, data, method, url, undefined, suggestedAction ?? deriveValidationSuggestedAction(message));
    this.name = 'CoinDCXValidationError';
    Object.setPrototypeOf(this, CoinDCXValidationError.prototype);
  }
}

export class CoinDCXInsufficientMarginError extends CoinDCXAPIError {
  constructor(message: string, status: number, data: any, method: string, url: string, suggestedAction?: string) {
    super(
      message,
      status,
      data,
      method,
      url,
      undefined,
      suggestedAction ??
        'Reduce the order quantity or leverage, or check available balance using client.spot.getBalances() or client.futures.account.getWallet().'
    );
    this.name = 'CoinDCXInsufficientMarginError';
    Object.setPrototypeOf(this, CoinDCXInsufficientMarginError.prototype);
  }
}

export class CoinDCXInvalidPairError extends CoinDCXAPIError {
  constructor(message: string, status: number, data: any, method: string, url: string, suggestedAction?: string) {
    super(
      message,
      status,
      data,
      method,
      url,
      undefined,
      suggestedAction ??
        'Fetch valid trading pairs using client.marketData.getMarketsDetails() or client.futures.market.getActiveInstruments() before placing orders.'
    );
    this.name = 'CoinDCXInvalidPairError';
    Object.setPrototypeOf(this, CoinDCXInvalidPairError.prototype);
  }
}

export class CoinDCXOrderError extends CoinDCXAPIError {
  constructor(message: string, status: number, data: any, method: string, url: string, suggestedAction?: string) {
    super(message, status, data, method, url, undefined, suggestedAction ?? deriveValidationSuggestedAction(message));
    this.name = 'CoinDCXOrderError';
    Object.setPrototypeOf(this, CoinDCXOrderError.prototype);
  }
}

/**
 * Thrown client-side, before any network request, when an order would
 * violate a configured `TradingSafetyLimits` guardrail (see core/safety.ts).
 * Never retryable - the caller must resize the order.
 */
export class CoinDCXOrderLimitError extends CoinDCXError {
  constructor(message: string, suggestedAction: string) {
    super(message, suggestedAction);
    this.name = 'CoinDCXOrderLimitError';
    Object.setPrototypeOf(this, CoinDCXOrderLimitError.prototype);
  }
}

export class CoinDCXWebSocketError extends CoinDCXError {
  public readonly originalError: Error | undefined;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    originalError: Error | undefined = undefined,
    isRetryable = true,
    suggestedAction = 'Check network connectivity and WebSocket auth credentials. The client auto-reconnects when isRetryable is true.'
  ) {
    super(message, suggestedAction);
    this.name = 'CoinDCXWebSocketError';
    this.originalError = originalError;
    this.isRetryable = isRetryable;
    Object.setPrototypeOf(this, CoinDCXWebSocketError.prototype);
  }
}

export class CoinDCXPaperEngineError extends CoinDCXError {
  constructor(
    message: string,
    suggestedAction = 'This occurred in the local paper-trading engine. Check simulated balances/positions via client.paper.getAccount().'
  ) {
    super(message, suggestedAction);
    this.name = 'CoinDCXPaperEngineError';
    Object.setPrototypeOf(this, CoinDCXPaperEngineError.prototype);
  }
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof CoinDCXAPIError) return error.isRetryable;
  if (error instanceof CoinDCXNetworkError) return true;
  if (error instanceof CoinDCXWebSocketError) return error.isRetryable;
  return false;
}

export function isRateLimitError(error: unknown): error is CoinDCXRateLimitError {
  return error instanceof CoinDCXRateLimitError;
}

export function isAuthenticationError(error: unknown): error is CoinDCXAuthenticationError {
  return error instanceof CoinDCXAuthenticationError;
}

export function isInsufficientMarginError(error: unknown): error is CoinDCXInsufficientMarginError {
  return error instanceof CoinDCXInsufficientMarginError;
}
