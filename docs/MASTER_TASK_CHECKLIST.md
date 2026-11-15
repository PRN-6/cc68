# EyeHand (cc68) — Master Task Checklist

> Comprehensive roadmap and execution tracking across all project milestones.

---

## Milestone Status Overview

| Milestone | Title | Status | Completion Date |
|---|---|---|---|
| **M0** | **Project Foundation & Tooling** | **COMPLETED** | Nov 15, 2026 |
| **M1** | **Computer Vision & Sensor Pipeline** | **IN PROGRESS (Task M1.1 Done)** | Nov 15, 2026 |
| **M2** | Gaze Estimation & 9-Point Calibration Engine | *Queued* | — |
| **M3** | 3D Hand Pose & Spatial Gesture Detection | *Queued* | — |
| **M4** | Eye-Hand Multimodal Fusion & Interaction | *Queued* | — |
| **M5** | Web HUD, Interactive Showcase & UI Lab | *Queued* | — |
| **M6** | End-to-End Validation, CI & Documentation Freeze | *Queued* | — |

---

## Detailed Milestone Task Breakdown

### Milestone M0: Project Foundation & Infrastructure
- [x] **Task M0.1: Repository Scaffolding & Workspace Configuration**
  - [x] Inspect local host environment (Node, pnpm, Python, Git, CUDA/GPU).
  - [x] Initialize Git repository (`main` branch) and configure `.gitignore`, `LICENSE`, `.env.example`.
  - [x] Configure pnpm monorepo workspace (`pnpm-workspace.yaml`, root `package.json`).
  - [x] Setup strict TypeScript foundation (`tsconfig.base.json`, `tsconfig.json`).
  - [x] Configure Vitest test runner with path aliases (`vitest.config.ts`).
  - [x] Establish package layouts (`packages/core`, `packages/vision`, `packages/fusion`, `apps/web`).
- [x] **Task M0.2: Core Mathematical & Signal Filtering Foundations (`@cc68/core`)**
  - [x] Implement 2D & 3D vector arithmetic (`Vector2`, `Vector3`, dot/cross products, normalization, lerp).
  - [x] Implement 2D coordinate space transformation (`Transform2D`, NDC to screen, bounding boxes, distance calculations).
  - [x] Implement Casiez et al. CHI 2012 One-Euro Filter (`OneEuroFilter1D`, `OneEuroFilter2D`, `OneEuroFilter3D`) with dynamic velocity-adaptive cutoff.
  - [x] Define landmark and tracking types (MediaPipe 21 hand landmarks, iris landmarks, head pose orientation).
  - [x] Define gaze estimation types (fixation vs saccade, calibration polynomials).
  - [x] Define gesture taxonomy types (Pinch, Grab, Open Palm, Point, Swipes).
  - [x] Implement typed event system (`EyeHandEventBus`, `EyeHandEventType`).
  - [x] Author comprehensive unit tests for vectors, One-Euro jitter reduction, and event bus dispatch.
  - [x] Implement Windows OS mouse bridge (`DesktopMouseBridge`) for Win32 cursor positioning and clicking via `EyeHand.exe`.
- [x] **Task M0.5: Native Windows Executable & System Tray Shell (`EyeHand.exe`)**
  - [x] Implement native C# launcher with Win32 `SetCursorPos` and `mouse_event` API bridge (`scripts/Launcher.cs`).
  - [x] Integrate Windows System Tray (`NotifyIcon`) with dynamic active/paused icon rendering.
  - [x] Implement System Tray context menu (Open Dashboard, Toggle Tracking, Calibrate Gaze, Exit).
  - [x] Configure background persistence (application continues tracking in tray when dashboard is closed).
  - [x] Create one-click automated build scripts (`build_exe.ps1` and `build_exe.bat`).
- [x] **Task M0.3: Documentation & Specification Framework**
  - [x] Create `MASTER_TASK_CHECKLIST.md`.
  - [x] Create `PROJECT_OVERVIEW.md`.
  - [x] Create `ARCHITECTURE.md`.
  - [x] Create `TECH_STACK.md`.
  - [x] Create `GESTURE_TAXONOMY.md`.
  - [x] Create `CALIBRATION_GUIDE.md`.
  - [x] Create `API_REFERENCE.md`.
  - [x] Create `DEVELOPMENT.md`.
  - [x] Create `TESTING.md`.
  - [x] Create `CONTRIBUTING.md`.
  - [x] Create `CHANGELOG.md`.
  - [x] Create comprehensive root `README.md`.
- [x] **Task M0.4: Baseline Verification & Quality Gates**
  - [x] Run `pnpm install` across all workspace packages.
  - [x] Run unit tests via `pnpm test` (all tests passing).
  - [x] Run typecheck via `pnpm run typecheck` (zero TypeScript errors).
  - [x] Git initial baseline commit.

---

### Milestone M1: Computer Vision & Sensor Pipeline
- [x] **Task M1.1: WebCam & Media Stream Abstraction**
  - [x] Camera permission handling and robust error mapping (`CameraError`, `PERMISSION_DENIED`, etc.).
  - [x] Frame rate regulation, canvas frame grabber (`captureFrame`), and resolution configuration.
  - [x] Camera device enumeration and switcher (`getDevices`).
  - [x] Full stream lifecycle controls (`start`, `stop`, `pause`, `resume`, `isStreaming`).
  - [x] Synthetic mock stream generator for headless/offline testing (`MockStreamGenerator`).
  - [x] Unit test suite verifying stream lifecycle, device filtering, and error mappings.
