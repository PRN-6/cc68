/**
 * Low-pass exponential smoothing filter.
 */
export class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  constructor(private alpha: number = 0.5) {
    this.setAlpha(alpha);
  }

  setAlpha(alpha: number): void {
    if (alpha <= 0 || alpha > 1) {
      throw new Error(`Alpha must be in (0, 1], got ${alpha}`);
    }
    this.alpha = alpha;
  }

  filter(value: number): number {
    if (this.y === null) {
      this.s = value;
    } else {
      this.s = this.alpha * value + (1.0 - this.alpha) * this.s!;
    }
    this.y = value;
    return this.s!;
  }

  filterWithAlpha(value: number, alpha: number): number {
    this.setAlpha(alpha);
    return this.filter(value);
  }

  hasLastRawValue(): boolean {
    return this.y !== null;
  }

  lastRawValue(): number {
    return this.y ?? 0;
  }

  reset(): void {
    this.y = null;
    this.s = null;
  }
}
