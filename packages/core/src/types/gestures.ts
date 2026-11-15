import { Vector2 } from '../math/vector2';
import { Vector3 } from '../math/vector3';
import { Handedness } from './landmarks';

export enum GestureType {
  NONE = 'NONE',
  PINCH = 'PINCH',
  PINCH_HOLD = 'PINCH_HOLD',
  GRAB = 'GRAB',
  OPEN_PALM = 'OPEN_PALM',
  POINT = 'POINT',
  SWIPE_LEFT = 'SWIPE_LEFT',
  SWIPE_RIGHT = 'SWIPE_RIGHT',
  SWIPE_UP = 'SWIPE_UP',
  SWIPE_DOWN = 'SWIPE_DOWN',
}

export interface PinchState {
  isPinching: boolean;
  distance: number; // Euclidean distance between thumb and index tip
  normalizedDistance: number; // Normalized by hand size (wrist to middle MCP)
  contactPoint: Vector3; // Midpoint between thumb tip and index tip in 3D
  screenContactPoint: Vector2; // Projected screen coordinate
  strength: number; // 0 (open) to 1 (tight contact)
  durationMs: number;
}

export interface GestureDetectionResult {
  gesture: GestureType;
  confidence: number;
  handedness: Handedness;
  pinch: PinchState;
  timestamp: number;
}
