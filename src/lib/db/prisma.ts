/**
 * Prisma 7 Client with PostgreSQL driver adapter.
 *
 * Prisma 7 requires an explicit driver adapter (no implicit engine binary).
 * Uses @prisma/adapter-pg with the pg connection pool.
 *
 * In development, Next.js hot-reload creates multiple module instances.
 * We attach the client to globalThis to prevent exhausting DB connections.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from '@/env';
import { logger } from '@/lib/logger';

// ─── Singleton Prisma Client ──────────────────────────────────────────────────

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    // Connection pool settings
    max: env.NODE_ENV === 'production' ? 20 : 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2_000,
  });

  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === 'development'
        ? [
            { level: 'query', emit: 'event' },
            { level: 'warn', emit: 'stdout' },
            { level: 'error', emit: 'stdout' },
          ]
        : [
            { level: 'warn', emit: 'stdout' },
            { level: 'error', emit: 'stdout' },
          ],
  });

  // Log slow queries in development
  if (env.NODE_ENV === 'development') {
    client.$on('query', (e: { query: string; duration: number }) => {
      if (e.duration > 500) {
        logger.warn('Slow query detected', { query: e.query, durationMs: e.duration });
      }
    });
  }

  return client;
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
