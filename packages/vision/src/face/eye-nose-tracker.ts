import { FaceLandmarksSummary, Vector2 } from '@cc68/core';
import { EyeGeometry } from './eye-geometry';

export interface EyeNoseTrackerConfig {
  /** Sensitivity multiplier for eye iris gaze in X axis (default: 0.70) */
  eyeSensitivityX: number;
  /** Sensitivity multiplier for eye iris gaze in Y axis (default: 0.75) */
  eyeSensitivityY: number;
  /** Sensitivity multiplier for nose tip displacement in X axis (default: 0.85) */
  noseSensitivityX: number;
  /** Sensitivity multiplier for nose tip displacement in Y axis (default: 0.90) */
  noseSensitivityY: number;
  /** Deadzone threshold for nose movement to ignore involuntary head tremor (default: 0.012) */
  noseDeadzone: number;
  /** Weight of eye iris gaze vs nose tracking (0.0 = nose only, 1.0 = eye only, default: 0.55) */
  eyeBlendWeight: number;
  /** Whether to auto-calibrate resting anchor on first valid face detection (default: true) */
  autoCalibrateOnFirstFrame: boolean;
}

export const DEFAULT_EYE_NOSE_CONFIG: EyeNoseTrackerConfig = {
  eyeSensitivityX: 0.70,
  eyeSensitivityY: 0.75,
  noseSensitivityX: 0.85,
  noseSensitivityY: 0.90,
  noseDeadzone: 0.012,
  eyeBlendWeight: 0.55,
  autoCalibrateOnFirstFrame: true,
};

export interface EyeNoseGazeResult {
  /** Normalized screen target coordinates in [0.0, 1.0] */
  screenPointNorm: Vector2;
  /** Current nose tip position in normalized camera coordinates [0, 1] */
  nosePosition: Vector2;
  /** Displacement of nose tip relative to calibrated resting anchor */
  noseOffset: Vector2;
  /** Combined binocular iris offset [-1.0, 1.0] */
  eyeGazeOffset: Vector2;
  /** Left eye iris offset [-1.0, 1.0] */
  leftEyeOffset: Vector2;
  /** Right eye iris offset [-1.0, 1.0] */
  rightEyeOffset: Vector2;
  /** Whether user is actively blinking / eyes closed */
  isBlinking: boolean;
  /** Whether resting anchor has been calibrated */
  isCalibrated: boolean;
}

/**
 * Dedicated Eye & Nose Gaze Tracking Engine.
 *
 * Exclusively tracks the user's Eyes (irises & canthi) and Nose (tip),
 * completely ignoring head pitch/yaw/roll, chin, forehead, and temple rotation.
 * Involuntary head drift below the deadzone is suppressed, ensuring rock-solid
 * cursor stability.
 */
export class EyeNoseGazeTracker {
  private config: EyeNoseTrackerConfig;
  private anchorNose: Vector2 | null = null;
  private calibrated: boolean = false;

  constructor(config: Partial<EyeNoseTrackerConfig> = {}) {
    this.config = { ...DEFAULT_EYE_NOSE_CONFIG, ...config };
  }

  /**
   * Calibrate resting neutral anchor position for the nose.
   * If point is not supplied, resets to uncalibrated so the next frame auto-anchors.
   */
  calibrate(point?: Vector2): void {
    if (point) {
      this.anchorNose = new Vector2(point.x, point.y);
      this.calibrated = true;
    } else {
      this.anchorNose = null;
      this.calibrated = false;
    }
  }

  /**
   * Reset the tracker state and anchor.
   */
  reset(): void {
    this.anchorNose = null;
    this.calibrated = false;
  }

  /**
   * Whether the tracker has an active calibrated neutral anchor.
   */
  isCalibrated(): boolean {
    return this.calibrated && this.anchorNose !== null;
  }

  /**
   * Get the current neutral anchor coordinates.
   */
  getAnchorNose(): Vector2 | null {
    return this.anchorNose ? new Vector2(this.anchorNose.x, this.anchorNose.y) : null;
  }

