import { defineConfig } from 'vitest/config';
import path from 'path';

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
