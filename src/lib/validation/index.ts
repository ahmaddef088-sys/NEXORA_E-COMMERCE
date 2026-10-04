import { z } from 'zod';
import type { ZodType, ZodTypeDef } from 'zod';
import { ValidationError } from '@/lib/errors/HttpError';

/**
 * Parse and validate request body using a Zod schema.
 * Throws a ValidationError (HttpError 400) with field-level details on failure.
 */
export async function parseBody<TOutput, TInput = TOutput>(
  request: Request,
  schema: ZodType<TOutput, ZodTypeDef, TInput>
): Promise<TOutput> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw ValidationError('Request body must be valid JSON');
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  return result.data;
}

/**
 * Parse and validate URL search params using a Zod schema.
 * Throws a ValidationError (HttpError 400) with field-level details on failure.
 */
export function parseQuery<TOutput>(
  searchParams: URLSearchParams,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: ZodType<TOutput, ZodTypeDef, any>
): TOutput {
  const params = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(params);

  if (!result.success) {
    throw ValidationError('Invalid query parameters', result.error.flatten().fieldErrors);
  }

  return result.data;
}

/**
 * Validate data with a Zod schema.
 * Throws a ValidationError (HttpError 400) with field-level details on failure.
 */
export function validateWith<TOutput, TInput = TOutput>(
  schema: ZodType<TOutput, ZodTypeDef, TInput>,
  data: unknown
): TOutput {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }
  return result.data;
}

// ─── Common reusable Zod schemas ─────────────────────────────────────────────

/** UUID v4 string */
export const uuidSchema = z.string().uuid('Must be a valid UUID');

/** Positive integer (for IDs, quantities, etc.) */
export const positiveIntSchema = z.number().int().positive();

/** Non-negative integer (for stock, counts, etc.) */
export const nonNegativeIntSchema = z.number().int().nonnegative();

/** Positive decimal string (for prices) */
export const priceSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Price must be a positive number with up to 2 decimal places')
  .refine((val) => parseFloat(val) > 0, 'Price must be greater than 0');

/** URL-friendly slug */
export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens only');

/** Pagination query schema */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().positive().max(100)),
});

/** Sort direction */
export const sortDirectionSchema = z.enum(['asc', 'desc']).default('desc');
