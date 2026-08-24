import { CoinDCXOrderLimitError } from './errors';

/**
 * Client-side guardrails enforced before an order ever reaches the network.
 * Unset fields impose no limit. These exist primarily for agent/LLM callers
 * that can size an order incorrectly - a human still has to opt in by
 * setting a limit, since the SDK has no way to guess a safe default across
 * accounts of very different sizes.
 */
export interface TradingSafetyLimits {
  /** Maximum quantity (base currency / contracts) allowed in a single order. */
  maxOrderQuantity?: number;
  /**
   * Maximum notional value (quantity * price) allowed in a single order.
   * Only enforced when a price is known - a market order's fill price isn't
   * known synchronously, so this check is skipped for market orders. Use
   * `maxOrderQuantity` to bound those instead.
   */
  maxOrderNotional?: number;
}

export interface OrderLimitCheckInput {
  quantity: number;
  price?: number | undefined;
}

export function assertWithinOrderLimits(order: OrderLimitCheckInput, limits: TradingSafetyLimits | undefined): void {
  if (!limits) return;

  if (limits.maxOrderQuantity !== undefined && order.quantity > limits.maxOrderQuantity) {
    throw new CoinDCXOrderLimitError(
      `Order quantity ${order.quantity} exceeds the configured max order quantity of ${limits.maxOrderQuantity}.`,
      `Reduce the quantity to ${limits.maxOrderQuantity} or below, or call client.setSafetyLimits({ maxOrderQuantity }) to raise it if this size is intentional.`
    );
  }

  if (limits.maxOrderNotional !== undefined && order.price !== undefined && order.price > 0) {
    const notional = order.quantity * order.price;
    if (notional > limits.maxOrderNotional) {
      throw new CoinDCXOrderLimitError(
        `Order notional ${notional} (quantity * price) exceeds the configured max order notional of ${limits.maxOrderNotional}.`,
        `Reduce the quantity or price so the notional stays under ${limits.maxOrderNotional}, or call client.setSafetyLimits({ maxOrderNotional }) to raise it if this size is intentional.`
      );
    }
  }
}
