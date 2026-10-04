/**
 * Notification service — Phase 16.
 *
 * Security contract:
 * - Notifications are always scoped to the owning user (never cross-user).
 * - Only the owning user (or admin) can list/read/mark their notifications.
 * - Notifications are created internally by server events, never directly by users.
 */

import { prisma } from '@/lib/db/prisma';
import { buildPaginationMeta } from '@/lib/api/response';
import type { PaginationMeta } from '@/lib/api/response';
import type { NotificationQuery, MarkReadInput } from '@/lib/validation/notification.schema';
import { Prisma, type NotificationType } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SafeNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: Date;
};

export type NotificationListResult = {
  data: SafeNotification[];
  meta: PaginationMeta;
  unreadCount: number;
};

// ─── Selectors ────────────────────────────────────────────────────────────────

const notificationSelect = {
  id: true,
  userId: true,
  type: true,
  title: true,
  message: true,
  data: true,
  isRead: true,
  createdAt: true,
} as const;

// ─── List notifications for a user ───────────────────────────────────────────

export async function listUserNotifications(
  userId: string,
  query: NotificationQuery
): Promise<NotificationListResult> {
  const { page, limit, isRead } = query;
  const skip = (page - 1) * limit;

  const where: {
    userId: string;
    isRead?: boolean;
  } = { userId };

  if (isRead !== undefined) {
    where.isRead = isRead;
  }

  const [data, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      select: notificationSelect,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    data: data as SafeNotification[],
    meta: buildPaginationMeta(page, limit, total),
    unreadCount,
  };
}

// ─── Mark specific notifications as read ─────────────────────────────────────

export async function markNotificationsRead(
  userId: string,
  input: MarkReadInput
): Promise<{ updated: number }> {
  const result = await prisma.notification.updateMany({
    where: {
      id: { in: input.ids },
      userId, // Security: only update notifications belonging to this user
    },
    data: { isRead: true },
  });

  return { updated: result.count };
}

// ─── Mark all notifications as read ──────────────────────────────────────────

export async function markAllNotificationsRead(userId: string): Promise<{ updated: number }> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { updated: result.count };
}

// ─── Get unread notification count ───────────────────────────────────────────

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

// ─── Create notification (internal — called by order/payment events) ──────────

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<SafeNotification> {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data !== undefined ? (data as Prisma.InputJsonValue) : Prisma.JsonNull,
      isRead: false,
    },
    select: notificationSelect,
  });

  return notification as SafeNotification;
}

/**
 * Create a notification within a transaction.
 * Use this when creating notifications as part of order/payment creation.
 */
export async function createNotificationInTx(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<SafeNotification> {
  const notification = await tx.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data !== undefined ? (data as Prisma.InputJsonValue) : Prisma.JsonNull,
      isRead: false,
    },
    select: notificationSelect,
  });

  return notification as SafeNotification;
}
