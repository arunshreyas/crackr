import 'server-only';

/**
 * Custom error indicating the database or network is temporarily unreachable.
 * Distinguishable from authentication failures, authorization failures, and validation errors.
 */
export class DatabaseUnavailableError extends Error {
  readonly code = 'DATABASE_UNAVAILABLE' as const;
  readonly isTransient = true;
  readonly retryable = true;
  readonly cause?: unknown;

  constructor(message = 'Database service is temporarily unavailable. Please try again.', cause?: unknown) {
    super(message);
    this.name = 'DatabaseUnavailableError';
    this.cause = cause;
  }
}

/**
 * Checks whether an error is a transient network or database connection error.
 * Handles Node.js system network codes, PostgreSQL connection exceptions,
 * and Prisma Client connectivity errors.
 */
export function isTransientDatabaseError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DatabaseUnavailableError) return true;

  const err = error as Record<string, unknown>;
  const code = (err.code || (err.cause as Record<string, unknown>)?.code || '') as string;
  const message = String(err.message || '');
  const name = String(err.name || '');

  // 1. Node.js system socket & network error codes
  const transientSystemCodes = [
    'EADDRNOTAVAIL',
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'EPIPE',
    'EAI_AGAIN',
  ];
  if (transientSystemCodes.includes(code)) return true;

  // 2. PostgreSQL connection error codes (Class 08 and Class 57)
  const transientPgCodes = [
    '08000', // connection_exception
    '08003', // connection_does_not_exist
    '08006', // connection_failure
    '08001', // sqlclient_unable_to_establish_sqlconnection
    '08004', // sqlserver_rejected_establishment_of_sqlconnection
    '57P01', // admin_shutdown
    '57P02', // crash_shutdown
    '57P03', // cannot_connect_now
  ];
  if (transientPgCodes.includes(code)) return true;

  // 3. Prisma Client connectivity error codes
  // P1001: Can't reach database server
  // P1002: The database server was reached but timed out
  // P1008: Operations timed out
  // P1017: Server has closed the connection
  const transientPrismaCodes = ['P1001', 'P1002', 'P1008', 'P1017'];
  if (transientPrismaCodes.includes(code)) return true;

  // 4. Prisma client class names
  if (name === 'PrismaClientInitializationError') return true;
  if (name === 'PrismaClientRustPanicError') return true;

  // 5. Common transient connection message substrings
  const lowerMessage = message.toLowerCase();
  const transientPatterns = [
    'eaddrnotavail',
    'econnrefused',
    'econnreset',
    'etimedout',
    'ehostunreach',
    'enetunreach',
    'connection terminated unexpectedly',
    'client has encountered a connection error',
    'timeout exceeded when trying to connect',
    'connection timeout',
    'connection closed',
    'can\'t reach database server',
    'socket hang up',
    'terminating connection due to administrator command',
  ];

  return transientPatterns.some((pattern) => lowerMessage.includes(pattern));
}

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  timeoutMs?: number;
  operationName?: string;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Executes a database operation with bounded retries, exponential backoff, and jitter.
 * ONLY retries transient network/connection errors. Non-transient errors (such as
 * validation errors, constraint violations, and unauthenticated state) fail immediately.
 */
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 2,
    initialDelayMs = 100,
    maxDelayMs = 1000,
    factor = 2,
    operationName = 'database operation',
    shouldRetry = isTransientDatabaseError,
  } = options;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      return await operation();
    } catch (err: unknown) {
      lastError = err;
      attempt++;

      // If we shouldn't retry (not transient or max attempts reached), break
      if (attempt > maxRetries || !shouldRetry(err, attempt)) {
        break;
      }

      // Exponential backoff with random jitter (0-50ms)
      const baseDelay = Math.min(maxDelayMs, initialDelayMs * Math.pow(factor, attempt - 1));
      const jitter = Math.floor(Math.random() * 50);
      const delay = baseDelay + jitter;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (isTransientDatabaseError(lastError)) {
    throw new DatabaseUnavailableError(
      `Database connection failed during ${operationName}. Please check your network and retry.`,
      lastError
    );
  }

  throw lastError;
}

export interface ServerActionErrorResponse {
  success: false;
  error: string;
  code: string;
  retryable: boolean;
}

/**
 * Sanitizes errors for client-facing server action responses.
 * Prevents leaking raw database connection strings, Prisma stack traces, or internal error objects.
 */
export function toServerActionError(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred. Please try again.'
): ServerActionErrorResponse {
  if (error instanceof DatabaseUnavailableError || isTransientDatabaseError(error)) {
    return {
      success: false,
      error: 'Database connection failed. Please check your network connection and retry.',
      code: 'DATABASE_UNAVAILABLE',
      retryable: true,
    };
  }

  if (error instanceof Error) {
    const msg = error.message;

    if (msg.includes('UNAUTHORIZED')) {
      return {
        success: false,
        error: 'UNAUTHORIZED: You must be signed in to perform this action.',
        code: 'UNAUTHORIZED',
        retryable: false,
      };
    }

    if (msg.includes('ONBOARDING_REQUIRED')) {
      return {
        success: false,
        error: 'Profile onboarding must be completed before performing this action.',
        code: 'ONBOARDING_REQUIRED',
        retryable: false,
      };
    }

    if (msg.includes('FORBIDDEN')) {
      return {
        success: false,
        error: 'You do not have permission to access this resource.',
        code: 'FORBIDDEN',
        retryable: false,
      };
    }

    if (msg.includes('SESSION_COMPLETED')) {
      return {
        success: false,
        error: 'This practice session has already been completed.',
        code: 'SESSION_COMPLETED',
        retryable: false,
      };
    }

    // Guard against leaking Prisma error traces in raw Error.message
    if (
      msg.includes('prisma.') ||
      msg.includes('PrismaClient') ||
      msg.includes('invocation:') ||
      msg.includes('read EADDRNOTAVAIL') ||
      msg.includes('Unique constraint')
    ) {
      if (isTransientDatabaseError(error)) {
        return {
          success: false,
          error: 'Database connection failed. Please check your network connection and retry.',
          code: 'DATABASE_UNAVAILABLE',
          retryable: true,
        };
      }
      return {
        success: false,
        error: fallbackMessage,
        code: 'INTERNAL_ERROR',
        retryable: false,
      };
    }

    return {
      success: false,
      error: msg,
      code: 'APP_ERROR',
      retryable: false,
    };
  }

  return {
    success: false,
    error: fallbackMessage,
    code: 'UNKNOWN_ERROR',
    retryable: false,
  };
}
