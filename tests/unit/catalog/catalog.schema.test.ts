/**
 * Unit tests for product and category validation schemas.
 */

import { createCategorySchema, updateCategorySchema, categoryQuerySchema } from '@/lib/validation/category.schema';
import { createProductSchema, updateProductSchema, productQuerySchema } from '@/lib/validation/product.schema';

// ─── createCategorySchema ─────────────────────────────────────────────────────

describe('createCategorySchema', () => {
  it('accepts valid category input', () => {
    const result = createCategorySchema.safeParse({
      name: 'Electronics',
      slug: 'electronics',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true); // default
    }
  });

  it('rejects missing name', () => {
    const result = createCategorySchema.safeParse({ slug: 'electronics' });
    expect(result.success).toBe(false);
  });

  it('rejects missing slug', () => {
    const result = createCategorySchema.safeParse({ name: 'Electronics' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid slug (uppercase)', () => {
    const result = createCategorySchema.safeParse({ name: 'Electronics', slug: 'Electronics' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid slug (spaces)', () => {
    const result = createCategorySchema.safeParse({ name: 'Electronics', slug: 'my category' });
    expect(result.success).toBe(false);
  });

  it('accepts slug with hyphens', () => {
    const result = createCategorySchema.safeParse({ name: 'Electronics', slug: 'consumer-electronics' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid image URL', () => {
    const result = createCategorySchema.safeParse({
      name: 'Electronics',
      slug: 'electronics',
      image: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid image URL', () => {
    const result = createCategorySchema.safeParse({
      name: 'Electronics',
      slug: 'electronics',
      image: 'https://example.com/image.jpg',
    });
    expect(result.success).toBe(true);
  });
});

// ─── updateCategorySchema ─────────────────────────────────────────────────────

describe('updateCategorySchema', () => {
  it('accepts empty update (no fields required)', () => {
    const result = updateCategorySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update', () => {
    const result = updateCategorySchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid slug in update', () => {
    const result = updateCategorySchema.safeParse({ slug: 'Invalid Slug' });
    expect(result.success).toBe(false);
  });
});

// ─── categoryQuerySchema ──────────────────────────────────────────────────────

describe('categoryQuerySchema', () => {
  it('uses defaults when no params provided', () => {
    const result = categoryQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sortBy).toBe('createdAt');
      expect(result.data.sortOrder).toBe('desc');
    }
  });

  it('parses page and limit from strings', () => {
    const result = categoryQuerySchema.safeParse({ page: '2', limit: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    }
  });

  it('transforms isActive string to boolean', () => {
    const trueResult = categoryQuerySchema.safeParse({ isActive: 'true' });
    if (trueResult.success) expect(trueResult.data.isActive).toBe(true);

    const falseResult = categoryQuerySchema.safeParse({ isActive: 'false' });
    if (falseResult.success) expect(falseResult.data.isActive).toBe(false);
  });
});

// ─── createProductSchema ──────────────────────────────────────────────────────

describe('createProductSchema', () => {
  const validProduct = {
    name: 'Laptop',
    slug: 'laptop',
    sku: 'LAPTOP-001',
    price: 999.99,
  };

  it('accepts valid product input', () => {
    const result = createProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stock).toBe(0); // default
      expect(result.data.isActive).toBe(true); // default
    }
  });

  it('rejects zero price', () => {
    const result = createProductSchema.safeParse({ ...validProduct, price: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative price', () => {
    const result = createProductSchema.safeParse({ ...validProduct, price: -10 });
    expect(result.success).toBe(false);
  });

  it('rejects negative stock', () => {
    const result = createProductSchema.safeParse({ ...validProduct, stock: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts zero stock', () => {
    const result = createProductSchema.safeParse({ ...validProduct, stock: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects missing SKU', () => {
    const { sku: _sku, ...withoutSku } = validProduct;
    const result = createProductSchema.safeParse(withoutSku);
    expect(result.success).toBe(false);
  });

  it('rejects invalid SKU characters', () => {
    const result = createProductSchema.safeParse({ ...validProduct, sku: 'SKU WITH SPACES' });
    expect(result.success).toBe(false);
  });

  it('accepts valid SKU formats', () => {
    const skus = ['SKU-001', 'SKU_001', 'ABC123', 'sku-lower'];
    for (const sku of skus) {
      const result = createProductSchema.safeParse({ ...validProduct, sku });
      expect(result.success).toBe(true);
    }
  });

  it('accepts optional categoryId as valid UUID', () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      categoryId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid categoryId (not UUID)', () => {
    const result = createProductSchema.safeParse({ ...validProduct, categoryId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects compareAtPrice of 0', () => {
    const result = createProductSchema.safeParse({ ...validProduct, compareAtPrice: 0 });
    expect(result.success).toBe(false);
  });
});

// ─── updateProductSchema ──────────────────────────────────────────────────────

describe('updateProductSchema', () => {
  it('accepts empty update (all fields optional)', () => {
    const result = updateProductSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects negative price in update', () => {
    const result = updateProductSchema.safeParse({ price: -5 });
    expect(result.success).toBe(false);
  });

  it('rejects negative stock in update', () => {
    const result = updateProductSchema.safeParse({ stock: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts stock of 0 in update', () => {
    const result = updateProductSchema.safeParse({ stock: 0 });
    expect(result.success).toBe(true);
  });
});

// ─── productQuerySchema ───────────────────────────────────────────────────────

describe('productQuerySchema', () => {
  it('uses defaults when no params provided', () => {
    const result = productQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sortBy).toBe('createdAt');
      expect(result.data.sortOrder).toBe('desc');
    }
  });

  it('parses minPrice and maxPrice from strings', () => {
    const result = productQuerySchema.safeParse({ minPrice: '10.00', maxPrice: '500.00' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.minPrice).toBe(10);
      expect(result.data.maxPrice).toBe(500);
    }
  });

  it('rejects invalid sortBy value', () => {
    const result = productQuerySchema.safeParse({ sortBy: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('accepts valid sortBy values', () => {
    const validSortBys = ['name', 'price', 'createdAt', 'stock'];
    for (const sortBy of validSortBys) {
      const result = productQuerySchema.safeParse({ sortBy });
      expect(result.success).toBe(true);
    }
  });

  it('transforms isActive string to boolean', () => {
    const result = productQuerySchema.safeParse({ isActive: 'true' });
    if (result.success) expect(result.data.isActive).toBe(true);
  });
});
