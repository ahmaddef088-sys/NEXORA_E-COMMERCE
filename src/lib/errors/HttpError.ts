import { AppError } from './AppError';

/**
 * Standard HTTP error codes used throughout the application.
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST'
  | 'PAYMENT_FAILED'
  | 'INSUFFICIENT_STOCK'
  | 'INVALID_COUPON'
  | 'COUPON_EXPIRED'
  | 'COUPON_LIMIT_EXCEEDED';

/**
 * HTTP-aware application error.
 * Used to produce consistent error responses in API route handlers.
 */
export class HttpError extends AppError {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// ─── Convenience factories ────────────────────────────────────────────────────

export const ValidationError = (message: string, details?: unknown): HttpError =>
  new HttpError(400, 'VALIDATION_ERROR', message, details);

export const BadRequestError = (message: string): HttpError =>
  new HttpError(400, 'BAD_REQUEST', message);

export const UnauthorizedError = (message = 'Authentication required'): HttpError =>
  new HttpError(401, 'UNAUTHORIZED', message);

export const ForbiddenError = (message = 'Access denied'): HttpError =>
  new HttpError(403, 'FORBIDDEN', message);

export const NotFoundError = (resource: string): HttpError =>
  new HttpError(404, 'NOT_FOUND', `${resource} not found`);

export const ConflictError = (message: string): HttpError =>
  new HttpError(409, 'CONFLICT', message);

export const UnprocessableError = (message: string, details?: unknown): HttpError =>
  new HttpError(422, 'UNPROCESSABLE', message, details);

export const InsufficientStockError = (productName?: string): HttpError =>
  new HttpError(
    422,
    'INSUFFICIENT_STOCK',
    productName
      ? `Insufficient stock for "${productName}"`
      : 'Insufficient stock for one or more items'
  );

export const TooManyRequestsError = (message = 'Too many requests'): HttpError =>
  new HttpError(429, 'TOO_MANY_REQUESTS', message);

export const InternalError = (message = 'An unexpected error occurred'): HttpError =>
  new HttpError(500, 'INTERNAL_ERROR', message);
