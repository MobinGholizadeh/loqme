import 'dotenv/config';
import { defineConfig } from 'vitest/config';
import path from 'path';

// Target disposable test database so integration tests and RLS suites pass cleanly without mutating developer data
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('_test_')) {
  const dbPort = process.env.POSTGRES_PORT || '5432';
  process.env.DATABASE_MIGRATION_URL = `postgresql://postgres:postgres@localhost:${dbPort}/loqme_onboarding_test_local?schema=public`;
  process.env.DATABASE_URL = `postgresql://loqme_runtime:${process.env.DATABASE_RUNTIME_PASSWORD || 'ci-runtime-test-only-password-123456'}@localhost:${dbPort}/loqme_onboarding_test_local?schema=public`;
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['apps/web/src/**/*.{ts,tsx}', 'apps/web/public/sw.js', 'packages/*/src/**/*.{ts,tsx}', 'scripts/*.{ts,cjs}'],
      exclude: ['**/*.d.ts'],
      reporter: ['text', 'html', 'json', 'json-summary', 'lcov'],
      reportOnFailure: true,
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
      '@loqme/types': path.resolve(__dirname, './packages/types/src'),
      '@loqme/validation': path.resolve(__dirname, './packages/validation/src'),
      '@loqme/design-tokens': path.resolve(__dirname, './packages/design-tokens/src'),
      '@loqme/api': path.resolve(__dirname, './packages/api/src'),
      'react-bits': path.resolve(__dirname, './packages/react-bits/src'),
    },
  },
});
