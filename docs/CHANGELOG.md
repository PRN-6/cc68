# Changelog

All notable changes to the EyeHand (`cc68`) project will be documented in this file.

## [0.6.0] - 2026-11-16 (Live Windows OS Cursor Driving & System Tray Integration)
### Added
- Real-time continuous OS mouse cursor driving loop connecting iris gaze coordinates and synthetic simulations directly to `DesktopMouseBridge`.
- `OneEuroFilter2D` signal filtering applied dynamically to cursor movements to eliminate high-frequency hand/gaze tremor while preserving instantaneous saccadic responsiveness.
- Continuous pinch-to-click and pinch-and-drag state transitions mapped to native Win32 `mouse_event` (`MOUSEEVENTF_LEFTDOWN` / `MOUSEEVENTF_LEFTUP`).
- Visual real-time gaze reticle overlaid on the viewport with dynamic color transitions (blue for fixation/tracking, green for active pinch).
- Interactive dashboard toggle "Enable Live OS Cursor Control" with real-time bridge status indicator.
- Auto-reconnect polling (2 Hz) detecting when `EyeHand.exe` starts in the Windows System Tray without needing a page refresh.
- Rebuilt `EyeHand.exe` executable with updated embedded dashboard assets and verified Win32 `SetCursorPos` and `mouse_event` API endpoints.

## [0.5.0] - 2026-11-16 (Milestone M1: Computer Vision & Sensor Pipeline - Task M1.4 Complete)
### Added
- `SyntheticLandmarkGenerator` producing deterministic, synchronized 478 face mesh / iris landmarks and 21 3D hand joints.
- Realistic interaction test scenarios: `FIXATION`, `LOOK_AND_PINCH_CLICK`, `PINCH_AND_DRAG`, `BLINK`, and `CIRCULAR_GAZE`.
- Continuous frame streaming utility (`createStream`) supporting customizable FPS rates and clean callback unbinding.
- Unit test suite for `SyntheticLandmarkGenerator` (35 passing unit tests total across workspace).
- Milestone M1 (Computer Vision & Sensor Pipeline) marked 100% complete.

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
- Windows System Tray integration (`NotifyIcon`) featuring custom procedural eye icon, tray balloon notifications, and background process persistence.
- Embedded local HTTP Win32 Mouse Injection server on `http://localhost:6868/api` with endpoints for `SetCursorPos` and `mouse_event`.
- Cross-origin enabled Win32 mouse controller API:
  - `GET /api/mouse/move?x={x}&y={y}`
  - `GET /api/mouse/click?button={left|right}`
  - `GET /api/mouse/down` & `/api/mouse/up`
  - `GET /api/screen` returning primary display resolution and tray state.
- `VideoStreamManager` with camera permission handling, device enumeration, and lifecycle controls.
- `MockStreamGenerator` for offline synthetic canvas rendering.

## [0.1.0] - 2026-11-15 (Milestone M0: Project Foundation)
### Added
- Initial monorepo scaffolding with pnpm workspaces and strict TypeScript configuration.
- `@cc68/core` package with 2D/3D vectors, transform utilities, and Casiez et al. CHI 2012 One-Euro Filter.
- `EyeHandEventBus` typed event dispatching system.
- `DesktopMouseBridge` client connector for native OS mouse injection.
- Complete documentation suite (`MASTER_TASK_CHECKLIST.md`, `ARCHITECTURE.md`, `TECH_STACK.md`, etc.).
