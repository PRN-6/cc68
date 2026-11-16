"""
Component 2: Screen Calibration System
Fits a robust 2D Affine Transformation Matrix: [gaze_x, gaze_y] -> [screen_x, screen_y]
Uses cv2.estimateAffine2D with Ridge Regression fallback so mapping is guaranteed stable and never singular.
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
        self.is_calibrated = False
        self.load()

    def load(self):
        if os.path.exists(self.calib_file):
            try:
                data = np.load(self.calib_file, allow_pickle=True).item()
                M = data.get("affine_M")
                if M is not None and isinstance(M, np.ndarray):
                    # Validate matrix dimensions and magnitude to prevent corrupted matrices
                    if M.shape == (2, 3) and np.max(np.abs(M)) < 50000:
                        self.affine_M = M
                        self.is_calibrated = True
                        print(f"Loaded valid calibration from {self.calib_file}")
                        return
                self.is_calibrated = False
            except Exception:
                self.is_calibrated = False

    def save(self):
        if self.affine_M is not None:
            data = {"affine_M": self.affine_M}
            np.save(self.calib_file, data)
            print(f"Calibration saved to {self.calib_file}")

    def fit(self, recorded_features, recorded_targets) -> bool:
        """
        Fits a 2D affine transformation matrix: src [gaze_x, gaze_y] -> dst [screen_x, screen_y]
        """
        if len(recorded_features) < 3:
            return False

        src = np.array(recorded_features, dtype=np.float32)
        dst = np.array(recorded_targets, dtype=np.float32)

        # 1. Estimate Affine 2D with OpenCV
        M, inliers = cv2.estimateAffine2D(src, dst)

        # 2. Fallback to Ridge Regression if estimateAffine2D had high error
        if M is None or np.max(np.abs(M)) > 30000:
            X = np.hstack([src, np.ones((len(src), 1))])
            ridge = 0.05 * np.eye(3)
            ridge[2, 2] = 0.0  # Don't regularize bias offset
            M_t = np.linalg.inv(X.T @ X + ridge) @ X.T @ dst
            M = M_t.T

        if M is not None and M.shape == (2, 3):
            self.affine_M = M
            self.is_calibrated = True
            self.save()
            print("2D Affine Calibration Matrix fitted successfully!")
            return True

        return False

    def predict(self, gaze_pt):
        """
        Transforms 2D gaze point [gaze_x, gaze_y] into screen (px, py).
        Applies border reach expansion gain so the eyes comfortably reach 100% of all borders.
        """
        gx = float(gaze_pt[0])
        gy = float(gaze_pt[1])

        if self.is_calibrated and self.affine_M is not None:
            # 2x3 Affine Transform: [px, py]^T = M @ [gx, gy, 1]^T
            vec = np.array([gx, gy, 1.0], dtype=np.float32)
            target = self.affine_M @ vec
            raw_px, raw_py = float(target[0]), float(target[1])
        else:
            # Reliable uncalibrated fallback
            norm_x = 0.5 + gx * 2.8
            norm_y = 0.5 + (gy - 0.14) * 3.2
            raw_px = norm_x * self.screen_w
            raw_py = norm_y * self.screen_h

        # Screen border reach expansion gain
        cx = self.screen_w / 2.0
        cy = self.screen_h / 2.0
        gain_x = 1.25
        gain_y = 1.30
        px = cx + (raw_px - cx) * gain_x
        py = cy + (raw_py - cy) * gain_y

        px = np.clip(px, 10, self.screen_w - 10)
        py = np.clip(py, 10, self.screen_h - 10)
        return float(px), float(py)
