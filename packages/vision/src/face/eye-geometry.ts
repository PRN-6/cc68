import { Vector2, EyeLandmarks, IrisLandmarks } from '@cc68/core';
import { FACE_LANDMARKS_INDICES } from './face-landmarks-indices';

export interface RawLandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface HeadOrientation {
  pitch: number; // In degrees (-up / +down)
  yaw: number;   // In degrees (-left / +right)
  roll: number;  // In degrees (-tilt left / +tilt right)
}

/**
 * Geometric analysis routines for eyes, irises, and head pose.
 */
export class EyeGeometry {
  /**
   * Calculate Eye Aspect Ratio (EAR) based on Soukupova & Cech (2016).
   * Formula: EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
   */
  static calculateEAR(
    landmarks: RawLandmarkPoint[],
    eye: typeof FACE_LANDMARKS_INDICES.LEFT_EYE | typeof FACE_LANDMARKS_INDICES.RIGHT_EYE
  ): number {
    const p1 = landmarks[eye.OUTER_CORNER];
    const p4 = landmarks[eye.INNER_CORNER];
    const p2 = landmarks[eye.UPPER_LID_SECONDARY_1];
    const p6 = landmarks[eye.LOWER_LID_SECONDARY_1];
    const p3 = landmarks[eye.UPPER_LID_SECONDARY_2];
    const p5 = landmarks[eye.LOWER_LID_SECONDARY_2];

    if (!p1 || !p4 || !p2 || !p6 || !p3 || !p5) {
      return 0.3; // Default nominal open eye ratio
    }

    const dist = (a: RawLandmarkPoint, b: RawLandmarkPoint) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const vertical1 = dist(p2, p6);
    const vertical2 = dist(p3, p5);
    const horizontal = dist(p1, p4);

    if (horizontal < 1e-6) return 0;
    return (vertical1 + vertical2) / (2.0 * horizontal);
  }

  /**
   * Determine if eye is closed/blinking based on EAR threshold (nominal threshold: 0.20).
   */
  static isBlinking(ear: number, threshold: number = 0.19): boolean {
    return ear < threshold;
  }

  /**
   * Extract typed iris landmarks.
   */
  static extractIris(
    landmarks: RawLandmarkPoint[],
    eye: typeof FACE_LANDMARKS_INDICES.LEFT_EYE | typeof FACE_LANDMARKS_INDICES.RIGHT_EYE
  ): IrisLandmarks {
    const getV2 = (idx: number) => {
      const pt = landmarks[idx];
      return pt ? new Vector2(pt.x, pt.y) : new Vector2(0, 0);
    };

    return {
      center: getV2(eye.IRIS_CENTER),
      left: getV2(eye.IRIS_LEFT),
      right: getV2(eye.IRIS_RIGHT),
      top: getV2(eye.IRIS_TOP),
      bottom: getV2(eye.IRIS_BOTTOM),
    };
  }

  /**
   * Extract full eye landmarks including canthi, eyelids, and iris.
   */
  static extractEye(
    landmarks: RawLandmarkPoint[],
    eye: typeof FACE_LANDMARKS_INDICES.LEFT_EYE | typeof FACE_LANDMARKS_INDICES.RIGHT_EYE
  ): EyeLandmarks {
    const getV2 = (idx: number) => {
      const pt = landmarks[idx];
      return pt ? new Vector2(pt.x, pt.y) : new Vector2(0, 0);
    };

    const ear = this.calculateEAR(landmarks, eye);
    // Normalize EAR to an openness ratio between 0 (closed) and 1 (wide open)
    // Nominal EAR: closed ~0.15, resting open ~0.30, wide open ~0.40+
    const opennessRatio = Math.max(0, Math.min(1, (ear - 0.15) / 0.17));

    return {
      iris: this.extractIris(landmarks, eye),
      eyelidUpper: getV2(eye.UPPER_LID_PRIMARY),
      eyelidLower: getV2(eye.LOWER_LID_PRIMARY),
      innerCorner: getV2(eye.INNER_CORNER),
      outerCorner: getV2(eye.OUTER_CORNER),
      opennessRatio,
    };
  }

  /**
   * Calculate normalized iris displacement relative to eye corners:
   * Returns a 2D offset where:
   * x in [-1, 1]: -1 = looking extreme left, 0 = center, +1 = looking extreme right
   * y in [-1, 1]: -1 = looking extreme up, 0 = center, +1 = looking extreme down
   */
  static calculateNormalizedIrisOffset(eye: EyeLandmarks): Vector2 {
    const eyeCenter = eye.innerCorner.lerp(eye.outerCorner, 0.5);
    const eyeWidth = Math.abs(eye.outerCorner.x - eye.innerCorner.x);
    const eyeHeight = Math.abs(eye.eyelidLower.y - eye.eyelidUpper.y);

    if (eyeWidth < 1e-6 || eyeHeight < 1e-6) {
      return new Vector2(0, 0);
    }

    const dx = (eye.iris.center.x - eyeCenter.x) / (eyeWidth * 0.5);
    const dy = (eye.iris.center.y - eyeCenter.y) / (eyeHeight * 0.5);

    return new Vector2(
      Math.max(-1, Math.min(1, dx)),
      Math.max(-1, Math.min(1, dy))
    );
  }

  /**
   * Estimate 3D head orientation (pitch, yaw, roll) using key facial anchor landmarks.
   */
  static estimateHeadPose(landmarks: RawLandmarkPoint[]): HeadOrientation {
    const anchors = FACE_LANDMARKS_INDICES.HEAD_POSE_ANCHORS;
    const nose = landmarks[anchors.NOSE_TIP];
    const chin = landmarks[anchors.CHIN];
    const forehead = landmarks[anchors.FOREHEAD_GLABELLA];
    const leftTemple = landmarks[anchors.LEFT_TEMPLE];
    const rightTemple = landmarks[anchors.RIGHT_TEMPLE];

    if (!nose || !chin || !forehead || !leftTemple || !rightTemple) {
      return { pitch: 0, yaw: 0, roll: 0 };
    }

    // Yaw: asymmetry between nose and temples
    const distToLeft = Math.abs(nose.x - leftTemple.x);
    const distToRight = Math.abs(nose.x - rightTemple.x);
    const totalTempleDist = distToLeft + distToRight;
    const yawRatio = totalTempleDist > 1e-6 ? (distToLeft - distToRight) / totalTempleDist : 0;
    const yaw = yawRatio * 90; // Approximate degrees

    // Pitch: vertical ratio of nose between forehead and chin
    const upperDist = Math.abs(nose.y - forehead.y);
    const lowerDist = Math.abs(chin.y - nose.y);
    const totalFaceHeight = upperDist + lowerDist;
    const pitchRatio = totalFaceHeight > 1e-6 ? (upperDist - lowerDist) / totalFaceHeight : 0;
    const pitch = pitchRatio * 75; // Approximate degrees

    // Roll: tilt of temples line
    const dx = rightTemple.x - leftTemple.x;
    const dy = rightTemple.y - leftTemple.y;
    const roll = Math.atan2(dy, dx) * (180.0 / Math.PI);

    return {
      pitch: Math.round(pitch * 10) / 10,
      yaw: Math.round(yaw * 10) / 10,
      roll: Math.round(roll * 10) / 10,
    };
  }
}
