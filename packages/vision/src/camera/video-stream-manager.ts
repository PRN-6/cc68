import {
  CameraDeviceInfo,
  CameraError,
  CameraErrorCode,
  DEFAULT_VIDEO_CONFIG,
  VideoStreamConfig,
} from './types';

export class VideoStreamManager {
  private activeStream: MediaStream | null = null;
  private activeVideoElement: HTMLVideoElement | null = null;
  private config: VideoStreamConfig;

  constructor(
    config: Partial<VideoStreamConfig> = {},
    private mediaDevices: MediaDevices | null = typeof navigator !== 'undefined'
      ? navigator.mediaDevices
      : null
  ) {
    this.config = { ...DEFAULT_VIDEO_CONFIG, ...config };
  }

  /**
   * Enumerate available video input devices.
   */
  async getDevices(): Promise<CameraDeviceInfo[]> {
    if (!this.mediaDevices) {
      throw new CameraError(
        'UNSUPPORTED',
        'MediaDevices API is not supported in this environment'
      );
    }

    try {
      const devices = await this.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
          groupId: d.groupId,
        }));
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  /**
   * Request webcam stream with configured constraints.
   */
  async start(overrides?: Partial<VideoStreamConfig>): Promise<MediaStream> {
    if (overrides) {
      this.config = { ...this.config, ...overrides };
    }

    if (!this.mediaDevices) {
      throw new CameraError(
        'UNSUPPORTED',
        'MediaDevices API is not supported in this environment'
      );
    }

    // Stop existing stream if running
    this.stop();

    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: this.config.width },
      height: { ideal: this.config.height },
      frameRate: { ideal: this.config.frameRate },
      facingMode: this.config.deviceId ? undefined : this.config.facingMode,
      deviceId: this.config.deviceId ? { exact: this.config.deviceId } : undefined,
    };

    try {
      this.activeStream = await this.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      if (this.activeVideoElement) {
        await this.attachTo(this.activeVideoElement);
      }

      return this.activeStream;
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  /**
   * Attach the active camera stream to an HTMLVideoElement and start playback.
   */
  async attachTo(video: HTMLVideoElement): Promise<void> {
    this.activeVideoElement = video;
    if (!this.activeStream) return;

    video.srcObject = this.activeStream;
    video.playsInline = true;
    video.muted = true;

    try {
      await video.play();
    } catch (err) {
      // Autoplay or element interaction issues
      console.warn('Video element play() was deferred:', err);
    }
  }

  /**
   * Capture a single video frame onto an HTMLCanvasElement and return ImageData.
   */
  captureFrame(canvas: HTMLCanvasElement): ImageData | null {
    if (!this.activeVideoElement || this.activeVideoElement.readyState < 2) {
      return null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = this.activeVideoElement.videoWidth || this.config.width;
    canvas.height = this.activeVideoElement.videoHeight || this.config.height;

    ctx.drawImage(this.activeVideoElement, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * Pause the stream by disabling video tracks.
   */
  pause(): void {
    if (!this.activeStream) return;
    this.activeStream.getVideoTracks().forEach((track) => {
      track.enabled = false;
    });
  }

  /**
   * Resume paused video tracks.
   */
  resume(): void {
    if (!this.activeStream) return;
    this.activeStream.getVideoTracks().forEach((track) => {
      track.enabled = true;
    });
  }

  /**
   * Stop all active video tracks and release hardware resources.
   */
  stop(): void {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => track.stop());
      this.activeStream = null;
    }
    if (this.activeVideoElement) {
      this.activeVideoElement.srcObject = null;
    }
  }

  /**
   * Check if a camera stream is actively playing.
   */
  isStreaming(): boolean {
    if (!this.activeStream) return false;
    return this.activeStream.getVideoTracks().some(
      (track) => track.readyState === 'live' && track.enabled
    );
  }

  /**
   * Get the current active MediaStream or null.
   */
  getStream(): MediaStream | null {
    return this.activeStream;
  }

  /**
   * Get current configuration.
   */
  getConfig(): Readonly<VideoStreamConfig> {
    return this.config;
  }

  private wrapError(err: unknown): CameraError {
    if (err instanceof CameraError) return err;

    let code: CameraErrorCode = 'UNKNOWN';
    let message = 'An unknown camera error occurred';

    if (err instanceof Error) {
      message = err.message;
      switch (err.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          code = 'PERMISSION_DENIED';
          break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          code = 'NOT_FOUND';
          break;
        case 'NotReadableError':
        case 'TrackStartError':
          code = 'NOT_READABLE';
          break;
        case 'OverconstrainedError':
        case 'ConstraintNotSatisfiedError':
          code = 'OVERCONSTRAINED';
          break;
        default:
          code = 'UNKNOWN';
      }
    }

    return new CameraError(code, message, err);
  }
}
