[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / FundingRateSchema

# Variable: FundingRateSchema

> `const` **FundingRateSchema**: `ZodObject`\<\{ `pair`: `ZodString`; `funding_rate`: `ZodUnion`\<\[`ZodNumber`, `ZodEffects`\<`ZodString`, `number`, `string`\>\]\>; `timestamp`: `ZodNumber`; `next_funding_time`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `pair`: `string`; `funding_rate`: `number`; `timestamp`: `number`; `next_funding_time?`: `number`; \}, \{ `pair`: `string`; `funding_rate`: `string` \| `number`; `timestamp`: `number`; `next_funding_time?`: `number`; \}\>

Defined in: [core/schemas.ts:134](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/schemas.ts#L134)
