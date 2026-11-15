import { describe, it, expect, vi } from 'vitest';
import { EyeHandEventBus, EyeHandEventType, Vector2 } from '../src';

describe('EyeHandEventBus', () => {
  it('correctly dispatches and receives typed events', () => {
    const bus = new EyeHandEventBus();
    const handler = vi.fn();

    const unsub = bus.on(EyeHandEventType.GAZE_MOVED, handler);
    expect(bus.listenerCount(EyeHandEventType.GAZE_MOVED)).toBe(1);

    bus.emit(EyeHandEventType.GAZE_MOVED, {
      screenPoint: new Vector2(500, 300),
      normalizedPoint: new Vector2(0.5, 0.3),
      confidence: 0.95,
      classification: 'fixation',
      timestamp: 12345,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].screenPoint.x).toBe(500);

    // Test unsubscribe
    unsub();
    expect(bus.listenerCount(EyeHandEventType.GAZE_MOVED)).toBe(0);

    bus.emit(EyeHandEventType.GAZE_MOVED, {
      screenPoint: new Vector2(600, 400),
      normalizedPoint: new Vector2(0.6, 0.4),
      confidence: 0.9,
      classification: 'saccade',
      timestamp: 12360,
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('handles once() subscriptions correctly', () => {
    const bus = new EyeHandEventBus();
    const handler = vi.fn();

    bus.once(EyeHandEventType.FRAME_PROCESSED, handler);

    bus.emit(EyeHandEventType.FRAME_PROCESSED, { fps: 60, timestamp: 100 });
    bus.emit(EyeHandEventType.FRAME_PROCESSED, { fps: 59, timestamp: 116 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount(EyeHandEventType.FRAME_PROCESSED)).toBe(0);
  });
});
