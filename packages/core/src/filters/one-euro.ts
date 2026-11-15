import { LowPassFilter } from './low-pass';
import { Vector2 } from '../math/vector2';
import { Vector3 } from '../math/vector3';

export interface OneEuroConfig {
  minCutoff: number; // Minimum cutoff frequency (Hz). Lower = less jitter at low speed. Typical: 1.0
  beta: number;      // Speed coefficient. Higher = less lag at high speed. Typical: 0.007
  dCutoff: number;   // Derivative cutoff frequency (Hz). Typical: 1.0
}

export const DEFAULT_ONE_EURO_CONFIG: OneEuroConfig = {
  minCutoff: 1.0,
  beta: 0.007,
  dCutoff: 1.0,
};

/**
 * 1D One-Euro Filter (Casiez, Roussel, Vogel - CHI 2012).
 * Adaptive low-pass filter providing high smoothing at low velocities (eliminating jitter)
 * and low smoothing at high velocities (eliminating lag).
 */
export class OneEuroFilter1D {
  private xFilt: LowPassFilter;
  private dxFilt: LowPassFilter;
  private lastTime: number | null = null;
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;

  constructor(config: Partial<OneEuroConfig> = {}) {
    this.minCutoff = config.minCutoff ?? DEFAULT_ONE_EURO_CONFIG.minCutoff;
    this.beta = config.beta ?? DEFAULT_ONE_EURO_CONFIG.beta;
    this.dCutoff = config.dCutoff ?? DEFAULT_ONE_EURO_CONFIG.dCutoff;

    this.xFilt = new LowPassFilter();
    this.dxFilt = new LowPassFilter();
  }

  private computeAlpha(rate: number, cutoff: number): number {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    const te = 1.0 / rate;
    return 1.0 / (1.0 + tau / te);
  }

  filter(value: number, timestampMs: number): number {
    if (this.lastTime === null) {
      this.lastTime = timestampMs;
      return this.xFilt.filterWithAlpha(value, 1.0);
    }

    const dt = (timestampMs - this.lastTime) / 1000.0;
    this.lastTime = timestampMs;

    // Guard against invalid or zero dt (e.g. rapid calls within same millisecond)
    const rate = dt > 1e-5 ? 1.0 / dt : 60.0;

    // Estimate derivative
    const prevRaw = this.xFilt.lastRawValue();
    const dx = (value - prevRaw) * rate;
    const edx = this.dxFilt.filterWithAlpha(dx, this.computeAlpha(rate, this.dCutoff));

    // Compute dynamic cutoff frequency
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilt.filterWithAlpha(value, this.computeAlpha(rate, cutoff));
  }

  reset(): void {
    this.lastTime = null;
    this.xFilt.reset();
    this.dxFilt.reset();
  }
}

/**
 * 2D One-Euro Filter for screen coordinates, eye gaze points, and 2D landmarks.
 */
export class OneEuroFilter2D {
  private xFilter: OneEuroFilter1D;
  private yFilter: OneEuroFilter1D;

  constructor(config: Partial<OneEuroConfig> = {}) {
    this.xFilter = new OneEuroFilter1D(config);
    this.yFilter = new OneEuroFilter1D(config);
  }

  filter(point: Vector2, timestampMs: number): Vector2 {
    const x = this.xFilter.filter(point.x, timestampMs);
    const y = this.yFilter.filter(point.y, timestampMs);
    return new Vector2(x, y);
  }

  reset(): void {
    this.xFilter.reset();
    this.yFilter.reset();
  }
}

/**
 * 3D One-Euro Filter for 3D hand/head landmarks.
 */
export class OneEuroFilter3D {
  private xFilter: OneEuroFilter1D;
  private yFilter: OneEuroFilter1D;
  private zFilter: OneEuroFilter1D;

  constructor(config: Partial<OneEuroConfig> = {}) {
    this.xFilter = new OneEuroFilter1D(config);
    this.yFilter = new OneEuroFilter1D(config);
    this.zFilter = new OneEuroFilter1D(config);
  }

  filter(point: Vector3, timestampMs: number): Vector3 {
    const x = this.xFilter.filter(point.x, timestampMs);
    const y = this.yFilter.filter(point.y, timestampMs);
    const z = this.zFilter.filter(point.z, timestampMs);
    return new Vector3(x, y, z);
  }

  reset(): void {
    this.xFilter.reset();
    this.yFilter.reset();
    this.zFilter.reset();
  }
}
