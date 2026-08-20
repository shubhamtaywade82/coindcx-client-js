import { FuturesApi } from '../rest/futures';
import { CreateFuturesOrderRequest, FuturesOrderResponse } from '../models';

export interface BracketOrderParams {
  pair: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number | undefined;
  stopLoss: number;
  takeProfit: number;
  leverage: number | undefined;
  marginType: 'isolated' | 'cross' | undefined;
  clientOrderId: string | undefined;
}

export interface BracketOrderResult {
  entryOrder: FuturesOrderResponse;
  stopLossOrder: FuturesOrderResponse | undefined;
  takeProfitOrder: FuturesOrderResponse | undefined;
}

export class BracketOps {
  constructor(private futuresApi: FuturesApi) {}

  async placeBracketOrder(params: BracketOrderParams): Promise<BracketOrderResult> {
    const clientOrderId = params.clientOrderId ?? `bracket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const entryOrderParams: CreateFuturesOrderRequest = {
      side: params.side,
      order_type: params.entryPrice ? 'limit_order' : 'market_order',
      base_currency: params.pair.split('-')[1]?.split('_')[0] ?? '',
      quote_currency: params.pair.split('_')[1] ?? 'USDT',
      target_quantity: params.quantity,
      price: params.entryPrice,
      leverage: params.leverage,
      margin_type: params.marginType,
      client_order_id: `${clientOrderId}_entry`,
      stop_loss: params.stopLoss,
      take_profit: params.takeProfit,
      time_in_force: 'gtc',
    };

    const entryOrder = await this.futuresApi.createOrder(entryOrderParams);

    let stopLossOrder: FuturesOrderResponse | undefined;
    let takeProfitOrder: FuturesOrderResponse | undefined;

    if (!params.entryPrice) {
      await new Promise(resolve => setTimeout(resolve, 500));

      const positions = await this.futuresApi.getPositions({ pair: params.pair });
      const position = positions.find(p => p.pair === params.pair);

      if (position) {
        try {
          const tpslResult = await this.futuresApi.createTPSL({
            position_id: position.id,
            stop_loss: params.stopLoss,
            take_profit: params.takeProfit,
          });
          if (Array.isArray(tpslResult)) {
            stopLossOrder = tpslResult.find(o => o.side !== params.side && o.stop_loss);
            takeProfitOrder = tpslResult.find(o => o.side !== params.side && o.take_profit);
          }
        } catch (error) {
          console.warn('Failed to create TPSL orders:', error);
        }
      }
    }

    return { entryOrder, stopLossOrder, takeProfitOrder };
  }

  async closePosition(pair: string): Promise<any> {
    return this.futuresApi.exitPosition({ pair });
  }

  async closePositionById(positionId: string | number): Promise<any> {
    return this.futuresApi.closePosition({ id: positionId });
  }

  async addTPSL(positionId: string | number, stopLoss?: number, takeProfit?: number): Promise<any> {
    return this.futuresApi.createTPSL({ position_id: positionId, stop_loss: stopLoss, take_profit: takeProfit });
  }

  async cancelAllOrdersForPosition(positionId: string | number): Promise<any> {
    return this.futuresApi.cancelAllOrdersForPosition({ position_id: positionId });
  }

  async updateStopLoss(positionId: string | number, stopLoss: number): Promise<any> {
    return this.futuresApi.createTPSL({ position_id: positionId, stop_loss: stopLoss, take_profit: undefined });
  }

  async updateTakeProfit(positionId: string | number, takeProfit: number): Promise<any> {
    return this.futuresApi.createTPSL({ position_id: positionId, stop_loss: undefined, take_profit: takeProfit });
  }
}