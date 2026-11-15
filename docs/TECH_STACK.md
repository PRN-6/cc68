# EyeHand (cc68) — Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Language** | TypeScript 5.7+ | Strict type safety, shared interfaces across monorepo packages. |
| **Package Manager** | pnpm 12.18+ | Fast workspace monorepo management, strict isolated dependencies. |
| **Vision Inference** | MediaPipe Tasks Vision | On-device WebAssembly/GPU inference for FaceMesh & 3D Hands. |
| **Signal Processing** | Pure TypeScript 1€ Filter | CHI 2012 velocity-adaptive low-pass filtering. |
| **Frontend Framework** | React 18 + Vite 6 | Rapid client-side rendering and responsive interactive UI. |
| **Styling** | Tailwind CSS | Modern, clean utility-first user interface styling. |
| **Desktop Shell** | Windows GUI Executable (`.exe`) | Standalone double-clickable Windows application (`EyeHand.exe`). |
| **Tray Integration** | WinForms `NotifyIcon` | Runs resident in Windows System Tray with context menu & notification alerts. |
| **OS Input Bridge** | Win32 API (`user32.dll`) | Low-latency system-level cursor movement (`SetCursorPos`) and clicks (`mouse_event`). |
| **Test Runner** | Vitest 2.1+ | Ultra-fast unit & integration testing with ESM support. |
| **E2E Testing** | Playwright (M6) | Automated browser verification with simulated camera streams. |
| **Target Runtime** | Chromium / Firefox / Safari | Cross-browser standards-compliant HTML5 Canvas & WebCam APIs. |
