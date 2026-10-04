import { NextResponse } from 'next/server';
import { HttpError } from '@/lib/errors/HttpError';
import { logger } from '@/lib/logger';

/**
 * Standard success response shape:
 * { success: true, data: T }
 */
export type ApiSuccess<T> = {
  success: true;
  data: T;
};

/**
 * Standard error response shape:
 * { success: false, error: { code, message, details? } }
 */
export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/**
 * Standard paginated response shape:
 * { success: true, data: T[], meta: PaginationMeta }
 */
export type PaginatedResponse<T> = {
  success: true;
  data: T[];
  meta: PaginationMeta;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// ─── Success helpers ─────────────────────────────────────────────────────────

export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function createdResponse<T>(data: T): NextResponse<ApiSuccess<T>> {
  return successResponse(data, 201);
}

export function paginatedResponse<T>(
  data: T[],
  meta: PaginationMeta
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json({ success: true, data, meta }, { status: 200 });
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// ─── Error helpers ────────────────────────────────────────────────────────────

export function errorResponse(
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status: statusCode }
  );
}

/**
 * Central error handler for API route handlers.
 * Converts known HttpErrors to consistent responses.
 * Logs and obscures unknown errors (never exposes internals to client).
 */
export function handleApiError(error: unknown): NextResponse<ApiError> {
  if (error instanceof HttpError) {
    return errorResponse(error.statusCode, error.code, error.message, error.details);
  }

  // Unknown/internal error — log it, return generic message
  logger.error('Unhandled API error', error);
  return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}

// ─── Pagination helpers ───────────────────────────────────────────────────────

export function parsePagination(
  searchParams: URLSearchParams,
  defaultLimit = 20,
  maxLimit = 100
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(searchParams.get('limit') ?? String(defaultLimit), 10) || defaultLimit)
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
