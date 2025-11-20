import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/index.ts')
        }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          preload: resolve(__dirname, 'src/preload.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    plugins: [react()],
    resolve: {
      preserveSymlinks: true
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/index.html'),
          preferences: resolve(__dirname, 'src/preferences.html')
        }
      }
    }
  }
});
