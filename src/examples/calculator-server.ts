import { MCPServer } from '../server/mcp-server.js';
import { LogLevel } from '../utils/logger.js';
import { MCPTool, MCPPrompt } from '../types/mcp.js';

export class CalculatorServer {
  private server: MCPServer;
  private history: Array<{ operation: string; result: number; timestamp: Date }> = [];

  constructor() {
    this.server = new MCPServer({
      logLevel: LogLevel.INFO,
      serverInfo: {
        name: 'Calculator Server',
        version: '1.0.0',
      },
    });

    this.setupTools();
    this.setupPrompts();
  }

  private setupTools() {
    // Basic arithmetic operations
    const addTool: MCPTool = {
      name: 'add',
      description: 'Add two numbers',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number' },
        },
        required: ['a', 'b'],
      },
    };

    this.server.addTool(addTool, async (params) => {
      const { a, b } = params;
      const result = a + b;
      this.addToHistory(`${a} + ${b}`, result);
      return { result, operation: 'addition' };
    });

    const subtractTool: MCPTool = {
      name: 'subtract',
      description: 'Subtract two numbers',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number' },
        },
        required: ['a', 'b'],
      },
    };

    this.server.addTool(subtractTool, async (params) => {
      const { a, b } = params;
      const result = a - b;
      this.addToHistory(`${a} - ${b}`, result);
      return { result, operation: 'subtraction' };
    });

    const multiplyTool: MCPTool = {
      name: 'multiply',
      description: 'Multiply two numbers',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number' },
        },
        required: ['a', 'b'],
      },
    };

    this.server.addTool(multiplyTool, async (params) => {
      const { a, b } = params;
      const result = a * b;
      this.addToHistory(`${a} × ${b}`, result);
      return { result, operation: 'multiplication' };
    });

    const divideTool: MCPTool = {
      name: 'divide',
      description: 'Divide two numbers',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'Dividend' },
          b: { type: 'number', description: 'Divisor' },
        },
        required: ['a', 'b'],
      },
    };

    this.server.addTool(divideTool, async (params) => {
      const { a, b } = params;
      if (b === 0) {
        throw new Error('Division by zero is not allowed');
      }
      const result = a / b;
      this.addToHistory(`${a} ÷ ${b}`, result);
      return { result, operation: 'division' };
    });

    const powerTool: MCPTool = {
      name: 'power',
      description: 'Raise a number to a power',
      inputSchema: {
        type: 'object',
        properties: {
          base: { type: 'number', description: 'Base number' },
          exponent: { type: 'number', description: 'Exponent' },
        },
        required: ['base', 'exponent'],
      },
    };

    this.server.addTool(powerTool, async (params) => {
      const { base, exponent } = params;
      const result = Math.pow(base, exponent);
      this.addToHistory(`${base}^${exponent}`, result);
      return { result, operation: 'exponentiation' };
    });

    const sqrtTool: MCPTool = {
      name: 'sqrt',
      description: 'Calculate square root of a number',
      inputSchema: {
        type: 'object',
        properties: {
          number: { type: 'number', description: 'Number to find square root of', minimum: 0 },
        },
        required: ['number'],
      },
    };

    this.server.addTool(sqrtTool, async (params) => {
      const { number } = params;
      if (number < 0) {
        throw new Error('Cannot calculate square root of negative number');
      }
      const result = Math.sqrt(number);
      this.addToHistory(`√${number}`, result);
      return { result, operation: 'square_root' };
    });

    const historyTool: MCPTool = {
      name: 'get_history',
      description: 'Get calculation history',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum number of entries to return', default: 10 },
        },
      },
    };

    this.server.addTool(historyTool, async (params) => {
      const { limit = 10 } = params;
      const recentHistory = this.history.slice(-limit).reverse();
      return {
        history: recentHistory,
        total: this.history.length,
      };
    });

    const clearHistoryTool: MCPTool = {
      name: 'clear_history',
      description: 'Clear calculation history',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };

    this.server.addTool(clearHistoryTool, async () => {
      const clearedCount = this.history.length;
      this.history = [];
      return {
        message: 'History cleared',
        clearedEntries: clearedCount,
      };
    });
  }

  private setupPrompts() {
    const mathHelpPrompt: MCPPrompt = {
      name: 'math_help',
      description: 'Get help with mathematical operations',
      arguments: [
        {
          name: 'topic',
          description: 'Specific math topic to get help with',
          required: false,
        },
      ],
    };

    this.server.addPrompt(mathHelpPrompt, async (params) => {
      const { topic } = params;
      
      let content = 'I can help you with various mathematical operations:\n\n';
      content += '• Basic arithmetic: add, subtract, multiply, divide\n';
      content += '• Advanced operations: power, square root\n';
      content += '• History management: view and clear calculation history\n\n';
      
      if (topic) {
        switch (topic.toLowerCase()) {
          case 'basic':
            content += 'Basic Operations:\n';
            content += '- add: Add two numbers together\n';
            content += '- subtract: Subtract second number from first\n';
            content += '- multiply: Multiply two numbers\n';
            content += '- divide: Divide first number by second\n';
            break;
          case 'advanced':
            content += 'Advanced Operations:\n';
            content += '- power: Raise base to exponent power\n';
            content += '- sqrt: Calculate square root of a number\n';
            break;
          case 'history':
            content += 'History Management:\n';
            content += '- get_history: View recent calculations\n';
            content += '- clear_history: Clear all calculation history\n';
            break;
          default:
            content += `No specific help available for topic: ${topic}`;
        }
      }

      return {
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: content,
            },
          },
        ],
      };
    });
  }

  private addToHistory(operation: string, result: number) {
    this.history.push({
      operation,
      result,
      timestamp: new Date(),
    });
  }

  async start() {
    await this.server.start();
  }

  getServer(): MCPServer {
    return this.server;
  }
}

if (require.main === module) {
  const calculatorServer = new CalculatorServer();
  calculatorServer.start().catch(console.error);
}
