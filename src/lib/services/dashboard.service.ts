/**
 * Dashboard & Reports service — Admin analytics and metrics aggregation.
 *
 * Security contract:
 * - All methods are restricted to ADMIN role (enforced at API route level).
 * - Sensitive customer data (passwords, salts) is never exposed.
 * - Computations use database-level aggregations for optimal performance.
 */

import { prisma } from '@/lib/db/prisma';
import { buildPaginationMeta } from '@/lib/api/response';
import type { PaginationMeta } from '@/lib/api/response';
import type {
  ReportQuery,
  AdminCustomerQuery,
  AdminPaymentQuery,
} from '@/lib/validation/dashboard.schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DashboardMetrics = {
  totalSales: string;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  pendingOrdersCount: number;
  statusBreakdown: Record<string, { count: number; total: string }>;
  recentOrders: Array<{
    id: string;
    total: string;
    status: string;
    createdAt: Date;
    customer: {
      id: string;
      name: string;
      email: string;
    };
    itemsCount: number;
  }>;
};

export type DailySalesRecord = {
  date: string;
  sales: string;
  orderCount: number;
};

export type CustomerSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
  ordersCount: number;
  totalSpent: string;
  createdAt: Date;
};

export type AdminPaymentSummary = {
  id: string;
  orderId: string;
  amount: string;
  method: string;
  status: string;
  transactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  order: {
    id: string;
    status: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
};

// ─── Dashboard Metrics ─────────────────────────────────────────────────────────

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [
    salesAgg,
    totalOrders,
    pendingOrdersCount,
    totalCustomers,
    totalProducts,
    lowStockCount,
    statusGroups,
    recentOrdersData,
  ] = await Promise.all([
    // Total sales (excluding cancelled orders)
    prisma.order.aggregate({
      where: { status: { not: 'CANCELLED' } },
      _sum: { total: true },
    }),
    // Total orders count
    prisma.order.count(),
    // Pending orders count
    prisma.order.count({
      where: { status: 'PENDING' },
    }),
    // Total registered customers
    prisma.user.count({
      where: { role: 'CUSTOMER' },
    }),
    // Total products in catalog
    prisma.product.count(),
    // Products with stock <= 10
    prisma.product.count({
      where: { stock: { lte: 10 } },
    }),
    // Orders grouped by status
    prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { total: true },
      orderBy: { status: 'asc' },
    }),
    // 5 most recent orders with user and items
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        items: {
          select: { id: true },
        },
      },
    }),
  ]);

  const totalSales = salesAgg._sum.total ? salesAgg._sum.total.toString() : '0.00';

  const statusBreakdown: Record<string, { count: number; total: string }> = {};
  for (const group of statusGroups) {
    statusBreakdown[group.status] = {
      count: group._count?.id ?? 0,
      total: group._sum?.total ? group._sum.total.toString() : '0.00',
    };
  }

  const recentOrders = recentOrdersData.map((order) => ({
    id: order.id,
    total: order.total.toString(),
    status: order.status,
    createdAt: order.createdAt,
    customer: order.user,
    itemsCount: order.items.length,
  }));

  return {
    totalSales,
    totalOrders,
    totalCustomers,
    totalProducts,
    lowStockCount,
    pendingOrdersCount,
    statusBreakdown,
    recentOrders,
  };
}

// ─── Sales Reports ────────────────────────────────────────────────────────────

export async function getSalesReport(query: ReportQuery): Promise<{
  period: string;
  totalRevenue: string;
  totalOrders: number;
  averageOrderValue: string;
  timeline: DailySalesRecord[];
}> {
  const periodDays: Record<string, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    year: 365,
  };

  const days = periodDays[query.period] ?? 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  cutoffDate.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: cutoffDate },
      status: { not: 'CANCELLED' },
    },
    select: {
      total: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const dailyMap: Record<string, { sales: number; count: number }> = {};

  let overallTotal = 0;
  for (const order of orders) {
    const dateStr = order.createdAt.toISOString().split('T')[0];
    const amount = parseFloat(order.total.toString());
    overallTotal += amount;

    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = { sales: 0, count: 0 };
    }
    dailyMap[dateStr].sales += amount;
    dailyMap[dateStr].count += 1;
  }

  const timeline: DailySalesRecord[] = Object.entries(dailyMap).map(([date, data]) => ({
    date,
    sales: data.sales.toFixed(2),
    orderCount: data.count,
  }));

  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? (overallTotal / totalOrders).toFixed(2) : '0.00';

  return {
    period: query.period,
    totalRevenue: overallTotal.toFixed(2),
    totalOrders,
    averageOrderValue,
    timeline,
  };
}

// ─── Admin Customers Management ───────────────────────────────────────────────

export async function listAdminCustomers(query: AdminCustomerQuery): Promise<{
  data: CustomerSummary[];
  meta: PaginationMeta;
}> {
  const { page, limit, search, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where = {
    role: 'CUSTOMER' as const,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        orders: {
          select: {
            total: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: sortOrder },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  const data: CustomerSummary[] = users.map((u) => {
    const validOrders = u.orders.filter((o) => o.status !== 'CANCELLED');
    const spent = validOrders.reduce((acc, o) => acc + parseFloat(o.total.toString()), 0);

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      ordersCount: u.orders.length,
      totalSpent: spent.toFixed(2),
      createdAt: u.createdAt,
    };
  });

  return { data, meta: buildPaginationMeta(page, limit, total) };
}

// ─── Admin Payments Management ────────────────────────────────────────────────

export async function listAdminPayments(query: AdminPaymentQuery): Promise<{
  data: AdminPaymentSummary[];
  meta: PaginationMeta;
}> {
  const { page, limit, status, method, orderId, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(status ? { status } : {}),
    ...(method ? { method } : {}),
    ...(orderId ? { orderId } : {}),
  };

  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      select: {
        id: true,
        orderId: true,
        amount: true,
        method: true,
        status: true,
        transactionId: true,
        createdAt: true,
        updatedAt: true,
        order: {
          select: {
            id: true,
            status: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: sortOrder },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  const data: AdminPaymentSummary[] = payments.map((p) => ({
    id: p.id,
    orderId: p.orderId,
    amount: p.amount.toString(),
    method: p.method,
    status: p.status,
    transactionId: p.transactionId,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    order: p.order,
  }));

  return { data, meta: buildPaginationMeta(page, limit, total) };
}
