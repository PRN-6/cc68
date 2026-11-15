import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  VideoStreamManager,
  CameraError,
  MockStreamGenerator,
} from '../src';

describe('VideoStreamManager', () => {
  let mockTrack: MediaStreamTrack;
  let mockStream: MediaStream;
  let mockMediaDevices: MediaDevices;

  beforeEach(() => {
    mockTrack = {
      kind: 'video',
      enabled: true,
      readyState: 'live',
      stop: vi.fn(),
    } as unknown as MediaStreamTrack;

    mockStream = {
      getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
      getTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream;

    mockMediaDevices = {
      enumerateDevices: vi.fn().mockResolvedValue([
        { deviceId: 'cam-1', kind: 'videoinput', label: 'FaceTime HD Camera', groupId: 'g1' },
        { deviceId: 'mic-1', kind: 'audioinput', label: 'Built-in Mic', groupId: 'g1' },
      ]),
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
    } as unknown as MediaDevices;
  });

  it('enumerates video input devices filtering out other media types', async () => {
    const manager = new VideoStreamManager({}, mockMediaDevices);
    const devices = await manager.getDevices();

    expect(devices).toHaveLength(1);
    expect(devices[0].deviceId).toBe('cam-1');
    expect(devices[0].label).toBe('FaceTime HD Camera');
  });

  it('throws UNSUPPORTED when mediaDevices is unavailable', async () => {
    const manager = new VideoStreamManager({}, null);
    await expect(manager.getDevices()).rejects.toThrow(CameraError);
    await expect(manager.start()).rejects.toThrow(CameraError);
  });

  it('starts video stream and reports streaming status', async () => {
    const manager = new VideoStreamManager({ width: 1920, height: 1080 }, mockMediaDevices);
    expect(manager.isStreaming()).toBe(false);

    const stream = await manager.start();
    expect(stream).toBe(mockStream);
    expect(manager.isStreaming()).toBe(true);
    expect(manager.getStream()).toBe(mockStream);
  });

  it('correctly maps NotAllowedError to PERMISSION_DENIED', async () => {
    const deniedError = new Error('Permission denied');
    deniedError.name = 'NotAllowedError';
    (mockMediaDevices.getUserMedia as any).mockRejectedValueOnce(deniedError);

    const manager = new VideoStreamManager({}, mockMediaDevices);
    try {
      await manager.start();
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CameraError);
      expect((err as CameraError).code).toBe('PERMISSION_DENIED');
    }
  });

  it('correctly maps NotFoundError to NOT_FOUND', async () => {
    const notFoundError = new Error('No camera found');
    notFoundError.name = 'NotFoundError';
    (mockMediaDevices.getUserMedia as any).mockRejectedValueOnce(notFoundError);

    const manager = new VideoStreamManager({}, mockMediaDevices);
    try {
      await manager.start();
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CameraError);
      expect((err as CameraError).code).toBe('NOT_FOUND');
    }
  });

  it('pauses, resumes, and stops media stream tracks cleanly', async () => {
    const manager = new VideoStreamManager({}, mockMediaDevices);
    await manager.start();

    manager.pause();
    expect(mockTrack.enabled).toBe(false);

    manager.resume();
    expect(mockTrack.enabled).toBe(true);

    manager.stop();
    expect(mockTrack.stop).toHaveBeenCalled();
    expect(manager.isStreaming()).toBe(false);
    expect(manager.getStream()).toBeNull();
  });
});

describe('MockStreamGenerator', () => {
  it('initializes with default config and safely handles rendering without canvas', () => {
    const generator = new MockStreamGenerator({ width: 640, height: 480 });
    expect(generator.renderSyntheticFrame()).toBeNull();
    expect(generator.createMediaStream()).toBeNull();
  });
});

