import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Tauri expects a fixed port for development
  server: {
    port: 3002,
    strictPort: true,
  },

  // Environment variable prefix
  envPrefix: ['VITE_', 'TAURI_'],

  resolve: {
    alias: {
      '@ntv/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },

  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
