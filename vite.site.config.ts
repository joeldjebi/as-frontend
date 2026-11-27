import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

/** Boutique en ligne (as.vite.ci/acheter) : compilée à part dans dist-site/ */
export default defineConfig({
  root: resolve(__dirname, 'site'),
  base: './',
  plugins: [react()],
  envDir: __dirname,
  publicDir: false,
  server: { port: 5176, fs: { allow: [__dirname] } },
  build: { outDir: resolve(__dirname, 'dist-site'), emptyOutDir: true },
});
