import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  plugins: [svelte(), ...(mode === 'singlefile' ? [viteSingleFile()] : [])],
  build:
    mode === 'singlefile'
      ? { outDir: 'dist-singlefile', cssCodeSplit: false }
      : { outDir: 'dist' },
}));
