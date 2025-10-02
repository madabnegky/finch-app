import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// Import the SVGR plugin
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  // svgr() must be here to handle the "?react" import suffix.
  plugins: [
    react(),
    svgr(),
  ],

  resolve: {
    alias: {
      // Alias for the shared logic
      '@shared': path.resolve(__dirname, '../shared-logic/src'),

      // Alias for the 'web/src' directory. This handles the "@/..." import.
      '@': path.resolve(__dirname, './src'),
    },
  },
});