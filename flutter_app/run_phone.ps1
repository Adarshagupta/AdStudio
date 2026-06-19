# Fast dev launch for a physical Android phone (USB only, arm64 APK, stable adb install).
param(
  [switch]$Attach,
  [switch]$SkipBuild,
  [switch]$Production,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$FlutterArgs
)

Set-Location $PSScriptRoot

$appId = "com.adstudio.app"
$mainActivity = "$appId/.MainActivity"
$cacheDir = "C:\GradleCache\adstudio-project"
$stagingApk = "C:\FlutterBuild\app-debug-staging.apk"
New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $stagingApk) | Out-Null

$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$adb = Join-Path $sdk "platform-tools\adb.exe"

function Invoke-Adb {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$AdbArgs)
  return (& $adb @AdbArgs 2>&1 | ForEach-Object { "$_" })
}

function Ensure-AdbReady {
  $out = Invoke-Adb devices
  if (($out -join "`n") -match "List of devices attached") { return $true }
  Write-Host "ADB not responding." -ForegroundColor Red
  Write-Host "  Admin PowerShell: .\fix_adb_admin.ps1" -ForegroundColor Yellow
  Write-Host "  Then: .\fix_adb.ps1" -ForegroundColor Yellow
  return $false
}

function Get-UsbSerial {
  foreach ($line in (Invoke-Adb devices)) {
    if ($line -match "_adb-tls-connect") { continue }
    if ($line -match "^(\S+)\s+device\s*$") { return $Matches[1] }
  }
  return $null
}

function Clear-OfflineWireless {
  foreach ($line in (Invoke-Adb devices)) {
    if ($line -match "_adb-tls-connect" -and $line -match "offline") {
      $id = ($line -split "\s+")[0]
      Invoke-Adb disconnect $id | Out-Null
    }
  }
}

function Install-ApkWithRetry {
  param(
    [string]$Serial,
    [string]$ApkPath,
    [int]$MaxAttempts = 3
  )

  Copy-Item $ApkPath $stagingApk -Force
  $sizeMb = [math]::Round((Get-Item $stagingApk).Length / 1MB)
  Write-Host "Installing $sizeMb MB APK..." -ForegroundColor Cyan
  Write-Host "Keep phone unlocked and USB connected." -ForegroundColor Yellow

  for ($i = 1; $i -le $MaxAttempts; $i++) {
    if ($i -gt 1) {
      Write-Host "Retry $i of $MaxAttempts..." -ForegroundColor Yellow
      Invoke-Adb kill-server | Out-Null
      Start-Sleep -Seconds 2
      Invoke-Adb start-server | Out-Null
      Start-Sleep -Seconds 2
    }

    $result = Invoke-Adb -s $Serial install -r -d $stagingApk
    $text = $result -join "`n"
    if ($text -match "Success") {
      Write-Host "Install succeeded." -ForegroundColor Green
      return $true
    }
    Write-Host $text -ForegroundColor DarkYellow
    Start-Sleep -Seconds 3
  }
  return $false
}

function Start-Attach {
  param([string]$Serial)
  Invoke-Adb -s $Serial shell am start -n $mainActivity -a android.intent.action.MAIN | Out-Null
  Start-Sleep -Seconds 3
  flutter attach --app-id=$appId -d $Serial --device-timeout=120 @FlutterArgs
  exit $LASTEXITCODE
}

if (-not (Ensure-AdbReady)) { exit 1 }
Clear-OfflineWireless
$usbSerial = Get-UsbSerial
if (-not $usbSerial) {
  Write-Host "No USB device. Plug in phone, enable USB debugging, run .\fix_adb.ps1" -ForegroundColor Red
  Invoke-Adb devices | ForEach-Object { Write-Host $_ }
  exit 1
}

Write-Host "Using USB: $usbSerial" -ForegroundColor Green

if ($Production) {
  $FlutterArgs = @(
    "--dart-define=API_BASE_URL=https://www.litemoov.com/api"
  ) + $FlutterArgs
  Write-Host "API: production (www.litemoov.com)" -ForegroundColor Cyan
}

$apk = "build\app\outputs\flutter-apk\app-debug.apk"

if ($Attach) {
  Start-Attach -Serial $usbSerial
}

if ($SkipBuild -and (Test-Path $apk)) {
  Write-Host "Skip build - installing existing APK..." -ForegroundColor Cyan
  if (-not (Install-ApkWithRetry -Serial $usbSerial -ApkPath $apk)) { exit 1 }
  Start-Attach -Serial $usbSerial
}

Write-Host "Building arm64 APK..." -ForegroundColor Cyan
flutter build apk --debug --target-platform android-arm64 --android-project-cache-dir=$cacheDir @FlutterArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path $apk)) {
  Write-Host "APK not found at $apk" -ForegroundColor Red
  exit 1
}

if (-not (Install-ApkWithRetry -Serial $usbSerial -ApkPath $apk)) {
  Write-Host ""
  Write-Host "Install failed. Try:" -ForegroundColor Red
  Write-Host "  1. Different USB cable / port"
  Write-Host "  2. .\setup_build_junction.ps1 then rebuild"
  Write-Host "  3. Uninstall old app on phone, then retry"
  exit 1
}

Write-Host "Starting app + debugger..." -ForegroundColor Cyan
Start-Attach -Serial $usbSerial
