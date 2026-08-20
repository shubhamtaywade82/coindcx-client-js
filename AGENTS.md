# AGENTS.md

## Project

Production-grade TypeScript SDK for the CoinDCX API (Spot, Margin, USD-margined
Futures): REST + Socket.IO WebSocket, zod-validated responses, per-endpoint rate
limiting, a local paper-trading engine, risk ops and MCP/LLM toolkits.

## Core Rules

- Never retry order placement (POST/DELETE) automatically — a timed-out write can
  already have reached the exchange and would be double-submitted. Retries are
  GET-only by design (`src/core/rest-client.ts`, `runWithRetry`).
- `paperMode` must never silently send a real order; the paper adapter intercepts
  order/position endpoints before the network layer (`src/core/rest-client.ts`).
- Keep the error hierarchy typed; throw `CoinDCX*Error` subclasses, never bare
  objects. Guards (`isRetryableError`, `isRateLimitError`, …) live in
  `src/core/errors.ts`.
- WebSocket is Socket.IO, not native WS — event names are emitted through
  `PublicStreams`/`PrivateStreams` wrappers; do not bypass them.
- Tests must not hit the live API: `tests/setup.ts` is nock-only. Importing
  `@pollyjs/adapter-node-http` anywhere in the jest setup patches `http.request`
  and silently disables nock — Polly lives only inside
  `tests/public-market-data.test.ts`.

## Architecture

- `src/core` = transport: `rest-client.ts` (axios + HMAC signing + retry + paper
  adapter), `rate-limiter.ts` (token buckets), `errors.ts`, `schemas.ts` (zod),
  `ws-client.ts` (Socket.IO)
- `src/rest` = public API wrappers: `spot`, `margin`, `futures`, `market-data`
- `src/websocket` = event streams: `public-streams`, `private-streams`
- `src/ops` = composable risk/account ops: `sizing`, `bracket`, `snapshot`
- `src/paper` = in-memory `PaperTradingEngine` (fees, slippage, margin)
- `src/mcp` = toolkits (`toolkit.ts`) + format converters (`formats.ts`)
- `src/models` = request/response types and zod schemas

Dependency flow is one-directional: `rest/websocket → ops → client → mcp`. The
client barrel (`src/index.ts`) wires everything and owns `handlePaperRequest`.

## Commands

- `build`: `npm run build` (tsup — ESM + CJS + d.ts)
- `test`: `npm test` (jest, `--runInBand` if resource-constrained)
- `typecheck`: `npm run typecheck`
- `lint`: `npm run lint`
- `verify`: `npm run verify` (typecheck + lint + test + build + check:types)
- `smoke`: `npm run smoke` (needs `COINDCX_API_KEY` / `COINDCX_API_SECRET`)
- `check:types`: `npm run check:types` (validates the published package exports)

## Boundaries

- Prefer editing `src/core/*`, `src/rest/*`, `src/ops/*`, `src/paper/*`, `src/mcp/*` and tests
- Do not relax the GET-only retry rule or the paper-mode gate without explicit approval
- Do not add dependencies to `src/mcp` that pull the whole REST/WS stack into the
  `./mcp` entry — it is a separate bundle
- When recording VCR cassettes, delete `tests/fixtures/cassettes/*` and run the
  public-market-data suite once; afterwards it replays from disk

## References

- See `README.md` for usage and API surface
- See `docs/API_DOCUMENTATION.md` for Binance↔CoinDCX market-data mapping