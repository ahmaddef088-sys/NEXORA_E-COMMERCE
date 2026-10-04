/**
 * POST /api/notifications/read-all — Mark ALL notifications as read for the user
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { markAllNotificationsRead } from '@/lib/services/notification.service';
import { successResponse, handleApiError } from '@/lib/api/response';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const result = await markAllNotificationsRead(auth.userId);
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
