import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import { ValidationError } from '../errors/mcp-errors.js';

export class SchemaValidator {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
  }

  validate<T>(schema: JSONSchemaType<T>, data: unknown): T {
    const validate = this.ajv.compile(schema);
    
    if (!validate(data)) {
      const errors = validate.errors?.map(err => 
        `${err.instancePath} ${err.message}`
      ).join(', ') || 'Validation failed';
      
      throw new ValidationError(`Schema validation failed: ${errors}`, {
        errors: validate.errors,
        data,
      });
    }
    
    return data as T;
  }

  validateToolInput(schema: any, input: unknown): any {
    try {
      const validate = this.ajv.compile(schema);
      
      if (!validate(input)) {
        const errors = validate.errors?.map(err => 
          `${err.instancePath} ${err.message}`
        ).join(', ') || 'Invalid input';
        
        throw new ValidationError(`Tool input validation failed: ${errors}`, {
          errors: validate.errors,
          input,
        });
      }
      
      return input;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError('Schema compilation failed', { error: error.message });
    }
  }
}
