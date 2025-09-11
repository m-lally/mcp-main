import { Logger, LogLevel } from '../utils/logger.js';
import { SchemaValidator } from '../validation/schema-validator.js';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger(LogLevel.DEBUG);
  });

  it('should log messages at appropriate levels', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    logger.info('Test message');
    logger.warn('Warning message');
    logger.error('Error message');

    expect(consoleSpy).toHaveBeenCalledTimes(3);
    consoleSpy.mockRestore();
  });

  it('should respect log level filtering', () => {
    const errorLogger = new Logger(LogLevel.ERROR);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    errorLogger.info('Should not log');
    errorLogger.error('Should log');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });
});

describe('SchemaValidator', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  it('should validate tool input against schema', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    };

    expect(() => {
      validator.validateToolInput(schema, { name: 'John', age: 30 });
    }).not.toThrow();

    expect(() => {
      validator.validateToolInput(schema, { age: 30 });
    }).toThrow();
  });
});
