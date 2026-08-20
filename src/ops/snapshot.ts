import { FuturesApi } from '../rest/futures';
import { SpotApi } from '../rest/spot';
import { MarketDataApi } from '../rest/market-data';
import { BalanceResponse, PositionResponse, TickerResponse, InstrumentResponse } from '../models';

export interface MarketSnapshot {
  pair: string;
  ticker: TickerResponse | null;
  orderBook: { bids: any[]; asks: any[] } | null;
  recentTrades: any[];
  fundingRate: number | null;
  timestamp: number;
}

export interface AccountOverview {
  spotBalances: BalanceResponse[];
  futuresWallet: BalanceResponse[];
  futuresPositions: PositionResponse[];
  totalEquity: number;
  availableMargin: number;
  usedMargin: number;
  unrealizedPnl: number;
  timestamp: number;
}

export class SnapshotOps {
  constructor(
    private futuresApi: FuturesApi,
    private spotApi: SpotApi,
    private marketDataApi: MarketDataApi
  ) {}

  async getMarketSnapshot(pair: string): Promise<MarketSnapshot> {
    const [, orderBookResult, tradesResult, fundingRateResult] = await Promise.allSettled([
      this.marketDataApi.getFuturesCandles(pair, '1m', 1).then(c => c[0] || null),
      this.marketDataApi.getFuturesOrderBook(pair, 20),
      this.marketDataApi.getFuturesTradeHistory(pair, 50),
      this.futuresApi.getFundingRateHistory(pair, 1).then(f => f[0]?.funding_rate || null),
    ]);

    let tickerData: TickerResponse | null = null;
    try {
      const allTickers = await this.marketDataApi.getSpotTicker();
      tickerData = allTickers.find(t => t.pair === pair) || null;
    } catch {
      // Ignore ticker fetch error
    }

    let orderBookData: { bids: any[]; asks: any[] } | null = null;
    if (orderBookResult.status === 'fulfilled' && orderBookResult.value) {
      const ob = orderBookResult.value;
      orderBookData = {
        bids: Object.entries(ob.bids).map(([p, q]) => ({ price: parseFloat(p), quantity: parseFloat(q as any) })),
        asks: Object.entries(ob.asks).map(([p, q]) => ({ price: parseFloat(p), quantity: parseFloat(q as any) })),
      };
    }

    return {
      pair,
      ticker: tickerData,
      orderBook: orderBookData,
      recentTrades: tradesResult.status === 'fulfilled' ? tradesResult.value : [],
      fundingRate: fundingRateResult.status === 'fulfilled' ? fundingRateResult.value : null,
      timestamp: Date.now(),
    };
  }

  async getAccountOverview(): Promise<AccountOverview> {
    const [spotBalances, futuresWallet, futuresPositions] = await Promise.allSettled([
      this.spotApi.getBalances(),
      this.futuresApi.getWallet(),
      this.futuresApi.getPositions(),
    ]);

    const spot = spotBalances.status === 'fulfilled' ? spotBalances.value : [];
    const wallet = futuresWallet.status === 'fulfilled' ? futuresWallet.value : [];
    const positions = futuresPositions.status === 'fulfilled' ? futuresPositions.value : [];

    const totalEquity = spot.reduce((sum, b) => sum + b.balance, 0) +
                       wallet.reduce((sum, b) => sum + b.balance, 0);

    const availableMargin = wallet.reduce((sum, b) => sum + (b.available_balance ?? 0), 0);
    const usedMargin = wallet.reduce((sum, b) => sum + (b.locked_balance ?? 0), 0);
    const unrealizedPnl = positions.reduce((sum, p) => sum + (p.unrealized_pnl ?? 0), 0);

    return {
      spotBalances: spot,
      futuresWallet: wallet,
      futuresPositions: positions,
      totalEquity,
      availableMargin,
      usedMargin,
      unrealizedPnl,
      timestamp: Date.now(),
    };
  }

  async getInstrumentDetails(pair: string): Promise<InstrumentResponse | null> {
    try {
      return await this.futuresApi.getInstrumentDetails(pair);
    } catch {
      return null;
    }
  }

  async getAllInstruments(marginCurrency = 'USDT'): Promise<string[]> {
    return this.futuresApi.getActiveInstruments(marginCurrency);
  }

  async getMultipleSnapshots(pairs: string[]): Promise<MarketSnapshot[]> {
    return Promise.all(pairs.map(pair => this.getMarketSnapshot(pair)));
  }

  async isValidFuturesPair(pair: string): Promise<boolean> {
    try {
      const instruments = await this.getAllInstruments();
      return instruments.includes(pair);
    } catch {
      return false;
    }
  }
}