import { MCPClient } from '../client/mcp-client.js';
import { LogLevel } from '../utils/logger.js';

async function main() {
  const client = new MCPClient({
    logLevel: LogLevel.INFO,
    clientInfo: {
      name: 'Example Client',
      version: '1.0.0',
    },
  });

  try {
    // Initialize the client
    console.log('Initializing client...');
    const initResult = await client.initialize();
    console.log('Initialization result:', JSON.stringify(initResult, null, 2));

    // List available tools
    console.log('\nListing tools...');
    const toolsResult = await client.listTools();
    console.log('Available tools:', JSON.stringify(toolsResult, null, 2));

    // Call a tool (example with calculator)
    if (toolsResult.tools.some(tool => tool.name === 'add')) {
      console.log('\nCalling add tool...');
      const addResult = await client.callTool('add', { a: 5, b: 3 });
      console.log('Add result:', JSON.stringify(addResult, null, 2));
    }

    // List resources
    console.log('\nListing resources...');
    const resourcesResult = await client.listResources();
    console.log('Available resources:', JSON.stringify(resourcesResult, null, 2));

    // List prompts
    console.log('\nListing prompts...');
    const promptsResult = await client.listPrompts();
    console.log('Available prompts:', JSON.stringify(promptsResult, null, 2));

    // Get a prompt (if available)
    if (promptsResult.prompts.some(prompt => prompt.name === 'math_help')) {
      console.log('\nGetting math help prompt...');
      const promptResult = await client.getPrompt('math_help', { topic: 'basic' });
      console.log('Prompt result:', JSON.stringify(promptResult, null, 2));
    }

    // Set up event listeners
    client.on('toolsChanged', () => {
      console.log('Tools list changed');
    });

    client.on('resourcesChanged', () => {
      console.log('Resources list changed');
    });

    client.on('promptsChanged', () => {
      console.log('Prompts list changed');
    });

    // Keep the client running for a bit to demonstrate events
    setTimeout(async () => {
      console.log('\nClosing client...');
      await client.close();
    }, 5000);

  } catch (error) {
    console.error('Client error:', error);
    await client.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
