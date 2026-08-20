[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / CreateSpotOrderRequest

# Interface: CreateSpotOrderRequest

Defined in: [models/index.ts:4](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L4)

## Properties

### side

> **side**: `"buy"` \| `"sell"`

Defined in: [models/index.ts:5](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L5)

***

### order\_type

> **order\_type**: `"market_order"` \| `"limit_order"` \| `"stop_limit_order"`

Defined in: [models/index.ts:6](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L6)

***

### market

> **market**: `string`

Defined in: [models/index.ts:7](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L7)

***

### price?

> `optional` **price?**: `number`

Defined in: [models/index.ts:8](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L8)

***

### quantity

> **quantity**: `number`

Defined in: [models/index.ts:9](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L9)

***

### client\_order\_id?

> `optional` **client\_order\_id?**: `string`

Defined in: [models/index.ts:10](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L10)

***

### time\_in\_force?

> `optional` **time\_in\_force?**: `"gtc"` \| `"ioc"` \| `"fok"` \| `"post_only"`

Defined in: [models/index.ts:11](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L11)

***

### trigger\_price?

> `optional` **trigger\_price?**: `number`

Defined in: [models/index.ts:12](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L12)

***

### stop\_loss?

> `optional` **stop\_loss?**: `number`

Defined in: [models/index.ts:13](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L13)

***

### take\_profit?

> `optional` **take\_profit?**: `number`

Defined in: [models/index.ts:14](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/models/index.ts#L14)
