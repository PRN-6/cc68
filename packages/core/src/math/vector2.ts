/**
 * 2D Vector representation and mathematical operations.
 */
export class Vector2 {
  constructor(public x: number = 0, public y: number = 0) {}

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(v: Vector2): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  addScaled(v: Vector2, s: number): Vector2 {
    return new Vector2(this.x + v.x * s, this.y + v.y * s);
  }

  sub(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  scale(s: number): Vector2 {
    return new Vector2(this.x * s, this.y * s);
  }

  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  distanceTo(v: Vector2): number {
    return this.sub(v).length();
  }

  distanceSqTo(v: Vector2): number {
    return this.sub(v).lengthSq();
  }

  normalize(): Vector2 {
    const len = this.length();
    if (len === 0) return new Vector2(0, 0);
    return new Vector2(this.x / len, this.y / len);
  }

  lerp(target: Vector2, alpha: number): Vector2 {
    const clampedAlpha = Math.max(0, Math.min(1, alpha));
    return new Vector2(
      this.x + (target.x - this.x) * clampedAlpha,
      this.y + (target.y - this.y) * clampedAlpha
    );
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  angleTo(v: Vector2): number {
    const theta = this.dot(v) / (this.length() * v.length());
    return Math.acos(Math.max(-1, Math.min(1, theta)));
  }

  equals(v: Vector2, epsilon: number = 1e-6): boolean {
    return Math.abs(this.x - v.x) <= epsilon && Math.abs(this.y - v.y) <= epsilon;
  }

  toArray(): [number, number] {
    return [this.x, this.y];
  }

  static fromArray(arr: [number, number]): Vector2 {
    return new Vector2(arr[0], arr[1]);
  }

  static zero(): Vector2 {
    return new Vector2(0, 0);
  }
}
