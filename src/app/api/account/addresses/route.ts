/**
 * GET  /api/account/addresses — List the authenticated user's addresses
 * POST /api/account/addresses — Add a new address
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { createAddressSchema } from '@/lib/validation/account.schema';
import { listAddresses, createAddress } from '@/lib/services/account.service';
import { successResponse, createdResponse, handleApiError } from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const addresses = await listAddresses(auth.userId);
    return successResponse(addresses);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const input = await parseBody(request, createAddressSchema);
    const address = await createAddress(auth.userId, input);
    return createdResponse(address);
  } catch (error) {
    return handleApiError(error);
  }
}
