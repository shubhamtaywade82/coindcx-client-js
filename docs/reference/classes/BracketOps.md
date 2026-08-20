[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / BracketOps

# Class: BracketOps

Defined in: [ops/bracket.ts:22](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/bracket.ts#L22)

## Constructors

### Constructor

> **new BracketOps**(`futuresApi`): `BracketOps`

Defined in: [ops/bracket.ts:23](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/bracket.ts#L23)

#### Parameters

##### futuresApi

`FuturesApi`

#### Returns

`BracketOps`

## Methods

### placeBracketOrder()

> **placeBracketOrder**(`params`): `Promise`\<[`BracketOrderResult`](../interfaces/BracketOrderResult.md)\>

Defined in: [ops/bracket.ts:25](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/bracket.ts#L25)

#### Parameters

##### params

[`BracketOrderParams`](../interfaces/BracketOrderParams.md)

#### Returns

`Promise`\<[`BracketOrderResult`](../interfaces/BracketOrderResult.md)\>

***

### closePosition()

> **closePosition**(`pair`): `Promise`\<`any`\>

Defined in: [ops/bracket.ts:74](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/bracket.ts#L74)

#### Parameters

##### pair

`string`

#### Returns

`Promise`\<`any`\>

***

### closePositionById()

> **closePositionById**(`positionId`): `Promise`\<`any`\>

Defined in: [ops/bracket.ts:78](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/bracket.ts#L78)

#### Parameters

##### positionId

`string` \| `number`

#### Returns

`Promise`\<`any`\>

***

### addTPSL()

> **addTPSL**(`positionId`, `stopLoss?`, `takeProfit?`): `Promise`\<`any`\>

Defined in: [ops/bracket.ts:82](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/bracket.ts#L82)

#### Parameters

##### positionId

`string` \| `number`

##### stopLoss?

`number`

##### takeProfit?

`number`

#### Returns

`Promise`\<`any`\>

***

### cancelAllOrdersForPosition()

> **cancelAllOrdersForPosition**(`positionId`): `Promise`\<`any`\>

Defined in: [ops/bracket.ts:86](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/bracket.ts#L86)

#### Parameters

##### positionId

`string` \| `number`

#### Returns

`Promise`\<`any`\>

***

### updateStopLoss()

> **updateStopLoss**(`positionId`, `stopLoss`): `Promise`\<`any`\>

Defined in: [ops/bracket.ts:90](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/bracket.ts#L90)

#### Parameters

##### positionId

`string` \| `number`

##### stopLoss

`number`

#### Returns

`Promise`\<`any`\>

***

### updateTakeProfit()

> **updateTakeProfit**(`positionId`, `takeProfit`): `Promise`\<`any`\>

Defined in: [ops/bracket.ts:94](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/bracket.ts#L94)

#### Parameters

##### positionId

`string` \| `number`

##### takeProfit

`number`

#### Returns

`Promise`\<`any`\>
