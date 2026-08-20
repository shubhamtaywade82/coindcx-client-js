[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / WsDepthDataSchema

# Variable: WsDepthDataSchema

> `const` **WsDepthDataSchema**: `ZodObject`\<\{ `timestamp`: `ZodOptional`\<`ZodNumber`\>; `bids`: `ZodRecord`\<`ZodString`, `ZodUnion`\<\[`ZodNumber`, `ZodString`\]\>\>; `asks`: `ZodRecord`\<`ZodString`, `ZodUnion`\<\[`ZodNumber`, `ZodString`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `timestamp?`: `number`; `bids`: `Record`\<`string`, `string` \| `number`\>; `asks`: `Record`\<`string`, `string` \| `number`\>; \}, \{ `timestamp?`: `number`; `bids`: `Record`\<`string`, `string` \| `number`\>; `asks`: `Record`\<`string`, `string` \| `number`\>; \}\>

Defined in: [core/schemas.ts:187](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/schemas.ts#L187)
