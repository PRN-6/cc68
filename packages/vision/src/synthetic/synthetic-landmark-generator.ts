import { FaceLandmarksSummary, HandPose, Vector3, HandLandmarkIndex } from '@cc68/core';
import { RawLandmarkPoint, EyeGeometry } from '../face/eye-geometry';
import { FACE_LANDMARKS_INDICES } from '../face/face-landmarks-indices';
import { HandGeometry } from '../hand/hand-geometry';

export type SyntheticScenario =
  | 'FIXATION'
  | 'LOOK_AND_PINCH_CLICK'
  | 'PINCH_AND_DRAG'
  | 'BLINK'
  | 'CIRCULAR_GAZE';

export interface SyntheticFrameData {
  timestampMs: number;
  faceSummary: FaceLandmarksSummary;
  hands: HandPose[];
  rawFaceLandmarks: RawLandmarkPoint[];
  rawHandLandmarks: RawLandmarkPoint[];
}

/**
 * Deterministic synthetic 3D landmark generator for automated CI testing,
 * headless integration verification, and camera-free development.
 */
export class SyntheticLandmarkGenerator {
  /**
   * Procedurally generate a full set of 478 MediaPipe face & iris landmarks.
   */
  static generateFaceLandmarks(timeSec: number, scenario: SyntheticScenario = 'FIXATION'): RawLandmarkPoint[] {
    const points: RawLandmarkPoint[] = Array.from({ length: 478 }, (_, i) => ({
      x: 0.5 + Math.sin(i) * 0.05,
      y: 0.5 + Math.cos(i) * 0.05,
      z: 0.0,
    }));

    // Anchors for head pose
    const anchors = FACE_LANDMARKS_INDICES.HEAD_POSE_ANCHORS;
    points[anchors.NOSE_TIP] = { x: 0.5, y: 0.5, z: -0.05 };
    points[anchors.CHIN] = { x: 0.5, y: 0.75, z: 0.0 };
    points[anchors.FOREHEAD_GLABELLA] = { x: 0.5, y: 0.25, z: 0.0 };
    points[anchors.LEFT_TEMPLE] = { x: 0.3, y: 0.45, z: 0.05 };
    points[anchors.RIGHT_TEMPLE] = { x: 0.7, y: 0.45, z: 0.05 };

    // Dynamic gaze target offset based on scenario
    let gazeX = 0;
    let gazeY = 0;
    let isBlinking = false;

    switch (scenario) {
      case 'CIRCULAR_GAZE':
        gazeX = 0.015 * Math.cos(timeSec * 2.0);
        gazeY = 0.010 * Math.sin(timeSec * 2.0);
        break;
      case 'LOOK_AND_PINCH_CLICK':
        // Gaze fixates firmly on target (0.6, 0.4)
        gazeX = 0.012;
        gazeY = -0.008;
        break;
      case 'BLINK':
        // Periodic blink every 1.5 seconds lasting 150ms
        const phase = timeSec % 1.5;
        isBlinking = phase < 0.15;
        break;
      case 'PINCH_AND_DRAG':
        // Gaze leads the drag trajectory
        gazeX = 0.015 * Math.sin(timeSec * 1.5);
        break;
      case 'FIXATION':
      default:
        // Micro-tremor around center
        gazeX = 0.001 * Math.sin(timeSec * 12.0);
        gazeY = 0.001 * Math.cos(timeSec * 14.0);
        break;
    }

    const eyelidDelta = isBlinking ? 0.002 : 0.035;

    // Configure Left Eye
    const le = FACE_LANDMARKS_INDICES.LEFT_EYE;
    points[le.OUTER_CORNER] = { x: 0.38, y: 0.45, z: 0 };
    points[le.INNER_CORNER] = { x: 0.46, y: 0.45, z: 0 };
    points[le.UPPER_LID_PRIMARY] = { x: 0.42, y: 0.45 - eyelidDelta, z: 0 };
    points[le.LOWER_LID_PRIMARY] = { x: 0.42, y: 0.45 + eyelidDelta, z: 0 };
    points[le.UPPER_LID_SECONDARY_1] = { x: 0.40, y: 0.45 - eyelidDelta * 0.9, z: 0 };
    points[le.LOWER_LID_SECONDARY_1] = { x: 0.40, y: 0.45 + eyelidDelta * 0.9, z: 0 };
    points[le.UPPER_LID_SECONDARY_2] = { x: 0.44, y: 0.45 - eyelidDelta * 0.9, z: 0 };
    points[le.LOWER_LID_SECONDARY_2] = { x: 0.44, y: 0.45 + eyelidDelta * 0.9, z: 0 };

    points[le.IRIS_CENTER] = { x: 0.42 + gazeX, y: 0.45 + gazeY, z: -0.01 };
    points[le.IRIS_LEFT] = { x: 0.41 + gazeX, y: 0.45 + gazeY, z: -0.01 };
    points[le.IRIS_RIGHT] = { x: 0.43 + gazeX, y: 0.45 + gazeY, z: -0.01 };
    points[le.IRIS_TOP] = { x: 0.42 + gazeX, y: 0.44 + gazeY, z: -0.01 };
    points[le.IRIS_BOTTOM] = { x: 0.42 + gazeX, y: 0.46 + gazeY, z: -0.01 };

    // Configure Right Eye
    const re = FACE_LANDMARKS_INDICES.RIGHT_EYE;
    points[re.INNER_CORNER] = { x: 0.54, y: 0.45, z: 0 };
    points[re.OUTER_CORNER] = { x: 0.62, y: 0.45, z: 0 };
    points[re.UPPER_LID_PRIMARY] = { x: 0.58, y: 0.45 - eyelidDelta, z: 0 };
    points[re.LOWER_LID_PRIMARY] = { x: 0.58, y: 0.45 + eyelidDelta, z: 0 };
    points[re.UPPER_LID_SECONDARY_1] = { x: 0.56, y: 0.45 - eyelidDelta * 0.9, z: 0 };
    points[re.LOWER_LID_SECONDARY_1] = { x: 0.56, y: 0.45 + eyelidDelta * 0.9, z: 0 };
    points[re.UPPER_LID_SECONDARY_2] = { x: 0.60, y: 0.45 - eyelidDelta * 0.9, z: 0 };
    points[re.LOWER_LID_SECONDARY_2] = { x: 0.60, y: 0.45 + eyelidDelta * 0.9, z: 0 };

    points[re.IRIS_CENTER] = { x: 0.58 + gazeX, y: 0.45 + gazeY, z: -0.01 };
    points[re.IRIS_LEFT] = { x: 0.57 + gazeX, y: 0.45 + gazeY, z: -0.01 };
    points[re.IRIS_RIGHT] = { x: 0.59 + gazeX, y: 0.45 + gazeY, z: -0.01 };
    points[re.IRIS_TOP] = { x: 0.58 + gazeX, y: 0.44 + gazeY, z: -0.01 };
    points[re.IRIS_BOTTOM] = { x: 0.58 + gazeX, y: 0.46 + gazeY, z: -0.01 };

    return points;
  }

