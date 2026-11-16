# Changelog

All notable changes to the EyeHand (`cc68`) project will be documented in this file.

## [0.4.0] - 2026-11-16 (Milestone M1: Computer Vision & Sensor Pipeline - Task M1.3)
### Added
- `HandLandmarkerService` orchestrating MediaPipe 21-joint 3D hand tracking with left/right hand classification.
- `HandGeometry` utility implementing scale-invariant distance measurements based on Wrist-to-Middle-MCP anatomical baseline.
- 3D Pinch distance metric calculation (Thumb tip #4 to Index tip #8) with normalized ratio and 3D contact midpoint coordinates.
- Palm normal vector computation with handedness inversion to detect whether the hand is facing toward or away from the camera.
- Extended fingers state classifier (Thumb, Index, Middle, Ring, Pinky) and bounding sphere computation.
- Real-time 3D Hand Pose & Pinch Telemetry card in `apps/web` displaying pinch distance, state (PINCHING vs RELEASED), palm orientation, and finger count.
- Unit test suite for `HandGeometry` and `HandLandmarkerService` (31 passing unit tests total across workspace).

## [0.3.0] - 2026-11-16 (Milestone M1: Computer Vision & Sensor Pipeline - Task M1.2)
### Added
- `FaceLandmarkerService` integrating MediaPipe FaceLandmarker with WebAssembly and GPU acceleration.
- 478 3D facial landmark processing and 10 iris landmark points extraction (468–472 left iris, 473–477 right iris).
- Real-time Eye Aspect Ratio (EAR) calculation based on Soukupová & Čech (2016) for robust blink detection.
- Normalized 2D iris displacement calculation ($[-1, 1]$ relative offset inside inner and outer canthi).
- Head pose orientation estimator calculating pitch, yaw, and roll from key 3D facial anchors (nose tip, chin, glabella, temples).
- Real-time Eye Tracking & Iris Telemetry dashboard in `apps/web` displaying EAR values, blink states, iris offsets, and head pose.
- Unit test suite for `EyeGeometry` and `FaceLandmarkerService` (24 passing unit tests total across workspace).

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
