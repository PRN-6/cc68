# Changelog

All notable changes to the EyeHand (`cc68`) project will be documented in this file.

## [0.14.0] - 2026-11-16 (Iconic Multiplayer Figma Cursor Style)
### Added
- **Default Figma Cursor Design (`CustomCursorOverlay`)**:
  - Implemented the iconic **Figma multiplayer collaborative cursor** as the default style across Windows:
    - **Classic Tilted Arrow Polygon**: Sharp tip hotspot positioned precisely at target coordinate `(x, y)` for exact clicking.
    - **High-Contrast Styling**: Vibrant Figma Purple (`#A259FF`) with a crisp 1.8px white border and soft elevation drop shadow.
    - **Signature "You" Pill Tag**: Rounded name badge pill pinned alongside the cursor stem.
    - **Pinch / Click Feedback**: Shifts to Emerald Green (`#10B981`) with an energetic pulse ripple upon pinch-click.
    - **1-Second Stare Dwell Progress Arc**: Circular Amber Gold progress arc sweeps clockwise (0° to 360°) around the pointer tip.
- **System Tray & Viewport Integration**:
  - Added "Figma Cursor (Default)" to the System Tray context menu and diagnostics viewport selector.
  - Extended `CustomCursorConfig.style` with `'figma'` across `@cc68/core` desktop bridge.
- Recompiled `EyeHand.exe` and web distribution bundle.

## [0.13.1] - 2026-11-16 (Edge Dwell Jitter Immunity & Full Screen Reach Calibration)
### Added
- **Edge Dwell Jitter Immunity Buffer (`GazeDwellController`)**:
  - Expanded `stareRadiusPixels` from 75px to **120px** to comfortably enclose higher-gain webcam fluctuations at the outer perimeter of the screen.
  - Implemented momentary noise buffer (tolerates up to 3 transient outlier frames near candidate boundary) so single-frame webcam noise spikes never reset the 1-second stare countdown at the display borders.
  - Large intentional saccadic jumps (> 2.0x radius) still reset the stare timer immediately.
- **Enhanced Gaze Gain Defaults (`EyeNoseGazeTracker`)**:
  - Boosted sensitivity to `eyeSensitivityX: 3.0`, `eyeSensitivityY: 3.4`, `noseSensitivityX: 5.8`, `noseSensitivityY: 6.2`, and `screenRangeGain: 1.65x`.
  - Guarantees natural eye glances and subtle nose shifts reach **100% of all 4 borders (0.0 to 1.0)** and corners effortlessly.
- Rebuilt production bundle and redeployed daemon engine.

## [0.13.0] - 2026-11-16 (Full Screen Display Reach & Dynamic Range Expansion)
### Added
- **Full Display Reach & Range Expansion (`EyeNoseGazeTracker`)**:
  - Upgraded eye iris sensitivity multipliers (`eyeSensitivityX: 2.2`, `eyeSensitivityY: 2.6`) and nose displacement gains (`noseSensitivityX: 4.2`, `noseSensitivityY: 4.5`).
  - Added `screenRangeGain` (default: `1.35x` / `1.45x`), allowing natural eye and nose movement to comfortably span from (0, 0) top-left all the way to (1920, 1080) bottom-right without eye or neck strain.
  - Added `setRangeGain()` and `updateConfig()` API methods for dynamic coverage tuning.
- **Diagnostics Viewport Screen Coverage Selector**:
  - Added preset buttons in the diagnostics UI: **Standard (1.1x)**, **Full Desktop (1.45x)**, and **Ultra-Wide (1.85x)**.
- **Unit Test Suite**:
  - Added full-screen peripheral boundary reach test in `packages/vision/tests/eye-nose-tracker.test.ts` (50 passing unit tests total across 11 suites).
- Rebuilt web distribution bundle and recompiled `EyeHand.exe`.

