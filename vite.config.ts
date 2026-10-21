import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { host: '0.0.0.0', port: 5000, strictPort: false, allowedHosts: ['5312bb7c-f5cb-4141-bb2b-a0c85aa47a31-00-3oefu38ln6rzu.picard.replit.dev'] }, test: { environment: 'node' } });
