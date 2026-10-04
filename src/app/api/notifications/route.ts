/**
 * GET  /api/notifications         — List user's notifications (authenticated)
 * POST /api/notifications/read    — Mark specific notifications as read (authenticated)
 * POST /api/notifications/read-all — Mark ALL notifications as read (authenticated)
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseQuery } from '@/lib/validation';
import { notificationQuerySchema } from '@/lib/validation/notification.schema';
import { listUserNotifications } from '@/lib/services/notification.service';
import { successResponse, handleApiError } from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const query = parseQuery(request.nextUrl.searchParams, notificationQuerySchema);
    const result = await listUserNotifications(auth.userId, query);
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
