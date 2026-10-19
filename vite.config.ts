import { defineConfig } from 'vite';

// base './' giúp đường dẫn tài nguyên đúng cả với GitHub Pages dạng
// https://<user>.github.io/<repo>/ lẫn tên miền riêng, không cần sửa theo tên repo.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
