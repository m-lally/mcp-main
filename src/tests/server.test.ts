import { MCPServer } from '../server/mcp-server.js';
import { LogLevel } from '../utils/logger.js';
import { MCPTool } from '../types/mcp.js';

describe('MCPServer', () => {
  let server: MCPServer;

  beforeEach(() => {
    server = new MCPServer({
      logLevel: LogLevel.ERROR, // Reduce noise in tests
      serverInfo: {
        name: 'Test Server',
        version: '1.0.0',
      },
    });
  });

  afterEach(async () => {
    await server.shutdown();
  });

  describe('Tool Management', () => {
    it('should add and retrieve tools', async () => {
      const testTool: MCPTool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
          required: ['input'],
        },
      };

      const handler = jest.fn().mockResolvedValue('test result');
      server.addTool(testTool, handler);

      // Simulate tools/list request
      const toolsList = await server['handleToolsList']();
      expect(toolsList.tools).toHaveLength(1);
      expect(toolsList.tools[0]).toEqual(testTool);
    });

    it('should execute tool handlers', async () => {
      const testTool: MCPTool = {
        name: 'echo_tool',
        description: 'Echo input',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
          required: ['message'],
        },
      };

      const handler = jest.fn().mockImplementation((params) => {
        return `Echo: ${params.message}`;
      });

      server.addTool(testTool, handler);

      const result = await server['handleToolsCall']({
        name: 'echo_tool',
        arguments: { message: 'Hello World' },
      });

      expect(handler).toHaveBeenCalledWith({ message: 'Hello World' });
      expect(result.content[0].text).toBe('Echo: Hello World');
    });

    it('should handle tool execution errors', async () => {
      const testTool: MCPTool = {
        name: 'error_tool',
        description: 'A tool that throws errors',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      };

      const handler = jest.fn().mockRejectedValue(new Error('Tool error'));
      server.addTool(testTool, handler);

      await expect(
        server['handleToolsCall']({
          name: 'error_tool',
          arguments: {},
        })
      ).rejects.toThrow('Tool execution failed');
    });

    it('should remove tools', () => {
      const testTool: MCPTool = {
        name: 'removable_tool',
        description: 'A removable tool',
        inputSchema: { type: 'object', properties: {} },
      };

      server.addTool(testTool, async () => 'result');
      server.removeTool('removable_tool');

      expect(server['tools'].has('removable_tool')).toBe(false);
    });
  });

  describe('Initialization', () => {
    it('should handle initialization', async () => {
      const initParams = {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'Test Client',
          version: '1.0.0',
        },
      };

      const result = await server['handleInitialize'](initParams);

      expect(result.protocolVersion).toBe('2024-11-05');
      expect(result.serverInfo.name).toBe('Test Server');
      expect(result.capabilities).toBeDefined();
    });

    it('should track initialization state', async () => {
      expect(server.isInitialized()).toBe(false);
      
      await server['handleInitialized']();
      
      expect(server.isInitialized()).toBe(true);
    });
  });
});
