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
      // Loopback only by default. The Vite dev server exposes source, .env
      // contents via /@fs/, HMR, and has a steady history of path-traversal
      // CVEs — never wildcard-bind it on a public-facing host. Opt in via
      // VITE_DEV_HOST=0.0.0.0 if you genuinely need LAN access from another
      // device, behind a trusted network.
      host: env.VITE_DEV_HOST || '127.0.0.1',
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
