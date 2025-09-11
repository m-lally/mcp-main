export enum MCPErrorCode {
  // Standard JSON-RPC errors
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  
  // MCP-specific errors
  INITIALIZATION_FAILED = -32000,
  TOOL_EXECUTION_ERROR = -32001,
  RESOURCE_NOT_FOUND = -32002,
  PERMISSION_DENIED = -32003,
  RATE_LIMIT_EXCEEDED = -32004,
  VALIDATION_ERROR = -32005,
  TIMEOUT_ERROR = -32006,
}

export class MCPError extends Error {
  constructor(
    public code: MCPErrorCode,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'MCPError';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }
}

export class ValidationError extends MCPError {
  constructor(message: string, data?: any) {
    super(MCPErrorCode.VALIDATION_ERROR, message, data);
  }
}

export class ToolExecutionError extends MCPError {
  constructor(message: string, data?: any) {
    super(MCPErrorCode.TOOL_EXECUTION_ERROR, message, data);
  }
}

export class ResourceNotFoundError extends MCPError {
  constructor(message: string, data?: any) {
    super(MCPErrorCode.RESOURCE_NOT_FOUND, message, data);
  }
}
