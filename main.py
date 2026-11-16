"""
EyeHand (cc68) - Main Unified Application
Modular, High-Performance Gaze & 3D Hand Tracking Desktop Application.
"""

import os
import sys
import time
import cv2
import pyautogui
import numpy as np

from eyehand import (
    EyeTracker,
    GazeCalibrator,
    OneEuroFilter,
    GazeDwellController,
    FigmaCursorOverlay,
    MouseController,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "scripts", "face_landmarker.task")
CALIB_FILE = os.path.join(BASE_DIR, "gaze_calibration.npy")

SCREEN_W, SCREEN_H = pyautogui.size()

def main():
    app_start_time = time.time()
    print("=" * 65)
    print("  EyeHand (cc68) - Gaze & Eye Cursor System")
    print(f"  Windows Screen: {SCREEN_W}x{SCREEN_H}")
    print("=" * 65)

    # 1. Initialize Components
    print("\n[1/4] Initializing MediaPipe Eye & Nose Vision Tracker...")
    if not os.path.exists(MODEL_PATH):
        alt_path = os.path.join(BASE_DIR, "external", "eye-controlled-mouse", "face_landmarker.task")
        if os.path.exists(alt_path):
            model_to_use = alt_path
        else:
            print("Downloading face_landmarker model...")
            import urllib.request
            urllib.request.urlretrieve("https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", MODEL_PATH)
            model_to_use = MODEL_PATH
    else:
        model_to_use = MODEL_PATH

    tracker = EyeTracker(model_to_use)

    # 2. Open Webcam
    print("[2/4] Opening Webcam...")
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        print("[ERROR] Could not open webcam. Make sure no other app is using your camera.")
        return

    # 3. Calibration System
    print("[3/4] Initializing Screen Calibrator...")
    calibrator = GazeCalibrator(CALIB_FILE, SCREEN_W, SCREEN_H)
    if not calibrator.is_calibrated:
        print("\n--> Starting fast 5-point calibration (Center, 4 Corners)...")
        calibrator.calibrate_interactive(cap, tracker)

    # 4. Desktop Figma Cursor Overlay & Mouse Driver
    print("[4/4] Starting Transparent Windows Figma Cursor Overlay...")
    overlay = FigmaCursorOverlay(size=90)
    mouse = MouseController(click_cooldown_s=0.75)

    filter_x = OneEuroFilter(min_cutoff=0.8, beta=0.03)
    filter_y = OneEuroFilter(min_cutoff=0.8, beta=0.03)
    dwell_ctrl = GazeDwellController(stare_duration_s=1.0, stare_radius_px=115, screen_w=SCREEN_W, screen_h=SCREEN_H)

    dwell_mode = True  # Default: 1.0-Second Stare Dwell Lock (user stared at position for 1s before cursor moves)
    sync_os_mouse = True

    print("\n" + "=" * 65)
    print("  EyeHand is Live and Tracking!")
    print("  -------------------------------------------------------------")
    print("  [C]     - Re-run 5-Point Calibration")
    print("  [D]     - Toggle Mode: Live Follow <-> 1.0s Stare Dwell")
    print("  [M]     - Toggle Physical OS Mouse Sync")
    print("  [Space] - Auto-Center neutral resting gaze")
    print("  [ESC/Q] - Exit EyeHand")
    print("=" * 65 + "\n")

    cv2.namedWindow("EyeHand Camera Feed", cv2.WINDOW_AUTOSIZE)

    try:
        while cap.isOpened():
            ok, frame = cap.read()
            if not ok:
                continue

            frame = cv2.flip(frame, 1)
            h, w = frame.shape[:2]
            now = time.time()
            now_ms = int((now - app_start_time) * 1000)

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            features = tracker.process_frame(rgb_frame, now_ms)

            if features is not None:
                # 1. Transform raw eye features to screen coordinates
                raw_px, raw_py = calibrator.predict(features.raw_vector)

                # 2. Filter jitter with One Euro Filter
                smooth_px = filter_x.filter(raw_px, now)
                smooth_py = filter_y.filter(raw_py, now)

                # 3. Apply Selected Mode (Live Smooth Follow vs 1-Second Stare Dwell)
                if dwell_mode:
                    target_cursor, dwell_progress, has_moved = dwell_ctrl.update((smooth_px, smooth_py), now)
                    active_x, active_y = target_cursor
                else:
                    active_x, active_y = int(smooth_px), int(smooth_py)
                    dwell_progress = 0.0

                # 4. Check Blink Click
                is_clicking = mouse.check_blink_click(features.is_blinking, active_x, active_y)

                # 5. Move Physical OS Mouse (if enabled)
                if sync_os_mouse:
                    mouse.move_cursor(active_x, active_y)

                # 6. Update Windows Figma Cursor Overlay
                overlay.update_position(active_x, active_y, dwell_progress, is_clicking)

                # 7. Draw Visual Telemetry on Preview Window
                cv2.circle(frame, features.left_iris, 4, (0, 255, 255), -1)
                cv2.circle(frame, features.right_iris, 4, (0, 255, 255), -1)
                cv2.circle(frame, features.nose_tip, 4, (0, 165, 255), -1)

                mode_title = "1.0s STARE DWELL" if dwell_mode else "LIVE SMOOTH FOLLOW"
                mode_col = (0, 200, 255) if dwell_mode else (0, 255, 120)

                cv2.putText(frame, f"MODE: {mode_title} [Press D to switch]", (20, 35),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.65, mode_col, 2, cv2.LINE_AA)
                cv2.putText(frame, f"Gaze: ({active_x}, {active_y}) | Calibrated: {calibrator.is_calibrated}", (20, 65),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.60, (255, 255, 255), 1, cv2.LINE_AA)

                if dwell_mode and dwell_progress > 0.02:
                    bar_w = 200
                    cv2.rectangle(frame, (20, 80), (20 + bar_w, 92), (100, 100, 100), 1)
                    fill_w = int(bar_w * dwell_progress)
                    cv2.rectangle(frame, (20, 80), (20 + fill_w, 92), (0, 200, 255), -1)
                    cv2.putText(frame, f"Charging: {int(dwell_progress * 100)}%", (230, 92),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.50, (0, 200, 255), 1, cv2.LINE_AA)

            cv2.imshow("EyeHand Camera Feed", frame)
            key = cv2.waitKey(1) & 0xFF

            if key == ord('q') or key == 27:
                break
            elif key == ord('d') or key == ord('D'):
                dwell_mode = not dwell_mode
                dwell_ctrl.reset()
                print(f"[MODE SWITCH] Now in {'1.0s STARE DWELL' if dwell_mode else 'LIVE SMOOTH FOLLOW'}")
            elif key == ord('m') or key == ord('M'):
                sync_os_mouse = not sync_os_mouse
                print(f"[MOUSE SYNC] Physical OS mouse sync is now {'ON' if sync_os_mouse else 'OFF'}")
            elif key == ord('c') or key == ord('C'):
                print("\n[CALIBRATION] Starting 5-point calibration...")
                calibrator.calibrate_interactive(cap, tracker)
                filter_x.reset()
                filter_y.reset()
                dwell_ctrl.reset()
            elif key == 32:  # Spacebar
                tracker.recenter_anchor()
                filter_x.reset()
                filter_y.reset()
                dwell_ctrl.reset()
                print("[RECENTER] Resting neutral gaze anchor recentered.")

    finally:
        cap.release()
        cv2.destroyAllWindows()
        overlay.destroy()
        print("\nEyeHand closed cleanly.")

if __name__ == "__main__":
    main()
