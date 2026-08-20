[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / CoinDCXAPIError

# Class: CoinDCXAPIError

Defined in: [core/errors.ts:9](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L9)

## Extends

- [`CoinDCXError`](CoinDCXError.md)

## Extended by

- [`CoinDCXRateLimitError`](CoinDCXRateLimitError.md)
- [`CoinDCXAuthenticationError`](CoinDCXAuthenticationError.md)
- [`CoinDCXValidationError`](CoinDCXValidationError.md)
- [`CoinDCXInsufficientMarginError`](CoinDCXInsufficientMarginError.md)
- [`CoinDCXInvalidPairError`](CoinDCXInvalidPairError.md)
- [`CoinDCXOrderError`](CoinDCXOrderError.md)

## Constructors

### Constructor

> **new CoinDCXAPIError**(`message`, `status`, `data`, `method`, `url`, `code?`): `CoinDCXAPIError`

Defined in: [core/errors.ts:17](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L17)

#### Parameters

##### message

`string`

##### status

`number`

##### data

`any`

##### method

`string`

##### url

`string`

##### code?

`string` \| `undefined`

#### Returns

`CoinDCXAPIError`

#### Overrides

[`CoinDCXError`](CoinDCXError.md).[`constructor`](CoinDCXError.md#constructor)

## Properties

### status

> `readonly` **status**: `number`

Defined in: [core/errors.ts:10](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L10)

***

### data

> `readonly` **data**: `any`

Defined in: [core/errors.ts:11](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L11)

***

### method

> `readonly` **method**: `string`

Defined in: [core/errors.ts:12](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L12)

***

### url

> `readonly` **url**: `string`

Defined in: [core/errors.ts:13](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L13)

***

### isRetryable

> `readonly` **isRetryable**: `boolean`

Defined in: [core/errors.ts:14](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L14)

***

### code

> `readonly` **code**: `string` \| `undefined`

Defined in: [core/errors.ts:15](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L15)
