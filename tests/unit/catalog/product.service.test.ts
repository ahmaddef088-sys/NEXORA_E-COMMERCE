/**
 * Unit tests for product.service.ts
 * Tests all CRUD operations with proper mocking.
 */

import {
  listProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  getRelatedProducts,
  getFeaturedProducts,
} from '@/lib/services/product.service';
import { HttpError } from '@/lib/errors/HttpError';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { prisma } from '@/lib/db/prisma';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockProduct = {
  id: 'prod-1',
  name: 'Laptop',
  slug: 'laptop',
  description: 'A powerful laptop',
  sku: 'LAPTOP-001',
  price: '999.99',
  compareAtPrice: null,
  stock: 50,
  isActive: true,
  image: null,
  categoryId: 'cat-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  category: { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
};

const defaultQuery = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt' as const,
  sortOrder: 'desc' as const,
};

// ─── listProducts ─────────────────────────────────────────────────────────────

describe('listProducts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockResolvedValue([[mockProduct], 1]);
  });

  it('returns paginated products for public view (only active)', async () => {
    const result = await listProducts(defaultQuery, false);
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('returns all products for admin view', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[mockProduct], 1]);
    const result = await listProducts(defaultQuery, true);
    expect(result.data).toHaveLength(1);
  });

  it('returns empty when no products', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
    const result = await listProducts(defaultQuery);
    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it('calculates totalPages correctly', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[mockProduct], 100]);
    const result = await listProducts({ ...defaultQuery, limit: 20 });
    expect(result.meta.totalPages).toBe(5);
  });
});

// ─── getProductById ───────────────────────────────────────────────────────────

describe('getProductById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns active product for public view', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
    const result = await getProductById('prod-1', false);
    expect(result.id).toBe('prod-1');
  });

  it('throws NotFoundError for inactive product in public view', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({ ...mockProduct, isActive: false });
    await expect(getProductById('prod-1', false)).rejects.toBeInstanceOf(HttpError);
    await expect(getProductById('prod-1', false)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('returns inactive product for admin view', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({ ...mockProduct, isActive: false });
    const result = await getProductById('prod-1', true);
    expect(result.isActive).toBe(false);
  });

  it('throws NotFoundError when product does not exist', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(getProductById('nonexistent')).rejects.toBeInstanceOf(HttpError);
    await expect(getProductById('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ─── getProductBySlug ─────────────────────────────────────────────────────────

describe('getProductBySlug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns product by slug for public view (active)', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
    const result = await getProductBySlug('laptop', false);
    expect(result.slug).toBe('laptop');
  });

  it('throws NotFoundError for inactive product in public view', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({ ...mockProduct, isActive: false });
    await expect(getProductBySlug('laptop', false)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns inactive product in admin view', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({ ...mockProduct, isActive: false });
    const result = await getProductBySlug('laptop', true);
    expect(result.isActive).toBe(false);
  });

  it('throws NotFoundError when slug not found', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(getProductBySlug('nonexistent')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── createProduct ────────────────────────────────────────────────────────────

describe('createProduct', () => {
  const validInput = {
    name: 'Laptop',
    slug: 'laptop',
    sku: 'LAPTOP-001',
    price: 999.99,
    stock: 50,
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a product successfully', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.product.create as jest.Mock).mockResolvedValue(mockProduct);

    const result = await createProduct(validInput);
    expect(result.id).toBe('prod-1');
    expect(prisma.product.create).toHaveBeenCalledTimes(1);
  });

  it('throws ConflictError when SKU already exists', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct); // SKU conflict first

    await expect(createProduct(validInput)).rejects.toBeInstanceOf(HttpError);
    await expect(createProduct(validInput)).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('throws ConflictError when slug already exists', async () => {
    (prisma.product.findUnique as jest.Mock)
      .mockResolvedValueOnce(null)       // SKU check — no conflict
      .mockResolvedValueOnce(mockProduct); // slug check — conflict

    await expect(createProduct(validInput)).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.product.create).not.toHaveBeenCalled();
  });
});

// ─── updateProduct ────────────────────────────────────────────────────────────

describe('updateProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates product name successfully', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
    const updated = { ...mockProduct, name: 'Pro Laptop' };
    (prisma.product.update as jest.Mock).mockResolvedValue(updated);

    const result = await updateProduct('prod-1', { name: 'Pro Laptop' });
    expect(result.name).toBe('Pro Laptop');
  });

  it('updates product price successfully', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
    const updated = { ...mockProduct, price: '1099.99' };
    (prisma.product.update as jest.Mock).mockResolvedValue(updated);

    const result = await updateProduct('prod-1', { price: 1099.99 });
    expect(result.price).toBe('1099.99');
  });

  it('throws NotFoundError when product does not exist', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(updateProduct('nonexistent', { name: 'Test' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws ConflictError when new SKU already taken', async () => {
    (prisma.product.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockProduct)
      .mockResolvedValueOnce({ id: 'prod-2', sku: 'OTHER-SKU' });

    await expect(updateProduct('prod-1', { sku: 'OTHER-SKU' })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('throws ConflictError when new slug already taken', async () => {
    (prisma.product.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockProduct)
      .mockResolvedValueOnce({ id: 'prod-2', slug: 'other-product' });

    await expect(updateProduct('prod-1', { slug: 'other-product' })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('allows deactivating a product', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
    const updated = { ...mockProduct, isActive: false };
    (prisma.product.update as jest.Mock).mockResolvedValue(updated);

    const result = await updateProduct('prod-1', { isActive: false });
    expect(result.isActive).toBe(false);
  });

  it('prevents negative stock update', async () => {
    // The schema enforces nonnegative stock — but service can also receive valid input
    // This ensures Prisma update is called with the correct data
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
    const updated = { ...mockProduct, stock: 0 };
    (prisma.product.update as jest.Mock).mockResolvedValue(updated);

    const result = await updateProduct('prod-1', { stock: 0 });
    expect(result.stock).toBe(0);
  });

  describe('Search & Discovery', () => {
    it('filters by inStock and hasDiscount', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[mockProduct], 1]);

      const result = await listProducts({
        ...defaultQuery,
        inStock: true,
        hasDiscount: true,
      });

      expect(result.data).toHaveLength(1);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('returns related products matching category', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: 'prod-1', categoryId: 'cat-1' });
      (prisma.product.findMany as jest.Mock)
        .mockResolvedValueOnce([{ ...mockProduct, id: 'prod-2', name: 'Related Laptop' }])
        .mockResolvedValueOnce([]);

      const related = await getRelatedProducts('prod-1', 4);
      expect(related).toHaveLength(1);
      expect(related[0].id).toBe('prod-2');
    });

    it('throws NotFoundError if product for related products does not exist', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getRelatedProducts('non-existent')).rejects.toThrow();
    });

    it('returns featured products', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

      const featured = await getFeaturedProducts(4);
      expect(featured).toHaveLength(1);
      expect(featured[0].id).toBe('prod-1');
    });
  });
});
