[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / WsOrderUpdateSchema

# Variable: WsOrderUpdateSchema

> `const` **WsOrderUpdateSchema**: `ZodObject`\<\{ `id`: `ZodUnion`\<\[`ZodString`, `ZodNumber`\]\>; `client_order_id`: `ZodOptional`\<`ZodString`\>; `pair`: `ZodOptional`\<`ZodString`\>; `side`: `ZodEnum`\<\[`"buy"`, `"sell"`\]\>; `order_type`: `ZodEnum`\<\[`"market_order"`, `"limit_order"`, `"stop_limit_order"`\]\>; `price`: `ZodOptional`\<`ZodUnion`\<\[`ZodNumber`, `ZodEffects`\<`ZodString`, `number`, `string`\>\]\>\>; `quantity`: `ZodUnion`\<\[`ZodNumber`, `ZodEffects`\<`ZodString`, `number`, `string`\>\]\>; `filled_quantity`: `ZodOptional`\<`ZodUnion`\<\[`ZodNumber`, `ZodEffects`\<`ZodString`, `number`, `string`\>\]\>\>; `status`: `ZodString`; `timestamp`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string` \| `number`; `client_order_id?`: `string`; `pair?`: `string`; `side`: `"buy"` \| `"sell"`; `order_type`: `"market_order"` \| `"limit_order"` \| `"stop_limit_order"`; `price?`: `number`; `quantity`: `number`; `filled_quantity?`: `number`; `status`: `string`; `timestamp?`: `number`; \}, \{ `id`: `string` \| `number`; `client_order_id?`: `string`; `pair?`: `string`; `side`: `"buy"` \| `"sell"`; `order_type`: `"market_order"` \| `"limit_order"` \| `"stop_limit_order"`; `price?`: `string` \| `number`; `quantity`: `string` \| `number`; `filled_quantity?`: `string` \| `number`; `status`: `string`; `timestamp?`: `number`; \}\>

Defined in: [core/schemas.ts:201](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/schemas.ts#L201)