  /**
   * Estimate normalized screen gaze point strictly from the Eyes and Nose.
   */
  estimateGaze(summary: FaceLandmarksSummary): EyeNoseGazeResult {
    const nose = new Vector2(summary.noseTip.x, summary.noseTip.y);

    // 1. Auto-calibrate anchor on first valid face frame if configured
    if (!this.calibrated || !this.anchorNose) {
      if (this.config.autoCalibrateOnFirstFrame) {
        this.anchorNose = new Vector2(nose.x, nose.y);
        this.calibrated = true;
      } else {
        this.anchorNose = new Vector2(0.5, 0.5);
      }
    }

    // 2. Binocular Eye Iris Offset Extraction
    const leftOffset = EyeGeometry.calculateNormalizedIrisOffset(summary.leftEye);
    const rightOffset = EyeGeometry.calculateNormalizedIrisOffset(summary.rightEye);

    const leftEar = summary.leftEye.opennessRatio * 0.17 + 0.15;
    const rightEar = summary.rightEye.opennessRatio * 0.17 + 0.15;
    const leftBlink = EyeGeometry.isBlinking(leftEar);
    const rightBlink = EyeGeometry.isBlinking(rightEar);
    const isBlinking = leftBlink && rightBlink;

    // Combine both eyes: if both open average them, if one blinking use the open eye
    let combinedEyeX = 0;
    let combinedEyeY = 0;
    if (!leftBlink && !rightBlink) {
      combinedEyeX = (leftOffset.x + rightOffset.x) * 0.5;
      combinedEyeY = (leftOffset.y + rightOffset.y) * 0.5;
    } else if (!leftBlink) {
      combinedEyeX = leftOffset.x;
      combinedEyeY = leftOffset.y;
    } else if (!rightBlink) {
      combinedEyeX = rightOffset.x;
      combinedEyeY = rightOffset.y;
    }

    const eyeGazeOffset = new Vector2(combinedEyeX, combinedEyeY);

    // 3. Nose Displacement relative to Calibrated Anchor
    const rawNoseDx = nose.x - this.anchorNose.x;
    const rawNoseDy = nose.y - this.anchorNose.y;

    // Suppress small involuntary head movement below deadzone threshold
    const noseDist = Math.sqrt(rawNoseDx * rawNoseDx + rawNoseDy * rawNoseDy);
    let filteredNoseDx = 0;
    let filteredNoseDy = 0;
    if (noseDist > this.config.noseDeadzone) {
      // Smoothly subtract deadzone to prevent step discontinuities
      const scale = (noseDist - this.config.noseDeadzone) / noseDist;
      filteredNoseDx = rawNoseDx * scale;
      filteredNoseDy = rawNoseDy * scale;
    }

    const noseOffset = new Vector2(filteredNoseDx, filteredNoseDy);

    // 4. Combine Eye & Nose into Normalized Screen Point [0.0, 1.0]
    // In mirrored webcam: looking right moves nose & irises towards camera-left (negative X)
    // Looking down moves nose & irises towards camera-bottom (positive Y)
    const eyeWeight = this.config.eyeBlendWeight;
    const noseWeight = 1.0 - eyeWeight;

    const deltaX =
      eyeGazeOffset.x * this.config.eyeSensitivityX * eyeWeight +
      noseOffset.x * this.config.noseSensitivityX * noseWeight;

    const deltaY =
      eyeGazeOffset.y * this.config.eyeSensitivityY * eyeWeight +
      noseOffset.y * this.config.noseSensitivityY * noseWeight;

    // Center baseline is 0.5, 0.5
    const normX = Math.max(0, Math.min(1, 0.5 - deltaX));
    const normY = Math.max(0, Math.min(1, 0.5 + deltaY));

    return {
      screenPointNorm: new Vector2(normX, normY),
      nosePosition: nose,
      noseOffset,
      eyeGazeOffset,
      leftEyeOffset: leftOffset,
      rightEyeOffset: rightOffset,
      isBlinking,
      isCalibrated: this.calibrated,
    };
  }
}
