import { HandPose, Handedness } from '@cc68/core';
import { RawLandmarkPoint } from '../face/eye-geometry';
import { HandGeometry } from './hand-geometry';

export interface HandLandmarkerConfig {
  wasmLoaderPath: string;
  modelAssetPath: string;
  runningMode: 'IMAGE' | 'VIDEO';
  minHandDetectionConfidence: number;
  minHandPresenceConfidence: number;
  minTrackingConfidence: number;
  numHands: number;
  delegate: 'GPU' | 'CPU';
}

export const DEFAULT_HAND_LANDMARKER_CONFIG: HandLandmarkerConfig = {
  wasmLoaderPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
  modelAssetPath:
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  runningMode: 'VIDEO',
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  numHands: 2,
  delegate: 'GPU',
};

/**
 * Service orchestrating MediaPipe Tasks Vision HandLandmarker,
 * extracting 21 3D joint landmarks, handedness, and hand poses.
 */
export class HandLandmarkerService {
  private config: HandLandmarkerConfig;
  private landmarker: any = null;
  private isInitialized: boolean = false;

  constructor(config: Partial<HandLandmarkerConfig> = {}) {
    this.config = { ...DEFAULT_HAND_LANDMARKER_CONFIG, ...config };
  }

  /**
   * Asynchronously initialize MediaPipe Tasks Vision HandLandmarker.
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks(this.config.wasmLoaderPath);

      this.landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: this.config.modelAssetPath,
          delegate: this.config.delegate,
        },
        runningMode: this.config.runningMode,
        numHands: this.config.numHands,
        minHandDetectionConfidence: this.config.minHandDetectionConfidence,
        minHandPresenceConfidence: this.config.minHandPresenceConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence,
      });

      this.isInitialized = true;
    } catch (err) {
      console.warn('HandLandmarkerService: MediaPipe native loader unavailable, falling back to procedural pipeline:', err);
      this.isInitialized = false;
    }
  }

  /**
   * Process a live HTMLVideoElement frame and return detected hand poses.
   */
  processVideoFrame(video: HTMLVideoElement, timestampMs: number): HandPose[] {
    if (!this.landmarker || !this.isInitialized) return [];

    try {
      const result = this.landmarker.detectForVideo(video, timestampMs);
      return this.parseResult(result, timestampMs);
    } catch (err) {
      console.error('Error processing video frame in HandLandmarker:', err);
      return [];
    }
  }

  /**
   * Process a single HTMLCanvasElement or HTMLImageElement frame.
   */
  processImage(image: HTMLCanvasElement | HTMLImageElement, timestampMs: number = Date.now()): HandPose[] {
    if (!this.landmarker || !this.isInitialized) return [];

    try {
      const result = this.landmarker.detect(image);
      return this.parseResult(result, timestampMs);
    } catch (err) {
      console.error('Error processing image in HandLandmarker:', err);
      return [];
    }
  }

  /**
   * Convert raw 21-joint landmark coordinates into a typed HandPose.
   * Enables automated CI tests, synthetic mock streams, and headless processing.
   */
  processRawHandLandmarks(
    landmarks: RawLandmarkPoint[],
    handedness: Handedness = 'Right',
    timestampMs: number = Date.now(),
    confidence: number = 0.95
  ): HandPose {
    return {
      landmarks: HandGeometry.toVector3List(landmarks),
      screenLandmarks: HandGeometry.toVector2List(landmarks),
      handedness,
      confidence,
      timestamp: timestampMs,
    };
  }

  private parseResult(result: any, timestampMs: number): HandPose[] {
    if (!result || !result.landmarks || result.landmarks.length === 0) {
      return [];
    }

    const poses: HandPose[] = [];
    for (let i = 0; i < result.landmarks.length; i++) {
      const rawPoints: RawLandmarkPoint[] = result.landmarks[i];
      let handedness: Handedness = 'Right';

      if (result.handedness && result.handedness[i] && result.handedness[i][0]) {
        handedness = result.handedness[i][0].displayName === 'Left' ? 'Left' : 'Right';
      }

      const score = result.handedness && result.handedness[i] && result.handedness[i][0]
        ? result.handedness[i][0].score
        : 0.95;

      poses.push(this.processRawHandLandmarks(rawPoints, handedness, timestampMs, score));
    }

    return poses;
  }

  isReady(): boolean {
    return this.isInitialized && this.landmarker !== null;
  }

  close(): void {
    if (this.landmarker && typeof this.landmarker.close === 'function') {
      this.landmarker.close();
      this.landmarker = null;
    }
    this.isInitialized = false;
  }
}
