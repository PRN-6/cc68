import { describe, it, expect, beforeEach } from 'vitest';
import { GazeStabilizer2D, Vector2 } from '../src';

describe('GazeStabilizer2D', () => {
  let stabilizer: GazeStabilizer2D;

  beforeEach(() => {
    stabilizer = new GazeStabilizer2D({
      deadzoneRadiusPixels: 30,
      releaseThresholdPixels: 45,
      fixationVelocityThreshold: 150,
      settleDurationMs: 80,
    });
  });

  it('locks initially and eliminates jitter when looking at a constant position', () => {
    const center = new Vector2(960, 540);
    const initial = stabilizer.filter(center, 1000);

    expect(initial.isLocked).toBe(true);
    expect(initial.classification).toBe('fixation');
    expect(initial.point.x).toBeCloseTo(960, 1);
    expect(initial.point.y).toBeCloseTo(540, 1);

    // Simulate micro-saccades and camera jitter within deadzone (+/- 12px)
    const jitterOffsets = [
      new Vector2(968, 542),
      new Vector2(955, 538),
      new Vector2(964, 546),
      new Vector2(958, 535),
      new Vector2(962, 541),
    ];

    for (let i = 0; i < jitterOffsets.length; i++) {
      const res = stabilizer.filter(jitterOffsets[i], 1000 + (i + 1) * 16);
      expect(res.isLocked).toBe(true);
      expect(res.classification).toBe('fixation');
      // Position must remain constant, virtually identical to locked center
      expect(Math.abs(res.point.x - 960)).toBeLessThan(1.5);
      expect(Math.abs(res.point.y - 540)).toBeLessThan(1.5);
    }
  });

  it('releases lock and moves smoothly when user looks at a new target position', () => {
    // 1. Establish fixation at (300, 300)
    stabilizer.filter(new Vector2(300, 300), 1000);

    // 2. Saccade: user looks far away to (800, 600) (distance ~583px > 45px release threshold)
    const saccadeTarget = new Vector2(800, 600);
    const saccadeRes = stabilizer.filter(saccadeTarget, 1030);

    expect(saccadeRes.isLocked).toBe(false);
    expect(saccadeRes.classification).toBe('saccade');
    // Output has moved toward new target
    expect(saccadeRes.point.x).toBeGreaterThan(300);
    expect(saccadeRes.point.y).toBeGreaterThan(300);
  });

  it('locks firmly onto the new target once gaze settles', () => {
    // 1. Start at origin
    stabilizer.filter(new Vector2(200, 200), 1000);

    // 2. Rapid move to new location (1000, 500)
    const newTarget = new Vector2(1000, 500);
    stabilizer.filter(newTarget, 1050);

    // 3. Gaze rests at new location for 120ms (settleDurationMs = 80ms)
    let finalRes = null;
    for (let t = 1066; t <= 1200; t += 16) {
      // Small sensor noise near target (< 3px)
      const near = new Vector2(1000 + Math.sin(t) * 2, 500 + Math.cos(t) * 2);
      finalRes = stabilizer.filter(near, t);
    }

    expect(finalRes).not.toBeNull();
    expect(finalRes!.isLocked).toBe(true);
    expect(finalRes!.classification).toBe('fixation');
    expect(Math.abs(finalRes!.point.x - 1000)).toBeLessThan(5);
    expect(Math.abs(finalRes!.point.y - 500)).toBeLessThan(5);
  });

  it('resets state correctly', () => {
    stabilizer.filter(new Vector2(500, 500), 1000);
    expect(stabilizer.isFixationLocked()).toBe(true);

    stabilizer.reset();
    expect(stabilizer.isFixationLocked()).toBe(false);
  });
});
