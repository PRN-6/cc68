import { describe, it, expect } from 'vitest';
import { Vector3, HandLandmarkIndex } from '@cc68/core';
import {
  HandGeometry,
  HandLandmarkerService,
  RawLandmarkPoint,
} from '../src';

describe('HandGeometry', () => {
  const createBaseHand = (): Vector3[] => {
    const list: Vector3[] = [];
    for (let i = 0; i < 21; i++) {
      list.push(new Vector3(0, 0, 0));
    }
    // Wrist at (0, 0, 0)
    list[HandLandmarkIndex.WRIST] = new Vector3(0, 0, 0);
    // Middle MCP at (0, 100, 0) -> scale = 100
    list[HandLandmarkIndex.MIDDLE_FINGER_MCP] = new Vector3(0, 100, 0);
    // Index MCP at (-30, 90, 0)
    list[HandLandmarkIndex.INDEX_FINGER_MCP] = new Vector3(-30, 90, 0);
    // Pinky MCP at (30, 80, 0)
    list[HandLandmarkIndex.PINKY_MCP] = new Vector3(30, 80, 0);
    return list;
  };

  it('computes anatomical hand scale from wrist to middle MCP', () => {
    const hand = createBaseHand();
    const scale = HandGeometry.calculateHandScale(hand);
    expect(scale).toBeCloseTo(100, 2);
  });

  it('detects tight pinch contact between thumb tip and index tip', () => {
    const hand = createBaseHand();
    // Position thumb tip and index tip in contact
    hand[HandLandmarkIndex.THUMB_TIP] = new Vector3(-10, 110, 0);
    hand[HandLandmarkIndex.INDEX_FINGER_TIP] = new Vector3(-8, 112, 0);

    const pinch = HandGeometry.calculatePinch(hand);
    expect(pinch.rawDistance).toBeCloseTo(Math.sqrt(4 + 4), 2); // ~2.82
    expect(pinch.normalizedDistance).toBeLessThan(0.05); // Very tight pinch (<5% of hand scale)
    expect(pinch.contactMidpoint.x).toBeCloseTo(-9, 1);
    expect(pinch.contactMidpoint.y).toBeCloseTo(111, 1);
  });

  it('detects open hand with separated fingers (not pinching)', () => {
    const hand = createBaseHand();
    // Open hand: thumb spread out, index finger extended
    hand[HandLandmarkIndex.THUMB_TIP] = new Vector3(-60, 80, 0);
    hand[HandLandmarkIndex.INDEX_FINGER_TIP] = new Vector3(-30, 170, 0);

    const pinch = HandGeometry.calculatePinch(hand);
    expect(pinch.normalizedDistance).toBeGreaterThan(0.5); // 50%+ of hand scale
  });

  it('computes unit palm normal vector perpendicular to palm plane', () => {
    const hand = createBaseHand();
    const normalRight = HandGeometry.calculatePalmNormal(hand, 'Right');
    expect(normalRight.length()).toBeCloseTo(1, 4);

    const normalLeft = HandGeometry.calculatePalmNormal(hand, 'Left');
    expect(normalLeft.length()).toBeCloseTo(1, 4);
    expect(normalLeft.x).toBeCloseTo(-normalRight.x, 4);
    expect(normalLeft.y).toBeCloseTo(-normalRight.y, 4);
    expect(normalLeft.z).toBeCloseTo(-normalRight.z, 4);
  });

  it('identifies extended fingers for open palm, closed fist, and pointing ray', () => {
    const hand = createBaseHand();

    // 1. Open Palm: all fingertips extended far from wrist
    hand[HandLandmarkIndex.THUMB_IP] = new Vector3(-40, 50, 0);
    hand[HandLandmarkIndex.THUMB_TIP] = new Vector3(-70, 70, 0);

    hand[HandLandmarkIndex.INDEX_FINGER_PIP] = new Vector3(-30, 130, 0);
    hand[HandLandmarkIndex.INDEX_FINGER_TIP] = new Vector3(-30, 180, 0);

    hand[HandLandmarkIndex.MIDDLE_FINGER_PIP] = new Vector3(0, 140, 0);
    hand[HandLandmarkIndex.MIDDLE_FINGER_TIP] = new Vector3(0, 190, 0);

    hand[HandLandmarkIndex.RING_FINGER_PIP] = new Vector3(20, 130, 0);
    hand[HandLandmarkIndex.RING_FINGER_TIP] = new Vector3(20, 175, 0);

    hand[HandLandmarkIndex.PINKY_PIP] = new Vector3(30, 115, 0);
    hand[HandLandmarkIndex.PINKY_TIP] = new Vector3(30, 150, 0);

    const openState = HandGeometry.calculateFingersExtended(hand);
    expect(openState.count).toBe(5);
    expect(openState.index).toBe(true);
    expect(openState.middle).toBe(true);

    // 2. Pointing gesture: fold middle, ring, pinky back toward palm
    hand[HandLandmarkIndex.MIDDLE_FINGER_TIP] = new Vector3(0, 80, 0);
    hand[HandLandmarkIndex.RING_FINGER_TIP] = new Vector3(20, 75, 0);
    hand[HandLandmarkIndex.PINKY_TIP] = new Vector3(30, 70, 0);

    const pointState = HandGeometry.calculateFingersExtended(hand);
    expect(pointState.index).toBe(true);
    expect(pointState.middle).toBe(false);
    expect(pointState.ring).toBe(false);
    expect(pointState.pinky).toBe(false);
  });

  it('calculates bounding sphere enclosing all hand joints', () => {
    const hand = createBaseHand();
    const sphere = HandGeometry.calculateBoundingSphere(hand);

    expect(sphere.radius).toBeGreaterThan(0);
    for (const pt of hand) {
      expect(sphere.center.distanceTo(pt)).toBeLessThanOrEqual(sphere.radius + 1e-4);
    }
  });
});

describe('HandLandmarkerService', () => {
  it('processes raw 21-joint landmarks into typed HandPose', () => {
    const service = new HandLandmarkerService();
    const rawLandmarks: RawLandmarkPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.5 + i * 0.01,
      y: 0.6 + i * 0.01,
      z: -0.1,
    }));

    const pose = service.processRawHandLandmarks(rawLandmarks, 'Right', 2000, 0.96);
    expect(pose).toBeDefined();
    expect(pose.landmarks.length).toBe(21);
    expect(pose.screenLandmarks.length).toBe(21);
    expect(pose.handedness).toBe('Right');
    expect(pose.confidence).toBe(0.96);
    expect(pose.timestamp).toBe(2000);
  });
});

