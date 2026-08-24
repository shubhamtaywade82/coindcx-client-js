import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import { CoinDCXClient } from '../index';
import { createAllToolkits, MCPTool } from './toolkit';
import { defaultLogger } from '../logger';

const SDK_VERSION = '1.0.0';

export class CoinDCXMcpServer {
  private readonly server: Server;
  private readonly tools: MCPTool[];
  private readonly logger = defaultLogger.child('CoinDCXMcpServer');

  constructor(client: CoinDCXClient, tools: MCPTool[] = createAllToolkits(client)) {
    this.server = new Server(
      { name: 'coindcx-sdk', version: SDK_VERSION },
      { capabilities: { tools: {} } }
    );
    this.tools = tools;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async (): Promise<{ tools: Tool[] }> => {
      return {
        tools: this.tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: t.annotations,
        })),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const tool = this.tools.find((t) => t.name === request.params.name);
      if (!tool) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Tool '${request.params.name}' not found.` }],
        };
      }

      try {
        const result = await tool.handler(request.params.arguments ?? {});
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const suggestedAction = error?.suggestedAction ? `\n\nSuggested action: ${error.suggestedAction}` : '';
        this.logger.warn(`Tool '${tool.name}' failed`, { error: errorMessage });

        return {
          isError: true,
          content: [{ type: 'text', text: `Error executing tool '${tool.name}': ${errorMessage}${suggestedAction}` }],
        };
      }
    });
  }

  /** Connects this server to any MCP transport (stdio, in-memory for tests, etc.). */
  async connect(transport: Transport): Promise<void> {
    await this.server.connect(transport);
  }

  async start(): Promise<void> {
    await this.connect(new StdioServerTransport());
    // stdout is reserved for the JSON-RPC transport; status goes to stderr.
    console.error('CoinDCX MCP server running on stdio');
  }
}
