import { Vector2, Vector3, HandLandmarkIndex, Handedness } from '@cc68/core';
import { RawLandmarkPoint } from '../face/eye-geometry';

export interface PinchMetric {
  rawDistance: number;         // Euclidean distance in 3D world units
  normalizedDistance: number;  // Distance divided by palm scale (scale-invariant)
  contactMidpoint: Vector3;    // Midpoint between thumb tip and index tip
  contactScreenPoint: Vector2; // Projected 2D screen coordinate
}

export interface ExtendedFingersState {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
  count: number;
}

export interface HandBoundingSphere {
  center: Vector3;
  radius: number;
}

/**
 * Geometric analysis routines for 21-joint 3D hand landmarks.
 */
export class HandGeometry {
  /**
   * Anatomical hand scale: Euclidean distance between Wrist (0) and Middle Finger MCP (9).
   * This provides a scale-invariant baseline across different hand sizes and distances from camera.
   */
  static calculateHandScale(landmarks: Vector3[]): number {
    const wrist = landmarks[HandLandmarkIndex.WRIST];
    const middleMcp = landmarks[HandLandmarkIndex.MIDDLE_FINGER_MCP];
    if (!wrist || !middleMcp) return 1.0;

    const scale = wrist.distanceTo(middleMcp);
    return scale > 1e-6 ? scale : 1.0;
  }

  /**
   * Calculate 3D pinch metrics between thumb tip (4) and index finger tip (8).
   */
  static calculatePinch(landmarks: Vector3[]): PinchMetric {
    const thumbTip = landmarks[HandLandmarkIndex.THUMB_TIP];
    const indexTip = landmarks[HandLandmarkIndex.INDEX_FINGER_TIP];

    if (!thumbTip || !indexTip) {
      return {
        rawDistance: 1.0,
        normalizedDistance: 1.0,
        contactMidpoint: Vector3.zero(),
        contactScreenPoint: Vector2.zero(),
      };
    }

    const rawDistance = thumbTip.distanceTo(indexTip);
    const handScale = this.calculateHandScale(landmarks);
    const normalizedDistance = rawDistance / handScale;

    const midpoint3D = thumbTip.lerp(indexTip, 0.5);
    const screen2D = new Vector2(midpoint3D.x, midpoint3D.y);

    return {
      rawDistance,
      normalizedDistance,
      contactMidpoint: midpoint3D,
      contactScreenPoint: screen2D,
    };
  }

  /**
   * Compute the palm normal vector pointing outward from the palm plane.
   * Defined by Wrist (0), Index Finger MCP (5), and Pinky MCP (17).
   */
  static calculatePalmNormal(landmarks: Vector3[], handedness: Handedness = 'Right'): Vector3 {
    const wrist = landmarks[HandLandmarkIndex.WRIST];
    const indexMcp = landmarks[HandLandmarkIndex.INDEX_FINGER_MCP];
    const pinkyMcp = landmarks[HandLandmarkIndex.PINKY_MCP];

    if (!wrist || !indexMcp || !pinkyMcp) {
      return new Vector3(0, 0, -1);
    }

    const v1 = indexMcp.sub(wrist);
    const v2 = pinkyMcp.sub(wrist);

    // Cross product gives normal perpendicular to palm plane
    let normal = v1.cross(v2).normalize();

    // Invert normal for left hand to ensure vector consistently points out of palm
    if (handedness === 'Left') {
      normal = normal.scale(-1);
    }

    return normal;
  }

  /**
   * Determine which fingers are currently extended outward.
   * Compares fingertip distance from wrist against PIP/MCP joints.
   */
  static calculateFingersExtended(landmarks: Vector3[]): ExtendedFingersState {
    const wrist = landmarks[HandLandmarkIndex.WRIST];
    if (!wrist) {
      return { thumb: false, index: false, middle: false, ring: false, pinky: false, count: 0 };
    }

    const isExtended = (tipIdx: number, pipIdx: number, mcpIdx: number) => {
      const tip = landmarks[tipIdx];
      const pip = landmarks[pipIdx];
      const mcp = landmarks[mcpIdx];
      if (!tip || !pip || !mcp) return false;

      const tipDist = wrist.distanceTo(tip);
      const pipDist = wrist.distanceTo(pip);
      const mcpDist = wrist.distanceTo(mcp);

      return tipDist > pipDist && pipDist > mcpDist;
    };

    // Thumb check: distance between thumb tip and pinky MCP
    const thumbTip = landmarks[HandLandmarkIndex.THUMB_TIP];
    const thumbIp = landmarks[HandLandmarkIndex.THUMB_IP];
    const pinkyMcp = landmarks[HandLandmarkIndex.PINKY_MCP];
    let thumbExtended = false;
    if (thumbTip && thumbIp && pinkyMcp) {
      thumbExtended = thumbTip.distanceTo(pinkyMcp) > thumbIp.distanceTo(pinkyMcp);
    }

    const indexExtended = isExtended(
      HandLandmarkIndex.INDEX_FINGER_TIP,
      HandLandmarkIndex.INDEX_FINGER_PIP,
      HandLandmarkIndex.INDEX_FINGER_MCP
    );

    const middleExtended = isExtended(
      HandLandmarkIndex.MIDDLE_FINGER_TIP,
      HandLandmarkIndex.MIDDLE_FINGER_PIP,
      HandLandmarkIndex.MIDDLE_FINGER_MCP
    );

    const ringExtended = isExtended(
      HandLandmarkIndex.RING_FINGER_TIP,
      HandLandmarkIndex.RING_FINGER_PIP,
      HandLandmarkIndex.RING_FINGER_MCP
    );

    const pinkyExtended = isExtended(
      HandLandmarkIndex.PINKY_TIP,
      HandLandmarkIndex.PINKY_PIP,
      HandLandmarkIndex.PINKY_MCP
    );

    const count = [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

    return {
      thumb: thumbExtended,
      index: indexExtended,
      middle: middleExtended,
      ring: ringExtended,
      pinky: pinkyExtended,
      count,
    };
  }

  /**
   * Calculate minimum bounding sphere enclosing all 21 hand joints.
   */
  static calculateBoundingSphere(landmarks: Vector3[]): HandBoundingSphere {
    if (landmarks.length === 0) {
      return { center: Vector3.zero(), radius: 0 };
    }

    // Centroid
    let sumX = 0, sumY = 0, sumZ = 0;
    for (const pt of landmarks) {
      sumX += pt.x;
      sumY += pt.y;
      sumZ += pt.z;
    }
    const center = new Vector3(sumX / landmarks.length, sumY / landmarks.length, sumZ / landmarks.length);

    // Maximum distance from centroid
    let maxDist = 0;
    for (const pt of landmarks) {
      const d = center.distanceTo(pt);
      if (d > maxDist) maxDist = d;
    }

    return { center, radius: maxDist };
  }

  /**
   * Convert an array of 21 raw coordinate points to typed Vector3 list.
   */
  static toVector3List(rawPoints: RawLandmarkPoint[]): Vector3[] {
    return rawPoints.map((pt) => new Vector3(pt.x, pt.y, pt.z ?? 0));
  }

  /**
   * Convert an array of 21 raw coordinate points to 2D screen space Vector2 list.
   */
  static toVector2List(rawPoints: RawLandmarkPoint[]): Vector2[] {
    return rawPoints.map((pt) => new Vector2(pt.x, pt.y));
  }
}
