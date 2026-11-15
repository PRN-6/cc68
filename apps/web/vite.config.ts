import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@cc68/core': path.resolve(__dirname, '../../packages/core/src'),
      '@cc68/vision': path.resolve(__dirname, '../../packages/vision/src'),
      '@cc68/fusion': path.resolve(__dirname, '../../packages/fusion/src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
