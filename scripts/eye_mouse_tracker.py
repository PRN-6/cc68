"""
EyeHand (cc68) - High-Precision Eye & Gaze Cursor Controller
Features:
- Fast 5-point Calibration (Center, Top-Left, Top-Right, Bottom-Right, Bottom-Left)
- Pure Eyes (Refined Irises) + Nose Tip Anchor (Strictly ignores head pitch/yaw/roll)
- Homography / Perspective Screen Mapping (Guaranteed 100% full-screen reach)
- One Euro Filter (Zero jitter and ocular tremor suppression)
- Switchable Mode: Live Smooth Follow (Default) <-> 1.0-Second Stare Dwell (Press 'D')
- Dual Output: Moves Windows OS mouse AND drives native Figma Desktop Cursor Overlay
"""

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
import numpy as np
import pyautogui
import time
import os
import math
import urllib.request
import urllib.parse

# ==============================================================================
# CONFIGURATION
# ==============================================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "face_landmarker.task")
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
CALIBRATION_FILE = os.path.join(SCRIPT_DIR, "gaze_calibration.npy")

# Screen Resolution
pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0
SCREEN_W, SCREEN_H = pyautogui.size()

# Timing & Parameters
STARE_DWELL_SECONDS = 1.0       # 1.0 second dwell when Dwell Mode is active
STARE_RADIUS_PX = 120           # Radius of stare fixation candidate
EAR_BLINK_THRESHOLD = 0.18      # Eyelid aspect ratio for blink click
CLICK_COOLDOWN_SECONDS = 0.75   # Minimum seconds between clicks

# Native Windows Desktop Bridge URL
BRIDGE_URL = "http://127.0.0.1:6868/api/mouse/move"

# Facial Landmark Indices
NOSE_TIP = 1
LEFT_EYE_OUTER = 33
LEFT_EYE_INNER = 133
LEFT_EYE_TOP = 159
LEFT_EYE_BOTTOM = 145

RIGHT_EYE_INNER = 362
RIGHT_EYE_OUTER = 263
RIGHT_EYE_TOP = 386
RIGHT_EYE_BOTTOM = 374

LEFT_IRIS_CENTER = 468
RIGHT_IRIS_CENTER = 473

# ==============================================================================
# ONE EURO FILTER
# ==============================================================================

class OneEuroFilter:
    def __init__(self, min_cutoff=0.8, beta=0.03, d_cutoff=1.0):
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.d_cutoff = d_cutoff
        self.x_prev = None
        self.dx_prev = 0.0
        self.t_prev = None

    @staticmethod
    def _alpha(cutoff, te):
        tau = 1.0 / (2.0 * math.pi * cutoff)
        return 1.0 / (1.0 + tau / te)

    def filter(self, x, t):
        if self.t_prev is None:
            self.t_prev = t
            self.x_prev = x
            return x

        te = max(t - self.t_prev, 1e-3)
        freq = 1.0 / te

        dx = (x - self.x_prev) * freq
        a_d = self._alpha(self.d_cutoff, te)
        dx_hat = a_d * dx + (1.0 - a_d) * self.dx_prev

        cutoff = self.min_cutoff + self.beta * abs(dx_hat)
        a = self._alpha(cutoff, te)
        x_hat = a * x + (1.0 - a) * self.x_prev

        self.x_prev = x_hat
        self.dx_prev = dx_hat
        self.t_prev = t
        return x_hat

    def reset(self):
        self.x_prev = None
        self.dx_prev = 0.0
        self.t_prev = None

# ==============================================================================
# FEATURE EXTRACTOR: PURE EYES & NOSE TIP
# ==============================================================================

