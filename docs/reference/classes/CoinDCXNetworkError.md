[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / CoinDCXNetworkError

# Class: CoinDCXNetworkError

Defined in: [core/errors.ts:30](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L30)

## Extends

- [`CoinDCXError`](CoinDCXError.md)

## Constructors

### Constructor

> **new CoinDCXNetworkError**(`message`, `originalError`): `CoinDCXNetworkError`

Defined in: [core/errors.ts:34](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L34)

#### Parameters

##### message

`string`

##### originalError

`Error`

#### Returns

`CoinDCXNetworkError`

#### Overrides

[`CoinDCXError`](CoinDCXError.md).[`constructor`](CoinDCXError.md#constructor)

## Properties

### originalError

> `readonly` **originalError**: `Error`

Defined in: [core/errors.ts:31](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L31)

***

### isRetryable

> `readonly` **isRetryable**: `true` = `true`

Defined in: [core/errors.ts:32](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L32)
