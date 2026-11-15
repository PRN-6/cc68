# EyeHand (cc68) — Project Overview

## 1. Executive Summary
**EyeHand (`cc68`)** is a next-generation multimodal interaction platform that unites real-time **Eye Gaze Tracking** and **3D Hand Gesture Estimation** into a seamless, touchless human-computer interface.

EyeHand is packaged as a lightweight, background **Windows Desktop Application (`EyeHand.exe`)** that docks directly into the **Windows System Tray**, providing system-wide, touchless OS cursor navigation across all Windows applications, documents, and media.

By decoupling **intentionality / target selection** (governed by where you look) from **action execution** (governed by micro-gestures like a thumb-index pinch), EyeHand brings the spatial computing "Look-and-Pinch" paradigm directly to Windows desktops using standard webcams without requiring specialized headsets, external hardware, or cloud servers.

---

## 2. Core Interaction Philosophy

### Solving the "Midas Touch" Problem
In traditional eye-tracking systems, looking at an interface element often causes unwanted clicks if the user lingers too long (dwell activation), or requires awkward exaggerated eye blinks. This is known in HCI as the **Midas Touch Problem**: everything you look at turns into an unintended action.

EyeHand solves this by assigning orthogonal roles to sensory channels:
1. **The Eye Acts as the Target Pointer**: The human visual system is extraordinarily fast at orienting attention. Where the eye fixates defines the active target bounding box.
2. **The Hand Acts as the Physical Trigger**: Micro-pinch gestures between the index finger and thumb provide the deliberate physical confirmation, drag control, or activation pulse.

---

## 3. High-Level System Architecture

```mermaid
flowchart LR
    subgraph SENSORS ["Sensor Ingestion"]
        CAM["WebCam Stream\n(60 FPS / HD)"]
        SYNTH["Synthetic Stream\n(Offline / CI)"]
    end

    subgraph VISION ["Vision Engine (@cc68/vision)"]
        FACE["MediaPipe FaceMesh\n(478 Landmarks + Iris)"]
        HAND["MediaPipe Hands\n(21 3D Landmarks)"]
    end

    subgraph CORE ["Core & Signal Processing (@cc68/core)"]
        EURO["1€ Adaptive Filter\n(Jitter Suppression)"]
        CALIB["9-Point Polynomial\nGaze Calibration"]
        GEST["Hysteresis Pinch &\nGesture Classifier"]
    end

    subgraph FUSION ["Multimodal Fusion (@cc68/fusion)"]
        SNAP["Magnetic Target Snapper"]
        STATE["Look-and-Pinch State Machine"]
        DISPATCH["Synthetic Event Dispatcher"]
    end

    subgraph APPS ["Presentation & Application (apps/web)"]
        HUD["Spatial HUD Overlay"]
        UI["Touchless UI Playground"]
    end

    subgraph DESKTOP ["Native Windows Shell (EyeHand.exe)"]
        TRAY["Windows System Tray\n(NotifyIcon + Menu)"]
        WIN32["Win32 Input Injection\n(SetCursorPos / mouse_event)"]
        OS_CURSOR["Global Windows OS Cursor\n(Desktop / Third-Party Apps)"]
    end

    CAM --> FACE & HAND
    SYNTH --> FACE & HAND
    FACE --> CALIB --> EURO
    HAND --> GEST --> EURO
    EURO --> SNAP --> STATE --> DISPATCH --> UI
    DISPATCH --> HUD
    DISPATCH --> WIN32 --> OS_CURSOR
    TRAY -. Controls .-> STATE
```

---

## 4. Key Target Features

1. **Zero External Hardware**: Operates with any standard RGB webcam or built-in laptop camera.
2. **100% Client-Side Privacy**: Video streams never leave the user's browser; all inference is computed on-device via WebAssembly/WebGPU.
3. **Sub-15ms Processing Budget**: Designed to operate smoothly at 60 FPS on modern laptop hardware.
4. **Dynamic 1€ (One-Euro) Filtering**: Eliminates physiological micro-saccade tremor at rest while maintaining crisp, instantaneous tracking during rapid saccades.
5. **Magnetic Target Snapping**: Compensates for natural ocular drift by gravitationally snapping the selection point to nearby interactive UI elements.
