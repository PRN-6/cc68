# EyeHand (cc68) - Windows Executable Build Pipeline
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "         EYEHAND (cc68) - BUILDING WINDOWS EXECUTABLE           " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

# 1. Compile Web / UI Assets
Write-Host "1. Building TypeScript & Web UI Assets..." -ForegroundColor Green
pnpm --filter web build

# 2. Compile Native Windows Launcher & Win32 Mouse Injection Executable
Write-Host "2. Compiling EyeHand.exe (Native Windows Executable with Win32 Mouse Injection)..." -ForegroundColor Green
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
& $csc /target:winexe /r:System.Windows.Forms.dll /r:System.Drawing.dll /out:"$root\EyeHand.exe" "$root\scripts\Launcher.cs"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "SUCCESS! Windows Executable Created:" -ForegroundColor Green
Get-Item "$root\EyeHand.exe" | Format-Table Name, Length, LastWriteTime
Write-Host "You can double-click 'EyeHand.exe' to launch EyeHand on Windows!" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan

