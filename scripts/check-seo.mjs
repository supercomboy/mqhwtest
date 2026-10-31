// Kiểm tra SEO cơ bản trên bản build: chạy sau `vite build`.
// Không phụ thuộc thư viện ngoài; chỉ đọc HTML/robots/sitemap đã sinh trong dist/.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SITE_URL = (process.env.SITE_URL ?? 'https://mqtech.onrender.com').replace(/\/$/, '');
const NOINDEX = process.env.VITE_NOINDEX === '1';
const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');

const PAGES = [
  { file: 'index.html', path: '/' },
  { file: 'test-ban-phim/index.html', path: '/test-ban-phim/' },
  { file: 'test-loa/index.html', path: '/test-loa/' },
  { file: 'test-micro/index.html', path: '/test-micro/' },
  { file: 'test-camera/index.html', path: '/test-camera/' },
];

const errors = [];

const read = (file) => readFileSync(join(DIST, file), 'utf8');

for (const page of PAGES) {
  const file = join(DIST, page.file);
  if (!existsSync(file)) {
    errors.push(`Thiếu ${page.file}`);
    continue;
  }
  const html = read(page.file);

  if (html.includes('%SITE_URL%') || html.includes('%PAGE_PATH%')) {
    errors.push(`${page.file}: còn placeholder chưa thay`);
  }

  const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? '';
  if (title.length < 15 || title.length > 70) {
    errors.push(`${page.file}: title dài ${title.length} ký tự`);
  }

  const description = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i)?.[1] ?? '';
  if (description.length < 80 || description.length > 180) {
    errors.push(`${page.file}: description dài ${description.length} ký tự`);
  }

  const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i)?.[1] ?? '';
  if (canonical !== `${SITE_URL}${page.path}`) {
    errors.push(`${page.file}: canonical sai (${canonical})`);
  }

  const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1Count !== 1) errors.push(`${page.file}: có ${h1Count} thẻ H1`);

  if (!html.includes('application/ld+json')) {
    errors.push(`${page.file}: thiếu JSON-LD`);
  }
  if (!html.includes('property="og:image"')) {
    errors.push(`${page.file}: thiếu og:image`);
  }

  const robots = html.match(/<meta[^>]*name="robots"[^>]*content="([^"]*)"/i)?.[1] ?? '';
  const expectedRobots = NOINDEX ? 'noindex,nofollow' : 'index,follow';
  if (robots !== expectedRobots) {
    errors.push(`${page.file}: robots là "${robots}", cần "${expectedRobots}"`);
  }

  if (/src="\/src\//.test(html)) {
    errors.push(`${page.file}: còn đường dẫn /src/ chưa build`);
  }
}

const sitemapPath = join(DIST, 'sitemap.xml');
if (!existsSync(sitemapPath)) {
  errors.push('Thiếu sitemap.xml');
} else {
  const sitemap = readFileSync(sitemapPath, 'utf8');
  for (const page of PAGES) {
    const url = `${SITE_URL}${page.path}`;
    if (!sitemap.includes(`<loc>${url}</loc>`)) errors.push(`Sitemap thiếu ${url}`);
  }
}

const robotsPath = join(DIST, 'robots.txt');
if (!existsSync(robotsPath)) {
  errors.push('Thiếu robots.txt');
} else {
  const robots = readFileSync(robotsPath, 'utf8');
  if (!robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`)) {
    errors.push('robots.txt thiếu dòng Sitemap');
  }
}

if (errors.length > 0) {
  console.error(`SEO check thất bại (${errors.length} lỗi):`);
  for (const message of errors) console.error(` - ${message}`);
  process.exit(1);
}

console.log(`SEO OK: ${PAGES.length} trang, sitemap + robots hợp lệ${NOINDEX ? ' (noindex)' : ''}`);
