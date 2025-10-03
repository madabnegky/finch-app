import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  // SVGR plugin has been removed
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared-logic/src'),
    },
  },
  optimizeDeps: {
    include: ['@shared/logic/api/firebase', '@shared/logic/hooks/useAuth', '@shared/logic/hooks/useProjectedBalances', '@shared/logic/hooks/useTransactionInstances', '@shared/logic/utils/currency', '@shared/logic/utils/date'],
  },
});