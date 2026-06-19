# Run as Administrator when adb daemon will not start.
#Requires -RunAsAdministrator

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$adb = Join-Path $sdk "platform-tools\adb.exe"

Write-Host "=== ADB admin fix ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Stopping adb + WinNAT..." -ForegroundColor Yellow
Get-Process adb -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
net stop winnat 2>&1 | Out-Null
Start-Sleep -Seconds 2
& $adb kill-server 2>&1 | Out-Null
Start-Sleep -Seconds 2

Write-Host "[2] Starting adb server..." -ForegroundColor Yellow
Remove-Item Env:ANDROID_ADB_SERVER_PORT -ErrorAction SilentlyContinue
$startOut = & $adb start-server 2>&1 | ForEach-Object { "$_" }
if ($startOut) { $startOut | ForEach-Object { Write-Host "  $_" } }
Start-Sleep -Seconds 4

Write-Host "[3] Restarting WinNAT..." -ForegroundColor Yellow
net start winnat 2>&1 | Out-Null
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "[4] Device list:" -ForegroundColor Cyan
$devices = & $adb devices -l 2>&1 | ForEach-Object { "$_" }
$devices | ForEach-Object { Write-Host "  $_" }

$ok = ($devices -join "`n") -match "List of devices attached"
if (-not $ok) {
  Write-Host ""
  Write-Host "ADB still broken. Also try:" -ForegroundColor Red
  Write-Host "  - Reboot PC"
  Write-Host "  - Android Studio > SDK Manager > reinstall Platform-Tools"
  Write-Host "  - Windows Security exclusion for: $sdk\platform-tools"
  exit 1
}

Write-Host ""
Write-Host "Success. In normal PowerShell run:" -ForegroundColor Green
Write-Host "  cd $PSScriptRoot"
Write-Host "  .\fix_adb.ps1"
Write-Host "  .\run_phone.ps1"
