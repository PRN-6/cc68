import { Vector2 } from '../math/vector2';
import { Vector3 } from '../math/vector3';

export interface NormalizedLandmark {
  x: number; // [0, 1] normalized to image width
  y: number; // [0, 1] normalized to image height
  z?: number; // relative depth coordinate
  visibility?: number;
}

/**
 * Standard 21 MediaPipe hand landmark indices.
 */
export enum HandLandmarkIndex {
  WRIST = 0,
  THUMB_CMC = 1,
  THUMB_MCP = 2,
  THUMB_IP = 3,
  THUMB_TIP = 4,
  INDEX_FINGER_MCP = 5,
  INDEX_FINGER_PIP = 6,
  INDEX_FINGER_DIP = 7,
  INDEX_FINGER_TIP = 8,
  MIDDLE_FINGER_MCP = 9,
  MIDDLE_FINGER_PIP = 10,
  MIDDLE_FINGER_DIP = 11,
  MIDDLE_FINGER_TIP = 12,
  RING_FINGER_MCP = 13,
  RING_FINGER_PIP = 14,
  RING_FINGER_DIP = 15,
  RING_FINGER_TIP = 16,
  PINKY_MCP = 17,
  PINKY_PIP = 18,
  PINKY_DIP = 19,
  PINKY_TIP = 20,
}

export type Handedness = 'Left' | 'Right';

export interface HandPose {
  landmarks: Vector3[]; // 21 3D landmarks
  screenLandmarks: Vector2[]; // 21 2D screen coordinates
  handedness: Handedness;
  confidence: number;
  timestamp: number;
}

export interface IrisLandmarks {
  center: Vector2;
  left: Vector2;
  right: Vector2;
  top: Vector2;
  bottom: Vector2;
}

export interface EyeLandmarks {
  iris: IrisLandmarks;
  eyelidUpper: Vector2;
  eyelidLower: Vector2;
  innerCorner: Vector2;
  outerCorner: Vector2;
  opennessRatio: number; // 0 = closed/blink, 1 = fully open
}

export interface FaceLandmarksSummary {
  leftEye: EyeLandmarks;
  rightEye: EyeLandmarks;
  noseTip: Vector3;
  pitch: number; // Head rotation in degrees
  yaw: number;
  roll: number;
  confidence: number;
  timestamp: number;
}
