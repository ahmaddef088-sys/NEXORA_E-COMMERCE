/**
 * GET /api/health
 *
 * Deep health check endpoint — Phase 20 Production Readiness.
 * Verifies that the application can connect to the database.
 * Used by load balancers, orchestrators (k8s readiness probe), and deployment pipelines.
 *
 * Returns 200 if healthy, 503 if the database is unavailable.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();

  // Verify database connectivity
  let dbStatus: 'ok' | 'error' = 'ok';
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch (error) {
    dbStatus = 'error';
    dbError = error instanceof Error ? error.message : 'Unknown database error';
    logger.error('Health check: database unreachable', error);
  }

  const isHealthy = dbStatus === 'ok';
  const totalMs = Date.now() - startTime;

  const body = {
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'unknown',
    uptime: process.uptime(),
    responseTimeMs: totalMs,
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        ...(dbError ? { error: dbError } : {}),
      },
    },
  };

  return NextResponse.json(body, { status: isHealthy ? 200 : 503 });
}
