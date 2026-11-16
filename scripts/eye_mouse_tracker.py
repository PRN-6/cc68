"""
EyeHand (cc68) - Python Gaze & Eye Cursor Controller
Based on proven GitHub Eye-Controlled-Mouse architecture (MediaPipe Face Landmarker + OpenCV + PyAutoGUI)
Enhanced for Pure Eyes + Nose Tracking, One Euro Filtering, and 1.0-Second Stare Dwell.
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

# Windows Display Resolution
pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0
SCREEN_W, SCREEN_H = pyautogui.size()

# Gaze Dwell Timing (User Request: "move cursor when user sees a specific position and stares for 1 sec")
STARE_DWELL_SECONDS = 1.0       # 1.0 second stare required before cursor moves
STARE_RADIUS_PX = 110           # Radius around candidate stare position in screen pixels
OUTLIER_TOLERANCE_FRAMES = 3    # Frames allowed to wander slightly without resetting stare

# Gaze Sensitivity & Full-Screen Reach
EYE_SENSITIVITY_X = 3.2
EYE_SENSITIVITY_Y = 3.6
NOSE_SENSITIVITY_X = 5.5
NOSE_SENSITIVITY_Y = 6.0
NOSE_DEADZONE = 0.008           # Deadzone to eliminate involuntary head tremor
EYE_WEIGHT = 0.60               # 60% eyes, 40% nose tip anchor
SCREEN_GAIN = 1.65              # Multiplier ensuring full reach to all 4 borders

# Eye Aspect Ratio (EAR) for Blink Click
EAR_BLINK_THRESHOLD = 0.19
BLINK_HOLD_SECONDS = 0.25
CLICK_COOLDOWN_SECONDS = 0.8

# Win32 Native Bridge URL (for custom Figma cursor overlay)
BRIDGE_URL = "http://127.0.0.1:6868/api/mouse/move"

# ==============================================================================
# FACIAL LANDMARK INDICES (MediaPipe Face Mesh Refined)
# ==============================================================================

NOSE_TIP = 1
BETWEEN_EYEBROWS = 168

# Eye Corners & Verticals
LEFT_EYE_OUTER = 33
LEFT_EYE_INNER = 133
LEFT_EYE_TOP = 159
LEFT_EYE_BOTTOM = 145

RIGHT_EYE_INNER = 362
RIGHT_EYE_OUTER = 263
RIGHT_EYE_TOP = 386
RIGHT_EYE_BOTTOM = 374

# Refined Iris Landmarks (Indices 468-477)
LEFT_IRIS_CENTER = 468
RIGHT_IRIS_CENTER = 473

# ==============================================================================
# ONE EURO FILTER (Smooths eye ocular tremor & sensor noise)
# ==============================================================================

class OneEuroFilter:
    def __init__(self, min_cutoff=0.5, beta=0.015, d_cutoff=1.0):
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
# 1-SECOND STARE DWELL CONTROLLER
# ==============================================================================

class GazeDwellController:
    """
    Keeps cursor locked at current target.
    Moves the cursor ONLY when the user fixates on a specific position for 1.0 full second.
    """
    def __init__(self, stare_duration_s=1.0, stare_radius_px=110, min_move_dist_px=45):
        self.stare_duration_s = stare_duration_s
        self.stare_radius_px = stare_radius_px
        self.min_move_dist_px = min_move_dist_px

        self.current_cursor = (SCREEN_W // 2, SCREEN_H // 2)
        self.candidate_center = None
        self.candidate_start_time = None
        self.dwell_progress = 0.0
        self.outlier_count = 0

    def update(self, raw_point, now):
        rx, ry = raw_point

        # If cursor is not initialized
        if self.current_cursor is None:
            self.current_cursor = (rx, ry)
            return self.current_cursor, 0.0, True

        # Distance from active cursor
        dist_from_active = math.hypot(rx - self.current_cursor[0], ry - self.current_cursor[1])

        # If user is still looking near current cursor, no need to trigger a move
        if dist_from_active < self.min_move_dist_px:
            self.candidate_center = None
            self.candidate_start_time = None
            self.dwell_progress = 0.0
            self.outlier_count = 0
            return self.current_cursor, 0.0, False

        # If candidate center not yet established
        if self.candidate_center is None:
            self.candidate_center = (rx, ry)
            self.candidate_start_time = now
            self.dwell_progress = 0.0
            self.outlier_count = 0
            return self.current_cursor, 0.0, False

        # Distance to candidate stare position
        dist_to_candidate = math.hypot(rx - self.candidate_center[0], ry - self.candidate_center[1])

        if dist_to_candidate <= self.stare_radius_px:
            # Gradually update candidate center to track minor drifting fixations
            self.candidate_center = (
                self.candidate_center[0] * 0.9 + rx * 0.1,
                self.candidate_center[1] * 0.9 + ry * 0.1
            )
            self.outlier_count = 0
            elapsed = now - self.candidate_start_time
            self.dwell_progress = min(1.0, elapsed / self.stare_duration_s)

            # Check if 1-second dwell threshold reached!
            if elapsed >= self.stare_duration_s:
                self.current_cursor = (int(self.candidate_center[0]), int(self.candidate_center[1]))
                self.candidate_center = None
                self.candidate_start_time = None
                self.dwell_progress = 0.0
                return self.current_cursor, 1.0, True
            else:
                return self.current_cursor, self.dwell_progress, False
        else:
            # Outlier buffer: tolerate transient noise frame before resetting
            if dist_to_candidate <= 2.0 * self.stare_radius_px and self.outlier_count < OUTLIER_TOLERANCE_FRAMES:
                self.outlier_count += 1
                return self.current_cursor, self.dwell_progress, False

            # Gaze moved to a completely different location: reset stare timer
            self.candidate_center = (rx, ry)
            self.candidate_start_time = now
            self.dwell_progress = 0.0
            self.outlier_count = 0
            return self.current_cursor, 0.0, False

# ==============================================================================
# PURE EYE & NOSE GAZE ESTIMATION ENGINE
# ==============================================================================

class EyeNoseGazeEstimator:
    def __init__(self):
        self.anchor_nose = None
        self.is_calibrated = False

    def estimate(self, landmarks, frame_w, frame_h):
        # 1. Nose Tip coordinate
        nose = landmarks[NOSE_TIP]
        nose_x = nose.x
        nose_y = nose.y

        # Auto-calibrate resting neutral anchor on first detected frame
        if self.anchor_nose is None:
            self.anchor_nose = (nose_x, nose_y)
            self.is_calibrated = True

        # 2. Extract Iris Offsets relative to Eye Canthi
        # Left Eye (User Right Eye on mirrored camera)
        l_outer = landmarks[LEFT_EYE_OUTER]
        l_inner = landmarks[LEFT_EYE_INNER]
        l_iris = landmarks[LEFT_IRIS_CENTER]
        l_center_x = (l_outer.x + l_inner.x) * 0.5
        l_center_y = (l_outer.y + l_inner.y) * 0.5
        l_width = max(1e-4, abs(l_inner.x - l_outer.x))
        l_offset_x = (l_iris.x - l_center_x) / (l_width * 0.5)
        l_offset_y = (l_iris.y - l_center_y) / (l_width * 0.35)

        # Right Eye (User Left Eye on mirrored camera)
        r_inner = landmarks[RIGHT_EYE_INNER]
        r_outer = landmarks[RIGHT_EYE_OUTER]
        r_iris = landmarks[RIGHT_IRIS_CENTER]
        r_center_x = (r_outer.x + r_inner.x) * 0.5
        r_center_y = (r_outer.y + r_inner.y) * 0.5
        r_width = max(1e-4, abs(r_inner.x - r_outer.x))
        r_offset_x = (r_iris.x - r_center_x) / (r_width * 0.5)
        r_offset_y = (r_iris.y - r_center_y) / (r_width * 0.35)

        # Combine binocular offsets
        eye_dx = (l_offset_x + r_offset_x) * 0.5
        eye_dy = (l_offset_y + r_offset_y) * 0.5

        # 3. Nose displacement relative to resting anchor
        raw_nose_dx = nose_x - self.anchor_nose[0]
        raw_nose_dy = nose_y - self.anchor_nose[1]
        nose_dist = math.hypot(raw_nose_dx, raw_nose_dy)

        # Deadzone filter to ignore involuntary head tremor
        if nose_dist > NOSE_DEADZONE:
            scale = (nose_dist - NOSE_DEADZONE) / nose_dist
            filtered_nose_dx = raw_nose_dx * scale
            filtered_nose_dy = raw_nose_dy * scale
        else:
            filtered_nose_dx = 0.0
            filtered_nose_dy = 0.0

        # 4. Combine Eye Iris + Nose Tip with full-screen expansion gain
        delta_x = (eye_dx * EYE_SENSITIVITY_X * EYE_WEIGHT +
                   filtered_nose_dx * NOSE_SENSITIVITY_X * (1.0 - EYE_WEIGHT)) * SCREEN_GAIN
        delta_y = (eye_dy * EYE_SENSITIVITY_Y * EYE_WEIGHT +
                   filtered_nose_dy * NOSE_SENSITIVITY_Y * (1.0 - EYE_WEIGHT)) * SCREEN_GAIN

        # Mirrored webcam mapping: looking right -> camera left (negative X)
        norm_x = np.clip(0.5 - delta_x, 0.0, 1.0)
        norm_y = np.clip(0.5 + delta_y, 0.0, 1.0)

        # Blink calculation (Eye Aspect Ratio)
        l_top = landmarks[LEFT_EYE_TOP]
        l_bottom = landmarks[LEFT_EYE_BOTTOM]
        r_top = landmarks[RIGHT_EYE_TOP]
        r_bottom = landmarks[RIGHT_EYE_BOTTOM]

        l_ear = abs(l_top.y - l_bottom.y) / l_width
        r_ear = abs(r_top.y - r_bottom.y) / r_width
        is_blinking = (l_ear + r_ear) * 0.5 < EAR_BLINK_THRESHOLD

        return (norm_x, norm_y), is_blinking

    def recenter(self):
        self.anchor_nose = None
        self.is_calibrated = False

# ==============================================================================
# WIN32 HTTP BRIDGE DISPATCHER (Notifies EyeHand.exe Figma Cursor)
# ==============================================================================

def dispatch_to_eyehand(x, y, progress, is_click):
    try:
        url = f"{BRIDGE_URL}?x={int(x)}&y={int(y)}&progress={progress:.2f}&pinch={'true' if is_click else 'false'}&syncOs=1"
        req = urllib.request.Request(url, method="GET")
        urllib.request.urlopen(req, timeout=0.05)
    except Exception:
        # If EyeHand.exe is not running, fallback directly to OS mouse SetCursorPos
        pyautogui.moveTo(x, y)

# ==============================================================================
# MAIN TRACKING PIPELINE
# ==============================================================================

def main():
    # Ensure model exists
    if not os.path.exists(MODEL_PATH):
        print("Downloading MediaPipe face landmarker model...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("Model downloaded.")

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

    # Open Webcam
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    print("=======================================================")
    print(" EyeHand: Pure Eye & Nose Gaze Tracking Active")
    print(f" Screen Resolution: {SCREEN_W}x{SCREEN_H}")
    print(" 1-Second Stare Dwell: Cursor moves after 1s steady gaze")
    print(" Press 'C' to Recenter Neutral Anchor")
    print(" Press 'ESC' or 'Q' to Exit")
    print("=======================================================")

    estimator = EyeNoseGazeEstimator()
    filter_x = OneEuroFilter(min_cutoff=0.4, beta=0.012)
    filter_y = OneEuroFilter(min_cutoff=0.4, beta=0.012)
    dwell_ctrl = GazeDwellController(stare_duration_s=STARE_DWELL_SECONDS, stare_radius_px=STARE_RADIUS_PX)

    start_time = time.time()
    last_click_time = 0
    blink_start_time = None

    cv2.namedWindow("EyeHand Vision Feed", cv2.WINDOW_AUTOSIZE)

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            continue

        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]
        now = time.time()
        timestamp_ms = int((now - start_time) * 1000)

        # Convert to MediaPipe Image
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = landmarker.detect_for_video(mp_image, timestamp_ms)

        if result.face_landmarks:
            landmarks = result.face_landmarks[0]
            norm_gaze, is_blinking = estimator.estimate(landmarks, w, h)

            raw_target_x = norm_gaze[0] * SCREEN_W
            raw_target_y = norm_gaze[1] * SCREEN_H

            # One Euro Filter
            smooth_x = filter_x.filter(raw_target_x, now)
            smooth_y = filter_y.filter(raw_target_y, now)

            # 1-Second Stare Dwell Lock
            active_cursor, progress, has_moved = dwell_ctrl.update((smooth_x, smooth_y), now)

            # Blink Click Detection
            is_click = False
            if is_blinking:
                if blink_start_time is None:
                    blink_start_time = now
                elif (now - blink_start_time) >= BLINK_HOLD_SECONDS:
                    if (now - last_click_time) > CLICK_COOLDOWN_SECONDS:
                        pyautogui.click(active_cursor[0], active_cursor[1])
                        last_click_time = now
                        is_click = True
                        blink_start_time = None
            else:
                blink_start_time = None

            # Dispatch position to EyeHand Win32 Figma Overlay and/or OS mouse
            dispatch_to_eyehand(active_cursor[0], active_cursor[1], progress, is_click)

            # Visual HUD on Camera Feed
            # Iris marker
            l_iris = landmarks[LEFT_IRIS_CENTER]
            r_iris = landmarks[RIGHT_IRIS_CENTER]
            cv2.circle(frame, (int(l_iris.x * w), int(l_iris.y * h)), 4, (0, 255, 255), -1)
            cv2.circle(frame, (int(r_iris.x * w), int(r_iris.y * h)), 4, (0, 255, 255), -1)

            # Nose Anchor marker
            nose = landmarks[NOSE_TIP]
            cv2.circle(frame, (int(nose.x * w), int(nose.y * h)), 4, (0, 165, 255), -1)

            # Dwell progress arc / bar
            cv2.putText(frame, f"Gaze Target: ({int(active_cursor[0])}, {int(active_cursor[1])})", (20, 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, f"1s Stare Dwell: {int(progress * 100)}%", (20, 70),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 255) if progress < 1.0 else (0, 255, 0), 2)

            # Progress bar
            bar_w = 220
            bar_h = 14
            cv2.rectangle(frame, (20, 85), (20 + bar_w, 85 + bar_h), (100, 100, 100), 1)
            fill_w = int(bar_w * progress)
            if fill_w > 0:
                cv2.rectangle(frame, (20, 85), (20 + fill_w, 85 + bar_h), (0, 200, 255), -1)

        cv2.imshow("EyeHand Vision Feed", frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == 27:
            break
        elif key == ord('c') or key == ord('C'):
            estimator.recenter()
            filter_x.reset()
            filter_y.reset()
            print("Anchor re-centered to current position.")

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
