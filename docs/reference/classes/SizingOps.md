[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / SizingOps

# Class: SizingOps

Defined in: [ops/sizing.ts:19](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/sizing.ts#L19)

## Constructors

### Constructor

> **new SizingOps**(`futuresApi`): `SizingOps`

Defined in: [ops/sizing.ts:20](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/sizing.ts#L20)

#### Parameters

##### futuresApi

`FuturesApi`

#### Returns

`SizingOps`

## Methods

### calculatePositionSize()

> **calculatePositionSize**(`params`): [`PositionSizeResult`](../interfaces/PositionSizeResult.md)

Defined in: [ops/sizing.ts:22](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/sizing.ts#L22)

#### Parameters

##### params

[`PositionSizingParams`](../interfaces/PositionSizingParams.md)

#### Returns

[`PositionSizeResult`](../interfaces/PositionSizeResult.md)

***

### quantizeQuantity()

> **quantizeQuantity**(`pair`, `quantity`): `Promise`\<`number`\>

Defined in: [ops/sizing.ts:42](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/sizing.ts#L42)

#### Parameters

##### pair

`string`

##### quantity

`number`

#### Returns

`Promise`\<`number`\>

***

### quantizePrice()

> **quantizePrice**(`pair`, `price`): `Promise`\<`number`\>

Defined in: [ops/sizing.ts:52](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/sizing.ts#L52)

#### Parameters

##### pair

`string`

##### price

`number`

#### Returns

`Promise`\<`number`\>

***

### calculateLiquidationPrice()

> **calculateLiquidationPrice**(`entryPrice`, `leverage`, `side`, `maintenanceMargin?`): `number`

Defined in: [ops/sizing.ts:62](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/sizing.ts#L62)

#### Parameters

##### entryPrice

`number`

##### leverage

`number`

##### side

`"long"` \| `"short"`

##### maintenanceMargin?

`number` = `0.005`

#### Returns

`number`

***

### calculateRequiredMargin()

> **calculateRequiredMargin**(`quantity`, `entryPrice`, `leverage`): `number`

Defined in: [ops/sizing.ts:69](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/sizing.ts#L69)

#### Parameters

##### quantity

`number`

##### entryPrice

`number`

##### leverage

`number`

#### Returns

`number`

***

### calculatePnL()

> **calculatePnL**(`entryPrice`, `currentPrice`, `quantity`, `side`): `number`

Defined in: [ops/sizing.ts:73](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/sizing.ts#L73)

#### Parameters

##### entryPrice

`number`

##### currentPrice

`number`

##### quantity

`number`

##### side

`"long"` \| `"short"`

#### Returns

`number`

***

### calculateROE()

> **calculateROE**(`entryPrice`, `currentPrice`, `quantity`, `side`, `leverage`): `number`

Defined in: [ops/sizing.ts:78](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/sizing.ts#L78)

#### Parameters

##### entryPrice

`number`

##### currentPrice

`number`

##### quantity

`number`

##### side

`"long"` \| `"short"`

##### leverage

`number`

#### Returns

`number`
