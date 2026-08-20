[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / PaperTradingEngine

# Class: PaperTradingEngine

Defined in: [paper/engine.ts:66](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L66)

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new PaperTradingEngine**(`config`): `PaperTradingEngine`

Defined in: [paper/engine.ts:76](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L76)

#### Parameters

##### config

[`PaperEngineConfig`](../interfaces/PaperEngineConfig.md)

#### Returns

`PaperTradingEngine`

#### Overrides

`EventEmitter.constructor`

## Methods

### updatePrice()

> **updatePrice**(`pair`, `bid`, `ask`): `void`

Defined in: [paper/engine.ts:95](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L95)

#### Parameters

##### pair

`string`

##### bid

`number`

##### ask

`number`

#### Returns

`void`

***

### getMidPrice()

> **getMidPrice**(`pair`): `number` \| `null`

Defined in: [paper/engine.ts:101](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L101)

#### Parameters

##### pair

`string`

#### Returns

`number` \| `null`

***

### getBidAsk()

> **getBidAsk**(`pair`): \{ `bid`: `number`; `ask`: `number`; \} \| `null`

Defined in: [paper/engine.ts:107](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L107)

#### Parameters

##### pair

`string`

#### Returns

\{ `bid`: `number`; `ask`: `number`; \} \| `null`

***

### placeOrder()

> **placeOrder**(`params`): `Promise`\<[`FuturesOrderResponse`](../interfaces/FuturesOrderResponse.md)\>

Defined in: [paper/engine.ts:111](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L111)

#### Parameters

##### params

`CreateFuturesOrderRequest`

#### Returns

`Promise`\<[`FuturesOrderResponse`](../interfaces/FuturesOrderResponse.md)\>

***

### cancelOrder()

> **cancelOrder**(`orderId`): `Promise`\<`boolean`\>

Defined in: [paper/engine.ts:158](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L158)

#### Parameters

##### orderId

`string` \| `number`

#### Returns

`Promise`\<`boolean`\>

***

### getOrder()

> **getOrder**(`orderId`): [`PaperOrder`](../interfaces/PaperOrder.md) \| `undefined`

Defined in: [paper/engine.ts:176](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L176)

#### Parameters

##### orderId

`string` \| `number`

#### Returns

[`PaperOrder`](../interfaces/PaperOrder.md) \| `undefined`

***

### getOrders()

> **getOrders**(): [`PaperOrder`](../interfaces/PaperOrder.md)[]

Defined in: [paper/engine.ts:180](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L180)

#### Returns

[`PaperOrder`](../interfaces/PaperOrder.md)[]

***

### getOpenOrders()

> **getOpenOrders**(): [`PaperOrder`](../interfaces/PaperOrder.md)[]

Defined in: [paper/engine.ts:184](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L184)

#### Returns

[`PaperOrder`](../interfaces/PaperOrder.md)[]

***

### getPositions()

> **getPositions**(): [`PaperPosition`](../interfaces/PaperPosition.md)[]

Defined in: [paper/engine.ts:188](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L188)

#### Returns

[`PaperPosition`](../interfaces/PaperPosition.md)[]

***

### getPosition()

> **getPosition**(`pair`): [`PaperPosition`](../interfaces/PaperPosition.md) \| `undefined`

Defined in: [paper/engine.ts:192](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L192)

#### Parameters

##### pair

`string`

#### Returns

[`PaperPosition`](../interfaces/PaperPosition.md) \| `undefined`

***

### getAccount()

> **getAccount**(): [`PaperAccount`](../interfaces/PaperAccount.md)

Defined in: [paper/engine.ts:196](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L196)

#### Returns

[`PaperAccount`](../interfaces/PaperAccount.md)

***

### reset()

> **reset**(`config?`): `void`

Defined in: [paper/engine.ts:201](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/paper/engine.ts#L201)

#### Parameters

##### config?

`Partial`\<[`PaperEngineConfig`](../interfaces/PaperEngineConfig.md)\>

#### Returns

`void`
