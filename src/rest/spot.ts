import { RestClient } from '../core/rest-client';
import { RestClientOptions } from '../core/types';
import { assertWithinOrderLimits } from '../core/safety';
import {
  CreateSpotOrderRequest,
  CreateMultipleSpotOrdersRequest,
  GetOrderStatusRequest,
  GetOrderStatusMultipleRequest,
  CancelOrderRequest,
  CancelAllOrdersRequest,
  EditOrderRequest,
  GetUserSpotTradeHistoryRequest,
  SpotOrderResponse,
  BalanceResponse,
  UserInfoResponse,
  ActiveOrdersCountResponse,
} from '../models';

export class SpotApi extends RestClient {
  constructor(options?: RestClientOptions) {
    super(options);
  }

  async createOrder(params: CreateSpotOrderRequest): Promise<SpotOrderResponse> {
    assertWithinOrderLimits({ quantity: params.quantity, price: params.price }, this.safetyLimits);
    if (!params.client_order_id) {
      params.client_order_id = `js_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
    return this.signedRequest('POST', '/exchange/v1/orders/create', params);
  }

  async createMultipleOrders(params: CreateMultipleSpotOrdersRequest): Promise<SpotOrderResponse[]> {
    params.orders.forEach(o => {
      assertWithinOrderLimits({ quantity: o.quantity, price: o.price }, this.safetyLimits);
      if (!o.client_order_id) {
        o.client_order_id = `js_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      }
    });
    return this.signedRequest('POST', '/exchange/v1/orders/create_multiple', params);
  }

  async getOrderStatus(params: GetOrderStatusRequest): Promise<SpotOrderResponse> {
    return this.signedRequest('POST', '/exchange/v1/orders/status', params);
  }

  async getOrderStatusMultiple(params: GetOrderStatusMultipleRequest): Promise<SpotOrderResponse[]> {
    return this.signedRequest('POST', '/exchange/v1/orders/status_multiple', params);
  }

  async getActiveOrders(): Promise<SpotOrderResponse[]> {
    return this.signedRequest('POST', '/exchange/v1/orders/active_orders', {});
  }

  async cancelOrder(params: CancelOrderRequest): Promise<any> {
    return this.signedRequest('POST', '/exchange/v1/orders/cancel', params);
  }

  async cancelAllOrders(params: CancelAllOrdersRequest = {}): Promise<any> {
    return this.signedRequest('POST', '/exchange/v1/orders/cancel_all', params);
  }

  async cancelOrdersByIds(ids: (string | number)[]): Promise<any> {
    return this.signedRequest('POST', '/exchange/v1/orders/cancel_by_ids', { ids });
  }

  async editOrder(params: EditOrderRequest): Promise<SpotOrderResponse> {
    return this.signedRequest('POST', '/exchange/v1/orders/edit', params);
  }

  async getUserTradeHistory(params: GetUserSpotTradeHistoryRequest): Promise<SpotOrderResponse[]> {
    return this.signedRequest('POST', '/exchange/v1/orders/trade_history', params);
  }

  async getActiveOrdersCount(): Promise<number> {
    const response = await this.signedRequest<ActiveOrdersCountResponse>(
      'POST',
      '/exchange/v1/orders/active_orders_count',
      {}
    );
    return response.count;
  }

  async getBalances(): Promise<BalanceResponse[]> {
    return this.signedRequest('POST', '/exchange/v1/users/balances', {});
  }

  async getUserInfo(): Promise<UserInfoResponse> {
    return this.signedRequest('POST', '/exchange/v1/users/info', {});
  }
}