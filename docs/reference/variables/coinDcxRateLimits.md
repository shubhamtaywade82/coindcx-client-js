[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / coinDcxRateLimits

# Variable: coinDcxRateLimits

> `const` **coinDcxRateLimits**: `object`

Defined in: [core/rate-limiter.ts:87](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/rate-limiter.ts#L87)

## Type Declaration

### orders

> `readonly` **orders**: `object`

#### orders.capacity

> `readonly` **capacity**: `100` = `100`

#### orders.refillRate

> `readonly` **refillRate**: `1.67` = `1.67`

### positions

> `readonly` **positions**: `object`

#### positions.capacity

> `readonly` **capacity**: `50` = `50`

#### positions.refillRate

> `readonly` **refillRate**: `0.83` = `0.83`

### account

> `readonly` **account**: `object`

#### account.capacity

> `readonly` **capacity**: `200` = `200`

#### account.refillRate

> `readonly` **refillRate**: `3.33` = `3.33`

### marketData

> `readonly` **marketData**: `object`

#### marketData.capacity

> `readonly` **capacity**: `300` = `300`

#### marketData.refillRate

> `readonly` **refillRate**: `5` = `5`

### wallet

> `readonly` **wallet**: `object`

#### wallet.capacity

> `readonly` **capacity**: `100` = `100`

#### wallet.refillRate

> `readonly` **refillRate**: `1.67` = `1.67`

### default

> `readonly` **default**: `object`

#### default.capacity

> `readonly` **capacity**: `1500` = `1500`

#### default.refillRate

> `readonly` **refillRate**: `25` = `25`
