[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / TokenBucket

# Class: TokenBucket

Defined in: [core/rate-limiter.ts:6](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/rate-limiter.ts#L6)

## Constructors

### Constructor

> **new TokenBucket**(`config`): `TokenBucket`

Defined in: [core/rate-limiter.ts:12](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/rate-limiter.ts#L12)

#### Parameters

##### config

[`TokenBucketConfig`](../interfaces/TokenBucketConfig.md)

#### Returns

`TokenBucket`

## Methods

### consume()

> **consume**(`tokens?`): `Promise`\<`void`\>

Defined in: [core/rate-limiter.ts:19](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/rate-limiter.ts#L19)

#### Parameters

##### tokens?

`number` = `1`

#### Returns

`Promise`\<`void`\>

***

### getAvailableTokens()

> **getAvailableTokens**(): `number`

Defined in: [core/rate-limiter.ts:43](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/rate-limiter.ts#L43)

#### Returns

`number`

***

### reset()

> **reset**(): `void`

Defined in: [core/rate-limiter.ts:47](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/rate-limiter.ts#L47)

#### Returns

`void`
