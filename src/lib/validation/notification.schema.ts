/**
 * Zod validation schemas for Notifications (Phase 16).
 */

import { z } from 'zod';
import { paginationSchema } from './index';

// ─── Notification query ───────────────────────────────────────────────────────

export const notificationQuerySchema = paginationSchema.extend({
  isRead: z
    .string()
    .optional()
    .transform((v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      return undefined;
    }),
});

export type NotificationQuery = z.infer<typeof notificationQuerySchema>;

// ─── Mark as read ─────────────────────────────────────────────────────────────

export const markReadSchema = z.object({
  ids: z
    .array(z.string().uuid('Each ID must be a valid UUID'))
    .min(1, 'At least one notification ID is required'),
});

export type MarkReadInput = z.infer<typeof markReadSchema>;
