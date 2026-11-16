import { describe, it, expect } from 'vitest';
import { Vector2, Vector3, FaceLandmarksSummary, EyeLandmarks } from '@cc68/core';
import { EyeNoseGazeTracker } from '../src';

function createMockEye(irisCenter: Vector2, innerCorner: Vector2, outerCorner: Vector2, open: boolean = true): EyeLandmarks {
  return {
    iris: {
      center: irisCenter,
      left: new Vector2(irisCenter.x - 0.01, irisCenter.y),
      right: new Vector2(irisCenter.x + 0.01, irisCenter.y),
      top: new Vector2(irisCenter.x, irisCenter.y - 0.01),
      bottom: new Vector2(irisCenter.x, irisCenter.y + 0.01),
    },
    innerCorner,
    outerCorner,
    eyelidUpper: new Vector2((innerCorner.x + outerCorner.x) / 2, 0.48),
    eyelidLower: new Vector2((innerCorner.x + outerCorner.x) / 2, 0.52),
    opennessRatio: open ? 0.8 : 0.0,
  };
}

function createMockFaceSummary(nose: Vector2, leftIrisOffset: number = 0, rightIrisOffset: number = 0): FaceLandmarksSummary {
  // Left eye centered at (0.45, 0.50), width 0.10
  const leftEye = createMockEye(
    new Vector2(0.45 + leftIrisOffset * 0.04, 0.50),
    new Vector2(0.50, 0.50),
    new Vector2(0.40, 0.50)
  );

  // Right eye centered at (0.55, 0.50), width 0.10
  const rightEye = createMockEye(
    new Vector2(0.55 + rightIrisOffset * 0.04, 0.50),
    new Vector2(0.50, 0.50),
    new Vector2(0.60, 0.50)
  );

  return {
    leftEye,
    rightEye,
    noseTip: new Vector3(nose.x, nose.y, 0),
    pitch: 0,
    yaw: 0,
    roll: 0,
    confidence: 0.98,
    timestamp: 1000,
  };
}

describe('EyeNoseGazeTracker', () => {
  it('auto-calibrates resting anchor on first face frame and yields center screen (0.5, 0.5)', () => {
    const tracker = new EyeNoseGazeTracker();
    const face = createMockFaceSummary(new Vector2(0.50, 0.52));

    const result = tracker.estimateGaze(face);
    expect(tracker.isCalibrated()).toBe(true);
    expect(tracker.getAnchorNose()?.x).toBeCloseTo(0.50, 2);
    expect(tracker.getAnchorNose()?.y).toBeCloseTo(0.52, 2);

    expect(result.screenPointNorm.x).toBeCloseTo(0.5, 2);
    expect(result.screenPointNorm.y).toBeCloseTo(0.5, 2);
    expect(result.noseOffset.x).toBe(0);
    expect(result.noseOffset.y).toBe(0);
  });

  it('shifts screen gaze rightwards when eyes look right', () => {
    const tracker = new EyeNoseGazeTracker();
    // Frame 1: Calibrate resting center
    tracker.estimateGaze(createMockFaceSummary(new Vector2(0.50, 0.50)));

    // Frame 2: Irises look right (in camera coords, leftwards = negative offset)
    const lookingRightFace = createMockFaceSummary(new Vector2(0.50, 0.50), -0.6, -0.6);
    const result = tracker.estimateGaze(lookingRightFace);

    expect(result.eyeGazeOffset.x).toBeLessThan(-0.3);
    // Looking right in mirrored space maps to normX > 0.5
    expect(result.screenPointNorm.x).toBeGreaterThan(0.55);
  });

  it('shifts screen gaze leftwards when eyes look left', () => {
    const tracker = new EyeNoseGazeTracker();
    tracker.estimateGaze(createMockFaceSummary(new Vector2(0.50, 0.50)));

    // Looking left (in camera coords, rightwards = positive offset)
    const lookingLeftFace = createMockFaceSummary(new Vector2(0.50, 0.50), 0.6, 0.6);
    const result = tracker.estimateGaze(lookingLeftFace);

    expect(result.eyeGazeOffset.x).toBeGreaterThan(0.3);
    expect(result.screenPointNorm.x).toBeLessThan(0.45);
  });

  it('suppresses small involuntary head tremor within deadzone', () => {
    const tracker = new EyeNoseGazeTracker({ noseDeadzone: 0.015 });
    tracker.estimateGaze(createMockFaceSummary(new Vector2(0.50, 0.50)));

    // Subtle micro-tremor of nose: shift 0.005 (well below 0.015 threshold)
    const tremorFace = createMockFaceSummary(new Vector2(0.504, 0.503));
    const result = tracker.estimateGaze(tremorFace);

    expect(result.noseOffset.x).toBe(0);
    expect(result.noseOffset.y).toBe(0);
    expect(result.screenPointNorm.x).toBeCloseTo(0.5, 2);
    expect(result.screenPointNorm.y).toBeCloseTo(0.5, 2);
  });

  it('responds smoothly to intentional nose pointing exceeding deadzone', () => {
    const tracker = new EyeNoseGazeTracker({ noseDeadzone: 0.01 });
    tracker.estimateGaze(createMockFaceSummary(new Vector2(0.50, 0.50)));

    // Point nose to the right (camera X decreases to 0.45, delta = -0.05)
    const noseRightFace = createMockFaceSummary(new Vector2(0.45, 0.50));
    const result = tracker.estimateGaze(noseRightFace);

    expect(result.noseOffset.x).toBeLessThan(-0.03);
    expect(result.screenPointNorm.x).toBeGreaterThan(0.51);
  });

  it('supports explicit manual re-centering and calibration', () => {
    const tracker = new EyeNoseGazeTracker();
    tracker.estimateGaze(createMockFaceSummary(new Vector2(0.40, 0.40)));

    expect(tracker.getAnchorNose()?.x).toBeCloseTo(0.40, 2);

    // User re-centers while sitting at (0.52, 0.55)
    tracker.calibrate(new Vector2(0.52, 0.55));
    expect(tracker.getAnchorNose()?.x).toBeCloseTo(0.52, 2);
    expect(tracker.getAnchorNose()?.y).toBeCloseTo(0.55, 2);

    const atNewCenter = createMockFaceSummary(new Vector2(0.52, 0.55));
    const res = tracker.estimateGaze(atNewCenter);
    expect(res.screenPointNorm.x).toBeCloseTo(0.5, 2);
    expect(res.screenPointNorm.y).toBeCloseTo(0.5, 2);
  });
});
