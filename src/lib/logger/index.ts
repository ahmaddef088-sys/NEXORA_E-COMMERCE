/**
 * Centralized structured logger.
 *
 * - In production: outputs JSON for log aggregation services.
 * - In development: outputs human-readable colored text.
 * - Never logs sensitive data (passwords, tokens, secrets).
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('User registered', { userId });
 *   logger.error('Payment failed', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
};

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel =
  process.env.NODE_ENV === 'production'
    ? 'info'
    : process.env.LOG_LEVEL
      ? (process.env.LOG_LEVEL as LogLevel)
      : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[MIN_LEVEL];
}

function formatError(err: unknown): LogEntry['error'] | undefined {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      // Only include stack trace outside of production
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    };
  }
  return undefined;
}

function log(
  level: LogLevel,
  message: string,
  contextOrError?: Record<string, unknown> | unknown
): void {
  if (!shouldLog(level)) return;

  const timestamp = new Date().toISOString();
  let context: Record<string, unknown> | undefined;
  let error: LogEntry['error'] | undefined;

  if (contextOrError instanceof Error) {
    error = formatError(contextOrError);
  } else if (contextOrError !== undefined && typeof contextOrError === 'object') {
    context = contextOrError as Record<string, unknown>;
  }

  const entry: LogEntry = { level, message, timestamp, context, error };

  if (process.env.NODE_ENV === 'production') {
    // Structured JSON output for log aggregation
    process.stdout.write(JSON.stringify(entry) + '\n');
  } else {
    // Human-readable output for development
    const colors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';
    const prefix = `${colors[level]}[${level.toUpperCase()}]${reset} ${timestamp}`;

    console.log(`${prefix} ${message}`);
    if (context) console.log('  context:', context);
    if (error) console.log('  error:', error.name, '-', error.message);
    if (error?.stack) console.log(error.stack);
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    log('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    log('warn', message, context),
  error: (message: string, error?: unknown) =>
    log('error', message, error),
};
