/**
 * Production-Ready Structured JSON Logger for Loqme
 * Features:
 * - Log levels: debug, info, warn, error
 * - Automatic redaction of sensitive credentials (passwords, OTPs, tokens, secrets, card data)
 * - ISO timestamps and structured JSON output for log aggregators (Elasticsearch/Loki/Datadog)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = new Set([
  'password',
  'otp',
  'otpcode',
  'token',
  'accesstoken',
  'refreshtoken',
  'session',
  'secret',
  'authorization',
  'cookie',
  'cardnumber',
  'cvv',
  'nationalcode',
  'apikey',
]);

/**
 * Recursively deep-clones an object while redacting sensitive fields
 */
export function scrubSensitiveData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => scrubSensitiveData(item));
  }

  const clean: Record<string, any> = {};

  for (const [key, val] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive =
      SENSITIVE_KEYS.has(lowerKey) ||
      Array.from(SENSITIVE_KEYS).some((k) => lowerKey.includes(k));

    if (isSensitive) {
      clean[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = scrubSensitiveData(val);
    } else {
      clean[key] = val;
    }
  }

  return clean;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  context?: Record<string, any>;
  correlationId?: string;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private service: string;

  constructor(service = 'loqme-web') {
    this.service = service;
  }

  private write(level: LogLevel, message: string, meta?: Record<string, any>, err?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
    };

    if (meta) {
      const scrubbed = scrubSensitiveData(meta);
      if (scrubbed.correlationId) {
        entry.correlationId = scrubbed.correlationId;
        delete scrubbed.correlationId;
      }
      entry.context = scrubbed;
    }

    if (err) {
      entry.error = {
        message: err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
        code: (err as any).code,
      };
    }

    const jsonString = JSON.stringify(entry);

    switch (level) {
      case 'error':
        console.error(jsonString);
        break;
      case 'warn':
        console.warn(jsonString);
        break;
      case 'info':
        console.info(jsonString);
        break;
      case 'debug':
        if (process.env.NODE_ENV !== 'production') {
          console.debug(jsonString);
        }
        break;
    }

    return entry;
  }

  debug(message: string, meta?: Record<string, any>) {
    return this.write('debug', message, meta);
  }

  info(message: string, meta?: Record<string, any>) {
    return this.write('info', message, meta);
  }

  warn(message: string, meta?: Record<string, any>, err?: Error) {
    return this.write('warn', message, meta, err);
  }

  error(message: string, err?: Error, meta?: Record<string, any>) {
    return this.write('error', message, meta, err);
  }
}

export const logger = new Logger('loqme-platform');
