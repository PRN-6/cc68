# EyeHand (cc68) — Development Guide

## Prerequisites
- **Node.js**: $\ge 20.0.0$ (Environment currently has Node `v24.22.1`)
- **pnpm**: $\ge 9.0.0$ (Environment currently has pnpm `12.18.0`)
- **Git**: Installed and configured
- **WebCam**: Built-in or external USB camera (or simulated synthetic feed)

---

## Workspace Setup

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Run Unit Tests**:
   ```bash
   pnpm test
   ```

3. **Typecheck Workspace**:
   ```bash
   pnpm run typecheck
   ```

4. **Launch Interactive Development Server (Web Mode)**:
   ```bash
   pnpm dev
   ```

5. **Build and Run Windows Executable (`EyeHand.exe`)**:
   ```bash
   # Build the executable
   .\build_exe.bat
   # or
   powershell -ExecutionPolicy Bypass -File .\build_exe.ps1

   # Launch the executable (docks into Windows System Tray)
   .\EyeHand.exe
   ```
