"""
Component 2: Screen Calibration & Learning System
Learns the personal eye range and fits an Affine Projection Matrix to the user's screen.
Includes personal eye bounds normalization and Ridge-regularized 2D mapping.
"""

import os
import time
import numpy as np
import cv2

class GazeCalibrator:
    def __init__(self, calib_file: str, screen_w: int, screen_h: int):
        self.calib_file = calib_file
        self.screen_w = screen_w
        self.screen_h = screen_h
        self.affine_M = None
        self.bounds = None
        self.is_calibrated = False
        self.load()

    def load(self):
        if os.path.exists(self.calib_file):
            try:
                data = np.load(self.calib_file, allow_pickle=True).item()
                M = data.get("affine_M")
                bounds = data.get("bounds")
                if M is not None and isinstance(M, np.ndarray) and M.shape == (2, 3):
                    if np.max(np.abs(M)) < 50000:
                        self.affine_M = M
                        self.bounds = bounds
                        self.is_calibrated = True
                        print(f"Loaded valid calibration from {self.calib_file}")
                        return
                self.is_calibrated = False
            except Exception:
                self.is_calibrated = False

    def save(self):
        if self.affine_M is not None:
            data = {"affine_M": self.affine_M, "bounds": self.bounds}
            np.save(self.calib_file, data)
            print(f"Calibration saved to {self.calib_file}")

    def fit(self, recorded_features, recorded_targets) -> bool:
        """
        Learns personal eye bounds and fits 2D Affine Transformation Matrix.
        """
        if len(recorded_features) < 3:
            return False

        src = np.array(recorded_features, dtype=np.float32)
        dst = np.array(recorded_targets, dtype=np.float32)

        # 1. Learn personal eye bounds
        x_min = float(np.min(src[:, 0]))
        x_max = float(np.max(src[:, 0]))
        y_min = float(np.min(src[:, 1]))
        y_max = float(np.max(src[:, 1]))
        self.bounds = {
            "x_min": x_min,
            "x_max": x_max,
            "y_min": y_min,
            "y_max": y_max,
        }

        # 2. Fit 2D Affine Projection with Ridge Regularization
        # Maps [gx, gy, 1] -> [screen_x, screen_y]
        X = np.hstack([src, np.ones((len(src), 1), dtype=np.float32)])
        ridge = 0.02 * np.eye(3, dtype=np.float32)
        ridge[2, 2] = 0.0  # Do not regularize bias offset

        try:
            M_t = np.linalg.inv(X.T @ X + ridge) @ X.T @ dst
            M = M_t.T
        except Exception:
            M, _ = cv2.estimateAffine2D(src, dst)

        if M is not None and M.shape == (2, 3) and np.max(np.abs(M)) < 50000:
            self.affine_M = M
            self.is_calibrated = True
            self.save()
            print(f"Model successfully trained! Learned eye bounds: X [{x_min:.3f}, {x_max:.3f}], Y [{y_min:.3f}, {y_max:.3f}]")
            return True

        return False

    def predict(self, gaze_pt):
        """
        Transforms 2D gaze point [gaze_x, gaze_y] into screen coordinates (px, py).
        Uses the learned personal eye bounds and projection matrix.
        """
        gx = float(gaze_pt[0])
        gy = float(gaze_pt[1])

        if self.is_calibrated and self.affine_M is not None:
            # 2x3 Affine Transform: [px, py]^T = M @ [gx, gy, 1]^T
            vec = np.array([gx, gy, 1.0], dtype=np.float32)
            target = self.affine_M @ vec
            raw_px, raw_py = float(target[0]), float(target[1])

            # Apply border reach gain from screen center
            cx = self.screen_w / 2.0
            cy = self.screen_h / 2.0
            gain_x = 1.30
            gain_y = 1.35
            px = cx + (raw_px - cx) * gain_x
            py = cy + (raw_py - cy) * gain_y
        else:
            # High-gain uncalibrated fallback
            norm_x = 0.5 + gx * 4.2
            norm_y = 0.5 + (gy - 0.12) * 4.5
            px = norm_x * self.screen_w
            py = norm_y * self.screen_h

        px = np.clip(px, 15, self.screen_w - 15)
        py = np.clip(py, 15, self.screen_h - 15)
        return float(px), float(py)
