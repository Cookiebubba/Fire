import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// one self-contained HTML file — runs from file://, no server needed
export default defineConfig({
  plugins: [viteSingleFile()],
  build: { outDir: 'dist-single' },
});
