[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / PaperOrder

# Interface: PaperOrder

Defined in: [paper/engine.ts:14](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L14)

## Properties

### id

> **id**: `string`

Defined in: [paper/engine.ts:15](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L15)

***

### clientOrderId

> **clientOrderId**: `string`

Defined in: [paper/engine.ts:16](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L16)

***

### pair

> **pair**: `string`

Defined in: [paper/engine.ts:17](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L17)

***

### side

> **side**: `"buy"` \| `"sell"`

Defined in: [paper/engine.ts:18](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L18)

***

### orderType

> **orderType**: `"market_order"` \| `"limit_order"` \| `"stop_limit_order"`

Defined in: [paper/engine.ts:19](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L19)

***

### price

> **price**: `number` \| `undefined`

Defined in: [paper/engine.ts:20](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L20)

***

### quantity

> **quantity**: `number`

Defined in: [paper/engine.ts:21](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L21)

***

### filledQuantity

> **filledQuantity**: `number`

Defined in: [paper/engine.ts:22](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L22)

***

### remainingQuantity

> **remainingQuantity**: `number`

Defined in: [paper/engine.ts:23](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L23)

***

### status

> **status**: `"rejected"` \| `"new"` \| `"partially_filled"` \| `"filled"` \| `"cancelled"`

Defined in: [paper/engine.ts:24](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L24)

***

### leverage

> **leverage**: `number` \| `undefined`

Defined in: [paper/engine.ts:25](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L25)

***

### marginType

> **marginType**: `"isolated"` \| `"cross"` \| `undefined`

Defined in: [paper/engine.ts:26](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L26)

***

### stopLoss

> **stopLoss**: `number` \| `undefined`

Defined in: [paper/engine.ts:27](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L27)

***

### takeProfit

> **takeProfit**: `number` \| `undefined`

Defined in: [paper/engine.ts:28](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L28)

***

### createdAt

> **createdAt**: `number`

Defined in: [paper/engine.ts:29](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L29)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [paper/engine.ts:30](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L30)

***

### fills

> **fills**: [`PaperFill`](PaperFill.md)[]

Defined in: [paper/engine.ts:31](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L31)
