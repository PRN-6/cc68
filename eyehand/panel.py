"""
Component 6: Interactive Registration & Test Panel
1. Precision Gaze Registration: Guides the user through 5 screen positions, gathers 2D iris & gaze vectors,
   and computes the optimal 2D Affine mapping matrix.
2. Interactive Test Sandbox: Allows the user to look around 9 target zones on screen, test their
   1.0-second stare dwell lock, view live accuracy & matching error, and verify 100% full-screen reach
   before launching into native Windows Desktop control.
"""

import os
import time
import math
import cv2
import numpy as np

class RegistrationTestPanel:
    def __init__(self, screen_w: int, screen_h: int, calibrator):
        self.screen_w = screen_w
        self.screen_h = screen_h
        self.calibrator = calibrator
        self.win_name = "EyeHand - Registration and Test Panel"

    def run(self, cap, tracker, filter_x, filter_y, dwell_ctrl) -> str:
        """
        Runs the full panel experience.
        Returns:
            'desktop' - proceed to full Windows desktop control
            'exit'    - user requested application exit
        """
        cv2.namedWindow(self.win_name, cv2.WINDOW_NORMAL)
        cv2.setWindowProperty(self.win_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

        # If not calibrated yet, begin in registration mode
        if not self.calibrator.is_calibrated:
            ok = self._run_registration(cap, tracker)
            if not ok:
                cv2.destroyWindow(self.win_name)
                return "exit"

        # Run the interactive verification & test sandbox
        action = self._run_test_sandbox(cap, tracker, filter_x, filter_y, dwell_ctrl)
        cv2.destroyWindow(self.win_name)
        return action

    def _run_registration(self, cap, tracker) -> bool:
        """
        Phase 1: Precision Gaze Registration & Data Matching
        Guides user through 5 screen positions, gathers iris samples, and fits the affine matrix.
        """
        margin_x = int(self.screen_w * 0.12)
        margin_y = int(self.screen_h * 0.14)
        cx = self.screen_w // 2
        cy = self.screen_h // 2

        targets = [
            ("SCREEN CENTER", cx, cy),
            ("TOP-LEFT CORNER", margin_x, margin_y),
            ("TOP-RIGHT CORNER", self.screen_w - margin_x, margin_y),
            ("BOTTOM-RIGHT CORNER", self.screen_w - margin_x, self.screen_h - margin_y),
            ("BOTTOM-LEFT CORNER", margin_x, self.screen_h - margin_y),
        ]

        recorded_features = []
        recorded_targets = []
        point_duration = 1.3  # seconds of fixation per point

        for step_idx, (label, tx, ty) in enumerate(targets):
            target_samples = []
            dwell_start = time.time()

            while time.time() - dwell_start < point_duration:
                ok, frame = cap.read()
                if not ok:
                    continue

                frame = cv2.flip(frame, 1)
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                feat = tracker.process_frame(rgb_frame)

                canvas = np.zeros((self.screen_h, self.screen_w, 3), dtype=np.uint8)
                canvas[:] = (20, 15, 10)  # Slate dark background

                elapsed = time.time() - dwell_start
                # Ignore initial 0.30s saccade settling
                if elapsed > 0.30 and feat is not None:
                    target_samples.append(feat.gaze_point)

                progress = min(1.0, elapsed / point_duration)

                # Header HUD
                self._draw_hud(canvas,
                    title=f"GAZE REGISTRATION - STEP {step_idx + 1} OF {len(targets)}",
                    subtitle="Keep your head steady. Look directly at the glowing center dot to register."
                )

                # Mini camera PIP in top-right
                self._draw_camera_pip(canvas, frame, feat)

                # Glowing Target Reticle
                pulse_r = int(36 + math.sin(time.time() * 6) * 5)
                # Outer ring
                cv2.circle(canvas, (tx, ty), pulse_r, (60, 45, 30), 2, cv2.LINE_AA)
                # Charging countdown circle
                if progress > 0.05:
                    sweep_angle = int(progress * 360)
                    cv2.ellipse(canvas, (tx, ty), (36, 36), 0, -90, -90 + sweep_angle, (11, 158, 245), 4, cv2.LINE_AA)

                # Crosshair
                cv2.line(canvas, (tx - 20, ty), (tx + 20, ty), (255, 255, 255), 1, cv2.LINE_AA)
                cv2.line(canvas, (tx, ty - 20), (tx, ty + 20), (255, 255, 255), 1, cv2.LINE_AA)
                cv2.circle(canvas, (tx, ty), 8, (129, 185, 16), -1)
                cv2.circle(canvas, (tx, ty), 3, (255, 255, 255), -1)

                # Label below target
                cv2.putText(canvas, label, (tx - 110, ty + 55),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2, cv2.LINE_AA)
                cv2.putText(canvas, f"Registering: {int(progress * 100)}%", (tx - 70, ty + 80),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.52, (11, 158, 245), 1, cv2.LINE_AA)

                cv2.imshow(self.win_name, canvas)
                key = cv2.waitKey(1) & 0xFF
                if key == 27 or key == ord('q'):
                    return False

            if len(target_samples) > 0:
                mean_feat = np.mean(target_samples, axis=0)
                recorded_features.append(mean_feat)
                recorded_targets.append([tx, ty])

        # Analyze data and compute matching affine transformation matrix
        if len(recorded_features) >= 3:
            # Splash: Analyzing data
            splash = np.zeros((self.screen_h, self.screen_w, 3), dtype=np.uint8)
            splash[:] = (20, 15, 10)
            cv2.putText(splash, "ANALYZING DATA & MATCHING GAZE MODEL...", (cx - 320, cy - 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (11, 158, 245), 2, cv2.LINE_AA)
            cv2.putText(splash, "Fitting 2D Affine Screen Projection Matrix", (cx - 260, cy + 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (180, 180, 180), 1, cv2.LINE_AA)
            cv2.imshow(self.win_name, splash)
            cv2.waitKey(500)

            return self.calibrator.fit(recorded_features, recorded_targets)

        return False

    def _run_test_sandbox(self, cap, tracker, filter_x, filter_y, dwell_ctrl) -> str:
        """
        Phase 2: Live Test & Verification Sandbox
        Displays 9 test target cards. User gazes at them to test 1.0s dwell lock and see matching accuracy.
        """
        margin_x = int(self.screen_w * 0.12)
        margin_y = int(self.screen_h * 0.14)
        cx = self.screen_w // 2
        cy = self.screen_h // 2

        # 9 interactive test target cards across the display
        test_targets = [
            {"id": "TOP-LEFT",      "x": margin_x,                 "y": margin_y,                 "matched": False, "err": 0},
            {"id": "TOP-CENTER",    "x": cx,                       "y": margin_y,                 "matched": False, "err": 0},
            {"id": "TOP-RIGHT",     "x": self.screen_w - margin_x, "y": margin_y,                 "matched": False, "err": 0},
            {"id": "MID-LEFT",      "x": margin_x,                 "y": cy,                       "matched": False, "err": 0},
            {"id": "SCREEN CENTER", "x": cx,                       "y": cy,                       "matched": False, "err": 0},
            {"id": "MID-RIGHT",     "x": self.screen_w - margin_x, "y": cy,                       "matched": False, "err": 0},
            {"id": "BOTTOM-LEFT",   "x": margin_x,                 "y": self.screen_h - margin_y, "matched": False, "err": 0},
            {"id": "BOTTOM-CENTER", "x": cx,                       "y": self.screen_h - margin_y, "matched": False, "err": 0},
            {"id": "BOTTOM-RIGHT",  "x": self.screen_w - margin_x, "y": self.screen_h - margin_y, "matched": False, "err": 0},
        ]

        dwell_mode = True  # Default to 1.0s stare dwell
        dwell_ctrl.reset((cx, cy))
        filter_x.reset()
        filter_y.reset()

        smooth_px, smooth_py = cx, cy

        while cap.isOpened():
            ok, frame = cap.read()
            if not ok:
                continue

            frame = cv2.flip(frame, 1)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            feat = tracker.process_frame(rgb_frame)

            canvas = np.zeros((self.screen_h, self.screen_w, 3), dtype=np.uint8)
            canvas[:] = (20, 15, 10)  # Slate dark backdrop

            now = time.time()
            active_x, active_y = cx, cy
            dwell_prog = 0.0
            has_moved = False

            if feat is not None:
                # 1. Transform raw 2D eye gaze to screen coordinates
                raw_px, raw_py = self.calibrator.predict(feat.gaze_point)

                # 2. Filter jitter with One Euro Filter
                smooth_px = filter_x.filter(raw_px, now)
                smooth_py = filter_y.filter(raw_py, now)

                # 3. Apply 1.0s Stare Dwell vs Live Follow
                if dwell_mode:
                    target_cursor, dwell_prog, has_moved = dwell_ctrl.update((smooth_px, smooth_py), now)
                    active_x, active_y = target_cursor
                else:
                    active_x, active_y = int(smooth_px), int(smooth_py)
                    dwell_prog = 0.0
            else:
                active_x, active_y = dwell_ctrl.current_cursor

            # 1. Header HUD
            mode_text = "1.0s STARE DWELL LOCK" if dwell_mode else "LIVE SMOOTH FOLLOW"
            matched_count = sum(1 for t in test_targets if t["matched"])
            self._draw_hud(
                canvas,
                title="EYEHAND TEST & VERIFICATION PANEL",
                subtitle=f"Mode: {mode_text} [Press D to switch] | Targets Matched: {matched_count} / {len(test_targets)} | Gaze: ({int(smooth_px)}, {int(smooth_py)})"
            )

            # 2. Mini camera PIP in top-right
            self._draw_camera_pip(canvas, frame, feat)

            # 3. Draw 9 interactive test target cards
            for tgt in test_targets:
                tx, ty = tgt["x"], tgt["y"]
                # Distance to user's active gaze focus
                gaze_dist = math.hypot(smooth_px - tx, smooth_py - ty)
                cursor_dist = math.hypot(active_x - tx, active_y - ty)
                is_hovered = gaze_dist < 100 or cursor_dist < 80

                # Check if user dwelled on or reached this target
                if is_hovered:
                    if dwell_mode and (has_moved or dwell_prog > 0.85):
                        tgt["matched"] = True
                        tgt["err"] = int(cursor_dist)
                    elif not dwell_mode and gaze_dist < 75:
                        tgt["matched"] = True
                        tgt["err"] = int(gaze_dist)

                self._draw_target_card(canvas, tgt, is_hovered, dwell_prog if is_hovered else 0.0)

            # 4. Action bar at bottom (drawn BEFORE cursors so cursors are always on top)
            self._draw_action_bar(canvas)

            # 5. Live Gaze Focus Ring (Subtle glowing cyan reticle showing where eyes are fixating)
            cv2.circle(canvas, (int(smooth_px), int(smooth_py)), 10, (255, 220, 0), 2, cv2.LINE_AA)
            cv2.circle(canvas, (int(smooth_px), int(smooth_py)), 2, (255, 255, 255), -1)

            # 6. Render the Authentic Figma Cursor on Top of Everything
            self._draw_figma_cursor(canvas, active_x, active_y, dwell_prog)

            cv2.imshow(self.win_name, canvas)
            key = cv2.waitKey(1) & 0xFF

            if key == 27 or key == ord('q'):
                return "exit"
            elif key == 13 or key == 32:  # Enter or Space
                return "desktop"
            elif key == ord('d') or key == ord('D'):
                dwell_mode = not dwell_mode
                dwell_ctrl.reset((cx, cy))
            elif key == ord('r') or key == ord('R'):
                # Re-run registration
                ok = self._run_registration(cap, tracker)
                if ok:
                    for t in test_targets:
                        t["matched"] = False
                        t["err"] = 0
            elif key == ord('c') or key == ord('C'):
                # Clear test hits
                for t in test_targets:
                    t["matched"] = False
                    t["err"] = 0

        return "exit"

    def _draw_hud(self, canvas, title: str, subtitle: str):
        cv2.rectangle(canvas, (0, 0), (self.screen_w, 95), (28, 22, 16), -1)
        cv2.line(canvas, (0, 95), (self.screen_w, 95), (55, 45, 35), 1, cv2.LINE_AA)

        cv2.putText(canvas, title, (40, 42),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.90, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(canvas, subtitle, (40, 72),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (16, 185, 129), 1, cv2.LINE_AA)

    def _draw_camera_pip(self, canvas, frame, feat):
        pip_w, pip_h = 240, 135
        pip_x = self.screen_w - pip_w - 30
        pip_y = 15

        pip_img = cv2.resize(frame, (pip_w, pip_h))
        canvas[pip_y:pip_y + pip_h, pip_x:pip_x + pip_w] = pip_img

        has_face = feat is not None
        border_col = (129, 185, 16) if has_face else (0, 0, 220)
        cv2.rectangle(canvas, (pip_x, pip_y), (pip_x + pip_w, pip_y + pip_h), border_col, 2)

        if has_face:
            cam_h, cam_w = frame.shape[:2]
            scale_x = pip_w / cam_w
            scale_y = pip_h / cam_h

            lx = pip_x + int(feat.left_iris[0] * scale_x)
            ly = pip_y + int(feat.left_iris[1] * scale_y)
            rx = pip_x + int(feat.right_iris[0] * scale_x)
            ry = pip_y + int(feat.right_iris[1] * scale_y)
            nx = pip_x + int(feat.nose_tip[0] * scale_x)
            ny = pip_y + int(feat.nose_tip[1] * scale_y)

            cv2.circle(canvas, (lx, ly), 3, (0, 255, 255), -1)
            cv2.circle(canvas, (rx, ry), 3, (0, 255, 255), -1)
            cv2.circle(canvas, (nx, ny), 3, (0, 165, 255), -1)

            cv2.putText(canvas, "EYES LOCKED", (pip_x + 8, pip_y + 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.40, (129, 185, 16), 1, cv2.LINE_AA)
        else:
            cv2.putText(canvas, "NO FACE DETECTED", (pip_x + 8, pip_y + 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.40, (0, 0, 255), 1, cv2.LINE_AA)

    def _draw_target_card(self, canvas, tgt, is_hovered: bool, dwell_prog: float):
        tx, ty = tgt["x"], tgt["y"]
        w, h = 160, 90
        x1 = tx - w // 2
        y1 = ty - h // 2
        x2 = tx + w // 2
        y2 = ty + h // 2

        is_matched = tgt["matched"]

        if is_matched:
            bg_col = (30, 70, 20)       # Dark emerald
            border_col = (129, 185, 16) # Bright emerald
            title_col = (255, 255, 255)
        elif is_hovered:
            bg_col = (45, 35, 25)       # Amber glow
            border_col = (11, 158, 245) # Amber border
            title_col = (11, 158, 245)
        else:
            bg_col = (30, 22, 16)       # Subtle slate
            border_col = (60, 48, 38)
            title_col = (180, 180, 180)

        # Card body
        cv2.rectangle(canvas, (x1, y1), (x2, y2), bg_col, -1)
        cv2.rectangle(canvas, (x1, y1), (x2, y2), border_col, 2, cv2.LINE_AA)

        # Center target dot
        dot_col = (129, 185, 16) if is_matched else (255, 89, 162)
        cv2.circle(canvas, (tx, ty - 8), 6, dot_col, -1)
        cv2.circle(canvas, (tx, ty - 8), 2, (255, 255, 255), -1)

        # Status text inside card
        if is_matched:
            cv2.putText(canvas, "[ MATCHED ]", (x1 + 22, ty + 16),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.48, (129, 185, 16), 1, cv2.LINE_AA)
            cv2.putText(canvas, f"Error: {tgt['err']}px", (x1 + 38, ty + 33),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.40, (180, 220, 180), 1, cv2.LINE_AA)
        else:
            cv2.putText(canvas, tgt["id"], (x1 + 18, ty + 16),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.44, title_col, 1, cv2.LINE_AA)
            if is_hovered and dwell_prog > 0.05:
                # Charging bar at bottom of card
                bar_w = int((w - 20) * dwell_prog)
                cv2.rectangle(canvas, (x1 + 10, y2 - 10), (x1 + 10 + bar_w, y2 - 6), (11, 158, 245), -1)

    def _draw_figma_cursor(self, canvas, x: int, y: int, dwell_prog: float):
        x = int(np.clip(x, 10, self.screen_w - 60))
        y = int(np.clip(y, 10, self.screen_h - 60))

        fill_col = (255, 89, 162)  # Figma Purple (#A259FF in BGR)

        # Drop Shadow
        shadow_pts = np.array([
            [x + 2, y + 3], [x + 2, y + 26], [x + 8, y + 20],
            [x + 13, y + 30], [x + 17, y + 28], [x + 12, y + 18], [x + 20, y + 18]
        ], np.int32)
        cv2.fillPoly(canvas, [shadow_pts], (20, 10, 30))

        # Figma Arrow
        arrow_pts = np.array([
            [x, y], [x, y + 23], [x + 6, y + 17],
            [x + 11, y + 27], [x + 15, y + 25], [x + 10, y + 15], [x + 18, y + 15]
        ], np.int32)
        cv2.fillPoly(canvas, [arrow_pts], fill_col)
        cv2.polylines(canvas, [arrow_pts], True, (255, 255, 255), 2, cv2.LINE_AA)

        # "You" Badge
        bx = x + 16
        by = y + 19
        bw, bh = 36, 18
        cv2.rectangle(canvas, (bx, by), (bx + bw, by + bh), fill_col, -1)
        cv2.rectangle(canvas, (bx, by), (bx + bw, by + bh), (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(canvas, "You", (bx + 6, by + 13), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (255, 255, 255), 1, cv2.LINE_AA)

        # 1-second dwell charging circle around tip
        if dwell_prog > 0.02:
            r = 14
            angle = int(dwell_prog * 360)
            cv2.ellipse(canvas, (x, y), (r, r), 0, -90, -90 + angle, (11, 158, 245), 3, cv2.LINE_AA)
            cv2.circle(canvas, (x, y), 3, (11, 158, 245), -1)

    def _draw_action_bar(self, canvas):
        bar_h = 75
        bar_y = self.screen_h - bar_h
        cv2.rectangle(canvas, (0, bar_y), (self.screen_w, self.screen_h), (25, 20, 14), -1)
        cv2.line(canvas, (0, bar_y), (self.screen_w, bar_y), (55, 45, 35), 1, cv2.LINE_AA)

        # Big Launch Button
        btn_w, btn_h = 440, 48
        btn_x = self.screen_w // 2 - btn_w // 2
        btn_y = bar_y + 14
        cv2.rectangle(canvas, (btn_x, btn_y), (btn_x + btn_w, btn_y + btn_h), (129, 185, 16), -1)
        cv2.rectangle(canvas, (btn_x, btn_y), (btn_x + btn_w, btn_y + btn_h), (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(canvas, "[ SPACE / ENTER ] : START DESKTOP MODE", (btn_x + 22, btn_y + 31),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.62, (255, 255, 255), 2, cv2.LINE_AA)

        # Shortcuts on sides
        cv2.putText(canvas, "[R] Re-register Points", (50, bar_y + 42),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1, cv2.LINE_AA)
        cv2.putText(canvas, "[D] Toggle 1s Dwell / Live", (270, bar_y + 42),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1, cv2.LINE_AA)
        cv2.putText(canvas, "[C] Clear Hits", (self.screen_w - 300, bar_y + 42),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1, cv2.LINE_AA)
        cv2.putText(canvas, "[ESC] Exit", (self.screen_w - 140, bar_y + 42),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (160, 160, 160), 1, cv2.LINE_AA)
