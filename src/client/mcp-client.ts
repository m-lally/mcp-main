import { EventEmitter } from 'events';
import { StdioTransport } from '../transport/stdio-transport.js';
import { Logger, LogLevel } from '../utils/logger.js';
import { SchemaValidator } from '../validation/schema-validator.js';
import { MCPError, MCPErrorCode, ToolExecutionError } from '../errors/mcp-errors.js';
import {
  MCPMessage,
  MCPTool,
  MCPResource,
  MCPPrompt,
  InitializeParams,
  InitializeResult,
  ServerCapabilities,
} from '../types/mcp.js';

export interface ToolHandler {
  (params: any): Promise<any>;
}

export interface ResourceHandler {
  (uri: string): Promise<{ contents: any; mimeType?: string }>;
}

export interface PromptHandler {
  (params: any): Promise<{ messages: Array<{ role: string; content: any }> }>;
}

export class MCPServer extends EventEmitter {
  private transport: StdioTransport;
  private logger: Logger;
  private validator: SchemaValidator;
  private initialized = false;
  private tools = new Map<string, { definition: MCPTool; handler: ToolHandler }>();
  private resources = new Map<string, { definition: MCPResource; handler: ResourceHandler }>();
  private prompts = new Map<string, { definition: MCPPrompt; handler: PromptHandler }>();
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }>();
  private serverInfo = {
    name: 'MCP Server',
    version: '1.0.0',
  };

  constructor(options: { logLevel?: LogLevel; serverInfo?: { name: string; version: string } } = {}) {
    super();
    
    this.logger = new Logger(options.logLevel || LogLevel.INFO);
    this.validator = new SchemaValidator();
    this.transport = new StdioTransport(this.logger);
    
    if (options.serverInfo) {
      this.serverInfo = options.serverInfo;
    }
    
    this.setupTransport();
    this.setupErrorHandling();
  }

  private setupTransport() {
    this.transport.on('message', this.handleMessage.bind(this));
    this.transport.on('error', this.handleTransportError.bind(this));
    this.transport.on('close', this.handleTransportClose.bind(this));
  }

  private setupErrorHandling() {
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', {}, error);
      this.shutdown(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection', { promise }, reason as Error);
    });

    process.on('SIGINT', () => {
      this.logger.info('Received SIGINT, shutting down gracefully');
      this.shutdown(0);
    });

    process.on('SIGTERM', () => {
      this.logger.info('Received SIGTERM, shutting down gracefully');
      this.shutdown(0);
    });
  }

  private async handleMessage(message: MCPMessage) {
    try {
      if (message.id !== undefined && message.result !== undefined) {
        this.handleResponse(message);
        return;
      }

      if (message.id !== undefined && message.error !== undefined) {
        this.handleErrorResponse(message);
        return;
      }

      if (message.method) {
        await this.handleRequest(message);
      }
    } catch (error) {
      this.logger.error('Error handling message', { message }, error as Error);
      
      if (message.id !== undefined) {
        await this.sendError(message.id, new MCPError(
          MCPErrorCode.INTERNAL_ERROR,
          'Internal server error',
          { originalError: (error as Error).message }
        ));
      }
    }
  }

  private handleResponse(message: MCPMessage) {
    const pending = this.pendingRequests.get(message.id!);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.id!);
      pending.resolve(message.result);
    }
  }

  private handleErrorResponse(message: MCPMessage) {
    const pending = this.pendingRequests.get(message.id!);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.id!);
      pending.reject(new MCPError(
        message.error!.code,
        message.error!.message,
        message.error!.data
      ));
    }
  }

  private async handleRequest(message: MCPMessage) {
    const { method, params, id } = message;

    try {
      let result: any;

      switch (method) {
        case 'initialize':
          result = await this.handleInitialize(params);
          break;
        case 'initialized':
          await this.handleInitialized();
          return; // No response needed for notification
        case 'tools/list':
          result = await this.handleToolsList();
          break;
        case 'tools/call':
          result = await this.handleToolsCall(params);
          break;
        case 'resources/list':
          result = await this.handleResourcesList();
          break;
        case 'resources/read':
          result = await this.handleResourcesRead(params);
          break;
        case 'prompts/list':
          result = await this.handlePromptsList();
          break;
        case 'prompts/get':
          result = await this.handlePromptsGet(params);
          break;
        case 'logging/setLevel':
          await this.handleLoggingSetLevel(params);
          return; // No response needed for notification
        default:
          throw new MCPError(
            MCPErrorCode.METHOD_NOT_FOUND,
            `Method not found: ${method}`
          );
      }

      if (id !== undefined) {
        await this.sendResult(id, result);
      }
    } catch (error) {
      if (id !== undefined) {
        const mcpError = error instanceof MCPError 
          ? error 
          : new MCPError(MCPErrorCode.INTERNAL_ERROR, (error as Error).message);
        await this.sendError(id, mcpError);
      }
    }
  }

  private async handleInitialize(params: InitializeParams): Promise<InitializeResult> {
    this.logger.info('Initializing server', { params });

    const capabilities: ServerCapabilities = {
      logging: {},
      tools: { listChanged: true },
      resources: { subscribe: true, listChanged: true },
      prompts: { listChanged: true },
    };

    return {
      protocolVersion: '2024-11-05',
      capabilities,
      serverInfo: this.serverInfo,
    };
  }

  private async handleInitialized() {
    this.initialized = true;
    this.logger.info('Server initialized successfully');
    this.emit('initialized');
  }

  private async handleToolsList() {
    return {
      tools: Array.from(this.tools.values()).map(tool => tool.definition),
    };
  }

  private async handleToolsCall(params: { name: string; arguments?: any }) {
    const { name, arguments: args } = params;
    
    const tool = this.tools.get(name);
    if (!tool) {
      throw new MCPError(
        MCPErrorCode.METHOD_NOT_FOUND,
        `Tool not found: ${name}`
      );
    }

    try {
      // Validate input against schema
      if (tool.definition.inputSchema && args) {
        this.validator.validateToolInput(tool.definition.inputSchema, args);
      }

      const result = await tool.handler(args || {});
      
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Tool execution failed', { name, args }, error as Error);
      throw new ToolExecutionError(
        `Tool execution failed: ${(error as Error).message}`,
        { tool: name, arguments: args }
      );
    }
  }

  private async handleResourcesList() {
    return {
      resources: Array.from(this.resources.values()).map(resource => resource.definition),
    };
  }

  private async handleResourcesRead(params: { uri: string }) {
    const { uri } = params;
    
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new MCPError(
        MCPErrorCode.RESOURCE_NOT_FOUND,
        `Resource not found: ${uri}`
      );
    }

    try {
      const result = await resource.handler(uri);
      return {
        contents: [
          {
            uri,
            mimeType: result.mimeType || 'text/plain',
            text: typeof result.contents === 'string' 
              ? result.contents 
              : JSON.stringify(result.contents, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Resource read failed', { uri }, error as Error);
      throw new MCPError(
        MCPErrorCode.INTERNAL_ERROR,
        `Failed to read resource: ${(error as Error).message}`,
        { uri }
      );
    }
  }

  private async handlePromptsList() {
    return {
      prompts: Array.from(this.prompts.values()).map(prompt => prompt.definition),
    };
  }

  private async handlePromptsGet(params: { name: string; arguments?: any }) {
    const { name, arguments: args } = params;
    
    const prompt = this.prompts.get(name);
    if (!prompt) {
      throw new MCPError(
        MCPErrorCode.METHOD_NOT_FOUND,
        `Prompt not found: ${name}`
      );
    }

    try {
      const result = await prompt.handler(args || {});
      return result;
    } catch (error) {
      this.logger.error('Prompt execution failed', { name, args }, error as Error);
      throw new MCPError(
        MCPErrorCode.INTERNAL_ERROR,
        `Prompt execution failed: ${(error as Error).message}`,
        { prompt: name, arguments: args }
      );
    }
  }

  private async handleLoggingSetLevel(params: { level: string }) {
    const { level } = params;
    const logLevel = LogLevel[level.toUpperCase() as keyof typeof LogLevel];
    
    if (logLevel !== undefined) {
      this.logger.setLogLevel(logLevel);
      this.logger.info(`Log level set to ${level}`);
    } else {
      this.logger.warn(`Invalid log level: ${level}`);
    }
  }

  private handleTransportError(error: Error) {
    this.logger.error('Transport error', {}, error);
    this.emit('error', error);
  }

  private handleTransportClose() {
    this.logger.info('Transport closed');
    this.emit('close');
  }

  private async sendResult(id: string | number, result: any) {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id,
      result,
    };
    
    await this.transport.send(message);
  }

  private async sendError(id: string | number, error: MCPError) {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id,
      error: error.toJSON(),
    };
    
    await this.transport.send(message);
  }

  private async sendRequest(method: string, params?: any, timeout = 30000): Promise<any> {
    const id = ++this.requestId;
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new MCPError(MCPErrorCode.TIMEOUT_ERROR, 'Request timeout'));
      }, timeout);

      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });

      this.transport.send(message).catch(reject);
    });
  }

  // Public API methods
  addTool(definition: MCPTool, handler: ToolHandler) {
    this.tools.set(definition.name, { definition, handler });
    this.logger.info(`Tool registered: ${definition.name}`);
  }

  addResource(definition: MCPResource, handler: ResourceHandler) {
    this.resources.set(definition.uri, { definition, handler });
    this.logger.info(`Resource registered: ${definition.uri}`);
  }

  addPrompt(definition: MCPPrompt, handler: PromptHandler) {
    this.prompts.set(definition.name, { definition, handler });
    this.logger.info(`Prompt registered: ${definition.name}`);
  }

  removeTool(name: string) {
    this.tools.delete(name);
    this.logger.info(`Tool removed: ${name}`);
  }

  removeResource(uri: string) {
    this.resources.delete(uri);
    this.logger.info(`Resource removed: ${uri}`);
  }

  removePrompt(name: string) {
    this.prompts.delete(name);
    this.logger.info(`Prompt removed: ${name}`);
  }

  async start() {
    this.logger.info('Starting MCP server');
    this.emit('start');
  }

  async shutdown(exitCode = 0) {
    this.logger.info('Shutting down server');
    
    // Clear pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Server shutting down'));
    }
    this.pendingRequests.clear();

    // Close transport
    this.transport.close();
    
    this.emit('shutdown');
    
    // Give some time for cleanup
    setTimeout(() => {
      process.exit(exitCode);
    }, 1000);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getLogger(): Logger {
    return this.logger;
  }
}