- [ ] **Task M1.2: MediaPipe Face Landmarker & Iris Tracking**
  - [ ] Integrate `@mediapipe/tasks-vision` FaceLandmarker.
  - [ ] Extract 478 3D facial landmarks and 10 iris landmark points (468–477).
  - [ ] Calculate Eye Aspect Ratio (EAR) for blink detection and eyelid state.
- [ ] **Task M1.3: MediaPipe Hand Landmarker & Pose Tracking**
  - [ ] Integrate `@mediapipe/tasks-vision` HandLandmarker.
  - [ ] Extract 21 3D hand joints per hand (left / right classification).
  - [ ] Compute palm normal vector and hand bounding sphere.
- [ ] **Task M1.4: Synthetic Landmark Stream Generator**
  - [ ] Implement headless deterministic synthetic landmark generator.
  - [ ] Provide scripted trajectories for eyes and hands for automated CI tests without webcam.

---

### Milestone M2: Gaze Estimation & 9-Point Calibration Engine *(Queued)*
- [ ] **Task M2.1: Iris Displacement & Gaze Normalization**
  - [ ] Compute relative iris position inside inner/outer canthus.
  - [ ] Compensate for 3D head pitch, yaw, and roll using face mesh geometry.
- [ ] **Task M2.2: 9-Point Polynomial Calibration Engine**
  - [ ] Interactive 9-point grid collection sequence on screen.
  - [ ] Solve bivariate polynomial regression mapping raw gaze signals to screen coordinates $(x, y)$.
  - [ ] Evaluate Root-Mean-Square (RMS) error and generate confidence report.
- [ ] **Task M2.3: Fixation & Saccade Classifier (I-VT Algorithm)**
  - [ ] Velocity-threshold identification of eye fixations vs saccades.
  - [ ] Saccade suppression to prevent false activations while shifting gaze.
- [ ] **Task M2.4: Calibration Profile Persistence**
  - [ ] Local storage persistence for user calibration profiles.
  - [ ] Real-time drift correction during prolonged interaction sessions.

---

### Milestone M3: 3D Hand Pose & Spatial Gesture Detection *(Queued)*
- [ ] **Task M3.1: 3D Pinch Detection with Dynamic Hysteresis**
  - [ ] Compute normalized Euclidean distance between thumb tip and index tip.
  - [ ] Implement dual-threshold hysteresis (contact threshold $T_{\text{enter}}$ vs release threshold $T_{\text{exit}}$) to eliminate flutter.
- [ ] **Task M3.2: Multi-Gesture Classifier**
  - [ ] Rule-based and geometric classifiers for Grab/Fist, Open Palm, and Pointing Ray.
  - [ ] Dynamic swipe gesture recognition with velocity thresholding.
- [ ] **Task M3.3: Hand Motion & Velocity Tracking**
  - [ ] Calculate real-time wrist and fingertip velocities.
  - [ ] Filter noise with One-Euro filter.
- [ ] **Task M3.4: Dual-Hand Support & Bimanual Interactions**
  - [ ] Support tracking both hands simultaneously.
  - [ ] Two-handed zoom/rotate spatial gestures.

---

### Milestone M4: Eye-Hand Multimodal Fusion & Interaction *(Queued)*
- [ ] **Task M4.1: "Look-and-Pinch" Interaction State Machine**
  - [ ] State progression: Idle -> Focus (Gaze) -> Pre-pinch -> Active Pinch (Action) -> Release.
  - [ ] Separation of selection target (determined by eye gaze) from action triggering (determined by hand pinch).
- [ ] **Task M4.2: Magnetic Target Snapping & Dwell Assist**
  - [ ] Expand interactive element bounding boxes with dynamic magnetic attraction.
  - [ ] Gravitational snapping to eliminate eye tremor over small click targets.
- [ ] **Task M4.3: Virtual Multimodal Cursor Dispatcher**
  - [ ] Synthetic pointer event dispatch (`pointerdown`, `pointermove`, `pointerup`, `click`).
  - [ ] Seamless integration with standard web DOM elements.
- [ ] **Task M4.4: Midas Touch Prevention**
  - [ ] Strict intent gate preventing accidental activations during natural eye scanning.

---

### Milestone M5: Web HUD, Interactive Showcase & UI Lab *(Queued)*
- [ ] **Task M5.1: Real-Time Visual HUD Overlay**
  - [ ] Canvas overlay displaying gaze crosshair, fixation circle, and 21-point hand skeleton.
  - [ ] Visual pinch progress indicator and confidence badges.
- [ ] **Task M5.2: 9-Point Calibration Wizard UI**
  - [ ] Guided interactive full-screen calibration animation with sound/visual feedback.
- [ ] **Task M5.3: Interactive Touchless Playground**
  - [ ] Touchless UI cards, virtual keyboard, canvas freehand sketching, and 3D object manipulation.
- [ ] **Task M5.4: Live Performance & Telemetry Dashboard**
  - [ ] Frame rate monitor (FPS), latency graphs (inference, filtering, fusion, render).

---

### Milestone M6: End-to-End Validation, CI & Documentation Freeze *(Queued)*
- [ ] **Task M6.1: High Coverage Test Suite**
  - [ ] Unit & integration test coverage >90% across core math, filtering, and fusion logic.
- [ ] **Task M6.2: Playwright E2E Test Suite**
  - [ ] Automated headless browser test simulating full gaze+pinch workflow with synthetic stream.
- [ ] **Task M6.3: Production Build & Performance Audit**
  - [ ] Verify sub-15ms frame processing budget on target hardware.
- [ ] **Task M6.4: Final Documentation Signoff**
  - [ ] Update changelog, verify all API docs, and tag release.
