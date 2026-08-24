# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-08-24

### Added

- **Native MCP server** (`src/mcp/server.ts`, `bin/mcp.ts`) - a standalone
  stdio MCP server wrapping the existing tool toolkits (`createAllToolkits`),
  for use directly from Claude Desktop, Cursor, or any other MCP host.
  Published via two bin entries: `coindcx-mcp` and `mcp` (so
  `npx @nemesis-oss/coindcx-sdk mcp` works), plus `npm run mcp` for local
  development.
- `suggestedAction` on every `CoinDCXError` subclass - a short, actionable
  hint (e.g. "check balance via client.spot.getBalances()") aimed at
  agent/LLM callers so they can recover from a failure autonomously.
  Existing error classes and guards (`isRetryableError`,
  `isAuthenticationError`, `isInsufficientMarginError`, etc.) are unchanged.
- `@modelcontextprotocol/sdk` dependency (required by the new MCP server).

### Changed

- POST/DELETE requests that carry a `client_order_id` (auto-generated for
  every order-create call) are now retried on 429/5xx like GETs, instead of
  always failing fast. This is safe because CoinDCX rejects a reused
  `client_order_id` rather than executing it twice, so a retry either
  succeeds (the original request never reached the exchange) or surfaces a
  duplicate-id error - it never double-submits an order. Writes without a
  `client_order_id` still fail fast, unchanged from prior behavior.

## [1.0.0] - Initial release

Production-grade TypeScript SDK for CoinDCX Spot, Margin, and Futures
trading with Socket.IO WebSocket support, a local paper-trading engine,
risk ops (position sizing, bracket orders, account snapshots), and
Zod-free JSON-Schema toolkits for LLM/agent tool use.
