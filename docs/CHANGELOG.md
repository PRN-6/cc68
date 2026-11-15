# Changelog

All notable changes to the EyeHand (`cc68`) project will be documented in this file.

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
