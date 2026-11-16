import { Vector2 } from '../math/vector2';
import { OneEuroFilter2D } from './one-euro';
import { GazeClassification } from '../types/gaze';

export interface GazeStabilizerConfig {
  /**
   * Radius in screen pixels within which gaze is considered a fixation (zero-shake deadzone).
   * Default: 35 pixels.
   */
  deadzoneRadiusPixels: number;

  /**
   * Distance in screen pixels to break a fixation lock and trigger a deliberate saccade to a new target.
   * Default: 50 pixels.
   */
  releaseThresholdPixels: number;

  /**
   * Maximum gaze velocity (in pixels/second) considered stationary/settled.
   * Default: 180 px/s.
   */
  fixationVelocityThreshold: number;

  /**
   * Milliseconds the gaze must remain low-velocity before locking into a steady fixation.
   * Default: 90 ms.
   */
  settleDurationMs: number;

  /**
   * One-Euro filter minimum cutoff frequency (Hz) for smoothing during active saccadic transitions.
   * Default: 0.6 Hz.
   */
  oneEuroMinCutoff: number;

  /**
   * One-Euro filter velocity coefficient for saccadic transitions.
   * Default: 0.015.
   */
  oneEuroBeta: number;
}

export const DEFAULT_GAZE_STABILIZER_CONFIG: GazeStabilizerConfig = {
  deadzoneRadiusPixels: 35,
  releaseThresholdPixels: 50,
  fixationVelocityThreshold: 180,
  settleDurationMs: 90,
  oneEuroMinCutoff: 0.6,
  oneEuroBeta: 0.015,
};

export interface StabilizedGazeResult {
  point: Vector2;
  classification: GazeClassification;
  isLocked: boolean;
}

/**
 * GazeStabilizer2D: Oculomotor Jitter Elimination & Fixation-Lock Engine.
 *
 * Implements an adaptive Dual-State Gaze Filter (I-VT velocity threshold & dispersion deadband):
 * 1. FIXATION STATE: When the user focuses on a specific region, small physiological micro-saccades,
 *    ocular tremors (nystagmus), and webcam sensor noise are suppressed completely.
 *    The cursor remains ROCK-SOLID and CONSTANT without any shaking.
 * 2. SACCADE STATE: When the user deliberately looks to a new screen position (distance exceeds release threshold),
 *    the lock releases and the cursor glides smoothly and responsively to the new target.
 *    Once the gaze settles, it firmly locks into place again.
 */
export class GazeStabilizer2D {
  private config: GazeStabilizerConfig;
  private saccadeFilter: OneEuroFilter2D;
  private lockedPoint: Vector2 | null = null;
  private currentOutputPoint: Vector2 | null = null;
  private isLocked: boolean = false;

  private lastRawTarget: Vector2 | null = null;
  private lastTimestampMs: number | null = null;
  private lowVelocityDurationMs: number = 0;

  constructor(config: Partial<GazeStabilizerConfig> = {}) {
    this.config = { ...DEFAULT_GAZE_STABILIZER_CONFIG, ...config };
    this.saccadeFilter = new OneEuroFilter2D({
      minCutoff: this.config.oneEuroMinCutoff,
      beta: this.config.oneEuroBeta,
      dCutoff: 1.0,
    });
  }

  /**
   * Filter an incoming raw gaze point.
   * Returns the rock-solid stabilized position and whether it is currently fixation-locked.
   */
  filter(rawTarget: Vector2, timestampMs: number): StabilizedGazeResult {
    // Initial point bootstrap
    if (this.lockedPoint === null || this.currentOutputPoint === null || this.lastTimestampMs === null) {
      this.lockedPoint = new Vector2(rawTarget.x, rawTarget.y);
      this.currentOutputPoint = new Vector2(rawTarget.x, rawTarget.y);
      this.lastRawTarget = new Vector2(rawTarget.x, rawTarget.y);
      this.lastTimestampMs = timestampMs;
      this.isLocked = true;
      this.lowVelocityDurationMs = 0;
      this.saccadeFilter.filter(rawTarget, timestampMs);

      return {
        point: this.currentOutputPoint,
        classification: 'fixation',
        isLocked: true,
      };
    }

    const dtMs = Math.max(1, timestampMs - this.lastTimestampMs);
    const dtSeconds = dtMs / 1000.0;
    this.lastTimestampMs = timestampMs;

    // Calculate instantaneous velocity of raw gaze in pixels/second
    const displacement = rawTarget.distanceTo(this.lastRawTarget!);
    const velocityPxPerSec = displacement / dtSeconds;
    this.lastRawTarget = new Vector2(rawTarget.x, rawTarget.y);

    const distanceToLocked = rawTarget.distanceTo(this.lockedPoint);

    // 1. If currently LOCKED in a fixation:
    if (this.isLocked) {
      if (distanceToLocked < this.config.releaseThresholdPixels) {
        // Micro-tremor / ocular jitter within threshold:
        // ZERO MOVEMENT. Output remains completely constant.
        // Gently adapt locked anchor (1% lerp) to accommodate very slow postural shifts
        this.lockedPoint = this.lockedPoint.lerp(rawTarget, 0.015);
        this.currentOutputPoint = new Vector2(this.lockedPoint.x, this.lockedPoint.y);

        return {
          point: this.currentOutputPoint,
          classification: 'fixation',
          isLocked: true,
        };
      } else {
        // Gaze has broken out of the deadzone: user is looking at a new target!
        this.isLocked = false;
        this.lowVelocityDurationMs = 0;
        // Warm up filter from current output position
        this.saccadeFilter.reset();
        this.saccadeFilter.filter(this.currentOutputPoint, timestampMs - 1);
      }
    }

    // 2. Gaze is in SACCADIC TRANSITION (moving to new screen target):
    const smoothed = this.saccadeFilter.filter(rawTarget, timestampMs);
    this.currentOutputPoint = smoothed;

    // Check if gaze velocity has dropped below threshold or movement is within micro-tremor bound,
    // indicating the user has arrived and is focusing at the new target
    const isLowVelocity = displacement < 5.0 || velocityPxPerSec < this.config.fixationVelocityThreshold;
    if (isLowVelocity) {
      this.lowVelocityDurationMs += dtMs;
      if (this.lowVelocityDurationMs >= this.config.settleDurationMs) {
        // Saccade completed: LOCK the cursor firmly at the new destination!
        this.isLocked = true;
        this.lockedPoint = new Vector2(smoothed.x, smoothed.y);
        this.lowVelocityDurationMs = 0;

        return {
          point: this.lockedPoint,
          classification: 'fixation',
          isLocked: true,
        };
      }
    } else {
      this.lowVelocityDurationMs = 0;
    }

    return {
      point: this.currentOutputPoint,
      classification: 'saccade',
      isLocked: false,
    };
  }

  /**
   * Reset filter state (e.g. when stream pauses or blinks).
   */
  reset(): void {
    this.lockedPoint = null;
    this.currentOutputPoint = null;
    this.lastRawTarget = null;
    this.lastTimestampMs = null;
    this.isLocked = false;
    this.lowVelocityDurationMs = 0;
    this.saccadeFilter.reset();
  }

  /**
   * Query whether the cursor is currently in rock-solid fixation lock.
   */
  isFixationLocked(): boolean {
    return this.isLocked;
  }
}
