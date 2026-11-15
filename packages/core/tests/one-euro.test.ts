import { describe, it, expect } from 'vitest';
import { OneEuroFilter1D, OneEuroFilter2D, Vector2 } from '../src';

describe('OneEuroFilter', () => {
  it('significantly suppresses jitter for stationary noisy input', () => {
    const filter = new OneEuroFilter1D({ minCutoff: 1.0, beta: 0.007 });
    const groundTruth = 100.0;
    const noisySamples: number[] = [];
    const filteredSamples: number[] = [];

    // Simulate 60 FPS (approx 16.6ms intervals) with Gaussian-like jitter
    for (let i = 0; i < 60; i++) {
      const timestamp = i * 16.67;
      const noise = (Math.sin(i * 1.5) * 4.0) + (Math.cos(i * 3.7) * 2.0); // jitter +/- 6px
      const sample = groundTruth + noise;
      noisySamples.push(sample);
      const filtered = filter.filter(sample, timestamp);
      if (i > 10) {
        // Evaluate after warmup
        filteredSamples.push(filtered);
      }
    }

    // Compute standard deviation of noisy vs filtered
    const noisyMean = noisySamples.reduce((a, b) => a + b, 0) / noisySamples.length;
    const noisyVariance = noisySamples.reduce((acc, val) => acc + (val - noisyMean) ** 2, 0) / noisySamples.length;
    const noisyStdDev = Math.sqrt(noisyVariance);

    const filteredMean = filteredSamples.reduce((a, b) => a + b, 0) / filteredSamples.length;
    const filteredVariance = filteredSamples.reduce((acc, val) => acc + (val - filteredMean) ** 2, 0) / filteredSamples.length;
    const filteredStdDev = Math.sqrt(filteredVariance);

    expect(filteredStdDev).toBeLessThan(noisyStdDev * 0.4); // At least 60% jitter reduction
  });

  it('adapts cutoff dynamically and tracks rapid motion with low lag', () => {
    const filter = new OneEuroFilter1D({ minCutoff: 1.0, beta: 0.1 });
    let t = 0;

    // Settle at 0
    for (let i = 0; i < 30; i++) {
      filter.filter(0, t);
      t += 16.67;
    }

    // Sudden rapid jump to 1000 at high speed
    let lastFiltered = 0;
    for (let i = 0; i < 10; i++) {
      lastFiltered = filter.filter(1000, t);
      t += 16.67;
    }

    // Within 10 frames (~160ms) of rapid motion, it should track near the target
    expect(lastFiltered).toBeGreaterThan(900);
  });

  it('filters 2D points accurately with OneEuroFilter2D', () => {
    const filter2D = new OneEuroFilter2D();
    const p1 = new Vector2(100, 200);
    const f1 = filter2D.filter(p1, 0);

    expect(f1.x).toBeCloseTo(100, 1);
    expect(f1.y).toBeCloseTo(200, 1);

    const p2 = new Vector2(102, 198);
    const f2 = filter2D.filter(p2, 16.67);
    expect(f2.x).toBeGreaterThan(100);
    expect(f2.x).toBeLessThan(102);
  });
});
