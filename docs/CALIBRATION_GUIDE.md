# EyeHand (cc68) — 9-Point Gaze Calibration Guide

## 1. The Need for Calibration
Every user possesses unique anatomical features:
- Inter-pupillary distance (IPD).
- Eyelid aperture shape and tilt.
- Camera mounting angle and distance relative to the screen.

Without calibration, raw iris displacement from webcam frames cannot accurately map to specific pixels on a monitor.

---

## 2. 9-Point Polynomial Regression

EyeHand uses an interactive 9-point screen calibration grid:

```
(10%, 10%)           (50%, 10%)           (90%, 10%)
    ●────────────────────●────────────────────●
    │                                         │
    │                                         │
(10%, 50%)           (50%, 50%)           (90%, 50%)
    ●────────────────────●────────────────────●
    │                                         │
    │                                         │
(10%, 90%)           (50%, 90%)           (90%, 90%)
    ●────────────────────●────────────────────●
```

### Mathematical Mapping Model
For each eye sample with normalized iris coordinates $(u, v)$ and head compensation $(\theta_{\text{pitch}}, \theta_{\text{yaw}})$:

$$X_{\text{screen}} = a_0 + a_1 u + a_2 v + a_3 u^2 + a_4 v^2 + a_5 u v + c_x \theta_{\text{yaw}}$$
$$Y_{\text{screen}} = b_0 + b_1 u + b_2 v + b_3 u^2 + b_4 v^2 + b_5 u v + c_y \theta_{\text{pitch}}$$

Using ordinary least squares (OLS), the calibration engine calculates optimal coefficient vectors $\mathbf{a}$ and $\mathbf{b}$ minimizing Root-Mean-Square Error (RMSE) against known target coordinates.
