# EyeHand (cc68) — Gesture Taxonomy & State Machine

## 1. Supported Hand Gestures

| Gesture | Landmark Criteria | Interaction Effect |
|---|---|---|
| **PINCH** | Euclidean distance $\|\vec{p}_{\text{thumb}} - \vec{p}_{\text{index}}\| < D_{\text{enter}}$ | Primary selection / Click trigger on gaze target. |
| **PINCH_DRAG** | Hand moves while maintaining pinch contact | Spatial manipulation, panning, canvas drawing. |
| **PINCH_RELEASE**| Euclidean distance exceeds release threshold $D_{\text{exit}}$ | Release selection / Drop action. |
| **GRAB / FIST** | All 4 fingertips folded inward towards palm base | 3D object rotation or mass viewport grab. |
| **OPEN PALM** | All 5 fingers extended outward, palm facing camera | Pause tracking, reset calibration, or summon menu. |
| **POINT** | Index finger fully extended, other 3 fingers folded | Direct raycast pointing (fallback when eye tracking is off). |
| **SWIPE** | Rapid lateral hand translation ($v_x > v_{\text{threshold}}$) | Carousel page navigation, dismissal. |

---

## 2. Dynamic Hysteresis in Pinch Detection

To eliminate flickering around the contact boundary:

```
Distance between Thumb Tip and Index Tip:

   Large Distance (Fingers Apart)
         │
         │  Approaching
         ▼
 ──── D_enter ────►  TRIGGER PINCH (Enter State)
         │
         │  Separating
         ▼
 ──── D_exit ─────►  RELEASE PINCH (Exit State)
         │
         ▼
   (D_exit > D_enter to create a hysteresis buffer zone)
```

- When $D_{\text{normalized}} < 0.05$: Transition from `OPEN` to `PINCHING`.
- When $D_{\text{normalized}} > 0.08$: Transition from `PINCHING` to `OPEN`.
- While inside $[0.05, 0.08]$: Retain previous state.
