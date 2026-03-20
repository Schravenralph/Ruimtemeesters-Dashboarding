import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/client'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    port: parseInt(process.env.VITE_DEV_PORT || '3000', 10),
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist/client',
    sourcemap: true,
  },
});
