import { MCPTool } from './toolkit';

export interface ToolContext {
  env: 'live' | 'paper';
  isSigned: boolean;
}

export function toJsonSchema(inputSchema: Record<string, unknown>): Record<string, unknown> {
  return inputSchema;
}

export function toOpenAITool(tool: MCPTool): Record<string, unknown> {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: toJsonSchema(tool.inputSchema),
    },
  };
}

export function toAnthropicTool(tool: MCPTool): Record<string, unknown> {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: toJsonSchema(tool.inputSchema),
  };
}

export function toMCPTool(tool: MCPTool): {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: MCPTool['annotations'];
} {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: toJsonSchema(tool.inputSchema),
    ...(tool.annotations ? { annotations: tool.annotations } : {}),
  };
}

export function toToolList(
  tools: MCPTool[],
  format: 'openai' | 'anthropic' | 'mcp'
): Record<string, unknown>[] {
  if (format === 'openai') return tools.map(toOpenAITool);
  if (format === 'anthropic') return tools.map(toAnthropicTool);
  return tools.map(toMCPTool);
}

export function textResult(text: string): { content: { type: string; text: string }[] } {
  return { content: [{ type: 'text', text }] };
}

export function toolkitToFormats(toolkit: MCPTool[]): {
  openai: Record<string, unknown>[];
  anthropic: Record<string, unknown>[];
  mcp: Record<string, unknown>[];
} {
  return {
    openai: toToolList(toolkit, 'openai'),
    anthropic: toToolList(toolkit, 'anthropic'),
    mcp: toToolList(toolkit, 'mcp'),
  };
}