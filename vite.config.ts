import { defineConfig } from 'vite';

export default defineConfig({
  // 相對路徑：部署在 GitHub Pages 的子路徑（/VegeKiller/）底下也能正確載入
  base: './',
  server: { port: 5173, open: true },
  build: { target: 'es2022' },
});
