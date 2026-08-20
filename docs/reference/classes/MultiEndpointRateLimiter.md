[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / MultiEndpointRateLimiter

# Class: MultiEndpointRateLimiter

Defined in: [core/rate-limiter.ts:53](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/rate-limiter.ts#L53)

## Constructors

### Constructor

> **new MultiEndpointRateLimiter**(`defaultConfig?`): `MultiEndpointRateLimiter`

Defined in: [core/rate-limiter.ts:57](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/rate-limiter.ts#L57)

#### Parameters

##### defaultConfig?

[`TokenBucketConfig`](../interfaces/TokenBucketConfig.md) = `...`

#### Returns

`MultiEndpointRateLimiter`

## Methods

### getLimiter()

> **getLimiter**(`endpoint`, `config?`): [`TokenBucket`](TokenBucket.md)

Defined in: [core/rate-limiter.ts:61](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/rate-limiter.ts#L61)

#### Parameters

##### endpoint

`string`

##### config?

[`TokenBucketConfig`](../interfaces/TokenBucketConfig.md)

#### Returns

[`TokenBucket`](TokenBucket.md)

***

### consume()

> **consume**(`endpoint`, `tokens?`, `config?`): `Promise`\<`void`\>

Defined in: [core/rate-limiter.ts:68](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/rate-limiter.ts#L68)

#### Parameters

##### endpoint

`string`

##### tokens?

`number` = `1`

##### config?

[`TokenBucketConfig`](../interfaces/TokenBucketConfig.md)

#### Returns

`Promise`\<`void`\>

***

### getAvailableTokens()

> **getAvailableTokens**(`endpoint`): `number`

Defined in: [core/rate-limiter.ts:73](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/rate-limiter.ts#L73)

#### Parameters

##### endpoint

`string`

#### Returns

`number`

***

### reset()

> **reset**(`endpoint?`): `void`

Defined in: [core/rate-limiter.ts:78](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/rate-limiter.ts#L78)

#### Parameters

##### endpoint?

`string`

#### Returns

`void`
