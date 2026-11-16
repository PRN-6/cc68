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

## 2. Architecture & Modular Components

```text
cc68/
├── main.py                    # Unified application orchestrating all 6 components
├── run.bat                    # 1-Click Windows batch launcher
├── EyeHand.exe                # Windows System Tray Executable
├── eyehand/                   # Clean, Modular Python Architecture
│   ├── __init__.py            # Package entry point exporting all components
│   ├── tracker.py             # Component 1: Vision Tracker (Irises + Nose anchor, head pose eliminated)
│   ├── calibration.py         # Component 2: 5-Point Calibration & 100% Screen Reach Matrix
│   ├── filters.py             # Component 3: One Euro Filter & 1.0s Stare Dwell Controller
│   ├── overlay.py             # Component 4: Transparent Click-Through Figma Cursor Overlay
│   ├── mouse.py               # Component 5: Physical OS Mouse Driver & Blink Click
│   └── panel.py               # Component 6: Interactive Registration & Test Panel
├── scripts/
│   └── Launcher.cs            # Native C# System Tray launcher
├── packages/
│   ├── core/                  # Math, 1€ filter, event bus, types, DesktopMouseBridge (@cc68/core)
│   ├── vision/                # WebCam capture & MediaPipe pipelines (@cc68/vision)
│   └── fusion/                # Multimodal fusion & Look-and-Pinch machine (@cc68/fusion)
└── apps/
    └── web/                   # Vite + React + Spatial HUD canvas demo
```

---

## 3. Quick Start

### 1-Click Desktop Launcher
```bash
# Launch EyeHand directly (Figma cursor + 1.0s Stare Dwell + Eye/Nose tracking)
.\run.bat

# Or run with Python:
python main.py
```

### Controls & Hotkeys
- **`[D]`**: Toggle **1.0-Second Stare Dwell Mode** vs **Live Smooth Follow**.
- **`[C]`**: Run interactive 5-point calibration (Center, 4 Corners) with border reach expansion.
- **`[Space]`**: Recenter neutral resting gaze anchor.
- **`[M]`**: Toggle physical Windows OS mouse synchronization.
- **`[ESC / Q]`**: Exit cleanly.

### Running Tests & Typechecks
```bash
# Run Vitest test suite (50 tests passing)
pnpm test

# Typecheck TypeScript packages
pnpm run typecheck
```

---

## 4. Current Milestone Status

- **M0 — Project Foundation & Tooling**: **COMPLETED (Task M0.1 Verified)**
- **M1 — Computer Vision & Sensor Pipeline**: *Awaiting Approval to Begin*

See [`docs/MASTER_TASK_CHECKLIST.md`](docs/MASTER_TASK_CHECKLIST.md) for detailed task breakdowns.