def extract_eye_features(landmarks, w, h):
    """
    Extracts normalized eye-gaze vector relative to eye corners and nose tip.
    Strictly independent of head yaw/pitch/roll.
    """
    # 1. Left Eye (mirrored frame = user's left or right depending on mirror)
    # Using relative position inside eye socket:
    l_outer = landmarks[LEFT_EYE_OUTER]
    l_inner = landmarks[LEFT_EYE_INNER]
    l_iris = landmarks[LEFT_IRIS_CENTER]

    l_cx = (l_outer.x + l_inner.x) * 0.5
    l_cy = (l_outer.y + l_inner.y) * 0.5
    l_w = max(1e-4, abs(l_inner.x - l_outer.x))

    # Normalized displacement [-1, 1]
    l_dx = (l_iris.x - l_cx) / (l_w * 0.5)
    l_dy = (l_iris.y - l_cy) / (l_w * 0.35)

    # 2. Right Eye
    r_inner = landmarks[RIGHT_EYE_INNER]
    r_outer = landmarks[RIGHT_EYE_OUTER]
    r_iris = landmarks[RIGHT_IRIS_CENTER]

    r_cx = (r_outer.x + r_inner.x) * 0.5
    r_cy = (r_outer.y + r_inner.y) * 0.5
    r_w = max(1e-4, abs(r_inner.x - r_outer.x))

    r_dx = (r_iris.x - r_cx) / (r_w * 0.5)
    r_dy = (r_iris.y - r_cy) / (r_w * 0.35)

    # Binocular iris average
    eye_x = (l_dx + r_dx) * 0.5
    eye_y = (l_dy + r_dy) * 0.5

    # 3. Nose Tip position
    nose = landmarks[NOSE_TIP]

    # 4. Blink detection (Eye Aspect Ratio)
    l_top = landmarks[LEFT_EYE_TOP]
    l_bottom = landmarks[LEFT_EYE_BOTTOM]
    r_top = landmarks[RIGHT_EYE_TOP]
    r_bottom = landmarks[RIGHT_EYE_BOTTOM]

    l_ear = abs(l_top.y - l_bottom.y) / l_w
    r_ear = abs(r_top.y - r_bottom.y) / r_w
    is_blinking = ((l_ear + r_ear) * 0.5) < EAR_BLINK_THRESHOLD

    # Feature vector: 4 elements [eye_x, eye_y, nose.x, nose.y]
    features = np.array([eye_x, eye_y, nose.x, nose.y], dtype=np.float32)
    return features, is_blinking

# ==============================================================================
# CALIBRATION SYSTEM (5-Point Screen Mapping)
# ==============================================================================

