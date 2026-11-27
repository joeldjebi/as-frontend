import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

/** Espace boutique (boutique.vite.ci) : même code et même style que le back-office, compilé à part dans dist-boutique/ */
export default defineConfig({
  root: resolve(__dirname, 'boutique'),
  base: './',
  plugins: [react()],
  envDir: __dirname,
  publicDir: false,
  server: { port: 5175, fs: { allow: [__dirname] } },
  build: { outDir: resolve(__dirname, 'dist-boutique'), emptyOutDir: true },
});
