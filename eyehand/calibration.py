"""
Component 2: Screen Calibration System
Runs an interactive 5-point calibration (Center, Top-Left, Top-Right, Bottom-Right, Bottom-Left).
Fits an Affine / Homography Least-Squares mapping matrix so gaze lands with pinpoint accuracy.
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
                self.affine_M = data.get("affine_M")
                self.is_calibrated = self.affine_M is not None
                if self.is_calibrated:
                    print(f"Loaded calibration from {self.calib_file}")
            except Exception:
                self.is_calibrated = False

    def save(self):
        if self.affine_M is not None:
            data = {"affine_M": self.affine_M}
            np.save(self.calib_file, data)
            print(f"Calibration saved to {self.calib_file}")

    def calibrate_interactive(self, cap, tracker):
        """
        Runs a 5-second fullscreen interactive calibration.
        """
        win_name = "EyeHand Calibration - Look at each glowing dot"
        cv2.namedWindow(win_name, cv2.WINDOW_NORMAL)
        cv2.setWindowProperty(win_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

        margin_x = int(self.screen_w * 0.08)
        margin_y = int(self.screen_h * 0.08)
        cx = self.screen_w // 2
        cy = self.screen_h // 2

        targets = [
            ("LOOK AT SCREEN CENTER", cx, cy),
            ("LOOK AT TOP-LEFT", margin_x, margin_y),
            ("LOOK AT TOP-RIGHT", self.screen_w - margin_x, margin_y),
            ("LOOK AT BOTTOM-RIGHT", self.screen_w - margin_x, self.screen_h - margin_y),
            ("LOOK AT BOTTOM-LEFT", margin_x, self.screen_h - margin_y),
        ]

        recorded_features = []
        recorded_targets = []

        start_time = time.time()

        for label, tx, ty in targets:
            target_samples = []
            dwell_start = time.time()
            point_duration = 1.3  # seconds per target

            while time.time() - dwell_start < point_duration:
                ok, frame = cap.read()
                if not ok:
                    continue

                frame = cv2.flip(frame, 1)
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                feat = tracker.process_frame(rgb_frame)
                if feat is not None:
                    # Ignore first 0.35s to allow eyes to settle
                    if (time.time() - dwell_start) > 0.35:
                        target_samples.append(feat.raw_vector)

                # Render calibration backdrop
                canvas = np.zeros((self.screen_h, self.screen_w, 3), dtype=np.uint8)
                elapsed = time.time() - dwell_start
                progress = min(1.0, elapsed / point_duration)

                # Glowing target with animated shrinking countdown circle
                outer_r = int(38 - progress * 18)
                cv2.circle(canvas, (tx, ty), outer_r, (0, 200, 255), 3, cv2.LINE_AA)
                cv2.circle(canvas, (tx, ty), 10, (0, 255, 120), -1)
                cv2.circle(canvas, (tx, ty), 3, (255, 255, 255), -1)

                cv2.putText(canvas, label, (self.screen_w // 2 - 200, 100),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.1, (255, 255, 255), 2, cv2.LINE_AA)
                cv2.putText(canvas, f"Progress: {int(progress * 100)}% (ESC to skip)",
                            (self.screen_w // 2 - 140, 145), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (180, 180, 180), 1, cv2.LINE_AA)

                cv2.imshow(win_name, canvas)
                key = cv2.waitKey(1) & 0xFF
                if key == 27:
                    cv2.destroyWindow(win_name)
                    return False

            if len(target_samples) > 0:
                mean_feat = np.mean(target_samples, axis=0)
                recorded_features.append(mean_feat)
                recorded_targets.append([tx, ty])

        cv2.destroyWindow(win_name)

        if len(recorded_features) >= 4:
            X = np.array(recorded_features)
            X_bias = np.hstack([X, np.ones((len(X), 1))])
            Y = np.array(recorded_targets)

            # Least-Squares fit: Affine mapping matrix
            self.affine_M, _, _, _ = np.linalg.lstsq(X_bias, Y, rcond=None)
            self.is_calibrated = True
            self.save()
            print("Interactive 5-point calibration completed successfully!")
            return True

        return False

    def predict(self, feature_vector):
        """
        Transforms raw feature vector [eye_x, eye_y, nose_dx, nose_dy] into (screen_x, screen_y)
        Applies border reach expansion to guarantee reaching 100% of the display edges.
        """
        if self.is_calibrated and self.affine_M is not None:
            feat_bias = np.append(feature_vector, 1.0)
            target = feat_bias @ self.affine_M
            raw_px = target[0]
            raw_py = target[1]
        else:
            # Baseline compensation when uncalibrated:
            eye_x, eye_y, nose_dx, nose_dy = feature_vector
            # Eye movement dominates, nose is minor anchor, compensating for top webcam downward tilt (-0.16)
            norm_x = 0.5 + (eye_x * 4.2 + nose_dx * 1.2) * 0.5 * 1.85
            norm_y = 0.5 + ((eye_y - 0.16) * 4.6 + nose_dy * 1.2) * 0.5 * 1.85
            raw_px = norm_x * self.screen_w
            raw_py = norm_y * self.screen_h

        # Screen border reach gain: expands natural eye range so user comfortably reaches all 4 borders & corners
        cx = self.screen_w / 2.0
        cy = self.screen_h / 2.0
        gain_x = 1.25
        gain_y = 1.30
        px = cx + (raw_px - cx) * gain_x
        py = cy + (raw_py - cy) * gain_y

        px = np.clip(px, 0, self.screen_w)
        py = np.clip(py, 0, self.screen_h)
        return px, py
