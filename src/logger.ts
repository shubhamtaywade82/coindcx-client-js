export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  enableColors?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const COLORS = {
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  reset: '\x1b[0m',
};

export class Logger {
  private level: LogLevel;
  private prefix: string;
  private enableColors: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || 'info';
    this.prefix = options.prefix || 'CoinDCX';
    this.enableColors = options.enableColors ?? true;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private format(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const color = this.enableColors ? COLORS[level] : '';
    const reset = this.enableColors ? COLORS.reset : '';
    const prefix = `[${this.prefix}]`;
    return `${color}${timestamp} ${prefix} [${level.toUpperCase()}]${reset} ${message} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) console.debug(this.format('debug', message, ...args));
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) console.info(this.format('info', message, ...args));
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) console.warn(this.format('warn', message, ...args));
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) console.error(this.format('error', message, ...args));
  }

  child(prefix: string): Logger {
    return new Logger({
      level: this.level,
      prefix: `${this.prefix}:${prefix}`,
      enableColors: this.enableColors,
    });
  }
}

export const defaultLogger = new Logger({ level: 'info' });