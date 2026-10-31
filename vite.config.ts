import { mkdirSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// Tên miền canonical. Đổi một chỗ này khi chuyển sang tên miền riêng.
const SITE_URL = (process.env.SITE_URL ?? 'https://mqtech.onrender.com').replace(/\/$/, '');

// Bản GitHub Pages chỉ để dự phòng: chặn index để tránh trùng với Render.
const NOINDEX = process.env.VITE_NOINDEX === '1';

const PAGES = [
  { path: '/', file: 'index.html', priority: '1.0' },
  { path: '/test-ban-phim/', file: 'test-ban-phim/index.html', priority: '0.9' },
  { path: '/test-loa/', file: 'test-loa/index.html', priority: '0.9' },
  { path: '/test-micro/', file: 'test-micro/index.html', priority: '0.9' },
  { path: '/test-camera/', file: 'test-camera/index.html', priority: '0.9' },
] as const;

const input = Object.fromEntries(
  PAGES.map((page) => [
    page.file === 'index.html' ? 'main' : page.file.replace('/index.html', ''),
    resolve(process.cwd(), page.file),
  ]),
);

/** Thay URL canonical/OG, thêm robots meta và sinh sitemap/robots khi build. */
function seoPlugin(): Plugin {
  return {
    name: 'seo-pages',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const file = relative(process.cwd(), ctx.filename).replace(/\\/g, '/');
        const page = PAGES.find((item) => item.file === file);
        const pagePath = page?.path ?? '/';

        let output = html
          .replaceAll('%SITE_URL%', SITE_URL)
          .replaceAll('%PAGE_PATH%', pagePath);

        const robots = NOINDEX ? 'noindex,nofollow' : 'index,follow';
        output = output.replace(
          '</head>',
          `  <meta name="robots" content="${robots}" />\n  </head>`,
        );

        return output;
      },
    },
    closeBundle() {
      const outDir = resolve(process.cwd(), 'dist');
      const today = new Date().toISOString().slice(0, 10);
      mkdirSync(outDir, { recursive: true });

      const urls = PAGES.map(
        (page) => `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
      ).join('\n');

      writeFileSync(
        resolve(outDir, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
      );

      writeFileSync(
        resolve(outDir, 'robots.txt'),
        `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`,
      );
    },
  };
}

// base './' giúp đường dẫn tài nguyên đúng cả với Render ở gốc miền lẫn
// GitHub Pages dạng https://<user>.github.io/<repo>/, không cần sửa theo tên repo.
export default defineConfig({
  base: './',
  plugins: [seoPlugin()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: { input },
  },
});
