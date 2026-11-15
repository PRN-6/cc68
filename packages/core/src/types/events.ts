import { GazePoint } from './gaze';
import { GestureDetectionResult } from './gestures';
import { HandPose, FaceLandmarksSummary } from './landmarks';

export enum EyeHandEventType {
  FRAME_PROCESSED = 'frame:processed',
  FACE_UPDATED = 'face:updated',
  HAND_UPDATED = 'hand:updated',
  GAZE_MOVED = 'gaze:moved',
  GAZE_FIXATION = 'gaze:fixation',
  GESTURE_DETECTED = 'gesture:detected',
  PINCH_START = 'pinch:start',
  PINCH_DRAG = 'pinch:drag',
  PINCH_END = 'pinch:end',
  INTERACTION_TRIGGERED = 'interaction:triggered',
  CALIBRATION_STEP = 'calibration:step',
  CALIBRATION_COMPLETE = 'calibration:complete',
}

export interface EyeHandEventMap {
  [EyeHandEventType.FRAME_PROCESSED]: { fps: number; timestamp: number };
  [EyeHandEventType.FACE_UPDATED]: FaceLandmarksSummary;
  [EyeHandEventType.HAND_UPDATED]: HandPose;
  [EyeHandEventType.GAZE_MOVED]: GazePoint;
  [EyeHandEventType.GAZE_FIXATION]: GazePoint & { durationMs: number };
  [EyeHandEventType.GESTURE_DETECTED]: GestureDetectionResult;
  [EyeHandEventType.PINCH_START]: GestureDetectionResult;
  [EyeHandEventType.PINCH_DRAG]: GestureDetectionResult;
  [EyeHandEventType.PINCH_END]: GestureDetectionResult;
  [EyeHandEventType.INTERACTION_TRIGGERED]: {
    targetId?: string;
    gaze: GazePoint;
    gesture: GestureDetectionResult;
  };
  [EyeHandEventType.CALIBRATION_STEP]: { step: number; total: number };
  [EyeHandEventType.CALIBRATION_COMPLETE]: { success: boolean; rmsError: number };
}
