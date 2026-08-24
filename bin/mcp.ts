#!/usr/bin/env node
import { CoinDCXClient } from '../src/index';
import { CoinDCXMcpServer } from '../src/mcp/server';

async function main(): Promise<void> {
  const apiKey = process.env.COINDCX_API_KEY;
  const apiSecret = process.env.COINDCX_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('Error: COINDCX_API_KEY and COINDCX_API_SECRET environment variables are required.');
    console.error('Usage: COINDCX_API_KEY=your_key COINDCX_API_SECRET=your_secret npx @nemesis-oss/coindcx-sdk mcp');
    process.exit(1);
  }

  const client = new CoinDCXClient({
    apiKey,
    apiSecret,
    paperMode: process.env.COINDCX_PAPER_MODE === 'true',
  });
  const server = new CoinDCXMcpServer(client);

  console.error('Starting CoinDCX MCP server...');
  await server.start();
}

main().catch((err) => {
  console.error('Fatal error starting MCP server:', err);
  process.exit(1);
});
