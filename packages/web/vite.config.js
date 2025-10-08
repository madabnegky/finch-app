import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // --- THIS IS THE FIX ---
  // Add this server configuration
  server: {
    fs: {
      // Allow serving files from one level up (the project root)
      allow: ['..'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared-logic/src'),
      '@shared-assets': path.resolve(__dirname, '../shared-assets'),
    },
  },
  optimizeDeps: {
    include: ['@shared/logic/api/firebase', '@shared/logic/hooks/useAuth', '@shared/logic/hooks/useProjectedBalances', '@shared/logic/hooks/useTransactionInstances', '@shared/logic/utils/currency', '@shared/logic/utils/date'],
  },
});