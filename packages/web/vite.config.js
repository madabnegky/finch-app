import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Add this section to correctly handle monorepo dependencies
  resolve: {
    preserveSymlinks: true
  }
})