  /**
   * Procedurally generate a full set of 21 MediaPipe 3D hand joints.
   */
  static generateHandLandmarks(timeSec: number, scenario: SyntheticScenario = 'FIXATION'): RawLandmarkPoint[] {
    const hand: RawLandmarkPoint[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));

    // Hand translation trajectory
    let handBaseX = 0.5;
    let handBaseY = 0.65;
    let isPinching = false;

    switch (scenario) {
      case 'LOOK_AND_PINCH_CLICK': {
        // Pinch cycle: cycle every 1.5s, pinch active between 0.6s and 1.1s
        const phase = timeSec % 1.5;
        isPinching = phase >= 0.6 && phase <= 1.1;
        break;
      }
      case 'PINCH_AND_DRAG': {
        const phase = timeSec % 2.0;
        isPinching = phase >= 0.4 && phase <= 1.6;
        if (isPinching) {
          handBaseX = 0.4 + 0.3 * ((phase - 0.4) / 1.2); // Drag horizontally across
        }
        break;
      }
      case 'CIRCULAR_GAZE':
      case 'FIXATION':
      case 'BLINK':
      default:
        isPinching = false;
        break;
    }

    // Wrist at base
    hand[HandLandmarkIndex.WRIST] = { x: handBaseX, y: handBaseY, z: 0 };

    // MCP knuckles
    hand[HandLandmarkIndex.THUMB_CMC] = { x: handBaseX - 0.04, y: handBaseY - 0.03, z: 0 };
    hand[HandLandmarkIndex.THUMB_MCP] = { x: handBaseX - 0.07, y: handBaseY - 0.06, z: 0 };
    hand[HandLandmarkIndex.THUMB_IP] = { x: handBaseX - 0.09, y: handBaseY - 0.10, z: 0 };

    hand[HandLandmarkIndex.INDEX_FINGER_MCP] = { x: handBaseX - 0.03, y: handBaseY - 0.12, z: 0 };
    hand[HandLandmarkIndex.INDEX_FINGER_PIP] = { x: handBaseX - 0.03, y: handBaseY - 0.16, z: 0 };
    hand[HandLandmarkIndex.INDEX_FINGER_DIP] = { x: handBaseX - 0.03, y: handBaseY - 0.19, z: 0 };

