/**
 * Environment configuration validated with Zod at startup.
 * Any missing or invalid env var will throw immediately — fail fast.
 */
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // Authentication
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRES_IN_SECONDS: z
    .string()
    .default('604800') // 7 days
    .transform(Number)
    .pipe(z.number().int().positive()),

  // Application
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  APP_URL: z.string().url('APP_URL must be a valid URL').default('http://localhost:3000'),

  // Cookie
  COOKIE_NAME: z.string().default('nexora_session'),

  // Inventory
  LOW_STOCK_THRESHOLD: z
    .string()
    .default('5')
    .transform(Number)
    .pipe(z.number().int().nonnegative()),
});

// Parse and export — throws ZodError on startup if any variable is invalid/missing
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export type Env = typeof env;
