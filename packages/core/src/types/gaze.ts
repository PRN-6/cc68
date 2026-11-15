import { Vector2 } from '../math/vector2';

export type GazeClassification = 'fixation' | 'saccade' | 'blink' | 'unknown';

export interface GazePoint {
  screenPoint: Vector2;       // In screen pixels
  normalizedPoint: Vector2;   // Normalized coordinates [0, 1]
  confidence: number;         // 0 to 1
  classification: GazeClassification;
  timestamp: number;
}

export interface CalibrationSample {
  targetScreenPoint: Vector2; // Ground truth target point on screen
  leftIrisNormalized: Vector2;
  rightIrisNormalized: Vector2;
  headYaw: number;
  headPitch: number;
  timestamp: number;
}

export interface CalibrationPolynomialCoefficients {
  a0: number;
  a1: number;
  a2: number;
  a3: number;
  a4: number;
  a5: number;
}

export interface CalibrationModel {
  isCalibrated: boolean;
  rmsErrorPixels: number;
  coefficientsX: CalibrationPolynomialCoefficients;
  coefficientsY: CalibrationPolynomialCoefficients;
  calibratedAt: number;
}
