import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Django dev server (backend/), started with `python manage.py runserver`.
    proxy: {
      '/v1': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
});
