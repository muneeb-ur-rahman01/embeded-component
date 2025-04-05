import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/embeded-component/', // 👈 Important!
  optimizeDeps: {
    exclude: ['lucide-react'],
    
  },
});
