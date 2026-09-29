import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTPS + host:true so a phone on the same Wi-Fi can open this dev server
// directly (e.g. https://<your-lan-ip>:5173/ops) and use its rear camera —
// getUserMedia only grants camera access on localhost or a secure (https)
// origin, and mobile browsers can't reach "localhost" on your laptop.
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true,
    port: 5173,
    // Django dev server (backend/), started with `python manage.py runserver`.
    proxy: {
      '/v1': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
});
