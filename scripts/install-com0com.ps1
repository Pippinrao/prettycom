#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Install signed com0com and create COM10 <-> COM11 test port pair.
#>
$ErrorActionPreference = "Stop"

function Get-SetupcPath {
    foreach ($root in @(${env:ProgramFiles(x86)}, $env:ProgramFiles)) {
        if (-not $root) { continue }
        $candidate = Join-Path $root "com0com\setupc.exe"
        if (Test-Path $candidate) { return $candidate }
    }
    return Join-Path ${env:ProgramFiles(x86)} "com0com\setupc.exe"
}

$SetupcPath = Get-SetupcPath
$ZipUrl = "https://downloads.sourceforge.net/project/com0com/com0com/3.0.0.0/com0com-3.0.0.0-i386-and-x64-signed.zip"
$DownloadTimeoutSec = if ($env:PRETTYCOM_COM0COM_DOWNLOAD_TIMEOUT_SEC) { [int]$env:PRETTYCOM_COM0COM_DOWNLOAD_TIMEOUT_SEC } else { 300 }
$InstallTimeoutSec = if ($env:PRETTYCOM_COM0COM_INSTALL_TIMEOUT_SEC) { [int]$env:PRETTYCOM_COM0COM_INSTALL_TIMEOUT_SEC } else { 600 }
$ZipPath = Join-Path $env:TEMP "com0com-3.0.0.0-signed.zip"
$ExtractDir = Join-Path $env:TEMP "com0com-signed-extract"
$PortA = if ($env:PRETTYCOM_TEST_PORT_A) { $env:PRETTYCOM_TEST_PORT_A } else { "COM10" }
$PortB = if ($env:PRETTYCOM_TEST_PORT_B) { $env:PRETTYCOM_TEST_PORT_B } else { "COM11" }

function Download-Com0comArchive {
    Write-Host "Downloading signed com0com from SourceForge..."
    if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
        & curl.exe -L --fail --retry 3 --retry-delay 5 --connect-timeout 30 --max-time $DownloadTimeoutSec -o $ZipPath $ZipUrl
        if ($LASTEXITCODE -ne 0) {
            throw "curl download failed (exit $LASTEXITCODE)"
        }
    } else {
        Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath -UseBasicParsing -TimeoutSec $DownloadTimeoutSec
    }
    $magic = [System.Text.Encoding]::ASCII.GetString([System.IO.File]::ReadAllBytes($ZipPath)[0..1])
    if ($magic -ne "PK") {
        throw "Downloaded file is not a zip archive. Check network or SourceForge mirror."
    }
}

function Get-SignedSetupPath {
    if (Test-Path $ExtractDir) {
        Remove-Item $ExtractDir -Recurse -Force
    }
    Expand-Archive -Path $ZipPath -DestinationPath $ExtractDir -Force
    $setup = Get-ChildItem -Path $ExtractDir -Filter "*x64*signed*.exe" -File | Select-Object -First 1
    if (-not $setup) {
        throw "Signed x64 setup.exe not found inside com0com archive."
    }
    return $setup.FullName
}

function Install-Com0com {
    if (Test-Path $SetupcPath) {
        Write-Host "com0com already installed at $SetupcPath"
        return
    }
    Download-Com0comArchive
    $setupPath = Get-SignedSetupPath
    Write-Host "Running silent install: $setupPath"
    $env:CNC_INSTALL_COMX_COMX_PORTS = "YES"
    $process = Start-Process -FilePath $setupPath -ArgumentList "/S" -PassThru
    if (-not $process.WaitForExit($InstallTimeoutSec * 1000)) {
        try { $process.Kill() } catch { }
        throw "com0com setup timed out after ${InstallTimeoutSec}s. Driver install may require reboot or be blocked by policy."
    }
    if ($process.ExitCode -ne 0) {
        throw "com0com setup exited with code $($process.ExitCode). Check driver signing policy."
    }
    if (-not (Test-Path $SetupcPath)) {
        throw "com0com setup finished but setupc.exe not found. Reboot may be required, then re-run this script."
    }
}

function Ensure-PortPair {
    param([string]$A, [string]$B)
    Write-Host "Ensuring null-modem pair $A <-> $B ..."
    $setupDir = Split-Path $SetupcPath -Parent
    Push-Location $setupDir
    try {
        $list = & $SetupcPath list 2>&1 | Out-String
        if ($list -match [regex]::Escape($A) -and $list -match [regex]::Escape($B)) {
            Write-Host "Port pair already configured."
            return
        }
        & $SetupcPath install "PortName=$A" "PortName=$B"
        if ($LASTEXITCODE -ne 0) {
            throw "setupc install failed (exit $LASTEXITCODE). Ports may be in use or driver not loaded."
        }
    } finally {
        Pop-Location
    }
}

try {
    Install-Com0com
    Ensure-PortPair -A $PortA -B $PortB
    Write-Host "com0com ready: $PortA <-> $PortB"
    Write-Host "If ports are unavailable, reboot once after first driver install."
} catch {
    Write-Error $_
    Write-Host ""
    Write-Host "Troubleshooting:"
    Write-Host "  1. Approve UAC when Cursor triggers elevated install"
    Write-Host "  2. Reboot after first install, then: npm run test:ports:check"
    Write-Host "  3. Corporate policy may block legacy signed drivers"
    exit 1
}
