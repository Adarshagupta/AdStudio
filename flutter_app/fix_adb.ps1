# Safe ADB check/fix — NEVER kills adb if it is already working.
# If adb daemon is dead, run fix_adb_admin.ps1 as Administrator (do not loop kill here).
param([switch]$Force)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$adb = Join-Path $sdk "platform-tools\adb.exe"

if (-not (Test-Path $adb)) {
  Write-Host "adb not found: $adb" -ForegroundColor Red
  exit 1
}

function Invoke-Adb {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$AdbArgs)
  return (& $adb @AdbArgs 2>&1 | ForEach-Object { "$_" })
}

function Get-AdbDeviceLines {
  $out = Invoke-Adb devices
  $text = $out -join "`n"
  if ($text -notmatch "List of devices attached") { return $null }
  return @($out | Where-Object { $_ -match "\S" -and $_ -notmatch "List of devices attached" })
}

function Get-UsbSerial {
  param([string[]]$Lines)
  foreach ($line in $Lines) {
    if ($line -match "_adb-tls-connect") { continue }
    if ($line -match "^(\S+)\s+device\s*$") { return $Matches[1] }
  }
  return $null
}

Write-Host "=== LiteMoov ADB check ===" -ForegroundColor Cyan
Write-Host ""

$lines = Get-AdbDeviceLines

if ($null -ne $lines) {
  Write-Host "ADB is running." -ForegroundColor Green
} elseif ($Force) {
  Write-Host "ADB not responding. Forcing restart..." -ForegroundColor Yellow
  Get-Process adb -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  Invoke-Adb kill-server | Out-Null
  Start-Sleep -Seconds 1
  Remove-Item Env:ANDROID_ADB_SERVER_PORT -ErrorAction SilentlyContinue
  Invoke-Adb start-server | Out-Null
  Start-Sleep -Seconds 3
  $lines = Get-AdbDeviceLines
} else {
  Write-Host "ADB daemon is not running." -ForegroundColor Red
  Write-Host ""
  Write-Host "Do NOT run this script again - it cannot fix a dead daemon." -ForegroundColor Yellow
  Write-Host "Run PowerShell AS ADMINISTRATOR, then:" -ForegroundColor Yellow
  Write-Host "  cd $PSScriptRoot" -ForegroundColor White
  Write-Host "  .\fix_adb_admin.ps1" -ForegroundColor White
  Write-Host ""
  Write-Host "Then come back to normal PowerShell and run:" -ForegroundColor Yellow
  Write-Host "  .\run_phone.ps1" -ForegroundColor White
  exit 1
}

if ($null -eq $lines) {
  Write-Host "ADB still not responding after restart." -ForegroundColor Red
  Write-Host "Run .\fix_adb_admin.ps1 as Administrator." -ForegroundColor Yellow
  exit 1
}

# Disconnect offline wireless only
foreach ($line in $lines) {
  if ($line -match "_adb-tls-connect" -and $line -match "offline") {
    $id = ($line -split "\s+")[0]
    Write-Host "Disconnecting stale wireless: $id" -ForegroundColor Yellow
    Invoke-Adb disconnect $id | Out-Null
  }
}

Write-Host ""
Write-Host "Devices:" -ForegroundColor Cyan
Invoke-Adb devices -l | ForEach-Object { Write-Host "  $_" }

$fresh = Get-AdbDeviceLines
$usb = Get-UsbSerial -Lines $fresh

Write-Host ""
if ($usb) {
  Write-Host "Ready: $usb" -ForegroundColor Green
  Write-Host "Run: .\run_phone.ps1" -ForegroundColor White
  exit 0
}

Write-Host "ADB works but no USB phone in 'device' state." -ForegroundColor Yellow
Write-Host "Plug in USB cable, enable USB debugging, accept the prompt on phone."
exit 1
