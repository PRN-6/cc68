/**
 * 3D Vector representation and mathematical operations.
 */
export class Vector3 {
  constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v: Vector3): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  addScaled(v: Vector3, s: number): Vector3 {
    return new Vector3(this.x + v.x * s, this.y + v.y * s, this.z + v.z * s);
  }

  sub(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  scale(s: number): Vector3 {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  distanceTo(v: Vector3): number {
    return this.sub(v).length();
  }

  distanceSqTo(v: Vector3): number {
    return this.sub(v).lengthSq();
  }

  normalize(): Vector3 {
    const len = this.length();
    if (len === 0) return new Vector3(0, 0, 0);
    return new Vector3(this.x / len, this.y / len, this.z / len);
  }

  lerp(target: Vector3, alpha: number): Vector3 {
    const clampedAlpha = Math.max(0, Math.min(1, alpha));
    return new Vector3(
      this.x + (target.x - this.x) * clampedAlpha,
      this.y + (target.y - this.y) * clampedAlpha,
      this.z + (target.z - this.z) * clampedAlpha
    );
  }

  equals(v: Vector3, epsilon: number = 1e-6): boolean {
    return (
      Math.abs(this.x - v.x) <= epsilon &&
      Math.abs(this.y - v.y) <= epsilon &&
      Math.abs(this.z - v.z) <= epsilon
    );
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  static fromArray(arr: [number, number, number]): Vector3 {
    return new Vector3(arr[0], arr[1], arr[2]);
  }

  static zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }
}
