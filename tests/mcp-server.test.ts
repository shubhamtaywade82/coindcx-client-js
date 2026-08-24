import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CoinDCXClient } from '../src/index';
import { CoinDCXMcpServer } from '../src/mcp/server';

async function connectedClient(sdkClient: CoinDCXClient): Promise<{ mcp: Client; server: CoinDCXMcpServer }> {
  const server = new CoinDCXMcpServer(sdkClient);
  const mcp = new Client({ name: 'test-client', version: '0.0.1' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([mcp.connect(clientTransport), server.connect(serverTransport)]);
  return { mcp, server };
}

function textOf(result: any): string {
  return result.content.map((c: any) => c.text).join('\n');
}

describe('CoinDCXMcpServer (in-memory transport)', () => {
  it('lists tools with MCP annotations so hosts can gate destructive calls', async () => {
    const sdkClient = new CoinDCXClient({ apiKey: 'k', apiSecret: 's', paperMode: true });
    const { mcp } = await connectedClient(sdkClient);

    const { tools } = await mcp.listTools();
    expect(tools.length).toBeGreaterThan(10);

    const createOrder = tools.find((t) => t.name === 'futures_create_order');
    expect(createOrder?.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true });

    const getPositions = tools.find((t) => t.name === 'futures_get_positions');
    expect(getPositions?.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });

    const resetPaper = tools.find((t) => t.name === 'paper_reset');
    expect(resetPaper?.annotations).toMatchObject({ destructiveHint: true });
  });

  it('returns a not-found error for an unknown tool', async () => {
    const sdkClient = new CoinDCXClient({ apiKey: 'k', apiSecret: 's', paperMode: true });
    const { mcp } = await connectedClient(sdkClient);

    const result = await mcp.callTool({ name: 'not_a_real_tool', arguments: {} });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("not found");
  });

  it('executes a paper-mode read-only tool successfully', async () => {
    const sdkClient = new CoinDCXClient({ apiKey: 'k', apiSecret: 's', paperMode: true, initialBalance: 5000 });
    const { mcp } = await connectedClient(sdkClient);

    const result = await mcp.callTool({ name: 'paper_get_account', arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toContain('5000');
  });

  it('dry_run validates and does not mutate paper account state', async () => {
    const sdkClient = new CoinDCXClient({ apiKey: 'k', apiSecret: 's', paperMode: true, initialBalance: 5000 });
    const { mcp } = await connectedClient(sdkClient);

    const before = await mcp.callTool({ name: 'paper_get_account', arguments: {} });

    const dryRunResult = await mcp.callTool({
      name: 'paper_place_order',
      arguments: {
        side: 'buy',
        order_type: 'market_order',
        base_currency: 'SOL',
        quote_currency: 'USDT',
        target_quantity: 1,
        dry_run: true,
      },
    });
    expect(dryRunResult.isError).toBeFalsy();
    expect(textOf(dryRunResult)).toContain('"dryRun": true');

    const after = await mcp.callTool({ name: 'paper_get_account', arguments: {} });
    expect(textOf(after)).toEqual(textOf(before));
  });

  it('rejects an oversized order via the configured safety limit and surfaces suggestedAction', async () => {
    const sdkClient = new CoinDCXClient({
      apiKey: 'k',
      apiSecret: 's',
      paperMode: true,
      safetyLimits: { maxOrderQuantity: 1 },
    });
    const { mcp } = await connectedClient(sdkClient);

    const result = await mcp.callTool({
      name: 'futures_create_order',
      arguments: {
        side: 'buy',
        order_type: 'market_order',
        base_currency: 'SOL',
        quote_currency: 'USDT',
        target_quantity: 100,
      },
    });

    expect(result.isError).toBe(true);
    const text = textOf(result);
    expect(text).toContain('exceeds the configured max order quantity');
    expect(text).toContain('Suggested action');
    expect(text).toContain('setSafetyLimits');
  });

  it('a dry_run also respects the configured safety limit without submitting', async () => {
    const sdkClient = new CoinDCXClient({
      apiKey: 'k',
      apiSecret: 's',
      paperMode: true,
      safetyLimits: { maxOrderQuantity: 1 },
    });
    const { mcp } = await connectedClient(sdkClient);

    const result = await mcp.callTool({
      name: 'futures_create_order',
      arguments: {
        side: 'buy',
        order_type: 'market_order',
        base_currency: 'SOL',
        quote_currency: 'USDT',
        target_quantity: 100,
        dry_run: true,
      },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('exceeds the configured max order quantity');
  });

  it('exposes the configured safety limits via account_get_safety_limits', async () => {
    const sdkClient = new CoinDCXClient({
      apiKey: 'k',
      apiSecret: 's',
      paperMode: true,
      safetyLimits: { maxOrderQuantity: 42 },
    });
    const { mcp } = await connectedClient(sdkClient);

    const result = await mcp.callTool({ name: 'account_get_safety_limits', arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toContain('42');
  });
});
