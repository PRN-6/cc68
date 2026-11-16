import { describe, it, expect } from 'vitest';
import {
  EyeGeometry,
  FACE_LANDMARKS_INDICES,
  FaceLandmarkerService,
  RawLandmarkPoint,
} from '../src';

describe('EyeGeometry & Blink Detection', () => {
  it('correctly calculates nominal EAR for open eyes and identifies non-blinking state', () => {
    // Generate synthetic open eye landmarks
    const landmarks: RawLandmarkPoint[] = Array.from({ length: 500 }, () => ({ x: 0, y: 0, z: 0 }));
    const leftEye = FACE_LANDMARKS_INDICES.LEFT_EYE;

    // Horizontal distance: 40px (e.g. x: 100 to 140)
    landmarks[leftEye.OUTER_CORNER] = { x: 0.40, y: 0.50 };
    landmarks[leftEye.INNER_CORNER] = { x: 0.48, y: 0.50 }; // width = 0.08

    // Vertical distance pair 1: 12px
    landmarks[leftEye.UPPER_LID_SECONDARY_1] = { x: 0.43, y: 0.475 };
    landmarks[leftEye.LOWER_LID_SECONDARY_1] = { x: 0.43, y: 0.525 }; // height1 = 0.05

    // Vertical distance pair 2: 12px
    landmarks[leftEye.UPPER_LID_SECONDARY_2] = { x: 0.45, y: 0.475 };
    landmarks[leftEye.LOWER_LID_SECONDARY_2] = { x: 0.45, y: 0.525 }; // height2 = 0.05

    const ear = EyeGeometry.calculateEAR(landmarks, leftEye);
    // EAR = (0.05 + 0.05) / (2 * 0.08) = 0.10 / 0.16 = 0.625
    expect(ear).toBeGreaterThan(0.3);
    expect(EyeGeometry.isBlinking(ear)).toBe(false);
  });

  it('correctly calculates low EAR for closed eyelids and triggers blink detection', () => {
    const landmarks: RawLandmarkPoint[] = Array.from({ length: 500 }, () => ({ x: 0, y: 0, z: 0 }));
    const leftEye = FACE_LANDMARKS_INDICES.LEFT_EYE;

    // Horizontal: width = 0.08
    landmarks[leftEye.OUTER_CORNER] = { x: 0.40, y: 0.50 };
    landmarks[leftEye.INNER_CORNER] = { x: 0.48, y: 0.50 };

    // Eyelids closed: vertical distances collapsed to ~0.01
    landmarks[leftEye.UPPER_LID_SECONDARY_1] = { x: 0.43, y: 0.495 };
    landmarks[leftEye.LOWER_LID_SECONDARY_1] = { x: 0.43, y: 0.505 };

    landmarks[leftEye.UPPER_LID_SECONDARY_2] = { x: 0.45, y: 0.495 };
    landmarks[leftEye.LOWER_LID_SECONDARY_2] = { x: 0.45, y: 0.505 };

    const ear = EyeGeometry.calculateEAR(landmarks, leftEye);
    // EAR = (0.01 + 0.01) / (2 * 0.08) = 0.02 / 0.16 = 0.125
    expect(ear).toBeLessThan(0.18);
    expect(EyeGeometry.isBlinking(ear)).toBe(true);
  });

  it('computes normalized iris displacement within eye contours', () => {
    const landmarks: RawLandmarkPoint[] = Array.from({ length: 500 }, () => ({ x: 0, y: 0, z: 0 }));
    const leftEye = FACE_LANDMARKS_INDICES.LEFT_EYE;

    // Left eye corner bounds: x from 0.40 to 0.50 (center = 0.45)
    landmarks[leftEye.OUTER_CORNER] = { x: 0.40, y: 0.50 };
    landmarks[leftEye.INNER_CORNER] = { x: 0.50, y: 0.50 };
    landmarks[leftEye.UPPER_LID_PRIMARY] = { x: 0.45, y: 0.48 };
    landmarks[leftEye.LOWER_LID_PRIMARY] = { x: 0.45, y: 0.52 };

    // Case 1: Iris exactly in center (0.45, 0.50)
    landmarks[leftEye.IRIS_CENTER] = { x: 0.45, y: 0.50 };
    landmarks[leftEye.IRIS_LEFT] = { x: 0.44, y: 0.50 };
    landmarks[leftEye.IRIS_RIGHT] = { x: 0.46, y: 0.50 };
    landmarks[leftEye.IRIS_TOP] = { x: 0.45, y: 0.49 };
    landmarks[leftEye.IRIS_BOTTOM] = { x: 0.45, y: 0.51 };

    const eyeCenter = EyeGeometry.extractEye(landmarks, leftEye);
    const offsetCenter = EyeGeometry.calculateNormalizedIrisOffset(eyeCenter);
    expect(offsetCenter.x).toBeCloseTo(0, 2);
    expect(offsetCenter.y).toBeCloseTo(0, 2);

    // Case 2: Looking right (iris shifted towards 0.48)
    landmarks[leftEye.IRIS_CENTER] = { x: 0.48, y: 0.50 };
    const eyeRight = EyeGeometry.extractEye(landmarks, leftEye);
    const offsetRight = EyeGeometry.calculateNormalizedIrisOffset(eyeRight);
    expect(offsetRight.x).toBeGreaterThan(0.5);

    // Case 3: Looking left (iris shifted towards 0.42)
    landmarks[leftEye.IRIS_CENTER] = { x: 0.42, y: 0.50 };
    const eyeLeft = EyeGeometry.extractEye(landmarks, leftEye);
    const offsetLeft = EyeGeometry.calculateNormalizedIrisOffset(eyeLeft);
    expect(offsetLeft.x).toBeLessThan(-0.5);
  });

  it('estimates 3D head pose orientation (pitch, yaw, roll)', () => {
    const landmarks: RawLandmarkPoint[] = Array.from({ length: 500 }, () => ({ x: 0, y: 0, z: 0 }));
    const anchors = FACE_LANDMARKS_INDICES.HEAD_POSE_ANCHORS;

    // Neutral head pose (centered)
    landmarks[anchors.NOSE_TIP] = { x: 0.50, y: 0.50, z: 0 };
    landmarks[anchors.CHIN] = { x: 0.50, y: 0.70, z: 0 };
    landmarks[anchors.FOREHEAD_GLABELLA] = { x: 0.50, y: 0.30, z: 0 };
    landmarks[anchors.LEFT_TEMPLE] = { x: 0.30, y: 0.45, z: 0 };
    landmarks[anchors.RIGHT_TEMPLE] = { x: 0.70, y: 0.45, z: 0 };

    const neutralPose = EyeGeometry.estimateHeadPose(landmarks);
    expect(neutralPose.yaw).toBeCloseTo(0, 1);
    expect(neutralPose.pitch).toBeCloseTo(0, 1);
    expect(neutralPose.roll).toBeCloseTo(0, 1);

    // Turn head right (nose shifts towards right temple)
    landmarks[anchors.NOSE_TIP] = { x: 0.60, y: 0.50, z: 0 };
    const turnedPose = EyeGeometry.estimateHeadPose(landmarks);
    expect(turnedPose.yaw).toBeGreaterThan(15);
  });
});

describe('FaceLandmarkerService', () => {
  it('correctly processes 478 landmarks into structured FaceLandmarksSummary', () => {
    const service = new FaceLandmarkerService();
    const mockLandmarks: RawLandmarkPoint[] = Array.from({ length: 478 }, (_, i) => ({
      x: 0.5 + (i % 10) * 0.01,
      y: 0.5 + (i % 7) * 0.01,
      z: 0.1,
    }));

    const summary = service.processRawLandmarks(mockLandmarks, 1000);
    expect(summary).toBeDefined();
    expect(summary.timestamp).toBe(1000);
    expect(summary.confidence).toBeGreaterThan(0.9);
    expect(summary.leftEye).toBeDefined();
    expect(summary.rightEye).toBeDefined();
    expect(summary.leftEye.iris.center).toBeDefined();
    expect(summary.rightEye.iris.center).toBeDefined();
    expect(summary.noseTip.x).toBeDefined();
    expect(typeof summary.pitch).toBe('number');
    expect(typeof summary.yaw).toBe('number');
    expect(typeof summary.roll).toBe('number');
  });
});

