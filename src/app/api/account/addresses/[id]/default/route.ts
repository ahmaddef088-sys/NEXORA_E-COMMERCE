/**
 * POST /api/account/addresses/:id/default — Set address as default
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { setDefaultAddress } from '@/lib/services/account.service';
import { successResponse, handleApiError } from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    const address = await setDefaultAddress(id, auth.userId);
    return successResponse(address);
  } catch (error) {
    return handleApiError(error);
  }
}