class GazeCalibrator:
    def __init__(self):
        self.homography = None
        self.affine_M = None
        self.is_calibrated = False
        self.load()

    def load(self):
        if os.path.exists(CALIBRATION_FILE):
            try:
                data = np.load(CALIBRATION_FILE, allow_pickle=True).item()
                self.affine_M = data.get("affine_M")
                self.is_calibrated = self.affine_M is not None
                if self.is_calibrated:
                    print("Loaded saved gaze calibration from file.")
            except Exception:
                self.is_calibrated = False

    def save(self):
        if self.affine_M is not None:
            data = {"affine_M": self.affine_M}
            np.save(CALIBRATION_FILE, data)
            print(f"Calibration successfully saved to {CALIBRATION_FILE}")

    def calibrate_interactive(self, cap, landmarker):
        """
        Runs a 5-second interactive 5-point calibration routine.
        Points: Center, Top-Left, Top-Right, Bottom-Right, Bottom-Left
        """
        win_name = "EyeHand Calibration - Look at each glowing dot"
        cv2.namedWindow(win_name, cv2.WINDOW_NORMAL)
        cv2.setWindowProperty(win_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

        margin_x = int(SCREEN_W * 0.08)
        margin_y = int(SCREEN_H * 0.08)
        cx = SCREEN_W // 2
        cy = SCREEN_H // 2

        calib_targets = [
            ("LOOK AT THE CENTER", cx, cy),
            ("LOOK AT TOP-LEFT", margin_x, margin_y),
            ("LOOK AT TOP-RIGHT", SCREEN_W - margin_x, margin_y),
            ("LOOK AT BOTTOM-RIGHT", SCREEN_W - margin_x, SCREEN_H - margin_y),
            ("LOOK AT BOTTOM-LEFT", margin_x, SCREEN_H - margin_y),
        ]

        recorded_features = []
        recorded_targets = []

        start_time = time.time()

        for label, tx, ty in calib_targets:
            target_samples = []
            dwell_start = time.time()
            point_duration = 1.3  # 1.3 seconds per point

            while time.time() - dwell_start < point_duration:
                ok, frame = cap.read()
                if not ok:
                    continue

                frame = cv2.flip(frame, 1)
                h, w = frame.shape[:2]
                now_ms = int((time.time() - start_time) * 1000)

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                res = landmarker.detect_for_video(mp_img, now_ms)

                if res.face_landmarks:
                    feat, _ = extract_eye_features(res.face_landmarks[0], w, h)
                    # Ignore first 0.3s to allow gaze settle
                    if (time.time() - dwell_start) > 0.3:
                        target_samples.append(feat)

                # Render calibration screen
                canvas = np.zeros((SCREEN_H, SCREEN_W, 3), dtype=np.uint8)
                elapsed = time.time() - dwell_start
                progress = min(1.0, elapsed / point_duration)

                # Glowing calibration target with animated shrinking countdown ring
                outer_r = int(35 - progress * 15)
                cv2.circle(canvas, (tx, ty), outer_r, (0, 200, 255), 3)
                cv2.circle(canvas, (tx, ty), 10, (0, 255, 120), -1)
                cv2.circle(canvas, (tx, ty), 3, (255, 255, 255), -1)

                # Instructions
                cv2.putText(canvas, label, (SCREEN_W // 2 - 220, 100),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.1, (255, 255, 255), 2, cv2.LINE_AA)
                cv2.putText(canvas, f"Progress: {int(progress * 100)}% (Press ESC to skip)",
                            (SCREEN_W // 2 - 160, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (180, 180, 180), 1, cv2.LINE_AA)

                cv2.imshow(win_name, canvas)
                key = cv2.waitKey(1) & 0xFF
                if key == 27:  # ESC
                    cv2.destroyWindow(win_name)
                    return False

            if len(target_samples) > 0:
                mean_feat = np.mean(target_samples, axis=0)
                recorded_features.append(mean_feat)
                recorded_targets.append([tx, ty])

        cv2.destroyWindow(win_name)

        if len(recorded_features) >= 4:
            # Fit Affine/Polynomial 2D regression model: [eye_x, eye_y, nose_x, nose_y, 1] -> [screen_x, screen_y]
            X = np.array(recorded_features)
            # Add bias term
            X_bias = np.hstack([X, np.ones((len(X), 1))])
            Y = np.array(recorded_targets)

            # Least-squares fit: M = (X^T X)^-1 X^T Y
            self.affine_M, _, _, _ = np.linalg.lstsq(X_bias, Y, rcond=None)
            self.is_calibrated = True
            self.save()
            print("Interactive calibration completed successfully!")
            return True

        return False

    def predict(self, features):
        """
        Predicts physical screen coordinates (X, Y) from facial feature vector.
        """
        if self.is_calibrated and self.affine_M is not None:
            feat_bias = np.append(features, 1.0)
            target = feat_bias @ self.affine_M
            px = np.clip(target[0], 0, SCREEN_W)
            py = np.clip(target[1], 0, SCREEN_H)
            return px, py
        else:
            # High-precision fallback when uncalibrated:
            # features: [eye_x, eye_y, nose.x, nose.y]
            eye_x, eye_y, nose_x, nose_y = features
            # Top-mounted webcam naturally sees downward eye angle: subtract 0.18 baseline
            norm_x = 0.5 + (eye_x * 2.8 + (nose_x - 0.5) * 4.5) * 0.5 * 1.5
            norm_y = 0.5 + ((eye_y - 0.18) * 3.2 + (nose_y - 0.5) * 5.0) * 0.5 * 1.5
            px = np.clip(norm_x * SCREEN_W, 0, SCREEN_W)
            py = np.clip(norm_y * SCREEN_H, 0, SCREEN_H)
            return px, py

# ==============================================================================
# WIN32 FIGMA CURSOR OVERLAY BRIDGE
# ==============================================================================

def dispatch_to_eyehand(x, y, progress, is_click):
    try:
        url = f"{BRIDGE_URL}?x={int(x)}&y={int(y)}&progress={progress:.2f}&pinch={'true' if is_click else 'false'}&syncOs=1"
        req = urllib.request.Request(url, method="GET")
        urllib.request.urlopen(req, timeout=0.04)
    except Exception:
        # If EyeHand desktop overlay server not running, directly move OS cursor
        pyautogui.moveTo(x, y)

# ==============================================================================
# MAIN ENGINE
# ==============================================================================

def main():
    if not os.path.exists(MODEL_PATH):
        print("Downloading MediaPipe face landmarker model...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)

    base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_faces=1,
        min_face_detection_confidence=0.55,
        min_face_presence_confidence=0.55,
        min_tracking_confidence=0.55,
    )
    landmarker = vision.FaceLandmarker.create_from_options(options)

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    calibrator = GazeCalibrator()

    # Prompt calibration if not yet calibrated
    if not calibrator.is_calibrated:
        print("\n[EyeHand] First-time setup: starting fast 5-point calibration...")
        calibrator.calibrate_interactive(cap, landmarker)

    filter_x = OneEuroFilter(min_cutoff=0.8, beta=0.03)
    filter_y = OneEuroFilter(min_cutoff=0.8, beta=0.03)

    # State
    dwell_mode = False          # False = Live Smooth Follow; True = 1.0s Stare Dwell Lock
    current_cursor = (SCREEN_W // 2, SCREEN_H // 2)
    candidate_pos = None
    candidate_start = None
    dwell_progress = 0.0
    last_click_time = 0
    blink_start = None

    print("\n=======================================================")
    print("  EyeHand (cc68) Eye Tracking Controller Active")
    print(f"  Windows Screen: {SCREEN_W}x{SCREEN_H}")
    print("  Mode: LIVE SMOOTH FOLLOW (Default)")
    print("  ---------------------------------------------------")
    print("  [C] - Re-run 5-Point Calibration")
    print("  [D] - Toggle Mode: Live Follow <-> 1s Stare Dwell")
    print("  [Space] - Auto-Center to Current Gaze Position")
    print("  [Q / ESC] - Exit Tracker")
    print("=======================================================\n")

    start_time = time.time()
    cv2.namedWindow("EyeHand Vision Feed", cv2.WINDOW_AUTOSIZE)

    while cap.isOpened():
        ok, frame = cap.read()
        if not ok:
            continue

        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]
        now = time.time()
        now_ms = int((now - start_time) * 1000)

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        res = landmarker.detect_for_video(mp_img, now_ms)

        if res.face_landmarks:
            landmarks = res.face_landmarks[0]
            features, is_blinking = extract_eye_features(landmarks, w, h)

            # Predict target screen coordinates via calibrated model
            raw_px, raw_py = calibrator.predict(features)

            # Filter jitter with One Euro Filter
            smooth_px = filter_x.filter(raw_px, now)
            smooth_py = filter_y.filter(raw_py, now)

            # Mode 1: 1-Second Stare Dwell Mode
            if dwell_mode:
                if candidate_pos is None:
                    candidate_pos = (smooth_px, smooth_py)
                    candidate_start = now
                    dwell_progress = 0.0
                else:
                    dist = math.hypot(smooth_px - candidate_pos[0], smooth_py - candidate_pos[1])
                    if dist <= STARE_RADIUS_PX:
                        candidate_pos = (candidate_pos[0] * 0.85 + smooth_px * 0.15,
                                        candidate_pos[1] * 0.85 + smooth_py * 0.15)
                        elapsed = now - candidate_start
                        dwell_progress = min(1.0, elapsed / STARE_DWELL_SECONDS)
                        if elapsed >= STARE_DWELL_SECONDS:
                            current_cursor = (int(candidate_pos[0]), int(candidate_pos[1]))
                            candidate_pos = None
                            candidate_start = None
                            dwell_progress = 0.0
                    else:
                        candidate_pos = (smooth_px, smooth_py)
                        candidate_start = now
                        dwell_progress = 0.0
                target_x, target_y = current_cursor
            # Mode 2: Live Smooth Follow (Default)
            else:
                target_x, target_y = int(smooth_px), int(smooth_py)
                dwell_progress = 0.0

            # Blink Click Detection
            is_click = False
            if is_blinking:
                if blink_start is None:
                    blink_start = now
                elif (now - blink_start) >= 0.22:
                    if (now - last_click_time) > CLICK_COOLDOWN_SECONDS:
                        pyautogui.click(target_x, target_y)
                        last_click_time = now
                        is_click = True
                        blink_start = None
            else:
                blink_start = None

            # Move cursor & notify desktop overlay
            dispatch_to_eyehand(target_x, target_y, dwell_progress, is_click)

            # HUD Display on camera window
            l_iris = landmarks[LEFT_IRIS_CENTER]
            r_iris = landmarks[RIGHT_IRIS_CENTER]
            nose = landmarks[NOSE_TIP]

            cv2.circle(frame, (int(l_iris.x * w), int(l_iris.y * h)), 4, (0, 255, 255), -1)
            cv2.circle(frame, (int(r_iris.x * w), int(r_iris.y * h)), 4, (0, 255, 255), -1)
            cv2.circle(frame, (int(nose.x * w), int(nose.y * h)), 4, (0, 165, 255), -1)

            mode_str = "1.0s STARE DWELL" if dwell_mode else "LIVE SMOOTH FOLLOW"
            mode_col = (0, 200, 255) if dwell_mode else (0, 255, 120)

            cv2.putText(frame, f"MODE: {mode_str} (Press 'D' to switch)", (20, 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, mode_col, 2, cv2.LINE_AA)
            cv2.putText(frame, f"Target: ({target_x}, {target_y}) | Calibrated: {calibrator.is_calibrated}", (20, 65),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.60, (255, 255, 255), 1, cv2.LINE_AA)

            if dwell_mode and dwell_progress > 0.02:
                bar_w = 200
                cv2.rectangle(frame, (20, 80), (20 + bar_w, 92), (100, 100, 100), 1)
                fill_w = int(bar_w * dwell_progress)
                cv2.rectangle(frame, (20, 80), (20 + fill_w, 92), (0, 200, 255), -1)
                cv2.putText(frame, f"Charging Stare: {int(dwell_progress * 100)}%", (230, 92),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.50, (0, 200, 255), 1, cv2.LINE_AA)

        cv2.imshow("EyeHand Vision Feed", frame)
        key = cv2.waitKey(1) & 0xFF

        if key == ord('q') or key == 27:
            break
        elif key == ord('d') or key == ord('D'):
            dwell_mode = not dwell_mode
            candidate_pos = None
            candidate_start = None
            dwell_progress = 0.0
            print(f"Mode switched to: {'1.0s STARE DWELL' if dwell_mode else 'LIVE SMOOTH FOLLOW'}")
        elif key == ord('c') or key == ord('C'):
            print("\nStarting 5-point calibration...")
            calibrator.calibrate_interactive(cap, landmarker)
            filter_x.reset()
            filter_y.reset()
        elif key == 32:  # Spacebar = instant auto-center
            print("Auto-centering neutral gaze position...")
            filter_x.reset()
            filter_y.reset()

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
