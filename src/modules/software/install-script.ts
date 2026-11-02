// Sinh file cài đặt một chạm (.bat) dùng winget cho các phần mềm đã chọn.
// Hàm thuần, không đụng DOM: dễ kiểm tra và không phụ thuộc trạng thái giao diện.
import type { SoftwareApp } from './catalog';

export const SCRIPT_FILENAME = 'device-check-apps.bat';

/** Dấu phân cách phần batch và phần PowerShell trong cùng một file .bat. */
const PS_MARKER = '#:PS';

/** App Installer ghim phiên bản: 1.29.380 (phát hành 21/09/2026). */
const APP_INSTALLER_URL =
  'https://github.com/microsoft/winget-cli/releases/download/v1.29.380/Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle';
const APP_INSTALLER_SHA256 = '65DEA9C01CE08EE7B763366B27C0E651F97DB857C11CA9B9C301826C10092F2E';
/** Phụ thuộc chính thức Microsoft công bố cho App Installer 1.29.380. */
const VCLIBS_URL = 'https://aka.ms/Microsoft.VCLibs.x64.14.00.Desktop.appx';
const WIN_APP_RUNTIME_URL =
  'https://aka.ms/windowsappsdk/1.8/latest/windowsappruntimeinstall-x64.exe';

export interface ScriptOptions {
  /** URL công khai của trang, ghi vào phần đầu script. */
  siteUrl: string;
  /** Thời điểm tạo; mặc định là bây giờ. */
  generatedAt?: Date;
}

type WingetApp = SoftwareApp & { wingetId: string };

/**
 * Mã thoát của winget khi gói đã ở bản mới nhất và không có gì để nâng cấp
 * (APPINSTALLER_CLI_ERROR_UPDATE_NOT_APPLICABLE, 0x8A15002B).
 */
const EXIT_ALREADY_LATEST = -1978335189;

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

/**
 * Khối cài một app + phân loại kết quả. winget trả mã 0x8A15002B khi app đã ở
 * bản mới nhất — đó không phải lỗi, nên phải tách khỏi $fail.
 */
function appInstallBlock(app: WingetApp): string[] {
  return [
    '',
    `Write-Host ${quote(`==> ${app.name}`)} -ForegroundColor Cyan`,
    `winget install --id ${app.wingetId} --exact --silent --accept-package-agreements --accept-source-agreements`,
    '$code = $LASTEXITCODE',
    'if ($code -eq 0) { $ok++ }',
    `elseif ($code -eq ${EXIT_ALREADY_LATEST}) {`,
    '  $skip++',
    `  Write-Host ${quote('   Đã ở bản mới nhất, bỏ qua.')} -ForegroundColor DarkGray`,
    '} else {',
    `  winget list --id ${app.wingetId} --exact --accept-source-agreements | Out-Null`,
    '  if ($LASTEXITCODE -eq 0) {',
    '    $skip++',
    `    Write-Host ${quote('   Phần mềm đã có trên máy, không có bản nâng cấp.')} -ForegroundColor DarkGray`,
    '  } else {',
    '    $fail++',
    `    $failed += ${quote(app.name)}`,
    `    Write-Warning (${quote(
      `Không cài được ${app.name} (mã 0x{0:X8}). Xem thông báo phía trên.`,
    )} -f $code)`,
    '  }',
    '}',
  ];
}

