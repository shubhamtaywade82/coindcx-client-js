[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / SnapshotOps

# Class: SnapshotOps

Defined in: [ops/snapshot.ts:26](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/snapshot.ts#L26)

## Constructors

### Constructor

> **new SnapshotOps**(`futuresApi`, `spotApi`, `marketDataApi`): `SnapshotOps`

Defined in: [ops/snapshot.ts:27](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/snapshot.ts#L27)

#### Parameters

##### futuresApi

`FuturesApi`

##### spotApi

`SpotApi`

##### marketDataApi

`MarketDataApi`

#### Returns

`SnapshotOps`

## Methods

### getMarketSnapshot()

> **getMarketSnapshot**(`pair`): `Promise`\<[`MarketSnapshot`](../interfaces/MarketSnapshot.md)\>

Defined in: [ops/snapshot.ts:33](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/snapshot.ts#L33)

#### Parameters

##### pair

`string`

#### Returns

`Promise`\<[`MarketSnapshot`](../interfaces/MarketSnapshot.md)\>

***

### getAccountOverview()

> **getAccountOverview**(): `Promise`\<[`AccountOverview`](../interfaces/AccountOverview.md)\>

Defined in: [ops/snapshot.ts:68](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/snapshot.ts#L68)

#### Returns

`Promise`\<[`AccountOverview`](../interfaces/AccountOverview.md)\>

***

### getInstrumentDetails()

> **getInstrumentDetails**(`pair`): `Promise`\<[`InstrumentResponse`](../interfaces/InstrumentResponse.md) \| `null`\>

Defined in: [ops/snapshot.ts:98](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/snapshot.ts#L98)

#### Parameters

##### pair

`string`

#### Returns

`Promise`\<[`InstrumentResponse`](../interfaces/InstrumentResponse.md) \| `null`\>

***

### getAllInstruments()

> **getAllInstruments**(`marginCurrency?`): `Promise`\<`string`[]\>

Defined in: [ops/snapshot.ts:106](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/snapshot.ts#L106)

#### Parameters

##### marginCurrency?

`string` = `'USDT'`

#### Returns

`Promise`\<`string`[]\>

***

### getMultipleSnapshots()

> **getMultipleSnapshots**(`pairs`): `Promise`\<[`MarketSnapshot`](../interfaces/MarketSnapshot.md)[]\>

Defined in: [ops/snapshot.ts:110](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/snapshot.ts#L110)

#### Parameters

##### pairs

`string`[]

#### Returns

`Promise`\<[`MarketSnapshot`](../interfaces/MarketSnapshot.md)[]\>

***

### isValidFuturesPair()

> **isValidFuturesPair**(`pair`): `Promise`\<`boolean`\>

Defined in: [ops/snapshot.ts:114](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/ops/snapshot.ts#L114)

#### Parameters

##### pair

`string`

#### Returns

`Promise`\<`boolean`\>
