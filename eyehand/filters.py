"""
Component 3: Stabilization & 1-Second Stare Dwell Filter
Implements:
1. One Euro Filter: adaptive low-pass filter (eliminates tremor when fixating, responsive during saccades).
2. Gaze Dwell Controller: locks cursor constant; moves ONLY when fixating on a candidate for 1.0 full second.
"""

import math

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

class GazeDwellController:
    """
    Keeps cursor locked at current target.
    Moves the cursor ONLY when the user fixates on a specific position for 1.0 full second.
    """
    def __init__(self, stare_duration_s=1.0, stare_radius_px=110, screen_w=1920, screen_h=1080):
        self.stare_duration_s = stare_duration_s
        self.stare_radius_px = stare_radius_px
        self.current_cursor = (screen_w // 2, screen_h // 2)
        self.candidate_center = None
        self.candidate_start_time = None
        self.dwell_progress = 0.0
        self.outlier_count = 0

    def update(self, raw_point, now):
        rx, ry = raw_point

        if self.current_cursor is None:
            self.current_cursor = (rx, ry)
            return self.current_cursor, 0.0, True

        # Distance from active locked cursor
        dist_from_active = math.hypot(rx - self.current_cursor[0], ry - self.current_cursor[1])
        if dist_from_active < 45:
            # Still looking at current cursor position
            self.candidate_center = None
            self.candidate_start_time = None
            self.dwell_progress = 0.0
            self.outlier_count = 0
            return self.current_cursor, 0.0, False

        # First frame of new fixation candidate
        if self.candidate_center is None:
            self.candidate_center = (rx, ry)
            self.candidate_start_time = now
            self.dwell_progress = 0.0
            self.outlier_count = 0
            return self.current_cursor, 0.0, False

        # Distance to candidate stare position
        dist_to_cand = math.hypot(rx - self.candidate_center[0], ry - self.candidate_center[1])

        if dist_to_cand <= self.stare_radius_px:
            # Softly attract candidate center to steady eye drift
            self.candidate_center = (
                self.candidate_center[0] * 0.88 + rx * 0.12,
                self.candidate_center[1] * 0.88 + ry * 0.12
            )
            self.outlier_count = 0
            elapsed = now - self.candidate_start_time
            self.dwell_progress = min(1.0, elapsed / self.stare_duration_s)

            if elapsed >= self.stare_duration_s:
                # 1.0-second stare confirmed! Move cursor!
                self.current_cursor = (int(self.candidate_center[0]), int(self.candidate_center[1]))
                self.candidate_center = None
                self.candidate_start_time = None
                self.dwell_progress = 0.0
                return self.current_cursor, 1.0, True
            else:
                return self.current_cursor, self.dwell_progress, False
        else:
            # Tolerate up to 3 transient outlier frames near boundary
            if dist_to_cand <= 2.0 * self.stare_radius_px and self.outlier_count < 3:
                self.outlier_count += 1
                return self.current_cursor, self.dwell_progress, False

            # Intentional glance away: reset candidate
            self.candidate_center = (rx, ry)
            self.candidate_start_time = now
            self.dwell_progress = 0.0
            self.outlier_count = 0
            return self.current_cursor, 0.0, False

    def reset(self, center=None):
        if center:
            self.current_cursor = center
        self.candidate_center = None
        self.candidate_start_time = None
        self.dwell_progress = 0.0
        self.outlier_count = 0

