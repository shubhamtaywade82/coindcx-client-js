[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / OrderBookSchema

# Variable: OrderBookSchema

> `const` **OrderBookSchema**: `ZodObject`\<\{ `timestamp`: `ZodOptional`\<`ZodNumber`\>; `bids`: `ZodArray`\<`ZodObject`\<\{ `price`: `ZodNumber`; `quantity`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `price`: `number`; `quantity`: `number`; \}, \{ `price`: `number`; `quantity`: `number`; \}\>, `"many"`\>; `asks`: `ZodArray`\<`ZodObject`\<\{ `price`: `ZodNumber`; `quantity`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `price`: `number`; `quantity`: `number`; \}, \{ `price`: `number`; `quantity`: `number`; \}\>, `"many"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `timestamp?`: `number`; `bids`: `object`[]; `asks`: `object`[]; \}, \{ `timestamp?`: `number`; `bids`: `object`[]; `asks`: `object`[]; \}\>

Defined in: [core/schemas.ts:61](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/schemas.ts#L61)
