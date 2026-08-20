[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / WsTradeDataSchema

# Variable: WsTradeDataSchema

> `const` **WsTradeDataSchema**: `ZodObject`\<\{ `timestamp`: `ZodNumber`; `price`: `ZodUnion`\<\[`ZodNumber`, `ZodEffects`\<`ZodString`, `number`, `string`\>\]\>; `quantity`: `ZodUnion`\<\[`ZodNumber`, `ZodEffects`\<`ZodString`, `number`, `string`\>\]\>; `isMaker`: `ZodOptional`\<`ZodBoolean`\>; `symbol`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `timestamp`: `number`; `price`: `number`; `quantity`: `number`; `isMaker?`: `boolean`; `symbol?`: `string`; \}, \{ `timestamp`: `number`; `price`: `string` \| `number`; `quantity`: `string` \| `number`; `isMaker?`: `boolean`; `symbol?`: `string`; \}\>

Defined in: [core/schemas.ts:193](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/schemas.ts#L193)
