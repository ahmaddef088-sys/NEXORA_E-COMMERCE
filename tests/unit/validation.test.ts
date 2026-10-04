/**
 * Tests for Zod validation utilities.
 */
import { z } from 'zod';
import {
  validateWith,
  uuidSchema,
  priceSchema,
  slugSchema,
  paginationSchema,
} from '@/lib/validation';
import { HttpError } from '@/lib/errors/HttpError';

describe('validateWith', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().positive(),
  });

  it('returns parsed data on success', () => {
    const result = validateWith(schema, { name: 'Alice', age: 30 });
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('throws HttpError 400 on validation failure', () => {
    expect(() => validateWith(schema, { name: '', age: -1 })).toThrow(HttpError);
  });

  it('throws with VALIDATION_ERROR code', () => {
    try {
      validateWith(schema, { name: '', age: -1 });
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).code).toBe('VALIDATION_ERROR');
      expect((err as HttpError).statusCode).toBe(400);
    }
  });

  it('includes field errors in details', () => {
    try {
      validateWith(schema, { name: '', age: -1 });
    } catch (err) {
      const details = (err as HttpError).details as Record<string, string[]>;
      expect(details).toBeDefined();
      expect(details.name).toBeDefined();
      expect(details.age).toBeDefined();
    }
  });
});

describe('uuidSchema', () => {
  it('accepts valid UUID v4', () => {
    expect(() => uuidSchema.parse('123e4567-e89b-12d3-a456-426614174000')).not.toThrow();
  });

  it('rejects non-UUID strings', () => {
    expect(() => uuidSchema.parse('not-a-uuid')).toThrow();
    expect(() => uuidSchema.parse('')).toThrow();
    expect(() => uuidSchema.parse('123')).toThrow();
  });
});

describe('priceSchema', () => {
  it('accepts valid price strings', () => {
    expect(() => priceSchema.parse('10.00')).not.toThrow();
    expect(() => priceSchema.parse('9.99')).not.toThrow();
    expect(() => priceSchema.parse('100')).not.toThrow();
    expect(() => priceSchema.parse('1999.99')).not.toThrow();
  });

  it('rejects zero and negative prices', () => {
    expect(() => priceSchema.parse('0')).toThrow();
    expect(() => priceSchema.parse('0.00')).toThrow();
    expect(() => priceSchema.parse('-5.00')).toThrow();
  });

  it('rejects invalid formats', () => {
    expect(() => priceSchema.parse('abc')).toThrow();
    expect(() => priceSchema.parse('10.999')).toThrow(); // too many decimals
    expect(() => priceSchema.parse('')).toThrow();
  });
});

describe('slugSchema', () => {
  it('accepts valid slugs', () => {
    expect(() => slugSchema.parse('my-product')).not.toThrow();
    expect(() => slugSchema.parse('product-1')).not.toThrow();
    expect(() => slugSchema.parse('abc')).not.toThrow();
  });

  it('rejects invalid slugs', () => {
    expect(() => slugSchema.parse('My Product')).toThrow(); // uppercase and spaces
    expect(() => slugSchema.parse('my_product')).toThrow(); // underscores
    expect(() => slugSchema.parse('-leading-dash')).toThrow();
    expect(() => slugSchema.parse('')).toThrow();
  });
});

describe('paginationSchema', () => {
  it('parses valid pagination params', () => {
    const result = paginationSchema.parse({ page: '2', limit: '10' });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
  });

  it('uses defaults when params are omitted', () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('rejects limit exceeding max', () => {
    expect(() => paginationSchema.parse({ limit: '200' })).toThrow();
  });

  it('rejects page less than 1', () => {
    expect(() => paginationSchema.parse({ page: '0' })).toThrow();
  });
});
