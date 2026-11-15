import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'packages/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@cc68/core': path.resolve(__dirname, './packages/core/src'),
      '@cc68/vision': path.resolve(__dirname, './packages/vision/src'),
      '@cc68/fusion': path.resolve(__dirname, './packages/fusion/src'),
    },
  },
});
