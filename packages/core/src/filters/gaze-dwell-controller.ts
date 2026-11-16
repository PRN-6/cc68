import { Vector2 } from '../math/vector2';

export interface GazeDwellConfig {
  /**
   * Required continuous stare duration in milliseconds before moving the cursor.
   * Default: 1000 ms (1.0 second as specified by user).
   */
  stareDurationMs: number;

  /**
   * Maximum dispersion radius (in screen pixels) within which incoming gaze points
   * are considered focused on the same specific position.
   * Default: 70 pixels.
   */
  stareRadiusPixels: number;

  /**
   * Minimum distance (in screen pixels) from current cursor position required to
   * trigger a new stare countdown.
   * Default: 40 pixels.
   */
  minTargetDistancePixels: number;
}

export const DEFAULT_GAZE_DWELL_CONFIG: GazeDwellConfig = {
  stareDurationMs: 1000,
  stareRadiusPixels: 70,
  minTargetDistancePixels: 40,
};

export interface GazeDwellResult {
  /**
   * Current cursor position on screen.
   * DOES NOT MOVE until user has continuously stared at a new position for 1 second.
   */
  cursorPosition: Vector2;

  /**
   * The candidate target point currently being stared at.
   */
  candidateTarget: Vector2;

  /**
   * Stare progress from 0.0 (0s) to 1.0 (1.0s).
   */
  dwellProgress: number;

  /**
   * Elapsed stare duration in milliseconds on current candidate target.
   */
  elapsedMs: number;

  /**
   * True on the exact frame the 1-second stare completes and the cursor moves.
   */
  hasMoved: boolean;

  /**
   * True if user is actively dwelling on a candidate target different from current cursor.
   */
  isStaring: boolean;
}

/**
 * GazeDwellController: 1-Second Stare Dwell Cursor Movement Engine.
 *
 * Rule:
 * 1. The cursor stays completely still and DOES NOT MOVE while the user looks or glances around.
 * 2. When the user looks at a specific position on the screen and stares at it for 1 full second (1000ms),
 *    the cursor moves to that exact position.
 * 3. If gaze wanders before 1 second is reached, progress resets and the cursor never moves.
 */
export class GazeDwellController {
  private config: GazeDwellConfig;
  private currentCursorPos: Vector2 | null = null;
  private candidateTarget: Vector2 | null = null;
  private dwellStartTimeMs: number | null = null;

  constructor(config: Partial<GazeDwellConfig> = {}) {
    this.config = { ...DEFAULT_GAZE_DWELL_CONFIG, ...config };
  }

  /**
   * Initialize or override the current resting cursor position.
   */
  setCursorPosition(pos: Vector2): void {
    this.currentCursorPos = new Vector2(pos.x, pos.y);
    this.candidateTarget = null;
    this.dwellStartTimeMs = null;
  }

  /**
   * Process a new gaze sample at timestampMs.
   */
  update(rawGaze: Vector2, timestampMs: number): GazeDwellResult {
    // 1. Initial point setup
    if (this.currentCursorPos === null) {
      this.currentCursorPos = new Vector2(rawTargetSafe(rawGaze).x, rawTargetSafe(rawGaze).y);
      this.candidateTarget = new Vector2(this.currentCursorPos.x, this.currentCursorPos.y);

      return {
        cursorPosition: this.currentCursorPos,
        candidateTarget: this.candidateTarget,
        dwellProgress: 0,
        elapsedMs: 0,
        hasMoved: false,
        isStaring: false,
      };
    }

    const gaze = rawTargetSafe(rawGaze);
    const distToCurrentCursor = gaze.distanceTo(this.currentCursorPos);

    // If gaze is already at the current cursor position, no need to trigger a new stare
    if (distToCurrentCursor < this.config.minTargetDistancePixels) {
      this.candidateTarget = new Vector2(gaze.x, gaze.y);
      this.dwellStartTimeMs = null;

      return {
        cursorPosition: this.currentCursorPos,
        candidateTarget: this.candidateTarget,
        dwellProgress: 0,
        elapsedMs: 0,
        hasMoved: false,
        isStaring: false,
      };
    }

    // 2. Gaze is focused on a NEW position away from current cursor:
    if (this.candidateTarget === null || this.dwellStartTimeMs === null) {
      // Begin new candidate stare
      this.candidateTarget = new Vector2(gaze.x, gaze.y);
      this.dwellStartTimeMs = timestampMs;

      return {
        cursorPosition: this.currentCursorPos,
        candidateTarget: this.candidateTarget,
        dwellProgress: 0,
        elapsedMs: 0,
        hasMoved: false,
        isStaring: true,
      };
    }

    // Check if gaze is still within the stare radius of candidate target
    const distToCandidate = gaze.distanceTo(this.candidateTarget);

    if (distToCandidate <= this.config.stareRadiusPixels) {
      // User is continuously staring at this specific position!
      // Smoothly refine candidate centroid (running average)
      this.candidateTarget = this.candidateTarget.lerp(gaze, 0.05);

      const elapsed = timestampMs - this.dwellStartTimeMs;
      const progress = Math.min(1.0, elapsed / this.config.stareDurationMs);

      // Check if 1 second (stareDurationMs) has elapsed!
      if (elapsed >= this.config.stareDurationMs) {
        // 1 SECOND REACHED: MOVE THE CURSOR NOW!
        this.currentCursorPos = new Vector2(this.candidateTarget.x, this.candidateTarget.y);
        this.dwellStartTimeMs = null; // Reset for next target

        return {
          cursorPosition: this.currentCursorPos,
          candidateTarget: this.currentCursorPos,
          dwellProgress: 1.0,
          elapsedMs: elapsed,
          hasMoved: true,
          isStaring: false,
        };
      }

      // Still counting down to 2 seconds: CURSOR DOES NOT MOVE!
      return {
        cursorPosition: this.currentCursorPos,
        candidateTarget: this.candidateTarget,
        dwellProgress: progress,
        elapsedMs: elapsed,
        hasMoved: false,
        isStaring: true,
      };
    } else {
      // Gaze wandered away before 2 seconds were reached:
      // Reset countdown to new target! CURSOR DOES NOT MOVE!
      this.candidateTarget = new Vector2(gaze.x, gaze.y);
      this.dwellStartTimeMs = timestampMs;

      return {
        cursorPosition: this.currentCursorPos,
        candidateTarget: this.candidateTarget,
        dwellProgress: 0,
        elapsedMs: 0,
        hasMoved: false,
        isStaring: true,
      };
    }
  }

  /**
   * Reset dwell controller state.
   */
  reset(): void {
    this.candidateTarget = null;
    this.dwellStartTimeMs = null;
  }

  /**
   * Get current resting cursor position.
   */
  getCursorPosition(): Vector2 | null {
    return this.currentCursorPos;
  }
}

function rawTargetSafe(v: Vector2): Vector2 {
  const x = Number.isFinite(v.x) ? v.x : 0;
  const y = Number.isFinite(v.y) ? v.y : 0;
  return new Vector2(x, y);
}
