/**
 * POST /api/notifications/read — Mark specific notifications as read
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { markReadSchema } from '@/lib/validation/notification.schema';
import { markNotificationsRead } from '@/lib/services/notification.service';
import { successResponse, handleApiError } from '@/lib/api/response';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const input = await parseBody(request, markReadSchema);
    const result = await markNotificationsRead(auth.userId, input);
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
