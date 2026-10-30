// Kiểm tra toàn vẹn src/modules/software/catalog.json bằng Node thuần (không cần cài thêm gì).
// Chạy: npm run check:catalog (được gọi tự động trong npm run build).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const catalogPath = fileURLToPath(new URL('../src/modules/software/catalog.json', import.meta.url));
const WINGET_ID = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;

let data;
try {
  data = JSON.parse(readFileSync(catalogPath, 'utf8'));
} catch (error) {
  console.error(`Không đọc được catalog: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const errors = [];
const categories = Array.isArray(data.categories) ? data.categories : [];
const apps = Array.isArray(data.apps) ? data.apps : [];
const categoryIds = new Set();

if (data.version !== 1) errors.push(`version phải là 1 (đang là ${String(data.version)}).`);
if (categories.length === 0) errors.push('Chưa có nhóm phần mềm nào.');
if (apps.length === 0) errors.push('Danh mục chưa có phần mềm nào.');

for (const category of categories) {
  if (typeof category?.id !== 'string' || typeof category?.label !== 'string' || !category.id || !category.label) {
    errors.push('Có nhóm phần mềm thiếu id hoặc tên.');
    continue;
  }
  if (categoryIds.has(category.id)) errors.push(`Nhóm bị trùng id: ${category.id}`);
  categoryIds.add(category.id);
}

const appIds = new Set();
const wingetIds = new Set();
let recommended = 0;

for (const app of apps) {
  if (
    typeof app?.id !== 'string' ||
    typeof app?.name !== 'string' ||
    typeof app?.publisher !== 'string' ||
    typeof app?.description !== 'string' ||
    !app.id ||
    !app.name ||
    !app.publisher ||
    !app.description
  ) {
    errors.push(`Phần mềm thiếu thông tin bắt buộc: ${app?.id ?? '(không tên)'}`);
    continue;
  }

  if (appIds.has(app.id)) errors.push(`Phần mềm bị trùng id: ${app.id}`);
  appIds.add(app.id);

  if (!categoryIds.has(app.category)) {
    errors.push(`${app.name} thuộc nhóm không tồn tại: ${String(app.category)}`);
  }
  if (typeof app.homepage !== 'string' || !/^https:\/\//.test(app.homepage)) {
    errors.push(`${app.name} có homepage không phải https.`);
  }
  if (app.wingetId !== undefined) {
    if (typeof app.wingetId !== 'string' || !WINGET_ID.test(app.wingetId)) {
      errors.push(`${app.name} có wingetId không hợp lệ: ${String(app.wingetId)}`);
    } else {
      if (wingetIds.has(app.wingetId)) errors.push(`wingetId bị trùng: ${app.wingetId}`);
      wingetIds.add(app.wingetId);
    }
  }
  if (app.recommended === true) recommended += 1;
}

if (recommended === 0) errors.push('Chưa đánh dấu phần mềm nào là "Cơ bản".');

if (errors.length > 0) {
  console.error(`Catalog có ${errors.length} lỗi:`);
  for (const message of errors) console.error(` - ${message}`);
  process.exit(1);
}

console.log(`OK: ${apps.length} apps / ${categories.length} categories (${recommended} recommended)`);
