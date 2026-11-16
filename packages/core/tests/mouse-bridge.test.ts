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
      json: vi.fn().mockResolvedValue({ width: 1920, height: 1080, customCursorActive: true }),
    } as any);

    const bridge = new DesktopMouseBridge('http://localhost:6868/api');
    const isAvail = await bridge.checkAvailability();

    expect(isAvail).toBe(true);
    expect(bridge.isConnected()).toBe(true);
    const screen = await bridge.getScreenDimensions();
    expect(screen).toEqual({ width: 1920, height: 1080, customCursorActive: true });
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

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:6868/api/mouse/move?x=500&y=301&pinch=0&syncOs=1&progress=0',
      { method: 'GET' }
    );
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:6868/api/mouse/click?button=left', {
      method: 'GET',
    });
  });

  it('supports custom cursor overlay configuration and visibility toggle', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: 'ok', visible: true }),
    } as any);
    global.fetch = fetchMock;

    const bridge = new DesktopMouseBridge('http://localhost:6868/api');
    await bridge.checkAvailability();

    await bridge.moveCustomCursor(640, 360, { pinch: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:6868/api/mouse/move?x=640&y=360&pinch=1&syncOs=0&progress=0',
      { method: 'GET' }
    );

    const vis = await bridge.setCustomCursorVisible(true);
    expect(vis).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:6868/api/cursor/overlay?visible=1', {
      method: 'GET',
    });

    await bridge.configureCustomCursor({ size: 72, style: 'crosshair', color: '38bdf8' });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:6868/api/cursor/config?size=72&style=crosshair&color=38bdf8',
      { method: 'GET' }
    );
  });
});
