# EyeHand (cc68)

> High-Performance Multimodal Gaze & Hand Tracking Interaction Platform for the Web.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](https://www.typescriptlang.org/)
[![Test Runner: Vitest](https://img.shields.io/badge/Tested%20with-Vitest-FCC72B.svg)](https://vitest.dev/)

---

## 1. Vision & Core Value Proposition

**EyeHand (`cc68`)** brings spatial computing's most intuitive interaction pattern — **"Look-and-Pinch"** — to standard laptops and desktops using ordinary webcams.

By uniting **real-time eye gaze tracking** with **3D hand gesture detection**, EyeHand solves the classic "Midas Touch" problem:
- **Where you look** determines what is selected.
- **How your hand moves** (a subtle thumb-and-index pinch) triggers the action.

Zero specialized hardware, zero cloud video streaming, 100% on-device client-side privacy.

---

## 2. Monorepo Architecture

```text
cc68/
├── docs/                      # Comprehensive engineering documentation
│   ├── MASTER_TASK_CHECKLIST.md
│   ├── PROJECT_OVERVIEW.md
│   ├── ARCHITECTURE.md
│   ├── TECH_STACK.md
│   ├── GESTURE_TAXONOMY.md
│   ├── CALIBRATION_GUIDE.md
│   └── API_REFERENCE.md
├── packages/
│   ├── core/                  # Math, 1€ filter, event bus, types (@cc68/core)
│   ├── vision/                # WebCam capture & MediaPipe pipelines (@cc68/vision)
│   └── fusion/                # Multimodal fusion & Look-and-Pinch machine (@cc68/fusion)
└── apps/
    └── web/                   # Vite + React + Spatial HUD canvas demo
```

---

## 3. Quick Start

### Installation
```bash
# Clone the repository
git clone https://github.com/eyehand/cc68.git
cd cc68

# Install dependencies with pnpm
pnpm install
```

### Running Tests
```bash
pnpm test
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
