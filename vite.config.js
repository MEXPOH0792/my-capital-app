import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'));

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // IMPORTANT: lucide-react must be matched BEFORE the generic react
          // check, otherwise `includes('react')` swallows it into vendor-react
          // (lucide-react was contributing ~80 KB of icons into the React
          // vendor chunk and never tree-shook properly).
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('zustand')) return 'vendor-state';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('react/jsx-runtime')) {
            return 'vendor-react';
          }
          return 'vendor';
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 3030,
  },
});
