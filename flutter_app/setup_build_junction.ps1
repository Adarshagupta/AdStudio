# Move flutter build/ off OneDrive (prevents adb install failures + file locks).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$buildLink = Join-Path $PSScriptRoot "build"
$buildTarget = "C:\FlutterBuild\adstudio"

if (Test-Path $buildLink) {
  $item = Get-Item $buildLink -Force
  if ($item.LinkType -eq "Junction") {
    Write-Host "build/ already junctioned to $($item.Target)" -ForegroundColor Green
    exit 0
  }
  Write-Host "Removing existing build/ folder (will rebuild)..." -ForegroundColor Yellow
  Remove-Item $buildLink -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $buildTarget | Out-Null
cmd /c mklink /J "$buildLink" "$buildTarget" | Out-Null
Write-Host "Linked build/ -> $buildTarget" -ForegroundColor Green
Write-Host "Run: flutter clean && .\run_phone.ps1"
