[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / CreateMarginOrderRequest

# Interface: CreateMarginOrderRequest

Defined in: [models/index.ts:36](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L36)

## Extended by

- [`CreateMarginOrderRequestFull`](CreateMarginOrderRequestFull.md)

## Properties

### side

> **side**: `"buy"` \| `"sell"`

Defined in: [models/index.ts:37](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L37)

***

### order\_type

> **order\_type**: `"market_order"` \| `"limit_order"` \| `"stop_limit_order"`

Defined in: [models/index.ts:38](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L38)

***

### market

> **market**: `string`

Defined in: [models/index.ts:39](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L39)

***

### price?

> `optional` **price?**: `number`

Defined in: [models/index.ts:40](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L40)

***

### quantity

> **quantity**: `number`

Defined in: [models/index.ts:41](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L41)

***

### leverage?

> `optional` **leverage?**: `number`

Defined in: [models/index.ts:42](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L42)

***

### client\_order\_id?

> `optional` **client\_order\_id?**: `string`

Defined in: [models/index.ts:43](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L43)

***

### time\_in\_force?

> `optional` **time\_in\_force?**: `"gtc"` \| `"ioc"` \| `"fok"` \| `"post_only"`

Defined in: [models/index.ts:44](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L44)

***

### trigger\_price?

> `optional` **trigger\_price?**: `number`

Defined in: [models/index.ts:45](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L45)

***

### stop\_loss?

> `optional` **stop\_loss?**: `number`

Defined in: [models/index.ts:46](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L46)

***

### take\_profit?

> `optional` **take\_profit?**: `number`

Defined in: [models/index.ts:47](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L47)
