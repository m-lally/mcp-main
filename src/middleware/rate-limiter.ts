import { RateLimiter, RateLimitPresets, KeyGenerators } from './middleware/rate-limiter.js';
import { MCPError, MCPErrorCode } from '../errors/mcp-errors.js';

// // Create rate limiter with moderate limits
// const rateLimiter = new RateLimiter({
//   ...RateLimitPresets.MODERATE,
//   keyGenerator: KeyGenerators.byToolName,
// });

// // In your server, check limits before processing requests
// await rateLimiter.checkLimit('tools/call', { name: 'my_tool' });


export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (method: string, params?: any) => string;
}

export class RateLimiter {
  private requests = new Map<string, number[]>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (method) => method,
      ...config,
    };

    // Clean up old entries periodically
    setInterval(() => {
      this.cleanup();
    }, this.config.windowMs);
  }

  async checkLimit(method: string, params?: any): Promise<void> {
    const key = this.config.keyGenerator!(method, params);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get or create request history for this key
    let requestTimes = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    requestTimes = requestTimes.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (requestTimes.length >= this.config.maxRequests) {
      throw new MCPError(
        MCPErrorCode.RATE_LIMIT_EXCEEDED,
        `Rate limit exceeded for ${method}. Max ${this.config.maxRequests} requests per ${this.config.windowMs}ms`,
        {
          method,
          limit: this.config.maxRequests,
          windowMs: this.config.windowMs,
          retryAfter: Math.ceil((requestTimes[0] + this.config.windowMs - now) / 1000),
        }
      );
    }

    // Add current request
    requestTimes.push(now);
    this.requests.set(key, requestTimes);
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    for (const [key, requestTimes] of this.requests.entries()) {
      const validRequests = requestTimes.filter(time => time > windowStart);
      
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }

  getStats(): Record<string, { requests: number; remaining: number }> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const stats: Record<string, { requests: number; remaining: number }> = {};

    for (const [key, requestTimes] of this.requests.entries()) {
      const validRequests = requestTimes.filter(time => time > windowStart);
      stats[key] = {
        requests: validRequests.length,
        remaining: Math.max(0, this.config.maxRequests - validRequests.length),
      };
    }

    return stats;
  }

  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }

  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Predefined rate limit configurations
export const RateLimitPresets = {
  // Very strict: 10 requests per minute
  STRICT: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  
  // Moderate: 100 requests per minute
  MODERATE: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  
  // Lenient: 1000 requests per minute
  LENIENT: {
    windowMs: 60 * 1000,
    maxRequests: 1000,
  },
  
  // Per-second limits
  PER_SECOND_5: {
    windowMs: 1000,
    maxRequests: 5,
  },
  
  PER_SECOND_10: {
    windowMs: 1000,
    maxRequests: 10,
  },
} as const;

// Usage example with different key generators
export const KeyGenerators = {
  // Rate limit by method only
  byMethod: (method: string) => method,
  
  // Rate limit by method and specific parameter
  byMethodAndParam: (method: string, params?: any) => {
    const key = params?.key || params?.id || 'default';
    return `${method}:${key}`;
  },
  
  // Rate limit by tool name for tool calls
  byToolName: (method: string, params?: any) => {
    if (method === 'tools/call' && params?.name) {
      return `tool:${params.name}`;
    }
    return method;
  },
  
  // Rate limit by resource URI for resource access
  byResourceUri: (method: string, params?: any) => {
    if (method.startsWith('resources/') && params?.uri) {
      return `resource:${params.uri}`;
    }
    return method;
  },
} as const;
