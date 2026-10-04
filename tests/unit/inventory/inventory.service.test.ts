/**
 * Unit tests for inventory.service.ts and inventory validation schemas.
 * Tests inventory lookup, listing, stock adjustments, negative stock prevention,
 * movement tracking, and low-stock alerts.
 */

import {
  getProductInventory,
  listInventory,
  adjustStock,
  getStockMovements,
  getLowStockProducts,
} from '@/lib/services/inventory.service';
import {
  stockAdjustmentSchema,
  inventoryQuerySchema,
} from '@/lib/validation/inventory.schema';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    inventory: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    stockMovement: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { prisma } from '@/lib/db/prisma';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockProduct = {
  id: 'prod-123',
  name: 'Mechanical Keyboard',
  sku: 'KB-001',
  stock: 25,
};

const mockInventory = {
  id: 'inv-123',
  productId: 'prod-123',
  quantity: 25,
  reserved: 5,
  updatedAt: new Date('2026-01-01'),
};

describe('Inventory Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── getProductInventory ───────────────────────────────────────────────────

  describe('getProductInventory', () => {
    it('returns inventory record with calculated available stock', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.inventory.upsert as jest.Mock).mockResolvedValue(mockInventory);

      const result = await getProductInventory('prod-123');

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-123' },
        select: { id: true, name: true, sku: true, stock: true },
      });
      expect(result.id).toBe('inv-123');
      expect(result.quantity).toBe(25);
      expect(result.reserved).toBe(5);
      expect(result.available).toBe(20); // 25 - 5
      expect(result.product.name).toBe('Mechanical Keyboard');
    });

    it('throws NotFoundError if product does not exist', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getProductInventory('non-existent')).rejects.toThrow('Product not found');
    });
  });

  // ─── listInventory ─────────────────────────────────────────────────────────

  describe('listInventory', () => {
    it('returns paginated inventory records with correct meta', async () => {
      const records = [
        {
          id: 'inv-1',
          productId: 'prod-1',
          quantity: 15,
          reserved: 3,
          updatedAt: new Date(),
          product: { id: 'prod-1', name: 'P1', sku: 'SKU-1', stock: 15 },
        },
      ];

      (prisma.$transaction as jest.Mock).mockResolvedValue([records, 1]);

      const result = await listInventory({
        page: 1,
        limit: 10,
        sortOrder: 'desc',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].available).toBe(12); // 15 - 3
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('filters by lowStock when requested', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);

      await listInventory({
        page: 1,
        limit: 10,
        lowStock: true,
        sortOrder: 'desc',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  // ─── adjustStock ───────────────────────────────────────────────────────────

  describe('adjustStock', () => {
    it('handles stock IN adjustment and creates audit movement', async () => {
      const txMock = {
        product: {
          findUnique: jest.fn().mockResolvedValue(mockProduct),
          update: jest.fn().mockResolvedValue({ ...mockProduct, stock: 35 }),
        },
        inventory: {
          upsert: jest.fn().mockResolvedValue(mockInventory),
          update: jest.fn().mockResolvedValue({ ...mockInventory, quantity: 35 }),
        },
        stockMovement: {
          create: jest.fn().mockResolvedValue({ id: 'mov-1' }),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(txMock));

      const result = await adjustStock('prod-123', {
        type: 'IN',
        quantity: 10,
        reason: 'Restock shipment received',
      });

      expect(txMock.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'prod-123' },
        data: { quantity: 35 },
        select: expect.any(Object),
      });
      expect(txMock.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-123' },
        data: { stock: 35 },
      });
      expect(txMock.stockMovement.create).toHaveBeenCalledWith({
        data: {
          productId: 'prod-123',
          type: 'IN',
          quantity: 10,
          reason: 'Restock shipment received',
        },
      });
      expect(result.quantity).toBe(35);
      expect(result.available).toBe(30); // 35 - 5
    });

    it('handles stock OUT adjustment', async () => {
      const txMock = {
        product: {
          findUnique: jest.fn().mockResolvedValue(mockProduct),
          update: jest.fn().mockResolvedValue({ ...mockProduct, stock: 15 }),
        },
        inventory: {
          upsert: jest.fn().mockResolvedValue(mockInventory),
          update: jest.fn().mockResolvedValue({ ...mockInventory, quantity: 15 }),
        },
        stockMovement: {
          create: jest.fn().mockResolvedValue({ id: 'mov-2' }),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(txMock));

      const result = await adjustStock('prod-123', {
        type: 'OUT',
        quantity: 10,
        reason: 'Damaged goods',
      });

      expect(txMock.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'prod-123' },
        data: { quantity: 15 },
        select: expect.any(Object),
      });
      expect(result.quantity).toBe(15);
    });

    it('prevents negative stock and throws UnprocessableError when removing more than available', async () => {
      const txMock = {
        product: {
          findUnique: jest.fn().mockResolvedValue({ ...mockProduct, stock: 5 }),
        },
        inventory: {
          upsert: jest.fn().mockResolvedValue({ ...mockInventory, quantity: 5 }),
        },
        stockMovement: {
          create: jest.fn(),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(txMock));

      await expect(
        adjustStock('prod-123', {
          type: 'OUT',
          quantity: 10,
        })
      ).rejects.toThrow('Cannot remove 10 units — only 5 available');

      expect(txMock.stockMovement.create).not.toHaveBeenCalled();
    });

    it('handles stock ADJUSTMENT to direct quantity', async () => {
      const txMock = {
        product: {
          findUnique: jest.fn().mockResolvedValue(mockProduct),
          update: jest.fn().mockResolvedValue({ ...mockProduct, stock: 0 }),
        },
        inventory: {
          upsert: jest.fn().mockResolvedValue(mockInventory),
          update: jest.fn().mockResolvedValue({ ...mockInventory, quantity: 0 }),
        },
        stockMovement: {
          create: jest.fn().mockResolvedValue({ id: 'mov-3' }),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(txMock));

      const result = await adjustStock('prod-123', {
        type: 'ADJUSTMENT',
        quantity: 0,
        reason: 'Physical inventory audit zero count',
      });

      expect(txMock.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'prod-123' },
        data: { quantity: 0 },
        select: expect.any(Object),
      });
      expect(result.quantity).toBe(0);
    });

    it('handles RETURN type adjustment', async () => {
      const txMock = {
        product: {
          findUnique: jest.fn().mockResolvedValue(mockProduct),
          update: jest.fn().mockResolvedValue({ ...mockProduct, stock: 27 }),
        },
        inventory: {
          upsert: jest.fn().mockResolvedValue(mockInventory),
          update: jest.fn().mockResolvedValue({ ...mockInventory, quantity: 27 }),
        },
        stockMovement: {
          create: jest.fn().mockResolvedValue({ id: 'mov-4' }),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(txMock));

      const result = await adjustStock('prod-123', {
        type: 'RETURN',
        quantity: 2,
        reason: 'Customer return',
      });

      expect(txMock.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'prod-123' },
        data: { quantity: 27 },
        select: expect.any(Object),
      });
      expect(result.quantity).toBe(27);
    });

    it('throws NotFoundError if product not found', async () => {
      const txMock = {
        product: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(txMock));

      await expect(
        adjustStock('non-existent', {
          type: 'IN',
          quantity: 5,
        })
      ).rejects.toThrow('Product not found');
    });
  });

  // ─── getStockMovements ─────────────────────────────────────────────────────

  describe('getStockMovements', () => {
    it('returns stock movements for a product ordered by createdAt desc', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: 'prod-123' });
      const mockMovements = [
        {
          id: 'mov-1',
          productId: 'prod-123',
          type: 'IN',
          quantity: 10,
          reason: 'Initial stock',
          createdAt: new Date(),
        },
      ];
      (prisma.stockMovement.findMany as jest.Mock).mockResolvedValue(mockMovements);

      const result = await getStockMovements('prod-123');

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-123' },
        select: { id: true },
      });
      expect(prisma.stockMovement.findMany).toHaveBeenCalledWith({
        where: { productId: 'prod-123' },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('IN');
    });

    it('throws NotFoundError if product does not exist', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getStockMovements('non-existent')).rejects.toThrow('Product not found');
    });
  });

  // ─── getLowStockProducts ───────────────────────────────────────────────────

  describe('getLowStockProducts', () => {
    it('returns products with stock at or below threshold', async () => {
      const lowStockRecords = [
        {
          id: 'inv-low',
          productId: 'prod-low',
          quantity: 4,
          reserved: 1,
          updatedAt: new Date(),
          product: { id: 'prod-low', name: 'Low Stock Item', sku: 'LOW-1', stock: 4 },
        },
      ];
      (prisma.inventory.findMany as jest.Mock).mockResolvedValue(lowStockRecords);

      const result = await getLowStockProducts(10);

      expect(prisma.inventory.findMany).toHaveBeenCalledWith({
        where: { quantity: { lte: 10 } },
        select: expect.any(Object),
        orderBy: { quantity: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].available).toBe(3);
    });
  });

  // ─── Schemas validation ────────────────────────────────────────────────────

  describe('Validation Schemas', () => {
    it('validates valid stock adjustment input', () => {
      const valid = {
        type: 'IN',
        quantity: 50,
        reason: 'Restock',
      };
      const parsed = stockAdjustmentSchema.parse(valid);
      expect(parsed.quantity).toBe(50);
      expect(parsed.type).toBe('IN');
    });

    it('allows quantity 0 for ADJUSTMENT type', () => {
      const valid = {
        type: 'ADJUSTMENT',
        quantity: 0,
      };
      const parsed = stockAdjustmentSchema.parse(valid);
      expect(parsed.quantity).toBe(0);
    });

    it('rejects quantity 0 for IN movement', () => {
      const invalid = {
        type: 'IN',
        quantity: 0,
      };
      expect(() => stockAdjustmentSchema.parse(invalid)).toThrow();
    });

    it('rejects negative quantity', () => {
      const invalid = {
        type: 'IN',
        quantity: -10,
      };
      expect(() => stockAdjustmentSchema.parse(invalid)).toThrow();
    });

    it('rejects unknown movement type', () => {
      const invalid = {
        type: 'INVALID_TYPE',
        quantity: 10,
      };
      expect(() => stockAdjustmentSchema.parse(invalid)).toThrow();
    });

    it('transforms lowStock string in query schema', () => {
      const parsed = inventoryQuerySchema.parse({ lowStock: 'true' });
      expect(parsed.lowStock).toBe(true);

      const parsedFalse = inventoryQuerySchema.parse({ lowStock: 'false' });
      expect(parsedFalse.lowStock).toBe(false);
    });
  });
});
