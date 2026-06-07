#Requires -Version 5.1
<#
.SYNOPSIS
  Verify com0com test port pair exists and both ends can be opened.
#>
$ErrorActionPreference = "Stop"

$SetupcPath = Join-Path ${env:ProgramFiles(x86)} "com0com\setupc.exe"
if (-not (Test-Path $SetupcPath)) {
    $SetupcPath = Join-Path $env:ProgramFiles "com0com\setupc.exe"
}
$PortA = if ($env:PRETTYCOM_TEST_PORT_A) { $env:PRETTYCOM_TEST_PORT_A } else { "COM10" }
$PortB = if ($env:PRETTYCOM_TEST_PORT_B) { $env:PRETTYCOM_TEST_PORT_B } else { "COM11" }

if (-not (Test-Path $SetupcPath)) {
    Write-Error "com0com not installed. Run as Administrator: npm run test:ports:install"
    exit 1
}

# Opening ports is enough; setupc list requires elevation and is only needed at install time.
Add-Type -AssemblyName System.IO.Ports
$opened = @()
try {
    foreach ($port in @($PortA, $PortB)) {
        $sp = New-Object System.IO.Ports.SerialPort $port, 115200
        $sp.ReadTimeout = 500
        $sp.WriteTimeout = 500
        $sp.Open()
        $opened += $sp
        Write-Host "OK: opened $port"
    }
    Write-Host "Test port pair $PortA <-> $PortB is ready."
} catch {
    Write-Error "Failed to open test port: $_`nRun npm run test:ports:install (Administrator) or reboot after driver install."
    exit 1
} finally {
    foreach ($sp in $opened) {
        if ($sp.IsOpen) { $sp.Close() }
        $sp.Dispose()
    }
}
