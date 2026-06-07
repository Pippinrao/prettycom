#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Replace broken com0com v3 (unsigned on Win11) with v2.2.2.0 fre-signed build.
#>
$ErrorActionPreference = "Stop"

$PortA = if ($env:PRETTYCOM_TEST_PORT_A) { $env:PRETTYCOM_TEST_PORT_A } else { "COM10" }
$PortB = if ($env:PRETTYCOM_TEST_PORT_B) { $env:PRETTYCOM_TEST_PORT_B } else { "COM11" }
$V2ZipUrl = "https://sourceforge.net/projects/com0com/files/com0com/2.2.2.0/com0com-2.2.2.0-x64-fre-signed.zip/download"
$WorkDir = Join-Path $env:TEMP "prettycom-com0com-v2"
$ZipPath = Join-Path $env:TEMP "com0com-2.2.2.0-x64-fre-signed.zip"

function Get-SetupcPath {
    foreach ($root in @(${env:ProgramFiles(x86)}, $env:ProgramFiles)) {
        if (-not $root) { continue }
        $candidate = Join-Path $root "com0com\setupc.exe"
        if (Test-Path $candidate) { return $candidate }
    }
    return $null
}

function Remove-OldCom0com {
    $uninstall = Join-Path ${env:ProgramFiles(x86)} "com0com\uninstall.exe"
    if (Test-Path $uninstall) {
        Write-Host "Uninstalling previous com0com..."
        $env:CNC_UNINSTALL_COMX_COMX_PORTS = "YES"
        Start-Process -FilePath $uninstall -ArgumentList "/S" -Wait | Out-Null
        Start-Sleep -Seconds 2
    }
    Get-PnpDevice -ErrorAction SilentlyContinue |
        Where-Object { $_.InstanceId -match "COM0COM" } |
        ForEach-Object {
            Write-Host "Removing device $($_.InstanceId) ..."
            try { pnputil /remove-device $_.InstanceId /subtree /force 2>&1 | Out-Null } catch {}
            try { Remove-PnpDevice -InstanceId $_.InstanceId -Confirm:$false -ErrorAction SilentlyContinue } catch {}
        }
}

function Install-V2Signed {
    Write-Host "Downloading com0com 2.2.2.0 fre-signed..."
    if (Test-Path $WorkDir) { Remove-Item $WorkDir -Recurse -Force }
    & curl.exe -L -o $ZipPath $V2ZipUrl
    Expand-Archive -Path $ZipPath -DestinationPath $WorkDir -Force
    $setup = Get-ChildItem -Path $WorkDir -Recurse -Filter "setup.exe" | Select-Object -First 1
    if (-not $setup) { throw "v2 setup.exe not found in archive" }
    Write-Host "Installing $($setup.FullName) ..."
    $env:CNC_INSTALL_COMX_COMX_PORTS = "YES"
    $proc = Start-Process -FilePath $setup.FullName -ArgumentList "/S" -Wait -PassThru
    if ($proc.ExitCode -ne 0) {
        throw "v2 setup exited with $($proc.ExitCode)"
    }
}

function Ensure-PortPair {
    param([string]$A, [string]$B)
    $setupc = Get-SetupcPath
    if (-not $setupc) { throw "setupc.exe not found after install" }
    Push-Location (Split-Path $setupc -Parent)
    try {
        $list = & $setupc list 2>&1 | Out-String
        if ($list -match [regex]::Escape($A) -and $list -match [regex]::Escape($B)) {
            Write-Host "Port pair $A <-> $B already configured."
            return
        }
        & $setupc install "PortName=$A" "PortName=$B"
        if ($LASTEXITCODE -ne 0) { throw "setupc install failed ($LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
}

function Start-Com0comDriver {
    $devices = Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -match "COM0COM" }
    foreach ($dev in $devices) {
        if ($dev.Status -eq "Error") {
            Write-Host "Enabling $($dev.FriendlyName) ..."
            Enable-PnpDevice -InstanceId $dev.InstanceId -Confirm:$false -ErrorAction SilentlyContinue
        }
    }
    sc.exe start com0com 2>&1 | Out-Null
}

Remove-OldCom0com
Install-V2Signed

$setupc = Get-SetupcPath
if (-not $setupc) { throw "setupc.exe not found after install" }
Push-Location (Split-Path $setupc -Parent)
try {
    Write-Host "preinstall / update driver..."
    & $setupc --silent preinstall | Out-Null
    & $setupc --silent update | Out-Null
} finally {
    Pop-Location
}

Ensure-PortPair -A $PortA -B $PortB
Start-Com0comDriver

$hvci = Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" -ErrorAction SilentlyContinue
if ($hvci.Enabled -eq 1) {
    Write-Host "Disabling Memory Integrity (HVCI) in registry — reboot once for it to take effect."
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" -Name Enabled -Value 0
}

$setupc = Get-SetupcPath
Write-Host "setupc: $setupc"
Push-Location (Split-Path $setupc -Parent)
try { & $setupc list } finally { Pop-Location }

Get-PnpDevice -ErrorAction SilentlyContinue |
    Where-Object { $_.InstanceId -match "COM0COM" } |
    Format-Table Status, FriendlyName, ConfigManagerErrorCode -AutoSize

Write-Host "Done. If Status still Error, Secure Boot may block even v2 — see docs/testing/virtual-serial-setup.md"
