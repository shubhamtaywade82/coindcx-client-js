[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / CoinDCXInvalidPairError

# Class: CoinDCXInvalidPairError

Defined in: [core/errors.ts:77](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L77)

## Extends

- [`CoinDCXAPIError`](CoinDCXAPIError.md)

## Constructors

### Constructor

> **new CoinDCXInvalidPairError**(`message`, `status`, `data`, `method`, `url`): `CoinDCXInvalidPairError`

Defined in: [core/errors.ts:78](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L78)

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

#### Returns

`CoinDCXInvalidPairError`

#### Overrides

[`CoinDCXAPIError`](CoinDCXAPIError.md).[`constructor`](CoinDCXAPIError.md#constructor)

## Properties

### status

> `readonly` **status**: `number`

Defined in: [core/errors.ts:10](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L10)

#### Inherited from

[`CoinDCXAPIError`](CoinDCXAPIError.md).[`status`](CoinDCXAPIError.md#status)

***

### data

> `readonly` **data**: `any`

Defined in: [core/errors.ts:11](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L11)

#### Inherited from

[`CoinDCXAPIError`](CoinDCXAPIError.md).[`data`](CoinDCXAPIError.md#data)

***

### method

> `readonly` **method**: `string`

Defined in: [core/errors.ts:12](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L12)

#### Inherited from

[`CoinDCXAPIError`](CoinDCXAPIError.md).[`method`](CoinDCXAPIError.md#method)

***

### url

> `readonly` **url**: `string`

Defined in: [core/errors.ts:13](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L13)

#### Inherited from

[`CoinDCXAPIError`](CoinDCXAPIError.md).[`url`](CoinDCXAPIError.md#url)

***

### isRetryable

> `readonly` **isRetryable**: `boolean`

Defined in: [core/errors.ts:14](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L14)

#### Inherited from

[`CoinDCXAPIError`](CoinDCXAPIError.md).[`isRetryable`](CoinDCXAPIError.md#isretryable)

***

### code

> `readonly` **code**: `string` \| `undefined`

Defined in: [core/errors.ts:15](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/errors.ts#L15)

#### Inherited from

[`CoinDCXAPIError`](CoinDCXAPIError.md).[`code`](CoinDCXAPIError.md#code)
