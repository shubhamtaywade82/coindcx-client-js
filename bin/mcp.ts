#!/usr/bin/env node
import { CoinDCXClient } from '../src/index';
import { CoinDCXMcpServer } from '../src/mcp/server';
import { TradingSafetyLimits } from '../src/core/safety';

function parsePositiveFloat(name: string, raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    console.error(`Error: ${name} must be a positive number, got "${raw}".`);
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  const apiKey = process.env.COINDCX_API_KEY;
  const apiSecret = process.env.COINDCX_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('Error: COINDCX_API_KEY and COINDCX_API_SECRET environment variables are required.');
    console.error('Usage: COINDCX_API_KEY=your_key COINDCX_API_SECRET=your_secret npx @nemesis-oss/coindcx-sdk mcp');
    process.exit(1);
  }

  const safetyLimits: TradingSafetyLimits = {
    maxOrderQuantity: parsePositiveFloat('COINDCX_MAX_ORDER_QUANTITY', process.env.COINDCX_MAX_ORDER_QUANTITY),
    maxOrderNotional: parsePositiveFloat('COINDCX_MAX_ORDER_NOTIONAL', process.env.COINDCX_MAX_ORDER_NOTIONAL),
  };
  const hasSafetyLimits = safetyLimits.maxOrderQuantity !== undefined || safetyLimits.maxOrderNotional !== undefined;
  if (!hasSafetyLimits) {
    console.error(
      'Warning: no order-size guardrails configured. An agent driving this server can size a live order arbitrarily large. ' +
        'Set COINDCX_MAX_ORDER_QUANTITY and/or COINDCX_MAX_ORDER_NOTIONAL to enable them.'
    );
  }

  const client = new CoinDCXClient({
    apiKey,
    apiSecret,
    paperMode: process.env.COINDCX_PAPER_MODE === 'true',
    safetyLimits: hasSafetyLimits ? safetyLimits : undefined,
  });
  const server = new CoinDCXMcpServer(client);

  console.error('Starting CoinDCX MCP server...');
  await server.start();
}

main().catch((err) => {
  console.error('Fatal error starting MCP server:', err);
  process.exit(1);
});
