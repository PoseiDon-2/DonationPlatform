import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist' // ต้องเป็น dist เพื่อให้ตรงกับ vercel.json
    }
});