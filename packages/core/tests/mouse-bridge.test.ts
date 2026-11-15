import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DesktopMouseBridge } from '../src';

describe('DesktopMouseBridge', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('checks availability and detects running Windows bridge', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ width: 1920, height: 1080 }),
    } as any);

    const bridge = new DesktopMouseBridge('http://localhost:6868/api');
    const isAvail = await bridge.checkAvailability();

    expect(isAvail).toBe(true);
    expect(bridge.isConnected()).toBe(true);
    const screen = await bridge.getScreenDimensions();
    expect(screen).toEqual({ width: 1920, height: 1080 });
  });

  it('handles bridge offline gracefully without throwing', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    const bridge = new DesktopMouseBridge('http://localhost:6868/api');
    const isAvail = await bridge.checkAvailability();

    expect(isAvail).toBe(false);
    expect(bridge.isConnected()).toBe(false);
    await expect(bridge.moveCursor(100, 200)).resolves.not.toThrow();
  });

  it('formats cursor move and click requests correctly', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: 'ok' }),
    } as any);
    global.fetch = fetchMock;

    const bridge = new DesktopMouseBridge('http://localhost:6868/api');
    await bridge.checkAvailability();
    await bridge.moveCursor(500.4, 300.9);
    await bridge.click('left');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:6868/api/mouse/move?x=500&y=301', {
      method: 'GET',
    });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:6868/api/mouse/click?button=left', {
      method: 'GET',
    });
  });
});
