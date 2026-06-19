# Reconnect to the app already on your phone — no Gradle build, no APK install.
Set-Location $PSScriptRoot
& "$PSScriptRoot\run_phone.ps1" -Attach @args
