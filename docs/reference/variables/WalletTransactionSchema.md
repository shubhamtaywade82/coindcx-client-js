[**@nemesis-oss/coindcx-sdk API Reference**](../index.md)

***

[@nemesis-oss/coindcx-sdk API Reference](../index.md) / WalletTransactionSchema

# Variable: WalletTransactionSchema

> `const` **WalletTransactionSchema**: `ZodObject`\<\{ `id`: `ZodUnion`\<\[`ZodString`, `ZodNumber`\]\>; `currency`: `ZodString`; `amount`: `ZodUnion`\<\[`ZodNumber`, `ZodEffects`\<`ZodString`, `number`, `string`\>\]\>; `type`: `ZodString`; `status`: `ZodString`; `timestamp`: `ZodNumber`; `fee`: `ZodOptional`\<`ZodNumber`\>; `txid`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string` \| `number`; `currency`: `string`; `amount`: `number`; `type`: `string`; `status`: `string`; `timestamp`: `number`; `fee?`: `number`; `txid?`: `string`; \}, \{ `id`: `string` \| `number`; `currency`: `string`; `amount`: `string` \| `number`; `type`: `string`; `status`: `string`; `timestamp`: `number`; `fee?`: `number`; `txid?`: `string`; \}\>

Defined in: [core/schemas.ts:161](https://github.com/shubhamtaywade82/coindcx-sdk/blob/ed817fac7b96aa51708606280e2193d6f691e34f/src/core/schemas.ts#L161)
