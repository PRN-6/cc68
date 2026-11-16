import { FaceLandmarksSummary, Vector3 } from '@cc68/core';
import { EyeGeometry, RawLandmarkPoint } from './eye-geometry';
import { FACE_LANDMARKS_INDICES } from './face-landmarks-indices';

export interface FaceLandmarkerConfig {
  wasmLoaderPath: string;
  modelAssetPath: string;
  runningMode: 'IMAGE' | 'VIDEO';
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  delegate: 'GPU' | 'CPU';
}

export const DEFAULT_FACE_LANDMARKER_CONFIG: FaceLandmarkerConfig = {
  wasmLoaderPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
  modelAssetPath:
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  runningMode: 'VIDEO',
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  delegate: 'GPU',
};

/**
 * Service orchestrating MediaPipe Face Landmarker, extracting iris centers,
 * calculating eye blink states (EAR), and head pose compensation.
 */
export class FaceLandmarkerService {
  private config: FaceLandmarkerConfig;
  private landmarker: any = null;
  private isInitialized: boolean = false;

  constructor(config: Partial<FaceLandmarkerConfig> = {}) {
    this.config = { ...DEFAULT_FACE_LANDMARKER_CONFIG, ...config };
  }

  /**
   * Asynchronously initialize MediaPipe Tasks Vision FaceLandmarker.
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks(this.config.wasmLoaderPath);

      this.landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: this.config.modelAssetPath,
          delegate: this.config.delegate,
        },
        runningMode: this.config.runningMode,
        numFaces: 1,
        minFaceDetectionConfidence: this.config.minDetectionConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence,
        outputFacialTransformationMatrixes: true,
      });

      this.isInitialized = true;
    } catch (err) {
      console.warn('FaceLandmarkerService: MediaPipe native loader unavailable, falling back to procedural pipeline:', err);
      this.isInitialized = false;
    }
  }

  /**
   * Process a live HTMLVideoElement frame and return structured face/iris telemetry.
   */
  processVideoFrame(video: HTMLVideoElement, timestampMs: number): FaceLandmarksSummary | null {
    if (!this.landmarker || !this.isInitialized) return null;

    try {
      const result = this.landmarker.detectForVideo(video, timestampMs);
      return this.parseResult(result, timestampMs);
    } catch (err) {
      console.error('Error processing video frame in FaceLandmarker:', err);
      return null;
    }
  }

  /**
   * Process a single HTMLCanvasElement or HTMLImageElement frame.
   */
  processImage(image: HTMLCanvasElement | HTMLImageElement, timestampMs: number = Date.now()): FaceLandmarksSummary | null {
    if (!this.landmarker || !this.isInitialized) return null;

    try {
      const result = this.landmarker.detect(image);
      return this.parseResult(result, timestampMs);
    } catch (err) {
      console.error('Error processing image in FaceLandmarker:', err);
      return null;
    }
  }

  /**
   * Convert an array of 478 raw landmark points into a structured FaceLandmarksSummary.
   * Enables automated CI tests, synthetic landmark feeds, and offline testing without GPU/Wasm.
   */
  processRawLandmarks(
    landmarks: RawLandmarkPoint[],
    timestampMs: number = Date.now(),
    confidence: number = 0.95
  ): FaceLandmarksSummary {
    const leftEye = EyeGeometry.extractEye(landmarks, FACE_LANDMARKS_INDICES.LEFT_EYE);
    const rightEye = EyeGeometry.extractEye(landmarks, FACE_LANDMARKS_INDICES.RIGHT_EYE);
    const pose = EyeGeometry.estimateHeadPose(landmarks);

    const nosePoint = landmarks[FACE_LANDMARKS_INDICES.HEAD_POSE_ANCHORS.NOSE_TIP] ?? { x: 0.5, y: 0.5, z: 0 };
    const noseTip = new Vector3(nosePoint.x, nosePoint.y, nosePoint.z ?? 0);

    return {
      leftEye,
      rightEye,
      noseTip,
      pitch: pose.pitch,
      yaw: pose.yaw,
      roll: pose.roll,
      confidence,
      timestamp: timestampMs,
    };
  }

  private parseResult(result: any, timestampMs: number): FaceLandmarksSummary | null {
    if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) {
      return null;
    }

    const landmarks: RawLandmarkPoint[] = result.faceLandmarks[0];
    return this.processRawLandmarks(landmarks, timestampMs, 0.98);
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
