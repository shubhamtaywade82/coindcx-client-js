[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / CoinDCXWebSocketError

# Class: CoinDCXWebSocketError

Defined in: [core/errors.ts:93](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L93)

## Extends

- [`CoinDCXError`](CoinDCXError.md)

## Constructors

### Constructor

> **new CoinDCXWebSocketError**(`message`, `originalError?`, `isRetryable?`): `CoinDCXWebSocketError`

Defined in: [core/errors.ts:97](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L97)

#### Parameters

##### message

`string`

##### originalError?

`Error` \| `undefined`

##### isRetryable?

`boolean` = `true`

#### Returns

`CoinDCXWebSocketError`

#### Overrides

[`CoinDCXError`](CoinDCXError.md).[`constructor`](CoinDCXError.md#constructor)

## Properties

### originalError

> `readonly` **originalError**: `Error` \| `undefined`

Defined in: [core/errors.ts:94](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L94)

***

### isRetryable

> `readonly` **isRetryable**: `boolean`

Defined in: [core/errors.ts:95](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L95)
