import { z } from 'zod';

export const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    SMS_PROVIDER: z.enum(['console', 'kavenegar', 'farazsms']).default('console'),
    KAVENEGAR_API_KEY: z.string().optional(),
    FARAZSMS_API_KEY: z.string().optional(),
    ZARINPAL_MERCHANT_ID: z.string().optional(),
    SENTRY_DSN: z.string().url().optional(),
    STRICT_PROD_CHECK: z.string().optional(),
    NEXT_PUBLIC_MAP_API_KEY: z.string().optional(),
    MAPIR_API_KEY: z.string().optional(),
  })
  .refine(
    (data) => {
      // Prohibit the default development placeholder secret when strict production check is active
      const isStrict =
        data.STRICT_PROD_CHECK === 'true' ||
        (data.NODE_ENV === 'production' &&
          process.env.STRICT_PROD_CHECK === 'true');

      if (isStrict) {
        return (
          data.SESSION_SECRET !==
          'loqme-development-session-super-secret-key-change-in-production-32c'
        );
      }
      return true;
    },
    {
      message: 'Default development SESSION_SECRET is strictly prohibited in production mode',
      path: ['SESSION_SECRET'],
    }
  );

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(rawEnv: Record<string, any> = process.env): EnvConfig {
  const result = envSchema.safeParse({
    DATABASE_URL: rawEnv.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/loqme?schema=public',
    SESSION_SECRET: rawEnv.SESSION_SECRET || 'loqme-development-session-super-secret-key-change-in-production-32c',
    NODE_ENV: rawEnv.NODE_ENV || 'development',
    PORT: rawEnv.PORT,
    NEXT_PUBLIC_APP_URL: rawEnv.NEXT_PUBLIC_APP_URL,
    SMS_PROVIDER: rawEnv.SMS_PROVIDER || 'console',
    KAVENEGAR_API_KEY: rawEnv.KAVENEGAR_API_KEY,
    FARAZSMS_API_KEY: rawEnv.FARAZSMS_API_KEY,
    ZARINPAL_MERCHANT_ID: rawEnv.ZARINPAL_MERCHANT_ID,
    SENTRY_DSN: rawEnv.SENTRY_DSN,
    STRICT_PROD_CHECK: rawEnv.STRICT_PROD_CHECK,
    NEXT_PUBLIC_MAP_API_KEY: rawEnv.NEXT_PUBLIC_MAP_API_KEY,
    MAPIR_API_KEY: rawEnv.MAPIR_API_KEY,
  });

  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
    throw new Error(`Environment configuration validation failed: ${JSON.stringify(result.error.flatten().fieldErrors)}`);
  }

  return result.data;
}

export const env = validateEnv();

