# Install security-scanner for current user on Windows.
# Copies tool to %LOCALAPPDATA%\security-scanner, creates wrappers in %LOCALAPPDATA%\bin,
# and adds that directory to user PATH so npm start, node app.js, etc. are scanned first.
# Usage: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$InstallDir = Join-Path $env:LOCALAPPDATA "security-scanner"
$BinDir = Join-Path $env:LOCALAPPDATA "bin"
$ConfigDir = Join-Path $env:USERPROFILE ".config\security-scanner"
$ConfigFile = Join-Path $ConfigDir "config.json"

# Copy project (exclude dev/git)
$exclude = @(".git", "node_modules", "dist", "*.deb")
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Get-ChildItem -Path $ScriptDir -Exclude $exclude | ForEach-Object {
    if ($_.Name -eq "dist" -or $_.Name -eq "node_modules" -or $_.Name -eq ".git") { return }
    Copy-Item -Path $_.FullName -Destination (Join-Path $InstallDir $_.Name) -Recurse -Force
}

# Ensure bin dir
New-Item -ItemType Directory -Force -Path $BinDir | Out-Null

# Find real node (for running run-wrapper.js and cli.js)
$nodePath = $null
try {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) { $nodePath = $nodeCmd.Source }
} catch {}
if (-not $nodePath) {
    Write-Host "Node.js not found in PATH. Install Node.js and run install.ps1 again."
    exit 1
}
$nodePath = (Resolve-Path $nodePath).Path

# CLI entry: security-scanner.cmd
$cliContent = @"
@echo off
"$nodePath" "$InstallDir\cli.js" %*
"@
Set-Content -Path (Join-Path $BinDir "security-scanner.cmd") -Value $cliContent -Encoding ASCII

# Command wrappers (node, npm, npx, ...)
$wrapperTemplate = Get-Content (Join-Path $InstallDir "bin\wrapper.cmd") -Raw
$commands = @("node", "npm", "npx", "python3", "python", "ruby", "bundle", "rails", "flutter", "dart")
foreach ($cmd in $commands) {
    $realBinary = $null
    try {
        $c = Get-Command $cmd -ErrorAction SilentlyContinue
        if ($c) { $realBinary = (Resolve-Path $c.Source).Path }
    } catch {}
    if (-not $realBinary) { continue }
    $content = $wrapperTemplate `
        -replace "REAL_BINARY_PLACEHOLDER", $nodePath `
        -replace "SCANNER_DIR_PLACEHOLDER", $InstallDir `
        -replace "COMMAND_NAME_PLACEHOLDER", $cmd
    $ext = if ($cmd -eq "node") { ".cmd" } else { ".cmd" }
    Set-Content -Path (Join-Path $BinDir "$cmd$ext") -Value $content -Encoding ASCII
}

# Merge realBinaries into user config
New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null
$env:SECURITY_SCANNER_CONFIG_FILE = $ConfigFile
try {
    $detectOut = & $nodePath (Join-Path $InstallDir "scripts\detect-binaries.js") 2>$null
    if ($detectOut) {
        $detectOut | & $nodePath (Join-Path $InstallDir "scripts\merge-real-binaries.js") 2>$null
    }
} catch {}

# Add BinDir to user PATH if not present
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$BinDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$BinDir;$userPath", "User")
    Write-Host "Added $BinDir to user PATH."
}

Write-Host ""
Write-Host "Installed to: $InstallDir"
Write-Host "CLI:         $BinDir\security-scanner.cmd"
Write-Host "Config:      $ConfigFile"
Write-Host ""
Write-Host "Command wrappers (scan before run): $BinDir\node.cmd, npm.cmd, npx.cmd, ..."
Write-Host "Open a new terminal so PATH is updated. Then npm start, node app.js, etc. will be scanned first."
Write-Host ""
& $nodePath (Join-Path $InstallDir "scripts\banner.js") 2>$null
