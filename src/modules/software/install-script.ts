// Sinh script PowerShell dùng winget để cài các phần mềm đã chọn.
// Hàm thuần, không đụng DOM: dễ kiểm tra và không phụ thuộc trạng thái giao diện.
import type { SoftwareApp } from './catalog';

export const SCRIPT_FILENAME = 'device-check-apps.ps1';

export interface ScriptOptions {
  /** URL công khai của trang, ghi vào phần đầu script. */
  siteUrl: string;
  /** Thời điểm tạo; mặc định là bây giờ. */
  generatedAt?: Date;
}

type WingetApp = SoftwareApp & { wingetId: string };

/** Chỉ giữ app có wingetId hợp lệ để đưa vào script. */
function withWinget(apps: SoftwareApp[]): WingetApp[] {
  return apps.filter(
    (app): app is WingetApp => typeof app.wingetId === 'string' && app.wingetId.length > 0,
  );
}

/** Bọc chuỗi trong nháy đơn của PowerShell, nhân đôi nháy đơn bên trong. */
function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function stamp(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

/**
 * Toàn bộ nội dung file .ps1. Không chèn bất cứ dữ liệu nào do người dùng nhập;
 * ID đến từ catalog tĩnh đã được kiểm tra bằng regex.
 */
export function buildPowerShell(apps: SoftwareApp[], opts: ScriptOptions): string {
  const chosen = withWinget(apps);
  const created = stamp(opts.generatedAt ?? new Date());
  const lines: string[] = [
    '# Device Check - cài phần mềm hàng loạt bằng winget',
    `# Tạo ngày ${created} - ${opts.siteUrl}`,
    '# Script chỉ chứa lệnh cài đặt từ danh mục tĩnh của trang; không tải mã từ xa.',
    '# Cách chạy: powershell -NoProfile -ExecutionPolicy Bypass -File .\\device-check-apps.ps1',
    '# Hoặc chuột phải vào file > Run with PowerShell.',
    '',
    "$ErrorActionPreference = 'Continue'",
    '',
    'if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {',
    "  Write-Host 'Không tìm thấy winget trên máy này.' -ForegroundColor Red",
    "  Write-Host 'Hãy cài \"App Installer\" từ Microsoft Store (Windows 10 1809+ hoặc Windows 11), rồi chạy lại script.'",
    "  Read-Host 'Nhấn Enter để đóng'",
    '  exit 1',
    '}',
    '',
    '$ok = 0',
    '$fail = 0',
    '',
    `Write-Host 'Bắt đầu cài ${chosen.length} phần mềm...' -ForegroundColor Green`,
  ];

  for (const app of chosen) {
    lines.push(
      '',
      `Write-Host ${quote(`==> ${app.name}`)} -ForegroundColor Cyan`,
      `winget install --id ${app.wingetId} --exact --silent --accept-package-agreements --accept-source-agreements`,
      `if ($LASTEXITCODE -eq 0) { $ok++ } else { $fail++; Write-Warning ${quote(
        `Không cài được ${app.name}. Xem thông báo phía trên.`,
      )} }`,
    );
  }

  lines.push(
    '',
    "Write-Host ''",
    'Write-Host "Xong: $ok thành công, $fail lỗi." -ForegroundColor Green',
    "Read-Host 'Nhấn Enter để đóng'",
    '',
  );

  return lines.join('\r\n');
}

/** Một dòng lệnh PowerShell để dán trực tiếp (nút "Sao chép lệnh"). */
export function buildWingetOneLiner(apps: SoftwareApp[]): string {
  return withWinget(apps)
    .map(
      (app) =>
        `winget install --id ${app.wingetId} --exact --silent --accept-package-agreements --accept-source-agreements`,
    )
    .join('; ');
}
