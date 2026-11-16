import { describe, it, expect, vi } from 'vitest';
import {
  SyntheticLandmarkGenerator,
  HandGeometry,
} from '../src';

describe('SyntheticLandmarkGenerator', () => {
  it('generates 478 deterministic face landmarks and 21 hand landmarks', () => {
    const facePoints = SyntheticLandmarkGenerator.generateFaceLandmarks(0, 'FIXATION');
    const handPoints = SyntheticLandmarkGenerator.generateHandLandmarks(0, 'FIXATION');

    expect(facePoints.length).toBe(478);
    expect(handPoints.length).toBe(21);

    for (const pt of facePoints) {
      expect(pt.x).toBeGreaterThan(0);
      expect(pt.x).toBeLessThan(1);
      expect(pt.y).toBeGreaterThan(0);
      expect(pt.y).toBeLessThan(1);
    }
  });

  it('generates pinch transition in LOOK_AND_PINCH_CLICK scenario', () => {
    // At t = 0.2s (phase < 0.6s), hand should be open
    const frameOpen = SyntheticLandmarkGenerator.generateFrame(200, 'LOOK_AND_PINCH_CLICK');
    const pinchOpen = HandGeometry.calculatePinch(frameOpen.hands[0].landmarks);
    expect(pinchOpen.normalizedDistance).toBeGreaterThan(0.3);

    // At t = 0.8s (0.6s <= phase <= 1.1s), hand should be in tight pinch
    const framePinch = SyntheticLandmarkGenerator.generateFrame(800, 'LOOK_AND_PINCH_CLICK');
    const pinchActive = HandGeometry.calculatePinch(framePinch.hands[0].landmarks);
    expect(pinchActive.normalizedDistance).toBeLessThan(0.06);
  });

  it('generates realistic blink cycles in BLINK scenario', () => {
    // At t = 50ms (phase < 0.15s), eye is closed (blinking)
    const frameBlink = SyntheticLandmarkGenerator.generateFrame(50, 'BLINK');
    expect(frameBlink.faceSummary.leftEye.opennessRatio).toBeLessThan(0.2);

    // At t = 600ms, eye is open
    const frameOpen = SyntheticLandmarkGenerator.generateFrame(600, 'BLINK');
    expect(frameOpen.faceSummary.leftEye.opennessRatio).toBeGreaterThan(0.5);
  });

  it('runs synthetic stream callback and cleanly cancels', async () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    const stop = SyntheticLandmarkGenerator.createStream(30, 'FIXATION', callback);

    // Advance 100ms (~3 frames at 30 FPS)
    vi.advanceTimersByTime(105);
    expect(callback).toHaveBeenCalled();
    const callsBeforeStop = callback.mock.calls.length;

    stop();
    vi.advanceTimersByTime(105);
    expect(callback.mock.calls.length).toBe(callsBeforeStop);

    vi.useRealTimers();
  });
});