function stamp(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

/**
 * Phần đầu file .bat: cmd chỉ đọc tới `exit /b`, sau đó gọi PowerShell đọc lại
 * chính file này bằng UTF-8 và chạy phần nằm sau dấu `#:PS`.
 */
function batchHeader(): string[] {
  return [
    '@echo off',
    'chcp 65001 >nul',
    'setlocal',
    'set "DC_SELF=%~f0"',
    'powershell -NoProfile -ExecutionPolicy Bypass -Command "$c=[IO.File]::ReadAllLines($env:DC_SELF,[Text.Encoding]::UTF8);$i=[Array]::IndexOf($c,\'#:PS\');iex ($c[($i+1)..($c.Length-1)] -join [char]10)"',
    'set "DC_EXIT=%ERRORLEVEL%"',
    'endlocal & exit /b %DC_EXIT%',
    PS_MARKER,
  ];
}

/** Khối tự nâng quyền: mở lại chính file .bat bằng quyền Administrator đúng một lần. */
function elevationBlock(): string[] {
  return [
    '$isAdmin = (New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)',
    'if (-not $isAdmin) {',
    "  Write-Host 'Cần quyền quản trị để cài phần mềm. Đang mở lại cửa sổ với quyền Administrator...' -ForegroundColor Yellow",
    '  try {',
    '    Start-Process -FilePath $env:ComSpec -ArgumentList \'/c\',(\'"\' + $env:DC_SELF + \'"\') -Verb RunAs -ErrorAction Stop',
    '  } catch {',
    "    Write-Host 'Không mở được cửa sổ quản trị (có thể bạn đã từ chối hộp thoại UAC).' -ForegroundColor Red",
    "    Read-Host 'Nhấn Enter để đóng'",
    '    exit 1',
    '  }',
    '  exit 0',
    '}',
  ];
}

/**
 * Khối kiểm tra winget và (chỉ khi người dùng đồng ý) tự cài App Installer.
 * Đây là ngoại lệ duy nhất được tải file về: 3 gói chính thức của Microsoft,
 * App Installer được ghim phiên bản và kiểm tra SHA-256.
 */
function wingetRepairBlock(): string[] {
  return [
    'function Test-Winget {',
    '  return [bool](Get-Command winget -ErrorAction SilentlyContinue)',
    '}',
    '',
    'if (-not (Test-Winget)) {',
    "  Write-Host 'Không tìm thấy winget (App Installer) trên máy này.' -ForegroundColor Yellow",
    '  $build = [Environment]::OSVersion.Version.Build',
    '  if ($build -lt 17763) {',
    '    Write-Host "Windows này quá cũ (build $build). winget cần Windows 10 1809 (build 17763) trở lên." -ForegroundColor Red',
    "    Read-Host 'Nhấn Enter để đóng'",
    '    exit 1',
    '  }',
    "  Write-Host 'Có thể cài winget từ nguồn chính thức của Microsoft:'",
    "  Write-Host '  - VCLibs 14.00 (x64)'",
    "  Write-Host '  - Windows App Runtime 1.8 (x64)'",
    "  Write-Host '  - App Installer 1.29.380 (ghim phiên bản, kiểm tra SHA-256)'",
    "  Write-Host 'Dung lượng khoảng 220 MB. Không cài thêm phần mềm nào khác.'",
    "  $answer = Read-Host 'Đồng ý tải và cài winget? (y/N)'",
    "  if ($answer -notmatch '^(y|yes|c|co|có)$') {",
    "    Write-Host 'Đã bỏ qua. Bạn có thể tự cài \"App Installer\" từ Microsoft Store rồi chạy lại file này.' -ForegroundColor Yellow",
    "    Write-Host 'Hoặc tải bản chính thức tại https://github.com/microsoft/winget-cli/releases/latest'",
    "    Read-Host 'Nhấn Enter để đóng'",
    '    exit 1',
    '  }',
    '',
    "  $dir = Join-Path $env:TEMP 'device-check-winget'",
    '  New-Item -ItemType Directory -Force -Path $dir | Out-Null',
    '  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12',
    "  $vcLibs = Join-Path $dir 'Microsoft.VCLibs.x64.14.00.Desktop.appx'",
    "  $runtime = Join-Path $dir 'WindowsAppRuntimeInstall-x64.exe'",
    "  $appInstaller = Join-Path $dir 'Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle'",
    '  try {',
    "    Write-Host 'Đang tải VCLibs...'",
    `    Invoke-WebRequest -UseBasicParsing -Uri '${VCLIBS_URL}' -OutFile $vcLibs`,
    "    Write-Host 'Đang tải Windows App Runtime 1.8...'",
    `    Invoke-WebRequest -UseBasicParsing -Uri '${WIN_APP_RUNTIME_URL}' -OutFile $runtime`,
    "    Write-Host 'Đang tải App Installer 1.29.380...'",
    `    Invoke-WebRequest -UseBasicParsing -Uri '${APP_INSTALLER_URL}' -OutFile $appInstaller`,
    '  } catch {',
    '    Write-Host "Không tải được gói cài đặt: $($_.Exception.Message)" -ForegroundColor Red',
    "    Read-Host 'Nhấn Enter để đóng'",
    '    exit 1',
    '  }',
    '',
    `  $expected = '${APP_INSTALLER_SHA256}'`,
    '  $actual = (Get-FileHash -Algorithm SHA256 -Path $appInstaller).Hash',
    '  if ($actual -ne $expected) {',
    "    Write-Host 'SHA-256 của App Installer không khớp. Đã dừng để an toàn.' -ForegroundColor Red",
    "    Read-Host 'Nhấn Enter để đóng'",
    '    exit 1',
    '  }',
    '',
    '  try {',
    "    Write-Host 'Đang cài VCLibs...'",
    '    Add-AppxPackage -Path $vcLibs -ErrorAction SilentlyContinue',
    "    Write-Host 'Đang cài Windows App Runtime 1.8...'",
    "    Start-Process -FilePath $runtime -ArgumentList '--quiet' -Wait",
    "    Write-Host 'Đang cài App Installer...'",
    '    Add-AppxPackage -Path $appInstaller',
    '  } catch {',
    '    Write-Host "Cài winget không thành công: $($_.Exception.Message)" -ForegroundColor Red',
    "    Write-Host 'Hãy cài \"App Installer\" từ Microsoft Store rồi chạy lại file này.' -ForegroundColor Yellow",
    "    Read-Host 'Nhấn Enter để đóng'",
    '    exit 1',
    '  }',
    '',
    '  $env:Path = "$env:LocalAppData\\Microsoft\\WindowsApps;$env:Path"',
    '  if (-not (Test-Winget)) {',
    "    Write-Host 'Đã cài gói nhưng chưa gọi được winget. Hãy mở cửa sổ mới rồi chạy lại file này.' -ForegroundColor Yellow",
    "    Read-Host 'Nhấn Enter để đóng'",
    '    exit 1',
    '  }',
    "  Write-Host 'Đã có winget, tiếp tục cài phần mềm.' -ForegroundColor Green",
    '}',
  ];
}

/**
 * Toàn bộ nội dung file .bat. Không chèn dữ liệu người dùng nhập; ID đến từ
 * catalog tĩnh đã được kiểm tra bằng regex.
 */
export function buildBatch(apps: SoftwareApp[], opts: ScriptOptions): string {
  const chosen = withWinget(apps);
  const created = stamp(opts.generatedAt ?? new Date());

  const lines: string[] = [
    ...batchHeader(),
    '# Device Check - cài phần mềm hàng loạt bằng winget',
    `# Tạo ngày ${created} - ${opts.siteUrl}`,
    '# Chạy: nháy đúp file này (Windows sẽ hỏi quyền Administrator một lần).',
    '# File tự gọi PowerShell có sẵn của Windows; chỉ cài các ID trong danh mục tĩnh của trang.',
    '',
    "$ErrorActionPreference = 'Continue'",
    '[Console]::OutputEncoding = [Text.Encoding]::UTF8',
    '',
    ...elevationBlock(),
    '',
    ...wingetRepairBlock(),
    '',
    '$ok = 0',
    '$skip = 0',
    '$fail = 0',
    '$failed = @()',
    '',
    `Write-Host 'Bắt đầu cài ${chosen.length} phần mềm...' -ForegroundColor Green`,
  ];

  for (const app of chosen) {
    lines.push(...appInstallBlock(app));
  }

  lines.push(
    '',
    "Write-Host ''",
    'Write-Host "Xong: $ok cài đặt, $skip đã có sẵn, $fail lỗi." -ForegroundColor Green',
    "if ($fail -gt 0) { Write-Host \"Không cài được: $($failed -join ', ')\" -ForegroundColor Yellow }",
    "Read-Host 'Nhấn Enter để đóng'",
    '',
  );

  return lines.join('\r\n');
}

/**
 * Toàn bộ nội dung file .ps1 (giữ lại cho ai muốn chạy script PowerShell thuần).
 * Không chèn bất cứ dữ liệu nào do người dùng nhập; ID đến từ catalog tĩnh.
 */
export function buildPowerShell(apps: SoftwareApp[], opts: ScriptOptions): string {
  const chosen = withWinget(apps);
  const created = stamp(opts.generatedAt ?? new Date());
  const lines: string[] = [
    '# Device Check - cài phần mềm hàng loạt bằng winget',
    `# Tạo ngày ${created} - ${opts.siteUrl}`,
    '# Script chỉ chứa lệnh cài đặt từ danh mục tĩnh của trang; không tải mã từ xa.',
    '# Cách chạy: powershell -NoProfile -ExecutionPolicy Bypass -File .\\device-check-apps.ps1',
    '',
    "$ErrorActionPreference = 'Continue'",
    '',
    'if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {',
    "  Write-Host 'Không tìm thấy winget trên máy này.' -ForegroundColor Red",
    "  Write-Host 'Hãy tải file .bat từ trang để script tự cài winget, hoặc cài \"App Installer\" từ Microsoft Store.'",
    "  Read-Host 'Nhấn Enter để đóng'",
    '  exit 1',
    '}',
    '',
    '$ok = 0',
    '$skip = 0',
    '$fail = 0',
    '$failed = @()',
    '',
    `Write-Host 'Bắt đầu cài ${chosen.length} phần mềm...' -ForegroundColor Green`,
  ];

  for (const app of chosen) {
    lines.push(...appInstallBlock(app));
  }

  lines.push(
    '',
    "Write-Host ''",
    'Write-Host "Xong: $ok cài đặt, $skip đã có sẵn, $fail lỗi." -ForegroundColor Green',
    "if ($fail -gt 0) { Write-Host \"Không cài được: $($failed -join ', ')\" -ForegroundColor Yellow }",
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
