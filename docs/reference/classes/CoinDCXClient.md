[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / CoinDCXClient

# Class: CoinDCXClient

Defined in: [index.ts:16](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L16)

## Constructors

### Constructor

> **new CoinDCXClient**(`options?`): `CoinDCXClient`

Defined in: [index.ts:38](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L38)

#### Parameters

##### options?

[`CoinDCXClientOptions`](../interfaces/CoinDCXClientOptions.md) = `{}`

#### Returns

`CoinDCXClient`

## Properties

### spot

> `readonly` **spot**: `SpotApi`

Defined in: [index.ts:17](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L17)

***

### margin

> `readonly` **margin**: `MarginApi`

Defined in: [index.ts:18](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L18)

***

### futures

> `readonly` **futures**: `object`

Defined in: [index.ts:19](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L19)

#### trading

> **trading**: `FuturesApi`

#### account

> **account**: `FuturesApi`

#### market

> **market**: `FuturesApi`

***

### marketData

> `readonly` **marketData**: `MarketDataApi`

Defined in: [index.ts:24](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L24)

***

### ws

> `readonly` **ws**: `WsClient`

Defined in: [index.ts:25](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L25)

***

### publicStreams

> `readonly` **publicStreams**: `PublicStreams`

Defined in: [index.ts:26](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L26)

***

### privateStreams

> `readonly` **privateStreams**: `PrivateStreams`

Defined in: [index.ts:27](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L27)

***

### ops

> `readonly` **ops**: `object`

Defined in: [index.ts:28](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L28)

#### sizing

> **sizing**: [`SizingOps`](SizingOps.md)

#### bracket

> **bracket**: [`BracketOps`](BracketOps.md)

#### snapshot

> **snapshot**: [`SnapshotOps`](SnapshotOps.md)

***

### paper

> `readonly` **paper**: [`PaperTradingEngine`](PaperTradingEngine.md)

Defined in: [index.ts:33](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L33)

## Methods

### connectWebsocket()

> **connectWebsocket**(): `Promise`\<`void`\>

Defined in: [index.ts:133](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L133)

#### Returns

`Promise`\<`void`\>

***

### subscribePrivateStreams()

> **subscribePrivateStreams**(): `void`

Defined in: [index.ts:137](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L137)

#### Returns

`void`

***

### setPaperMode()

> **setPaperMode**(`enabled`, `handler?`): `void`

Defined in: [index.ts:141](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L141)

#### Parameters

##### enabled

`boolean`

##### handler?

(`config`) => `Promise`\<`any`\>

#### Returns

`void`

***

### getRateLimitStatus()

> **getRateLimitStatus**(): `Record`\<`string`, `number`\>

Defined in: [index.ts:150](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L150)

#### Returns

`Record`\<`string`, `number`\>

***

### getRetryConfig()

> **getRetryConfig**(): `object`

Defined in: [index.ts:154](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L154)

#### Returns

`object`

##### maxRetries

> **maxRetries**: `number`

##### baseDelayMs

> **baseDelayMs**: `number`

##### maxDelayMs

> **maxDelayMs**: `number`

##### factor

> **factor**: `number`

***

### configureRetry()

> **configureRetry**(`options`): `void`

Defined in: [index.ts:158](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L158)

#### Parameters

##### options

###### maxRetries?

`number`

###### baseDelayMs?

`number`

###### maxDelayMs?

`number`

###### factor?

`number`

#### Returns

`void`

***

### disconnect()

> **disconnect**(): `void`

Defined in: [index.ts:167](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L167)

#### Returns

`void`

***

### nowSeconds()

> `static` **nowSeconds**(): `number`

Defined in: [index.ts:171](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L171)

#### Returns

`number`

***

### buildPair()

> `static` **buildPair**(`base`, `target`, `ecode?`): `string`

Defined in: [index.ts:175](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L175)

#### Parameters

##### base

`string`

##### target

`string`

##### ecode?

`string` = `'B'`

#### Returns

`string`

***

### parsePair()

> `static` **parsePair**(`pair`): \{ `ecode`: `string`; `base`: `string`; `target`: `string`; \} \| `null`

Defined in: [index.ts:179](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L179)

#### Parameters

##### pair

`string`

#### Returns

\{ `ecode`: `string`; `base`: `string`; `target`: `string`; \} \| `null`

***

### calculateLiquidationPrice()

> `static` **calculateLiquidationPrice**(`entryPrice`, `leverage`, `side`, `mm?`): `number`

Defined in: [index.ts:185](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/index.ts#L185)

#### Parameters

##### entryPrice

`number`

##### leverage

`number`

##### side

`string`

##### mm?

`number` = `0.005`

#### Returns

`number`
