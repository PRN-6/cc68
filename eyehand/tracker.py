"""
Component 1: Computer Vision Eye & Nose Tracking
Extracts refined iris centers and nose tip using MediaPipe Face Landmarker.
Strictly eliminates head pose (yaw/pitch/roll) by measuring iris offsets relative to eye canthi.
"""

import os
import math
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
from dataclasses import dataclass

# MediaPipe Refined Landmarks Indices
NOSE_TIP = 1
BETWEEN_EYEBROWS = 168

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

EAR_BLINK_THRESHOLD = 0.18

@dataclass
class EyeFeatures:
    raw_vector: np.ndarray       # [eye_x, eye_y, nose_x, nose_y]
    left_iris: tuple             # (x, y) in camera pixel coords
    right_iris: tuple            # (x, y) in camera pixel coords
    nose_tip: tuple              # (x, y) in camera pixel coords
    is_blinking: bool = False

class EyeTracker:
    def __init__(self, model_path: str):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"MediaPipe model file not found at: {model_path}")

        base_options = mp_python.BaseOptions(model_asset_path=model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.VIDEO,
            num_faces=1,
            min_face_detection_confidence=0.55,
            min_face_presence_confidence=0.55,
            min_tracking_confidence=0.55,
        )
        self.landmarker = vision.FaceLandmarker.create_from_options(options)
        self.anchor_nose = None

    def process_frame(self, frame_bgr, timestamp_ms: int):
        """
        Processes a single video frame and extracts pure eye and nose gaze features.
        """
        h, w = frame_bgr.shape[:2]
        rgb = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_bgr)
        result = self.landmarker.detect_for_video(rgb, timestamp_ms)

        if not result.face_landmarks:
            return None

        landmarks = result.face_landmarks[0]

        # 1. Left Eye
        l_outer = landmarks[LEFT_EYE_OUTER]
        l_inner = landmarks[LEFT_EYE_INNER]
        l_iris = landmarks[LEFT_IRIS_CENTER]

        l_cx = (l_outer.x + l_inner.x) * 0.5
        l_cy = (l_outer.y + l_inner.y) * 0.5
        l_w = max(1e-4, abs(l_inner.x - l_outer.x))

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

        # Average binocular iris displacement
        eye_x = (l_dx + r_dx) * 0.5
        eye_y = (l_dy + r_dy) * 0.5

        # 3. Nose tip
        nose = landmarks[NOSE_TIP]
        if self.anchor_nose is None:
            self.anchor_nose = (nose.x, nose.y)

        # Deadzone filter to strictly ignore involuntary head movement
        raw_nose_dx = nose.x - self.anchor_nose[0]
        raw_nose_dy = nose.y - self.anchor_nose[1]
        nose_dist = math.hypot(raw_nose_dx, raw_nose_dy)
        deadzone = 0.018

        if nose_dist > deadzone:
            scale = (nose_dist - deadzone) / nose_dist
            filtered_nose_dx = raw_nose_dx * scale
            filtered_nose_dy = raw_nose_dy * scale
        else:
            filtered_nose_dx = 0.0
            filtered_nose_dy = 0.0

        # 4. Blink detection (Eye Aspect Ratio)
        l_top = landmarks[LEFT_EYE_TOP]
        l_bottom = landmarks[LEFT_EYE_BOTTOM]
        r_top = landmarks[RIGHT_EYE_TOP]
        r_bottom = landmarks[RIGHT_EYE_BOTTOM]

        l_ear = abs(l_top.y - l_bottom.y) / l_w
        r_ear = abs(r_top.y - r_bottom.y) / r_w
        is_blinking = ((l_ear + r_ear) * 0.5) < EAR_BLINK_THRESHOLD

        # Feature vector [eye_x, eye_y, nose_dx, nose_dy]
        raw_vector = np.array([eye_x, eye_y, filtered_nose_dx, filtered_nose_dy], dtype=np.float32)

        return EyeFeatures(
            raw_vector=raw_vector,
            left_iris=(int(l_iris.x * w), int(l_iris.y * h)),
            right_iris=(int(r_iris.x * w), int(r_iris.y * h)),
            nose_tip=(int(nose.x * w), int(nose.y * h)),
            is_blinking=is_blinking,
        )

    def recenter_anchor(self):
        self.anchor_nose = None
