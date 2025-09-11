import { MCPError, MCPErrorCode } from '../errors/mcp-errors.js';

export interface AuthConfig {
  apiKeys?: string[];
  allowAnonymous?: boolean;
  customValidator?: (token: string) => Promise<boolean>;
}

export class AuthMiddleware {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  async authenticate(headers?: Record<string, string>): Promise<void> {
    if (this.config.allowAnonymous && !headers?.authorization) {
      return;
    }

    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new MCPError(
        MCPErrorCode.PERMISSION_DENIED,
        'Authentication required'
      );
    }

    const token = this.extractToken(authHeader);
    
    if (this.config.customValidator) {
      const isValid = await this.config.customValidator(token);
      if (!isValid) {
        throw new MCPError(
          MCPErrorCode.PERMISSION_DENIED,
          'Invalid authentication token'
        );
      }
      return;
    }

    if (this.config.apiKeys && this.config.apiKeys.includes(token)) {
      return;
    }

    throw new MCPError(
      MCPErrorCode.PERMISSION_DENIED,
      'Invalid authentication credentials'
    );
  }

  private extractToken(authHeader: string): string {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }
    return authHeader;
  }
}
