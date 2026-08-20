[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / CreateOrderRequestSchema

# Variable: CreateOrderRequestSchema

> `const` **CreateOrderRequestSchema**: `ZodObject`\<\{ `side`: `ZodEnum`\<\[`"buy"`, `"sell"`\]\>; `order_type`: `ZodEnum`\<\[`"market_order"`, `"limit_order"`, `"stop_limit_order"`\]\>; `market`: `ZodString`; `price`: `ZodOptional`\<`ZodEffects`\<`ZodUnion`\<\[`ZodNumber`, `ZodString`\]\>, `number`, `string` \| `number`\>\>; `quantity`: `ZodEffects`\<`ZodUnion`\<\[`ZodNumber`, `ZodString`\]\>, `number`, `string` \| `number`\>; `client_order_id`: `ZodOptional`\<`ZodString`\>; `time_in_force`: `ZodOptional`\<`ZodEnum`\<\[`"gtc"`, `"ioc"`, `"fok"`, `"post_only"`\]\>\>; `trigger_price`: `ZodOptional`\<`ZodEffects`\<`ZodUnion`\<\[`ZodNumber`, `ZodString`\]\>, `number`, `string` \| `number`\>\>; `stop_loss`: `ZodOptional`\<`ZodEffects`\<`ZodUnion`\<\[`ZodNumber`, `ZodString`\]\>, `number`, `string` \| `number`\>\>; `take_profit`: `ZodOptional`\<`ZodEffects`\<`ZodUnion`\<\[`ZodNumber`, `ZodString`\]\>, `number`, `string` \| `number`\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `side`: `"buy"` \| `"sell"`; `order_type`: `"market_order"` \| `"limit_order"` \| `"stop_limit_order"`; `market`: `string`; `price?`: `number`; `quantity`: `number`; `client_order_id?`: `string`; `time_in_force?`: `"gtc"` \| `"ioc"` \| `"fok"` \| `"post_only"`; `trigger_price?`: `number`; `stop_loss?`: `number`; `take_profit?`: `number`; \}, \{ `side`: `"buy"` \| `"sell"`; `order_type`: `"market_order"` \| `"limit_order"` \| `"stop_limit_order"`; `market`: `string`; `price?`: `string` \| `number`; `quantity`: `string` \| `number`; `client_order_id?`: `string`; `time_in_force?`: `"gtc"` \| `"ioc"` \| `"fok"` \| `"post_only"`; `trigger_price?`: `string` \| `number`; `stop_loss?`: `string` \| `number`; `take_profit?`: `string` \| `number`; \}\>

Defined in: [core/schemas.ts:16](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/schemas.ts#L16)
