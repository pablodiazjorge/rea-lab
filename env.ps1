# Prepares the current PowerShell session to run rea with Ghidra.
# Usage: . .\env.ps1   (dot-sourced, so the variables stay in the session)
# Temporary: phase F1 replaces the hard-coded versions with tools.json.

$root = $PSScriptRoot

$env:GHIDRA_INSTALL_DIR = Join-Path $root 'tools\ghidra_12.1.4_PUBLIC'
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-23'
$env:REA_ANALYSIS_PROVIDER = 'ghidra'

$bin = Join-Path $root 'node_modules\.bin'
if (($env:PATH -split ';') -notcontains $bin) {
    $env:PATH = "$bin;$env:PATH"
}

foreach ($path in @($env:GHIDRA_INSTALL_DIR, $env:JAVA_HOME, (Join-Path $bin 'rea.cmd'))) {
    if (-not (Test-Path -LiteralPath $path)) {
        Write-Warning "Missing: $path"
    }
}
