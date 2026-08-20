[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / WsBalanceUpdateSchema

# Variable: WsBalanceUpdateSchema

> `const` **WsBalanceUpdateSchema**: `ZodObject`\<\{ `currency`: `ZodString`; `balance`: `ZodUnion`\<\[`ZodNumber`, `ZodEffects`\<`ZodString`, `number`, `string`\>\]\>; `locked_balance`: `ZodOptional`\<`ZodUnion`\<\[`ZodNumber`, `ZodEffects`\<`ZodString`, `number`, `string`\>\]\>\>; `available_balance`: `ZodOptional`\<`ZodUnion`\<\[`ZodNumber`, `ZodEffects`\<`ZodString`, `number`, `string`\>\]\>\>; `wallet_type`: `ZodOptional`\<`ZodString`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `currency`: `string`; `balance`: `number`; `locked_balance?`: `number`; `available_balance?`: `number`; `wallet_type?`: `string`; `timestamp?`: `number`; \}, \{ `currency`: `string`; `balance`: `string` \| `number`; `locked_balance?`: `string` \| `number`; `available_balance?`: `string` \| `number`; `wallet_type?`: `string`; `timestamp?`: `number`; \}\>

Defined in: [core/schemas.ts:225](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/schemas.ts#L225)
