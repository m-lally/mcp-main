import { MCPClient } from '../client/mcp-client.js';
import { LogLevel } from '../utils/logger.js';

describe('MCPClient', () => {
  let client: MCPClient;

  beforeEach(() => {
    client = new MCPClient({
      logLevel: LogLevel.ERROR,
      clientInfo: {
        name: 'Test Client',
        version: '1.0.0',
      },
    });
  });

  afterEach(async () => {
    await client.close();
  });

  describe('Initialization', () => {
    it('should track initialization state', () => {
      expect(client.isInitialized()).toBe(false);
    });

    it('should throw error when calling methods before initialization', async () => {
      await expect(client.listTools()).rejects.toThrow('Client not initialized');
    });
  });

  describe('Event Handling', () => {
    it('should emit events for notifications', (done) => {
      client.on('toolsChanged', () => {
        done();
      });

      // Simulate notification
      client['handleNotification']({
        jsonrpc: '2.0',
        method: 'notifications/tools/list_changed',
      });
    });
  });
});
