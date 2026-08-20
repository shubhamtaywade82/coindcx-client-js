[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / CreateMarginOrderRequestFull

# Interface: CreateMarginOrderRequestFull

Defined in: [models/index.ts:94](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L94)

## Extends

- [`CreateMarginOrderRequest`](CreateMarginOrderRequest.md)

## Properties

### side

> **side**: `"buy"` \| `"sell"`

Defined in: [models/index.ts:37](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L37)

#### Inherited from

[`CreateMarginOrderRequest`](CreateMarginOrderRequest.md).[`side`](CreateMarginOrderRequest.md#side)

***

### order\_type

> **order\_type**: `"market_order"` \| `"limit_order"` \| `"stop_limit_order"`

Defined in: [models/index.ts:38](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L38)

#### Inherited from

[`CreateMarginOrderRequest`](CreateMarginOrderRequest.md).[`order_type`](CreateMarginOrderRequest.md#order_type)

***

### market

> **market**: `string`

Defined in: [models/index.ts:39](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L39)

#### Inherited from

[`CreateMarginOrderRequest`](CreateMarginOrderRequest.md).[`market`](CreateMarginOrderRequest.md#market)

***

### price?

> `optional` **price?**: `number`

Defined in: [models/index.ts:40](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L40)

#### Inherited from

[`CreateMarginOrderRequest`](CreateMarginOrderRequest.md).[`price`](CreateMarginOrderRequest.md#price)

***

### quantity

> **quantity**: `number`

Defined in: [models/index.ts:41](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L41)

#### Inherited from

[`CreateMarginOrderRequest`](CreateMarginOrderRequest.md).[`quantity`](CreateMarginOrderRequest.md#quantity)

***

### leverage?

> `optional` **leverage?**: `number`

Defined in: [models/index.ts:42](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L42)

#### Inherited from

[`CreateMarginOrderRequest`](CreateMarginOrderRequest.md).[`leverage`](CreateMarginOrderRequest.md#leverage)

***

### client\_order\_id?

> `optional` **client\_order\_id?**: `string`

Defined in: [models/index.ts:43](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L43)

#### Inherited from

[`CreateMarginOrderRequest`](CreateMarginOrderRequest.md).[`client_order_id`](CreateMarginOrderRequest.md#client_order_id)

***

### time\_in\_force?

> `optional` **time\_in\_force?**: `"gtc"` \| `"ioc"` \| `"fok"` \| `"post_only"`

Defined in: [models/index.ts:44](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L44)

#### Inherited from

[`CreateMarginOrderRequest`](CreateMarginOrderRequest.md).[`time_in_force`](CreateMarginOrderRequest.md#time_in_force)

***

### trigger\_price?

> `optional` **trigger\_price?**: `number`

Defined in: [models/index.ts:45](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L45)

#### Inherited from

[`CreateMarginOrderRequest`](CreateMarginOrderRequest.md).[`trigger_price`](CreateMarginOrderRequest.md#trigger_price)

***

### stop\_loss?

> `optional` **stop\_loss?**: `number`

Defined in: [models/index.ts:46](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L46)

#### Inherited from

[`CreateMarginOrderRequest`](CreateMarginOrderRequest.md).[`stop_loss`](CreateMarginOrderRequest.md#stop_loss)

***

### take\_profit?

> `optional` **take\_profit?**: `number`

Defined in: [models/index.ts:47](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L47)

#### Inherited from

[`CreateMarginOrderRequest`](CreateMarginOrderRequest.md).[`take_profit`](CreateMarginOrderRequest.md#take_profit)
