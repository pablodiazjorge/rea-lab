# Prepares the current PowerShell session to run rea and the lab tools from tools.json.
# Usage: . .\env.ps1   (dot-sourced, so the variables stay in this session only)
# Nothing is written to the user or machine environment.

$root = $PSScriptRoot
$manifest = Get-Content -Raw -LiteralPath (Join-Path $root 'tools.json') | ConvertFrom-Json

function Get-ToolFolder([string]$id) {
    $tool = $manifest.tools | Where-Object { $_.id -eq $id }
    return Join-Path (Join-Path $root 'tools') $tool.dir
}

$env:GHIDRA_INSTALL_DIR = Get-ToolFolder 'ghidra'
$env:JAVA_HOME = Get-ToolFolder 'jdk'
$env:REA_ANALYSIS_PROVIDER = 'ghidra'

$paths = @(
    (Join-Path $root 'node_modules\.bin'),
    (Join-Path (Get-ToolFolder 'llvm-mingw') 'bin')
)
foreach ($path in $paths) {
    if (($env:PATH -split ';') -notcontains $path) {
        $env:PATH = "$path;$env:PATH"
    }
}

$missing = @($env:GHIDRA_INSTALL_DIR, $env:JAVA_HOME) + $paths | Where-Object { -not (Test-Path -LiteralPath $_) }
if ($missing) {
    Write-Warning "Missing: $($missing -join ', '). Run: node scripts/setup.mjs"
}
