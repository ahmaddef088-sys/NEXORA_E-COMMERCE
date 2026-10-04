import { AppError } from '@/lib/errors/AppError';
import {
  HttpError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalError,
  BadRequestError,
  InsufficientStockError,
} from '@/lib/errors/HttpError';

describe('AppError', () => {
  it('extends Error', () => {
    const err = new AppError('test message');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('sets message correctly', () => {
    const err = new AppError('something went wrong');
    expect(err.message).toBe('something went wrong');
  });

  it('sets name to class name', () => {
    const err = new AppError('msg');
    expect(err.name).toBe('AppError');
  });
});

describe('HttpError', () => {
  it('extends AppError', () => {
    const err = new HttpError(400, 'BAD_REQUEST', 'bad input');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(HttpError);
  });

  it('stores statusCode and code', () => {
    const err = new HttpError(404, 'NOT_FOUND', 'resource not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('resource not found');
  });

  it('stores optional details', () => {
    const details = { field: 'email', error: 'required' };
    const err = new HttpError(400, 'VALIDATION_ERROR', 'invalid', details);
    expect(err.details).toEqual(details);
  });

  it('has undefined details when not provided', () => {
    const err = new HttpError(500, 'INTERNAL_ERROR', 'oops');
    expect(err.details).toBeUndefined();
  });
});

describe('Error factory functions', () => {
  it('ValidationError creates 400 with VALIDATION_ERROR code', () => {
    const err = ValidationError('invalid input', { email: ['required'] });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual({ email: ['required'] });
  });

  it('BadRequestError creates 400 with BAD_REQUEST code', () => {
    const err = BadRequestError('bad request');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
  });

  it('UnauthorizedError creates 401 with default message', () => {
    const err = UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Authentication required');
  });

  it('UnauthorizedError accepts custom message', () => {
    const err = UnauthorizedError('Token expired');
    expect(err.message).toBe('Token expired');
  });

  it('ForbiddenError creates 403', () => {
    const err = ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('NotFoundError creates 404 with resource name', () => {
    const err = NotFoundError('Product');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Product not found');
  });

  it('ConflictError creates 409', () => {
    const err = ConflictError('Email already exists');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });

  it('InternalError creates 500 with default message', () => {
    const err = InternalError();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.message).toBe('An unexpected error occurred');
  });

  it('InsufficientStockError creates 422 with product name', () => {
    const err = InsufficientStockError('Widget Pro');
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('INSUFFICIENT_STOCK');
    expect(err.message).toContain('Widget Pro');
  });

  it('InsufficientStockError works without product name', () => {
    const err = InsufficientStockError();
    expect(err.statusCode).toBe(422);
    expect(err.message).toContain('one or more items');
  });
});