    hand[HandLandmarkIndex.MIDDLE_FINGER_MCP] = { x: handBaseX, y: handBaseY - 0.12, z: 0 };
    hand[HandLandmarkIndex.MIDDLE_FINGER_PIP] = { x: handBaseX, y: handBaseY - 0.17, z: 0 };
    hand[HandLandmarkIndex.MIDDLE_FINGER_DIP] = { x: handBaseX, y: handBaseY - 0.21, z: 0 };
    hand[HandLandmarkIndex.MIDDLE_FINGER_TIP] = { x: handBaseX, y: handBaseY - 0.24, z: 0 };

    hand[HandLandmarkIndex.RING_FINGER_MCP] = { x: handBaseX + 0.03, y: handBaseY - 0.11, z: 0 };
    hand[HandLandmarkIndex.RING_FINGER_PIP] = { x: handBaseX + 0.03, y: handBaseY - 0.15, z: 0 };
    hand[HandLandmarkIndex.RING_FINGER_DIP] = { x: handBaseX + 0.03, y: handBaseY - 0.19, z: 0 };
    hand[HandLandmarkIndex.RING_FINGER_TIP] = { x: handBaseX + 0.03, y: handBaseY - 0.22, z: 0 };

    hand[HandLandmarkIndex.PINKY_MCP] = { x: handBaseX + 0.06, y: handBaseY - 0.09, z: 0 };
    hand[HandLandmarkIndex.PINKY_PIP] = { x: handBaseX + 0.06, y: handBaseY - 0.13, z: 0 };
    hand[HandLandmarkIndex.PINKY_DIP] = { x: handBaseX + 0.06, y: handBaseY - 0.16, z: 0 };
    hand[HandLandmarkIndex.PINKY_TIP] = { x: handBaseX + 0.06, y: handBaseY - 0.19, z: 0 };

    // Pinching: thumb tip moves close to index finger tip
    if (isPinching) {
      hand[HandLandmarkIndex.INDEX_FINGER_TIP] = { x: handBaseX - 0.04, y: handBaseY - 0.15, z: 0 };
      hand[HandLandmarkIndex.THUMB_TIP] = { x: handBaseX - 0.042, y: handBaseY - 0.152, z: 0 };
    } else {
      hand[HandLandmarkIndex.INDEX_FINGER_TIP] = { x: handBaseX - 0.03, y: handBaseY - 0.22, z: 0 };
      hand[HandLandmarkIndex.THUMB_TIP] = { x: handBaseX - 0.11, y: handBaseY - 0.13, z: 0 };
    }

    return hand;
  }

  /**
   * Generate a complete synchronized frame containing structured face and hand poses.
   */
  static generateFrame(timestampMs: number, scenario: SyntheticScenario = 'FIXATION'): SyntheticFrameData {
    const timeSec = timestampMs / 1000.0;
    const rawFace = this.generateFaceLandmarks(timeSec, scenario);
    const rawHand = this.generateHandLandmarks(timeSec, scenario);

    const leftEye = EyeGeometry.extractEye(rawFace, FACE_LANDMARKS_INDICES.LEFT_EYE);
    const rightEye = EyeGeometry.extractEye(rawFace, FACE_LANDMARKS_INDICES.RIGHT_EYE);
    const pose = EyeGeometry.estimateHeadPose(rawFace);

    const faceSummary: FaceLandmarksSummary = {
      leftEye,
      rightEye,
      noseTip: new Vector3(
        rawFace[FACE_LANDMARKS_INDICES.HEAD_POSE_ANCHORS.NOSE_TIP].x,
        rawFace[FACE_LANDMARKS_INDICES.HEAD_POSE_ANCHORS.NOSE_TIP].y,
        rawFace[FACE_LANDMARKS_INDICES.HEAD_POSE_ANCHORS.NOSE_TIP].z ?? 0
      ),
      pitch: pose.pitch,
      yaw: pose.yaw,
      roll: pose.roll,
      confidence: 0.99,
      timestamp: timestampMs,
    };

    const handPose: HandPose = {
      landmarks: HandGeometry.toVector3List(rawHand),
      screenLandmarks: HandGeometry.toVector2List(rawHand),
      handedness: 'Right',
      confidence: 0.98,
      timestamp: timestampMs,
    };

    return {
      timestampMs,
      faceSummary,
      hands: [handPose],
      rawFaceLandmarks: rawFace,
      rawHandLandmarks: rawHand,
    };
  }

  /**
   * Start a continuous synthetic streaming loop emitting frames at requested FPS.
   * Returns a cleanup / stop function.
   */
  static createStream(
    fps: number,
    scenario: SyntheticScenario,
    onFrame: (frame: SyntheticFrameData) => void
  ): () => void {
    const intervalMs = 1000.0 / fps;
    const startTime = Date.now();
    let isRunning = true;

    const timer = setInterval(() => {
      if (!isRunning) return;
      const now = Date.now();
      const frame = this.generateFrame(now - startTime, scenario);
      onFrame(frame);
    }, intervalMs);

    return () => {
      isRunning = false;
      clearInterval(timer);
    };
  }
}

