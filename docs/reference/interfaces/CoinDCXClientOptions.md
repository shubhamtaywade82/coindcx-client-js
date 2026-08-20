[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / CoinDCXClientOptions

# Interface: CoinDCXClientOptions

Defined in: [core/types.ts:69](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L69)

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [core/types.ts:70](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L70)

***

### apiSecret?

> `optional` **apiSecret?**: `string`

Defined in: [core/types.ts:71](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L71)

***

### baseUrl?

> `optional` **baseUrl?**: `string`

Defined in: [core/types.ts:72](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L72)

***

### publicApiBase?

> `optional` **publicApiBase?**: `string`

Defined in: [core/types.ts:73](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L73)

***

### wsUrl?

> `optional` **wsUrl?**: `string`

Defined in: [core/types.ts:74](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L74)

***

### paperMode?

> `optional` **paperMode?**: `boolean`

Defined in: [core/types.ts:75](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L75)

***

### paperEngineHandler?

> `optional` **paperEngineHandler?**: (`config`) => `Promise`\<`any`\>

Defined in: [core/types.ts:76](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L76)

#### Parameters

##### config

`any`

#### Returns

`Promise`\<`any`\>

***

### initialBalance?

> `optional` **initialBalance?**: `number`

Defined in: [core/types.ts:77](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L77)

***

### initialFuturesBalance?

> `optional` **initialFuturesBalance?**: `number`

Defined in: [core/types.ts:78](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L78)

***

### makerFee?

> `optional` **makerFee?**: `number`

Defined in: [core/types.ts:79](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L79)

***

### takerFee?

> `optional` **takerFee?**: `number`

Defined in: [core/types.ts:80](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L80)

***

### slippage?

> `optional` **slippage?**: `number`

Defined in: [core/types.ts:81](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L81)

***

### debug?

> `optional` **debug?**: `boolean`

Defined in: [core/types.ts:82](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L82)

***

### recvWindow?

> `optional` **recvWindow?**: `number`

Defined in: [core/types.ts:83](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L83)

***

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [core/types.ts:85](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L85)

Max retries for idempotent GET requests that fail with a retryable status. Default 2.

***

### retryBaseDelayMs?

> `optional` **retryBaseDelayMs?**: `number`

Defined in: [core/types.ts:87](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L87)

Base backoff delay for retries in ms. Default 1000.

***

### retryMaxDelayMs?

> `optional` **retryMaxDelayMs?**: `number`

Defined in: [core/types.ts:89](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L89)

Upper bound for the backoff delay in ms. Default 30_000.

***

### retryFactor?

> `optional` **retryFactor?**: `number`

Defined in: [core/types.ts:91](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L91)

Backoff multiplier per attempt. Default 2.

***

### rateLimitWindow?

> `optional` **rateLimitWindow?**: `number`

Defined in: [core/types.ts:92](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L92)

***

### maxRequestsPerWindow?

> `optional` **maxRequestsPerWindow?**: `number`

Defined in: [core/types.ts:93](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L93)

***

### binanceClient?

> `optional` **binanceClient?**: `any`

Defined in: [core/types.ts:94](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/types.ts#L94)
