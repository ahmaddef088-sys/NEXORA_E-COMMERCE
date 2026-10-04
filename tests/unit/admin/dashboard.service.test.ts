/**
 * Unit tests for dashboard.service.ts
 * Tests dashboard analytics, sales reports, admin customers list, and admin payments list.
 */

import {
  getDashboardMetrics,
  getSalesReport,
  listAdminCustomers,
  listAdminPayments,
} from '@/lib/services/dashboard.service';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    order: {
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    payment: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '@/lib/db/prisma';

describe('dashboard.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardMetrics', () => {
    it('aggregates and returns all dashboard metrics', async () => {
      (prisma.order.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 1549.99 },
      });
      (prisma.order.count as jest.Mock)
        .mockResolvedValueOnce(25) // totalOrders
        .mockResolvedValueOnce(4); // pendingOrdersCount
      (prisma.user.count as jest.Mock).mockResolvedValue(12); // totalCustomers
      (prisma.product.count as jest.Mock)
        .mockResolvedValueOnce(50) // totalProducts
        .mockResolvedValueOnce(3); // lowStockCount
      (prisma.order.groupBy as jest.Mock).mockResolvedValue([
        { status: 'DELIVERED', _count: { id: 10 }, _sum: { total: 800 } },
        { status: 'PENDING', _count: { id: 4 }, _sum: { total: 200 } },
      ]);
      (prisma.order.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'ord-1',
          total: 100,
          status: 'PENDING',
          createdAt: new Date('2026-09-01'),
          user: { id: 'u-1', name: 'John Doe', email: 'john@example.com' },
          items: [{ id: 'item-1' }, { id: 'item-2' }],
        },
      ]);

      const metrics = await getDashboardMetrics();

      expect(metrics.totalSales).toBe('1549.99');
      expect(metrics.totalOrders).toBe(25);
      expect(metrics.pendingOrdersCount).toBe(4);
      expect(metrics.totalCustomers).toBe(12);
      expect(metrics.totalProducts).toBe(50);
      expect(metrics.lowStockCount).toBe(3);
      expect(metrics.statusBreakdown.DELIVERED).toEqual({ count: 10, total: '800' });
      expect(metrics.statusBreakdown.PENDING).toEqual({ count: 4, total: '200' });
      expect(metrics.recentOrders).toHaveLength(1);
      expect(metrics.recentOrders[0].itemsCount).toBe(2);
      expect(metrics.recentOrders[0].customer.email).toBe('john@example.com');
    });

    it('handles empty data / zero sales gracefully', async () => {
      (prisma.order.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: null },
      });
      (prisma.order.count as jest.Mock).mockResolvedValue(0);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      (prisma.product.count as jest.Mock).mockResolvedValue(0);
      (prisma.order.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.order.findMany as jest.Mock).mockResolvedValue([]);

      const metrics = await getDashboardMetrics();

      expect(metrics.totalSales).toBe('0.00');
      expect(metrics.totalOrders).toBe(0);
      expect(metrics.statusBreakdown).toEqual({});
      expect(metrics.recentOrders).toEqual([]);
    });
  });

  describe('getSalesReport', () => {
    it('aggregates daily timeline and returns correct averages', async () => {
      const mockOrders = [
        { total: '50.00', createdAt: new Date('2026-09-10T10:00:00Z') },
        { total: '150.00', createdAt: new Date('2026-09-10T14:00:00Z') },
        { total: '100.00', createdAt: new Date('2026-09-11T09:00:00Z') },
      ];
      (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

      const report = await getSalesReport({ period: '30d' });

      expect(report.period).toBe('30d');
      expect(report.totalRevenue).toBe('300.00');
      expect(report.totalOrders).toBe(3);
      expect(report.averageOrderValue).toBe('100.00');
      expect(report.timeline).toHaveLength(2);
      expect(report.timeline[0]).toEqual({
        date: '2026-09-10',
        sales: '200.00',
        orderCount: 2,
      });
      expect(report.timeline[1]).toEqual({
        date: '2026-09-11',
        sales: '100.00',
        orderCount: 1,
      });
    });

    it('handles period with zero orders', async () => {
      (prisma.order.findMany as jest.Mock).mockResolvedValue([]);

      const report = await getSalesReport({ period: '7d' });

      expect(report.period).toBe('7d');
      expect(report.totalRevenue).toBe('0.00');
      expect(report.totalOrders).toBe(0);
      expect(report.averageOrderValue).toBe('0.00');
      expect(report.timeline).toEqual([]);
    });
  });

  describe('listAdminCustomers', () => {
    it('lists customers with order count and total spent calculation', async () => {
      const mockUsers = [
        {
          id: 'u-1',
          name: 'Alice',
          email: 'alice@example.com',
          role: 'CUSTOMER',
          createdAt: new Date('2026-01-01'),
          orders: [
            { total: '120.00', status: 'DELIVERED' },
            { total: '80.00', status: 'PROCESSING' },
            { total: '50.00', status: 'CANCELLED' }, // Cancelled should be excluded from spent
          ],
        },
      ];

      (prisma.$transaction as jest.Mock).mockResolvedValue([mockUsers, 1]);

      const result = await listAdminCustomers({ page: 1, limit: 10, sortOrder: 'desc' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('u-1');
      expect(result.data[0].ordersCount).toBe(3);
      expect(result.data[0].totalSpent).toBe('200.00'); // 120 + 80
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('passes search filters when provided', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);

      await listAdminCustomers({ page: 1, limit: 10, search: 'alice', sortOrder: 'asc' });

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('listAdminPayments', () => {
    it('returns paginated payments with associated order and customer data', async () => {
      const mockPayments = [
        {
          id: 'pay-1',
          orderId: 'ord-1',
          amount: '150.00',
          method: 'CARD',
          status: 'PAID',
          transactionId: 'txn-123',
          createdAt: new Date('2026-09-01'),
          updatedAt: new Date('2026-09-01'),
          order: {
            id: 'ord-1',
            status: 'PROCESSING',
            user: { id: 'u-1', name: 'Bob', email: 'bob@example.com' },
          },
        },
      ];

      (prisma.$transaction as jest.Mock).mockResolvedValue([mockPayments, 1]);

      const result = await listAdminPayments({
        page: 1,
        limit: 10,
        status: 'PAID',
        method: 'CARD',
        sortOrder: 'desc',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('pay-1');
      expect(result.data[0].amount).toBe('150.00');
      expect(result.data[0].method).toBe('CARD');
      expect(result.data[0].status).toBe('PAID');
      expect(result.data[0].order.user.email).toBe('bob@example.com');
      expect(result.meta.total).toBe(1);
    });
  });
});
