export interface VideoStreamConfig {
  width: number;
  height: number;
  frameRate: number;
  facingMode: 'user' | 'environment';
  deviceId?: string;
}

export const DEFAULT_VIDEO_CONFIG: VideoStreamConfig = {
  width: 1280,
  height: 720,
  frameRate: 60,
  facingMode: 'user',
};

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
  groupId: string;
}

export type CameraErrorCode =
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'NOT_READABLE'
  | 'OVERCONSTRAINED'
  | 'UNSUPPORTED'
  | 'UNKNOWN';

export class CameraError extends Error {
  constructor(
    public readonly code: CameraErrorCode,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(`[CameraError:${code}] ${message}`);
    this.name = 'CameraError';
  }
}
