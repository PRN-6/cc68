# Changelog

All notable changes to the EyeHand (`cc68`) project will be documented in this file.

## [0.2.0] - 2026-11-15 (Milestone M1: Computer Vision & Sensor Pipeline - Task M1.1)
### Added
- Standalone native Windows Desktop Executable (`EyeHand.exe`) compiled via `scripts/Launcher.cs` and `build_exe.ps1`.
- Windows System Tray (`NotifyIcon`) integration: EyeHand docks into the system tray with a glowing custom tray icon, balloon tip alerts, and background execution.
- System Tray Context Menu: Open EyeHand Dashboard, Toggle Tracking (Active/Paused), Calibrate Gaze, and Exit.
- Win32 OS-level mouse injection bridge (`SetCursorPos`, `mouse_event`) allowing touchless control over the actual Windows OS cursor outside the browser.
- `@cc68/core` client `DesktopMouseBridge` class with automated availability detection and screen dimension querying.
- `@cc68/vision` package initialized with `@mediapipe/tasks-vision` dependency.
- `VideoStreamManager` implementing robust WebCam stream lifecycle: acquisition, device enumeration, pause/resume, canvas frame capture, and error mapping (`PERMISSION_DENIED`, `NOT_FOUND`, `OVERCONSTRAINED`, `UNSUPPORTED`).
- `MockStreamGenerator` for rendering synthetic moving eye gaze and hand landmarks on a 60 FPS simulated canvas for headless CI testing and hardware-free environments.
- Unit test suite for `VideoStreamManager` and `MockStreamGenerator` (16 passing tests across workspace).
- Interactive Camera Stream Controller in `apps/web` allowing live webcam switching, stream monitoring, and simulated feed preview.

## [0.1.0] - 2026-11-15 (Milestone M0: Project Foundation)
### Added
- Monorepo structure initialized with `pnpm-workspace.yaml` and strict TypeScript configuration.
- `@cc68/core` package implementing 2D/3D vector mathematics, coordinate transformations, and bounding box queries.
- Casiez et al. CHI 2012 One-Euro adaptive filter (`OneEuroFilter1D`, `OneEuroFilter2D`, `OneEuroFilter3D`) for low-latency jitter suppression.
- High-performance, type-safe `EyeHandEventBus` and domain event interfaces.
- Landmark types for MediaPipe 21 hand joints, face iris points, and head orientation.
- Gaze and gesture taxonomy definitions (Look-and-Pinch interaction model).
- Full documentation suite (`MASTER_TASK_CHECKLIST.md`, `PROJECT_OVERVIEW.md`, `ARCHITECTURE.md`, `TECH_STACK.md`, `GESTURE_TAXONOMY.md`, `CALIBRATION_GUIDE.md`, `API_REFERENCE.md`, `DEVELOPMENT.md`, `TESTING.md`, `CONTRIBUTING.md`).
- 100% passing Vitest test suite for vector math, jitter reduction, and event bus pub/sub.
