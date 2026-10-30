// Danh mục phần mềm cho công cụ "Cài phần mềm" — nguồn dữ liệu duy nhất nằm trong catalog.json.
// Thêm/bớt app chỉ cần sửa JSON rồi chạy `npm run check:catalog`; không phải sửa giao diện.
import raw from './catalog.json';

export interface SoftwareCategory {
  id: string;
  label: string;
}

export interface SoftwareApp {
  /** Định danh nội bộ, duy nhất, dùng làm value của checkbox. */
  id: string;
  name: string;
  publisher: string;
  description: string;
  /** Phải khớp một id trong categories. */
  category: string;
  /** Mã gói winget. Để trống nếu app chưa có trên winget (chỉ hiện link tải thủ công). */
  wingetId?: string;
  homepage: string;
  /** Được chọn bởi nút "Chọn bộ cơ bản". */
  recommended?: boolean;
  /** Ghi chú bản quyền hoặc lưu ý phiên bản. */
  note?: string;
}

export const catalogVersion: number = raw.version;
export const categories = raw.categories as SoftwareCategory[];
export const apps = raw.apps as SoftwareApp[];

const WINGET_ID = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;

/** Kiểm tra toàn vẹn dữ liệu catalog. Trả về danh sách lỗi (rỗng = hợp lệ). */
export function validateCatalog(
  catalogApps: SoftwareApp[] = apps,
  catalogCategories: SoftwareCategory[] = categories,
): string[] {
  const errors: string[] = [];
  const categoryIds = new Set<string>();

  if (catalogCategories.length === 0) errors.push('Chưa có nhóm phần mềm nào.');

  for (const category of catalogCategories) {
    if (!category.id || !category.label) {
      errors.push('Có nhóm phần mềm thiếu id hoặc tên.');
      continue;
    }
    if (categoryIds.has(category.id)) errors.push(`Nhóm bị trùng id: ${category.id}`);
    categoryIds.add(category.id);
  }

  if (catalogApps.length === 0) errors.push('Danh mục chưa có phần mềm nào.');

  const appIds = new Set<string>();
  const wingetIds = new Set<string>();
  let recommended = 0;

  for (const app of catalogApps) {
    if (!app.id || !app.name || !app.publisher || !app.description) {
      errors.push(`Phần mềm thiếu thông tin bắt buộc: ${app.id || app.name || '(không tên)'}`);
      continue;
    }
    if (appIds.has(app.id)) errors.push(`Phần mềm bị trùng id: ${app.id}`);
    appIds.add(app.id);

    if (!categoryIds.has(app.category)) {
      errors.push(`${app.name} thuộc nhóm không tồn tại: ${app.category}`);
    }
    if (!/^https:\/\//.test(app.homepage)) {
      errors.push(`${app.name} có homepage không phải https.`);
    }
    if (app.wingetId) {
      if (!WINGET_ID.test(app.wingetId)) {
        errors.push(`${app.name} có wingetId không hợp lệ: ${app.wingetId}`);
      } else if (wingetIds.has(app.wingetId)) {
        errors.push(`wingetId bị trùng: ${app.wingetId}`);
      }
      wingetIds.add(app.wingetId);
    }
    if (app.recommended) recommended += 1;
  }

  if (recommended === 0) errors.push('Chưa đánh dấu phần mềm nào là "Cơ bản".');

  return errors;
}
