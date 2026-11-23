export type McpImportScope = "user" | "project";

export interface DiscoveredMcpServer {
  id: string;
  name: string;
  source: string;
  file: string;
  scope: McpImportScope;
  transport: "stdio" | "http" | "sse";
  configured: boolean;
  blocked?: string;
  needsSetup?: boolean;
}

export interface McpDiscovery {
  servers: DiscoveredMcpServer[];
  unreadable: string[];
  projectAvailable: boolean;
}
