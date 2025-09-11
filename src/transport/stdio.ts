import { EventEmitter } from 'events';
import { MCPMessage } from '../types/mcp.js';
import { Logger } from '../utils/logger.js';
import { MCPError, MCPErrorCode } from '../errors/mcp-errors.js';

export class StdioTransport extends EventEmitter {
  private logger: Logger;
  private buffer = '';
  private closed = false;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    this.setupStdio();
  }

  private setupStdio() {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', this.handleData.bind(this));
    process.stdin.on('end', this.handleEnd.bind(this));
    process.stdin.on('error', this.handleError.bind(this));
    
    process.stdout.on('error', this.handleError.bind(this));
    process.stderr.on('error', this.handleError.bind(this));
  }

  private handleData(chunk: string) {
    if (this.closed) return;

    this.buffer += chunk;
    this.processBuffer();
  }

  private processBuffer() {
    let newlineIndex;
    
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      
      if (line) {
        this.processLine(line);
      }
    }
  }

  private processLine(line: string) {
    try {
      const message: MCPMessage = JSON.parse(line);
      this.logger.debug('Received message', { message });
      this.emit('message', message);
    } catch (error) {
      this.logger.error('Failed to parse message', { line }, error as Error);
      this.emit('error', new MCPError(
        MCPErrorCode.PARSE_ERROR,
        'Invalid JSON received',
        { line }
      ));
    }
  }

  private handleEnd() {
    this.logger.info('Input stream ended');
    this.closed = true;
    this.emit('close');
  }

  private handleError(error: Error) {
    this.logger.error('Transport error', {}, error);
    this.emit('error', error);
  }

  send(message: MCPMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.closed) {
        reject(new Error('Transport is closed'));
        return;
      }

      try {
        const json = JSON.stringify(message);
        this.logger.debug('Sending message', { message });
        
        process.stdout.write(json + '\n', (error) => {
          if (error) {
            this.logger.error('Failed to send message', { message }, error);
            reject(error);
          } else {
            resolve();
          }
        });
      } catch (error) {
        this.logger.error('Failed to serialize message', { message }, error as Error);
        reject(error);
      }
    });
  }

  close() {
    if (this.closed) return;
    
    this.closed = true;
    this.logger.info('Closing transport');
    
    try {
      process.stdin.destroy();
    } catch (error) {
      this.logger.warn('Error closing stdin', {}, error as Error);
    }
    
    this.emit('close');
  }
}
