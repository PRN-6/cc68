# EyeHand (cc68)

> High-Performance Multimodal Gaze & Hand Tracking Windows System Tray Desktop Application.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D6.svg)](https://microsoft.com/windows)
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](https://www.typescriptlang.org/)
[![Test Runner: Vitest](https://img.shields.io/badge/Tested%20with-Vitest-FCC72B.svg)](https://vitest.dev/)

---

## 1. Vision & Core Value Proposition

**EyeHand (`cc68`)** brings spatial computing's most intuitive interaction pattern — **"Look-and-Pinch"** — to Windows desktops using standard webcams.

Operating as an unobtrusive **Windows System Tray background application (`EyeHand.exe`)**, EyeHand solves the classic "Midas Touch" problem:
- **Where you look** determines what is selected across your screen.
- **How your hand moves** (a subtle thumb-and-index pinch) triggers the native Windows click or drag.
- **Zero specialized headsets**, zero cloud video streaming, 100% on-device client-side privacy.

---

## 2. Windows Executable & System Tray Shell

```text
cc68/
├── EyeHand.exe                # Double-clickable Windows Executable (runs in System Tray)
├── build_exe.bat              # One-click Windows build batch script
├── build_exe.ps1              # Automated build pipeline script
├── scripts/
│   └── Launcher.cs            # Native C# System Tray shell + Win32 OS mouse injection bridge
├── docs/                      # Comprehensive engineering documentation
│   ├── MASTER_TASK_CHECKLIST.md
│   ├── PROJECT_OVERVIEW.md
│   ├── ARCHITECTURE.md
│   ├── TECH_STACK.md
│   ├── GESTURE_TAXONOMY.md
│   ├── CALIBRATION_GUIDE.md
│   └── API_REFERENCE.md
├── packages/
│   ├── core/                  # Math, 1€ filter, event bus, types, DesktopMouseBridge (@cc68/core)
│   ├── vision/                # WebCam capture & MediaPipe pipelines (@cc68/vision)
│   └── fusion/                # Multimodal fusion & Look-and-Pinch machine (@cc68/fusion)
└── apps/
    └── web/                   # Vite + React + Spatial HUD canvas demo
```

---

## 3. Quick Start

### Building and Running the Desktop `.exe`
```bash
# Build the native Windows executable
.\build_exe.bat

# Launch EyeHand (docks directly into your Windows System Tray)
.\EyeHand.exe
```

### Running Tests & Typechecks
```bash
# Run 19 unit tests
pnpm test

# Typecheck workspace
pnpm run typecheck
```

### Type Checking
```bash
pnpm run typecheck
```

---

## 4. Current Milestone Status

- **M0 — Project Foundation & Tooling**: **COMPLETED (Task M0.1 Verified)**
- **M1 — Computer Vision & Sensor Pipeline**: *Awaiting Approval to Begin*

See [`docs/MASTER_TASK_CHECKLIST.md`](docs/MASTER_TASK_CHECKLIST.md) for detailed task breakdowns.
