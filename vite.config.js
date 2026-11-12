import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    __SERVER_FORWARD_CONSOLE__: false,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normId = id.replace(/\\/g, '/');
          if (normId.includes('node_modules/three/')) {
            return 'three-core';
          }
          if (
            normId.includes('node_modules/@react-three/') ||
            normId.includes('node_modules/postprocessing/')
          ) {
            return 'r3f-scene';
          }
          if (
            normId.includes('node_modules/framer-motion/') ||
            normId.includes('node_modules/howler/') ||
            normId.includes('node_modules/@supabase/')
          ) {
            return 'app-vendors';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'api/**/*.test.js'],
  },
});
