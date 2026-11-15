import { VideoStreamConfig, DEFAULT_VIDEO_CONFIG } from './types';

export interface SyntheticTargetPositions {
  eyeGazeNorm: { x: number; y: number };
  handThumbTipNorm: { x: number; y: number };
  handIndexTipNorm: { x: number; y: number };
  isPinching: boolean;
}

/**
 * Generates synthetic frame streams and animated test patterns on an HTMLCanvasElement
 * for automated testing and devices without webcam hardware.
 */
export class MockStreamGenerator {
  private config: VideoStreamConfig;
  private canvas: HTMLCanvasElement | null = null;
  private animFrameId: number | null = null;
  private startTime: number = Date.now();

  constructor(config: Partial<VideoStreamConfig> = {}) {
    this.config = { ...DEFAULT_VIDEO_CONFIG, ...config };
  }

  /**
   * Bind an HTMLCanvasElement for rendering simulated synthetic video frames.
   */
  bindCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
  }

  /**
   * Render a single synthetic frame onto the canvas.
   * Can be driven with procedural animation or injected target coordinates.
   */
  renderSyntheticFrame(targets?: Partial<SyntheticTargetPositions>): ImageData | null {
    if (!this.canvas) return null;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return null;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const elapsedSec = (Date.now() - this.startTime) / 1000.0;

    // Default procedural motion
    const eyeX = targets?.eyeGazeNorm?.x ?? 0.5 + 0.3 * Math.cos(elapsedSec * 1.5);
    const eyeY = targets?.eyeGazeNorm?.y ?? 0.5 + 0.2 * Math.sin(elapsedSec * 1.2);

    const isPinch = targets?.isPinching ?? (Math.sin(elapsedSec * 2.0) > 0.5);
    const handX = targets?.handIndexTipNorm?.x ?? 0.5 + 0.25 * Math.sin(elapsedSec * 1.8);
    const handY = targets?.handIndexTipNorm?.y ?? 0.6 + 0.15 * Math.cos(elapsedSec * 1.4);

    // Dark futuristic camera simulation canvas
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, w, h);

    // Draw background alignment grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw simulated gaze point
    const gazePxX = eyeX * w;
    const gazePxY = eyeY * h;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gazePxX, gazePxY, 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(gazePxX, gazePxY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw simulated hand / pinch indicator
    const handPxX = handX * w;
    const handPxY = handY * h;
    ctx.strokeStyle = isPinch ? '#22c55e' : '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(handPxX, handPxY, isPinch ? 12 : 24, 0, Math.PI * 2);
    ctx.stroke();

    // Frame telemetry label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText(`SIMULATED CAMERA STREAM [${w}x${h}] | Pinch: ${isPinch}`, 16, 24);

    return ctx.getImageData(0, 0, w, h);
  }

  /**
   * Create a simulated MediaStream using canvas.captureStream if supported in browser.
   */
  createMediaStream(): MediaStream | null {
    if (!this.canvas || typeof this.canvas.captureStream !== 'function') {
      return null;
    }
    return this.canvas.captureStream(this.config.frameRate);
  }

  /**
   * Stop synthetic rendering animation.
   */
  stop(): void {
    if (this.animFrameId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}
