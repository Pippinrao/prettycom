# Virtual serial setup (com0com)

PrettyCOM automated tests use a **null-modem virtual COM pair** so no physical hardware is required.

## Default ports

| Variable | Default | Role |
|----------|---------|------|
| `PRETTYCOM_TEST_PORT_A` | `COM10` | PrettyCOM app connects here |
| `PRETTYCOM_TEST_PORT_B` | `COM11` | Test helpers / Rust integration write here |

Data written on one end appears on the other (loopback).

## One-time install (Administrator)

```powershell
npm run test:ports:install
```

This script:

1. Imports the signed com0com certificate
2. Silently installs com0com
3. Creates the `COM10` ↔ `COM11` pair via `setupc`

**First install may require a reboot** before ports are usable.

## Before Rust integration or Desktop E2E

```powershell
npm run test:ports:check
```

Fails fast with a clear message if com0com or the port pair is missing.

## Repair and diagnose

If ports are missing or misconfigured after install:

```powershell
npm run test:ports:repair    # Re-run com0com setup / pair creation (Admin PowerShell)
npm run test:ports:diagnose  # Print port availability and pairing diagnostics
```

## Desktop E2E scaffold

`npm run test:e2e:desktop` runs `e2e/desktop/run.mjs`. Without `tauri-driver` and WebDriverIO it **exits 0** with setup instructions (CI-friendly). When those tools are installed, the runner checks com0com ports and runs specs under `e2e/desktop/`.

## Troubleshooting

- **Access denied / driver blocked**: Run PowerShell as Administrator; check corporate driver signing policy.
- **`#requires` Administrator on install**: Open elevated PowerShell, then `npm run test:ports:install`.
- **Ports not listed after install**: Reboot once, then re-run `npm run test:ports:install`.
- **Do not use physical devices** (e.g. COM5/STM32) in CI or automated tests.
