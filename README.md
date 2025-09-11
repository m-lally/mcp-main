# MCP Framework

A complete TypeScript implementation of the Model Context Protocol (MCP) for building AI-powered applications with tools, resources, and prompts.

## Features

- 🚀 **Complete MCP Implementation** - Full support for MCP protocol specification
- 🛠️ **Tools** - Execute functions and commands
- 📁 **Resources** - Access and manage data sources
- 💬 **Prompts** - Template and generate AI prompts
- 🔒 **Security** - Built-in authentication and rate limiting
- 📝 **TypeScript** - Full type safety and IntelliSense
- 🧪 **Testing** - Comprehensive test suite
- 📚 **Examples** - Ready-to-use server implementations

## Installation

```bash
npm install mcp-framework
```

## Quick Start

### Creating a Server

````typescript
import { MCPServer } from 'mcp-framework';

const server = new MCPServer({
  serverInfo: {
    name: 'My MCP Server',
    version: '1.0.0',
  },
});