## [0.12.0] - 2026-11-16 (1-Second Stare Dwell Cursor Movement Engine)
### Changed
- **Stare Dwell Duration Adjusted to 1.0 Second**:
  - Reduced continuous gaze dwell duration from 2.0 seconds to **1.0 second (1000ms)** in `GazeDwellController`.
  - The cursor remains completely stationary while glancing around. When the user looks at a specific position and **stares continuously for 1 second**, the cursor moves directly to that position.
  - The circular Amber Gold charging arc around the cursor now completes a full 360° sweep in 1.0 second.
- **Unit Tests Updated**:
  - Updated all 3 dwell test suites in `packages/core/tests/gaze-dwell-controller.test.ts` to assert against the 1.0s (1000ms) stare threshold.
- Recompiled `EyeHand.exe` and web assets.

## [0.11.0] - 2026-11-16 (Pure Eye & Nose Gaze Tracking Engine with Head Tremor Isolation)
### Added
- **`EyeNoseGazeTracker` Dedicated Gaze Engine (`@cc68/vision`)**:
  - Exclusively tracks the user's **Eyes** (binocular irises and eye contours) and **Nose** (nose tip position).
  - Completely eliminates head rotation (pitch, yaw, roll from chin/forehead/temples) from controlling the cursor.
  - **Involuntary Head Tremor Suppression**: Integrated a deadzone filter (`noseDeadzone: 0.012`) to ignore minor head adjustments, preventing accidental cursor wander.
  - **Binocular Gaze Fusion**: Blends left and right eye irises with blink fallbacks and combines with the nose anchor for natural screen targeting.
  - **Auto & Manual Calibration**: Automatically calibrates resting neutral center on the first face frame, with an explicit "Recenter Nose Anchor" button in the diagnostics viewport.
- **Eyelid Normalization Hardening (`EyeGeometry`)**:
  - Clamped `effectiveHeight` with `eyeWidth * 0.35` to prevent eyelid narrowing/squinting during head tilts from causing vertical cursor spikes.
- **Diagnostics Viewport UI**:
  - Replaced "Head Pose (Yaw/Pitch/Roll)" card with real-time **Nose Tip (X, Y)**, anchor status, and "Recenter Nose Anchor" button.
- **Unit Test Suite**:
  - Added `packages/vision/tests/eye-nose-tracker.test.ts` (6 new unit tests, 49 passing across 11 suites total).
- Recompiled `EyeHand.exe` with console auto-hiding and persistent system tray execution.

## [0.10.0] - 2026-11-16 (2-Second Stare Dwell Cursor Movement Engine)
### Added
- **`GazeDwellController` 2-Second Stare Movement Engine**:
  - The cursor remains completely stationary and **does not move** while the user glances or looks around normally.
  - When the user focuses on a specific position and **stares continuously for 2.0 seconds** (2000ms), the cursor moves directly to that position.
  - If the user glances away before 2 seconds have elapsed, the countdown resets and the cursor does not move.
- **Amber Gold Countdown Charging Arc**:
  - `CustomCursorOverlay` on Windows renders a circular progress arc charging clockwise from 0° to 360° over the 2-second stare duration to give clear visual feedback.
  - Reaching 100% (2 seconds) moves the cursor to that location and plays a subtle lock animation.
- **DesktopMouseBridge & Launcher Integration**:
  - Extended `/api/mouse/move` to stream live stare progress and synchronize custom cursor position only upon confirmed stare dwell.
- **Unit Test Suite**:
  - Added `packages/core/tests/gaze-dwell-controller.test.ts` verifying dwell timing, threshold compliance, wandering gaze rejection, and consecutive dwell moves (43 passing unit tests total).
- Recompiled `EyeHand.exe` (25,088 bytes) with 2-second stare dwell logic.

