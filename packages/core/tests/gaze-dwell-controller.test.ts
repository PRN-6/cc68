import { describe, it, expect, beforeEach } from 'vitest';
import { GazeDwellController, Vector2 } from '../src';

describe('GazeDwellController', () => {
  let controller: GazeDwellController;

  beforeEach(() => {
    controller = new GazeDwellController({
      stareDurationMs: 1000, // 1.0 second
      stareRadiusPixels: 60,
      minTargetDistancePixels: 40,
    });
  });

  it('does NOT move cursor if user stares for less than 1 second', () => {
    // 1. Initial cursor at (500, 500)
    controller.setCursorPosition(new Vector2(500, 500));

    // 2. User looks at a new position (800, 300) (distance ~360px)
    const newTarget = new Vector2(800, 300);

    // Stare for 0ms, 250ms, 500ms, 750ms, 900ms (< 1000ms)
    const timestamps = [1000, 1250, 1500, 1750, 1900];

    for (const t of timestamps) {
      const res = controller.update(newTarget, t);
      // Cursor MUST NOT MOVE yet!
      expect(res.hasMoved).toBe(false);
      expect(res.cursorPosition.x).toBe(500);
      expect(res.cursorPosition.y).toBe(500);
      expect(res.dwellProgress).toBeLessThan(1.0);
    }
  });

  it('moves cursor when user continuously stares at a position for 1 full second', () => {
    controller.setCursorPosition(new Vector2(200, 200));

    const target = new Vector2(700, 600);

    // Start staring at t = 1000ms
    controller.update(target, 1000);

    // At t = 1500ms (0.5s elapsed): cursor still at (200, 200)
    const midRes = controller.update(target, 1500);
    expect(midRes.hasMoved).toBe(false);
    expect(midRes.cursorPosition.x).toBe(200);
    expect(midRes.cursorPosition.y).toBe(200);
    expect(midRes.dwellProgress).toBeCloseTo(0.5, 1);

    // At t = 2000ms (1.0s elapsed): 1-SECOND STARE REACHED!
    const triggerRes = controller.update(target, 2000);
    expect(triggerRes.hasMoved).toBe(true);
    expect(triggerRes.dwellProgress).toBe(1.0);
    // Cursor has moved to the stared position!
    expect(triggerRes.cursorPosition.x).toBeCloseTo(700, 0);
    expect(triggerRes.cursorPosition.y).toBeCloseTo(600, 0);
  });

  it('resets timer and does not move if user glances away before 1 second', () => {
    controller.setCursorPosition(new Vector2(100, 100));

    // Stare at Target 1 for 0.6 seconds (t = 1000 to 1600)
    controller.update(new Vector2(600, 200), 1000);
    controller.update(new Vector2(600, 200), 1600);

    // Then look at Target 2 (far away: 200, 800) at t = 1700
    const glanceRes = controller.update(new Vector2(200, 800), 1700);
    expect(glanceRes.hasMoved).toBe(false);
    expect(glanceRes.cursorPosition.x).toBe(100);
    expect(glanceRes.cursorPosition.y).toBe(100);
    expect(glanceRes.dwellProgress).toBe(0);

    // Check again at t = 2200 (only 0.5s on Target 2): still hasn't moved
    const stillWaiting = controller.update(new Vector2(200, 800), 2200);
    expect(stillWaiting.hasMoved).toBe(false);
    expect(stillWaiting.cursorPosition.x).toBe(100);
  });
});
