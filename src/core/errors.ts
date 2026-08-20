export class CoinDCXError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
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

  constructor(message: string, status: number, data: any, method: string, url: string, code: string | undefined = undefined) {
    super(message);
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

  constructor(message: string, originalError: Error) {
    super(message);
    this.name = 'CoinDCXNetworkError';
    this.originalError = originalError;
    Object.setPrototypeOf(this, CoinDCXNetworkError.prototype);
  }
}

export class CoinDCXRateLimitError extends CoinDCXAPIError {
  public readonly retryAfter: number;

  constructor(message: string, status: number, data: any, method: string, url: string, retryAfter: number) {
    super(message, status, data, method, url);
    this.name = 'CoinDCXRateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, CoinDCXRateLimitError.prototype);
  }
}

export class CoinDCXAuthenticationError extends CoinDCXAPIError {
  constructor(message: string, status: number, data: any, method: string, url: string) {
    super(message, status, data, method, url);
    this.name = 'CoinDCXAuthenticationError';
    Object.setPrototypeOf(this, CoinDCXAuthenticationError.prototype);
  }
}

export class CoinDCXValidationError extends CoinDCXAPIError {
  constructor(message: string, status: number, data: any, method: string, url: string) {
    super(message, status, data, method, url);
    this.name = 'CoinDCXValidationError';
    Object.setPrototypeOf(this, CoinDCXValidationError.prototype);
  }
}

export class CoinDCXInsufficientMarginError extends CoinDCXAPIError {
  constructor(message: string, status: number, data: any, method: string, url: string) {
    super(message, status, data, method, url);
    this.name = 'CoinDCXInsufficientMarginError';
    Object.setPrototypeOf(this, CoinDCXInsufficientMarginError.prototype);
  }
}

export class CoinDCXInvalidPairError extends CoinDCXAPIError {
  constructor(message: string, status: number, data: any, method: string, url: string) {
    super(message, status, data, method, url);
    this.name = 'CoinDCXInvalidPairError';
    Object.setPrototypeOf(this, CoinDCXInvalidPairError.prototype);
  }
}

export class CoinDCXOrderError extends CoinDCXAPIError {
  constructor(message: string, status: number, data: any, method: string, url: string) {
    super(message, status, data, method, url);
    this.name = 'CoinDCXOrderError';
    Object.setPrototypeOf(this, CoinDCXOrderError.prototype);
  }
}

export class CoinDCXWebSocketError extends CoinDCXError {
  public readonly originalError: Error | undefined;
  public readonly isRetryable: boolean;

  constructor(message: string, originalError: Error | undefined = undefined, isRetryable = true) {
    super(message);
    this.name = 'CoinDCXWebSocketError';
    this.originalError = originalError;
    this.isRetryable = isRetryable;
    Object.setPrototypeOf(this, CoinDCXWebSocketError.prototype);
  }
}

export class CoinDCXPaperEngineError extends CoinDCXError {
  constructor(message: string) {
    super(message);
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