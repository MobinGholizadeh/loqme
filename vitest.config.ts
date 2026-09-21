import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
      '@loqme/types': path.resolve(__dirname, './packages/types/src'),
      '@loqme/validation': path.resolve(__dirname, './packages/validation/src'),
      '@loqme/design-tokens': path.resolve(__dirname, './packages/design-tokens/src'),
      '@loqme/api': path.resolve(__dirname, './packages/api/src'),
    },
  },
});