## [0.9.0] - 2026-11-16 (Fixation-Lock GazeStabilizer & Zero-Jitter Cursor Engine)
### Added
- **`GazeStabilizer2D` Dual-State Filter Engine**:
  - Implements an adaptive Fixation-Lock & Saccade dispersion algorithm (I-VT velocity & deadband thresholding).
  - **Zero-Shake Fixation Lock**: When the user looks at any spot, micro-saccades, sensor noise, and involuntary ocular tremors are completely suppressed — the cursor stays **100% constant, rock-solid, with zero vibration or shaking**.
  - **Smooth Saccadic Transitions**: When the user looks to a new screen position (exceeding the release threshold), the lock releases and the cursor glides smoothly to the new destination.
  - **Auto-Settle Lock**: Once the user's gaze arrives and rests at the new position for 90ms, the cursor firmly locks onto the target again.
- **Unit Test Suite**:
  - Added `packages/core/tests/gaze-stabilizer.test.ts` verifying deadzone stability, saccade breakout, settling lock, and state reset (40 passing unit tests total).
- Recompiled `EyeHand.exe` and web bundle with active Fixation-Lock stabilization.

## [0.8.0] - 2026-11-16 (Silent Windows System Tray Execution & Background Auto-Tracking)
### Changed
- **Eliminated Automatic Browser Window Popup**: `EyeHand.exe` no longer pops up a browser window on startup. It runs 100% silently in the Windows System Tray.
- **Hidden Background Vision Engine**: MediaPipe and WebCam eye-tracking pipeline automatically boots in a silent, hidden worker (`StartBackgroundEngine`).
- **Instant Auto-Start Tracking**: Gaze and pinch tracking initializes automatically upon launching the `.exe` without requiring manual button clicks.
- **Direct System Tray Controls**:
  - Right-click tray menu provides direct control: `Tracking: Active / Paused`, `Custom Cursor: Visible / Hidden`, `Cursor Style (Spatial Reticle / Laser Dot / Crosshair)`, and optional `Settings & Camera Viewport...`.
- Recompiled `EyeHand.exe` (24,576 bytes) with background execution and automatic camera tracking loop.

## [0.7.0] - 2026-11-16 (Dedicated Custom Windows Cursor Overlay)
### Added
- **`CustomCursorOverlay` Win32 Native Desktop Overlay Window**: A dedicated, floating, always-on-top, click-through (`WS_EX_TRANSPARENT | WS_EX_LAYERED | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW`) holographic cursor rendered directly on Windows desktop.
- **Three Selectable Cursor Styles**:
  1. *Spatial Hologram Reticle*: Dual-ring electric cyan reticle with animated breathing pulse, crosshair tick marks, and precision focal dot.
  2. *Precision Laser Dot*: Minimalist glowing laser point for high-precision pointing.
  3. *Tactical Crosshair*: Clean precision crosshairs with focal center.
- **Tactile Visual Pinch & Click Feedback**:
  - Ring contracts to tactile grip size on pinch.
  - Shifts color dynamically from electric sky blue (`#38bdf8`) to vibrant emerald green (`#22c55e`).
  - Animated expanding ripple energy pulse indicating active click or drag state.
- **Independent Targeting & OS Mouse Decoupling**:
  - The custom cursor can glide freely across the entire Windows desktop without altering the user's physical mouse pointer.
  - Optional toggle `"Sync Real OS Mouse Pointer"` allows moving both simultaneously.
  - Pinch-clicks automatically target the exact desktop location of the custom cursor.
- **Desktop System Tray Controls**:
  - Right-click tray menu toggle: `"Custom Windows Cursor: Visible / Hidden"`.
  - HTTP endpoints: `/api/cursor/overlay?visible={1|0}`, `/api/cursor/config?style={...}&size={...}&color={...}`.
- **Web Dashboard Controls**:
  - Custom Cursor toggle, OS Mouse sync toggle, Style dropdown, and Size buttons (Small 48px, Medium 68px, Large 96px).
- **Core Library Extension**:
  - Added `moveCustomCursor`, `setCustomCursorVisible`, and `configureCustomCursor` to `DesktopMouseBridge` with full unit test coverage (36 passing tests).

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
