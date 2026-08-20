[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / WsPositionUpdateSchema

# Variable: WsPositionUpdateSchema

> `const` **WsPositionUpdateSchema**: `ZodObject`\<\{ `id`: `ZodUnion`\<\[`ZodString`, `ZodNumber`\]\>; `pair`: `ZodString`; `side`: `ZodEnum`\<\[`"long"`, `"short"`\]\>; `size`: `ZodUnion`\<\[`ZodNumber`, `ZodEffects`\<`ZodString`, `number`, `string`\>\]\>; `entry_price`: `ZodUnion`\<\[`ZodNumber`, `ZodEffects`\<`ZodString`, `number`, `string`\>\]\>; `mark_price`: `ZodOptional`\<`ZodUnion`\<\[`ZodNumber`, `ZodEffects`\<`ZodString`, `number`, `string`\>\]\>\>; `unrealized_pnl`: `ZodOptional`\<`ZodUnion`\<\[`ZodNumber`, `ZodEffects`\<`ZodString`, `number`, `string`\>\]\>\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string` \| `number`; `pair`: `string`; `side`: `"long"` \| `"short"`; `size`: `number`; `entry_price`: `number`; `mark_price?`: `number`; `unrealized_pnl?`: `number`; `timestamp?`: `number`; \}, \{ `id`: `string` \| `number`; `pair`: `string`; `side`: `"long"` \| `"short"`; `size`: `string` \| `number`; `entry_price`: `string` \| `number`; `mark_price?`: `string` \| `number`; `unrealized_pnl?`: `string` \| `number`; `timestamp?`: `number`; \}\>

Defined in: [core/schemas.ts:214](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/schemas.ts#L214)
