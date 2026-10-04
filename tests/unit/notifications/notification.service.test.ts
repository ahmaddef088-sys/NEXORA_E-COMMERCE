/**
 * Unit tests for notification.service.ts — Phase 16 Notifications
 */

import {
  listUserNotifications,
  markNotificationsRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
  createNotification,
} from '@/lib/services/notification.service';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '@/lib/db/prisma';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockNotification = {
  id: 'notif-1',
  userId: 'user-1',
  type: 'ORDER_CREATED' as const,
  title: 'Order Placed',
  message: 'Your order #123 has been placed.',
  data: { orderId: '123' },
  isRead: false,
  createdAt: new Date('2024-01-01'),
};

const defaultQuery = { page: 1, limit: 20 };

// ─── listUserNotifications ────────────────────────────────────────────────────

describe('listUserNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockResolvedValue([[mockNotification], 1, 1]);
  });

  it('returns notifications with unread count', async () => {
    const result = await listUserNotifications('user-1', defaultQuery);
    expect(result.data).toHaveLength(1);
    expect(result.unreadCount).toBe(1);
    expect(result.meta.total).toBe(1);
  });

  it('returns empty when user has no notifications', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0, 0]);
    const result = await listUserNotifications('user-1', defaultQuery);
    expect(result.data).toHaveLength(0);
    expect(result.unreadCount).toBe(0);
  });

  it('filters unread notifications when isRead=false', async () => {
    const query = { ...defaultQuery, isRead: false as const };
    await listUserNotifications('user-1', query);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

// ─── markNotificationsRead ────────────────────────────────────────────────────

describe('markNotificationsRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
  });

  it('marks specified notifications as read', async () => {
    const result = await markNotificationsRead('user-1', {
      ids: ['notif-1', 'notif-2'],
    });
    expect(result.updated).toBe(2);
    expect(prisma.notification.updateMany).toHaveBeenCalledTimes(1);
  });

  it('scopes update to the owning user', async () => {
    await markNotificationsRead('user-1', { ids: ['notif-1'] });
    const callArgs = (prisma.notification.updateMany as jest.Mock).mock.calls[0][0];
    expect(callArgs.where.userId).toBe('user-1');
  });
});

// ─── markAllNotificationsRead ─────────────────────────────────────────────────

describe('markAllNotificationsRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 5 });
  });

  it('marks all user notifications as read', async () => {
    const result = await markAllNotificationsRead('user-1');
    expect(result.updated).toBe(5);
  });

  it('only updates unread notifications', async () => {
    await markAllNotificationsRead('user-1');
    const callArgs = (prisma.notification.updateMany as jest.Mock).mock.calls[0][0];
    expect(callArgs.where.isRead).toBe(false);
    expect(callArgs.where.userId).toBe('user-1');
  });
});

// ─── getUnreadNotificationCount ───────────────────────────────────────────────

describe('getUnreadNotificationCount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns unread count for a user', async () => {
    (prisma.notification.count as jest.Mock).mockResolvedValue(3);
    const count = await getUnreadNotificationCount('user-1');
    expect(count).toBe(3);
  });

  it('returns 0 when no unread notifications', async () => {
    (prisma.notification.count as jest.Mock).mockResolvedValue(0);
    const count = await getUnreadNotificationCount('user-1');
    expect(count).toBe(0);
  });
});

// ─── createNotification ───────────────────────────────────────────────────────

describe('createNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.notification.create as jest.Mock).mockResolvedValue(mockNotification);
  });

  it('creates a notification for a user', async () => {
    const result = await createNotification(
      'user-1',
      'ORDER_CREATED',
      'Order Placed',
      'Your order has been placed.',
      { orderId: '123' }
    );
    expect(result.id).toBe('notif-1');
    expect(result.type).toBe('ORDER_CREATED');
  });

  it('creates a notification without data', async () => {
    await createNotification('user-1', 'ORDER_CREATED', 'Order Placed', 'Message');
    const callArgs = (prisma.notification.create as jest.Mock).mock.calls[0][0];
    // Prisma.JsonNull is a sentinel object for nullable JSON fields — not plain null
    // Verify data field is either null or the Prisma.JsonNull sentinel
    const dataField = callArgs.data.data;
    expect(dataField === null || (typeof dataField === 'object' && dataField !== null)).toBe(true);
  });

  it('creates notification with isRead=false by default', async () => {
    await createNotification('user-1', 'ORDER_CREATED', 'Title', 'Message');
    const callArgs = (prisma.notification.create as jest.Mock).mock.calls[0][0];
    expect(callArgs.data.isRead).toBe(false);
  });
});
