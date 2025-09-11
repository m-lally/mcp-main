// // Import everything
// import * as MCP from 'mcp-framework';

// // Import specific components
// import { MCPServer, MCPClient, LogLevel } from 'mcp-framework';

// // Import types only
// import type { MCPTool, MCPResource } from 'mcp-framework';

// // Import middleware
// import { RateLimiter, RateLimitPresets } from 'mcp-framework';

// Core types
export * from './types/mcp';
// Error handling
export * from './errors/mcp-errors';

// Utilities
export * from './utils/logger';

// Validation
export * from './validation/schema-validator';

// Transport layer
export * from './transport/stdio';

// Server and Client
export * from './server/mcp-server';
export { MCPClient } from './client/mcp-client'

// Middleware
export * from './middleware/rate-limiter';
export * from './middleware/auth';

// Examples (optional - you might want to exclude these from main exports)
export {
  FileServer,
  FileServerOptions,
  FileReadParams,
  FileWriteParams
} from './examples/file-server';
export * from './examples/calculator-server';

// Version info
export const VERSION = '1.0.0';

// Convenience re-exports for common use cases
export {
  MCPServer,
  type MCPServerOptions,
} from './server/mcp-server';

export {
  MCPClient,
} from './client/mcp-client';

export {
  LogLevel,
  Logger,
} from './utils/logger';

export {
  MCPError,
  MCPErrorCode,
} from './errors/mcp-errors';

export {
  RateLimiter,
  RateLimitPresets,
  KeyGenerators,
  type RateLimitConfig,
} from './middleware/rate-limiter';

export {
  AuthMiddleware,
  type AuthConfig,
} from './middleware/auth';

// Type-only exports for better tree-shaking
export type {
  MCPMessage,
  MCPTool,
  MCPResource,
  MCPPrompt,
  InitializeParams,
  InitializeResult,
  ServerCapabilities,
  ClientCapabilities,
  ToolCallParams,
  ToolCallResult,
  ResourceReadParams,
  ResourceReadResult,
  PromptGetParams,
  PromptGetResult,
} from './types/mcp';
