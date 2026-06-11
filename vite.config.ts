import { defineConfig } from 'vite';

// relative base so the build runs from any host path (itch.io-style
// subdirectory hosting, game portals, file:// previews)
export default defineConfig({
  base: './',
});
