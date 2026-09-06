import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  SMS_PROVIDER: z.enum(['console', 'kavenegar', 'farazsms']).default('console'),
  KAVENEGAR_API_KEY: z.string().optional(),
  FARAZSMS_API_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadConfig(): EnvConfig {
  const result = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/loqme?schema=public',
    SESSION_SECRET: process.env.SESSION_SECRET || 'loqme-development-session-super-secret-key-change-in-production-32c',
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SMS_PROVIDER: process.env.SMS_PROVIDER || 'console',
    KAVENEGAR_API_KEY: process.env.KAVENEGAR_API_KEY,
    FARAZSMS_API_KEY: process.env.FARAZSMS_API_KEY,
  });

  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
    throw new Error('Environment configuration validation failed');
  }

  return result.data;
}

export const env = loadConfig();
