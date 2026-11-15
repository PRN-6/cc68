import { describe, it, expect } from 'vitest';
import { Vector2, Vector3, Transform2D, BoundingBox2D } from '../src';

describe('Vector2 & Vector3 Math', () => {
  it('correctly calculates 2D vector length, addition, subtraction and normalization', () => {
    const v1 = new Vector2(3, 4);
    expect(v1.length()).toBe(5);

    const v2 = new Vector2(1, 2);
    const added = v1.add(v2);
    expect(added.x).toBe(4);
    expect(added.y).toBe(6);

    const sub = v1.sub(v2);
    expect(sub.x).toBe(2);
    expect(sub.y).toBe(2);

    const normalized = v1.normalize();
    expect(normalized.length()).toBeCloseTo(1, 5);
    expect(normalized.x).toBeCloseTo(0.6, 5);
    expect(normalized.y).toBeCloseTo(0.8, 5);
  });

  it('correctly calculates 2D lerp and distance', () => {
    const a = new Vector2(0, 0);
    const b = new Vector2(10, 20);
    const mid = a.lerp(b, 0.5);

    expect(mid.x).toBe(5);
    expect(mid.y).toBe(10);
    expect(a.distanceTo(b)).toBeCloseTo(Math.sqrt(500), 5);
  });

  it('correctly computes 3D vector cross product and dot product', () => {
    const v1 = new Vector3(1, 0, 0);
    const v2 = new Vector3(0, 1, 0);
    const cross = v1.cross(v2);

    expect(cross.x).toBe(0);
    expect(cross.y).toBe(0);
    expect(cross.z).toBe(1);
    expect(cross.length()).toBe(1);

    expect(v1.dot(v2)).toBe(0);
    expect(v1.dot(v1)).toBe(1);
  });

  it('transforms NDC to screen and validates bounding box collision', () => {
    const ndc = new Vector2(0.5, 0.5);
    const viewport = { width: 1920, height: 1080 };
    const screen = Transform2D.ndcToScreen(ndc, viewport);

    expect(screen.x).toBe(960);
    expect(screen.y).toBe(540);

    const backToNdc = Transform2D.screenToNdc(screen, viewport);
    expect(backToNdc.x).toBeCloseTo(0.5, 5);
    expect(backToNdc.y).toBeCloseTo(0.5, 5);

    const box: BoundingBox2D = { minX: 910, minY: 490, maxX: 1010, maxY: 590 };
    expect(Transform2D.containsPoint(box, screen)).toBe(true);

    const outside = new Vector2(100, 100);
    expect(Transform2D.containsPoint(box, outside)).toBe(false);

    // Center is (910+1010)/2 = 960, (490+590)/2 = 540 -> distance to screen (960, 540) is 0
    expect(Transform2D.distanceToBoxCenter(box, screen)).toBe(0);
  });
});
