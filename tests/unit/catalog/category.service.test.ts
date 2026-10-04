/**
 * Unit tests for category.service.ts
 * Tests all CRUD operations with proper mocking.
 */

import {
  listCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
} from '@/lib/services/category.service';
import { HttpError } from '@/lib/errors/HttpError';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    category: {
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

const mockCategory = {
  id: 'cat-1',
  name: 'Electronics',
  slug: 'electronics',
  description: 'Electronic products',
  image: null,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const defaultQuery = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt' as const,
  sortOrder: 'desc' as const,
};

// ─── listCategories ───────────────────────────────────────────────────────────

describe('listCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockResolvedValue([[mockCategory], 1]);
  });

  it('returns paginated categories', async () => {
    const result = await listCategories(defaultQuery);
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
  });

  it('applies isActive filter when provided', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
    await listCategories({ ...defaultQuery, isActive: false });
    // The query is passed to $transaction as an array
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('returns empty when no categories', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
    const result = await listCategories(defaultQuery);
    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it('calculates totalPages correctly', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[mockCategory], 45]);
    const result = await listCategories({ ...defaultQuery, limit: 20 });
    expect(result.meta.totalPages).toBe(3);
  });
});

// ─── getCategoryById ──────────────────────────────────────────────────────────

describe('getCategoryById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns category when found', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
    const result = await getCategoryById('cat-1');
    expect(result.id).toBe('cat-1');
    expect(result.name).toBe('Electronics');
  });

  it('throws NotFoundError when category missing', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(getCategoryById('nonexistent')).rejects.toBeInstanceOf(HttpError);
    await expect(getCategoryById('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ─── getCategoryBySlug ────────────────────────────────────────────────────────

describe('getCategoryBySlug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns category when found by slug', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
    const result = await getCategoryBySlug('electronics');
    expect(result.slug).toBe('electronics');
  });

  it('throws NotFoundError when slug missing', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(getCategoryBySlug('nonexistent')).rejects.toBeInstanceOf(HttpError);
    await expect(getCategoryBySlug('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ─── createCategory ───────────────────────────────────────────────────────────

describe('createCategory', () => {
  const validInput = {
    name: 'Electronics',
    slug: 'electronics',
    description: 'All electronics',
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a category successfully', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.category.create as jest.Mock).mockResolvedValue(mockCategory);

    const result = await createCategory(validInput);
    expect(result.id).toBe('cat-1');
    expect(prisma.category.create).toHaveBeenCalledTimes(1);
  });

  it('throws ConflictError when slug already exists', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);

    await expect(createCategory(validInput)).rejects.toBeInstanceOf(HttpError);
    await expect(createCategory(validInput)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(prisma.category.create).not.toHaveBeenCalled();
  });
});

// ─── updateCategory ───────────────────────────────────────────────────────────

describe('updateCategory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates category name successfully', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
    const updated = { ...mockCategory, name: 'Consumer Electronics' };
    (prisma.category.update as jest.Mock).mockResolvedValue(updated);

    const result = await updateCategory('cat-1', { name: 'Consumer Electronics' });
    expect(result.name).toBe('Consumer Electronics');
  });

  it('throws NotFoundError when category does not exist', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(updateCategory('nonexistent', { name: 'Test' })).rejects.toBeInstanceOf(HttpError);
    await expect(updateCategory('nonexistent', { name: 'Test' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws ConflictError when new slug already taken by another category', async () => {
    // Each test call to updateCategory needs the mock reset correctly
    (prisma.category.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockCategory)  // for finding the category to update
      .mockResolvedValueOnce({ id: 'cat-2', slug: 'new-slug' }); // conflict check

    let error: HttpError | null = null;
    try {
      await updateCategory('cat-1', { slug: 'new-slug' });
    } catch (e) {
      error = e as HttpError;
    }
    expect(error).toBeInstanceOf(HttpError);
    expect(error?.statusCode).toBe(409);
  });


  it('allows updating with the same slug (no conflict)', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
    (prisma.category.update as jest.Mock).mockResolvedValue(mockCategory);

    // Same slug — should not check for conflict
    const result = await updateCategory('cat-1', { slug: 'electronics' });
    expect(result.slug).toBe('electronics');
    // findUnique should only be called once (for the existence check)
    expect(prisma.category.findUnique).toHaveBeenCalledTimes(1);
  });
});
