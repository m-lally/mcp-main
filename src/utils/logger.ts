export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: Error;
}

export class Logger {
  private logLevel: LogLevel = LogLevel.INFO;
  private handlers: Array<(entry: LogEntry) => void> = [];

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.logLevel = logLevel;
    this.addHandler(this.consoleHandler);
  }

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  addHandler(handler: (entry: LogEntry) => void) {
    this.handlers.push(handler);
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    if (level < this.logLevel) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      error,
    };

    this.handlers.forEach(handler => {
      try {
        handler(entry);
      } catch (err) {
        console.error('Logger handler error:', err);
      }
    });
  }

  debug(message: string, context?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, any>, error?: Error) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  private consoleHandler = (entry: LogEntry) => {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level];
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const errorInfo = entry.error ? ` ${entry.error.stack}` : '';
    
    console.log(`[${timestamp}] ${level}: ${entry.message}${context}${errorInfo}`);
  };
}
