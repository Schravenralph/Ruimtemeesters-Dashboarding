import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/client'),
        '@shared': path.resolve(__dirname, './src/shared'),
      },
    },
    server: {
      port: parseInt(env.VITE_DEV_PORT || '3303', 10),
      strictPort: true,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:5022',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist/client',
      sourcemap: true,
    },
  };
});
