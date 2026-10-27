import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 3000,
    // (the projects' originals: not the site's, and big — a file still being
    // copied in there would stop the server)
    watch: { ignored: ['**/source-videos/**'] },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        work: resolve(__dirname, 'work.html'),
        works: resolve(__dirname, 'works.html'),
      },
    },
  },
});
