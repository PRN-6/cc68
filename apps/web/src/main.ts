import { CORE_VERSION, DesktopMouseBridge } from '@cc68/core';
import {
  VISION_VERSION,
  VideoStreamManager,
  MockStreamGenerator,
  FaceLandmarkerService,
  HandLandmarkerService,
  EyeGeometry,
  HandGeometry,
} from '@cc68/vision';

console.log(`EyeHand Web initialized with Core v${CORE_VERSION}, Vision v${VISION_VERSION}`);

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 860px; margin: 1.5rem auto; padding: 2rem; background: #0f172a; border-radius: 12px; color: #f8fafc; border: 1px solid #1e293b;">
      <header style="margin-bottom: 1.5rem; text-align: center;">
        <h1 style="font-size: 2rem; margin: 0 0 0.5rem 0; color: #38bdf8;">EyeHand (cc68)</h1>
        <p style="color: #94a3b8; margin: 0;">Task M1.2: MediaPipe Face Landmarker & Iris Tracking</p>
        <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
          <span style="background: #1e293b; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: #38bdf8;">Core v${CORE_VERSION}</span>
          <span style="background: #1e293b; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: #4ade80;">Vision v${VISION_VERSION}</span>
          <span id="bridge-status-badge" style="background: #1e293b; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: #f59e0b;">Checking Native Desktop Bridge...</span>
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1fr; gap: 1.25rem;">
        <!-- Camera Stream Controller -->
        <div style="background: #020617; border-radius: 8px; padding: 1.25rem; border: 1px solid #1e293b;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h2 style="font-size: 1.1rem; margin: 0;">Camera Stream & Vision Viewport</h2>
            <span id="stream-status" style="padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; background: #334155; color: #94a3b8;">DISCONNECTED</span>
          </div>

          <div style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
            <video id="camera-preview" style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); display: none;"></video>
            <canvas id="sim-canvas" style="width: 100%; height: 100%; display: none;"></canvas>
            <div id="video-placeholder" style="color: #64748b; font-size: 0.9rem; text-align: center;">
              Camera is inactive.<br/>Click "Start Webcam" or "Start Simulator" below.
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap;">
            <button id="btn-start-camera" style="background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500;">
              Start Webcam
            </button>
            <button id="btn-start-sim" style="background: #0d9488; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500;">
              Start Simulator
            </button>
            <button id="btn-stop" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; display: none;">
              Stop Stream
            </button>
          </div>
        </div>

        <!-- Face & Iris Tracking Telemetry -->
        <div style="background: #020617; border-radius: 8px; padding: 1.25rem; border: 1px solid #1e293b;">
          <h2 style="font-size: 1.1rem; margin: 0 0 0.75rem 0;">Eye Tracking & Iris Telemetry (M1.2)</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
            <div style="background: #0f172a; padding: 0.75rem; border-radius: 6px; border: 1px solid #334155;">
              <div style="font-size: 0.75rem; color: #94a3b8;">LEFT EYE (EAR)</div>
              <div id="val-left-ear" style="font-size: 1.2rem; font-weight: bold; color: #38bdf8;">0.30</div>
              <div id="val-left-blink" style="font-size: 0.75rem; color: #4ade80;">OPEN</div>
            </div>
            <div style="background: #0f172a; padding: 0.75rem; border-radius: 6px; border: 1px solid #334155;">
              <div style="font-size: 0.75rem; color: #94a3b8;">RIGHT EYE (EAR)</div>
              <div id="val-right-ear" style="font-size: 1.2rem; font-weight: bold; color: #38bdf8;">0.30</div>
              <div id="val-right-blink" style="font-size: 0.75rem; color: #4ade80;">OPEN</div>
            </div>
            <div style="background: #0f172a; padding: 0.75rem; border-radius: 6px; border: 1px solid #334155;">
              <div style="font-size: 0.75rem; color: #94a3b8;">IRIS OFFSET (X, Y)</div>
              <div id="val-iris-offset" style="font-size: 1.1rem; font-family: monospace; color: #a78bfa;">(0.00, 0.00)</div>
              <div style="font-size: 0.75rem; color: #64748b;">Normalized [-1, 1]</div>
            </div>
            <div style="background: #0f172a; padding: 0.75rem; border-radius: 6px; border: 1px solid #334155;">
              <div style="font-size: 0.75rem; color: #94a3b8;">HEAD POSE (Y, P, R)</div>
              <div id="val-head-pose" style="font-size: 1.1rem; font-family: monospace; color: #f59e0b;">0° / 0° / 0°</div>
              <div style="font-size: 0.75rem; color: #64748b;">Yaw / Pitch / Roll</div>
            </div>
          </div>
        </div>

        <!-- 3D Hand Pose & Pinch Telemetry (M1.3) -->
        <div style="background: #020617; border-radius: 8px; padding: 1.25rem; border: 1px solid #1e293b;">
          <h2 style="font-size: 1.1rem; margin: 0 0 0.75rem 0;">3D Hand Pose & Pinch Telemetry (M1.3)</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
            <div style="background: #0f172a; padding: 0.75rem; border-radius: 6px; border: 1px solid #334155;">
              <div style="font-size: 0.75rem; color: #94a3b8;">PINCH DISTANCE</div>
              <div id="val-pinch-dist" style="font-size: 1.2rem; font-weight: bold; color: #38bdf8;">0.45</div>
              <div id="val-pinch-state" style="font-size: 0.75rem; color: #f59e0b;">OPEN (RELEASED)</div>
            </div>
            <div style="background: #0f172a; padding: 0.75rem; border-radius: 6px; border: 1px solid #334155;">
              <div style="font-size: 0.75rem; color: #94a3b8;">PALM ORIENTATION</div>
              <div id="val-palm-facing" style="font-size: 1.1rem; font-family: monospace; color: #4ade80;">FACING CAMERA</div>
              <div style="font-size: 0.75rem; color: #64748b;">Normal vector Z &lt; 0</div>
            </div>
            <div style="background: #0f172a; padding: 0.75rem; border-radius: 6px; border: 1px solid #334155;">
              <div style="font-size: 0.75rem; color: #94a3b8;">FINGERS EXTENDED</div>
              <div id="val-fingers-count" style="font-size: 1.2rem; font-weight: bold; color: #a78bfa;">5 / 5</div>
              <div id="val-gesture-name" style="font-size: 0.75rem; color: #94a3b8;">OPEN PALM</div>
            </div>
            <div style="background: #0f172a; padding: 0.75rem; border-radius: 6px; border: 1px solid #334155;">
              <div style="font-size: 0.75rem; color: #94a3b8;">PINCH CONTACT (X, Y)</div>
              <div id="val-pinch-point" style="font-size: 1.1rem; font-family: monospace; color: #38bdf8;">(0.50, 0.60)</div>
              <div style="font-size: 0.75rem; color: #64748b;">Screen NDC [0, 1]</div>
            </div>
          </div>
        </div>

        <!-- Windows Native Mouse Injection Controller -->
        <div style="background: #020617; border-radius: 8px; padding: 1.25rem; border: 1px solid #1e293b;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h2 style="font-size: 1.1rem; margin: 0;">Windows OS Mouse Injection (EyeHand.exe)</h2>
            <span id="screen-res-badge" style="font-size: 0.8rem; color: #64748b;">Screen: Detecting...</span>
          </div>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button id="btn-test-cursor" style="background: #475569; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
              Test Move Cursor (Center)
            </button>
            <button id="btn-test-click" style="background: #475569; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
              Test Left Click
            </button>
          </div>
        </div>

        <div id="camera-log" style="padding: 0.75rem; background: #020617; border-radius: 6px; font-family: monospace; font-size: 0.8rem; color: #94a3b8; border: 1px solid #1e293b; min-height: 24px;">
          Ready.
        </div>
      </div>
    </div>
  `;

  const videoElement = document.getElementById('camera-preview') as HTMLVideoElement;
  const simCanvas = document.getElementById('sim-canvas') as HTMLCanvasElement;
  const placeholder = document.getElementById('video-placeholder') as HTMLDivElement;
  const statusBadge = document.getElementById('stream-status') as HTMLSpanElement;
  const bridgeBadge = document.getElementById('bridge-status-badge') as HTMLSpanElement;
  const screenBadge = document.getElementById('screen-res-badge') as HTMLSpanElement;
  const logEl = document.getElementById('camera-log') as HTMLDivElement;
  const btnStartCamera = document.getElementById('btn-start-camera') as HTMLButtonElement;
  const btnStartSim = document.getElementById('btn-start-sim') as HTMLButtonElement;
  const btnStop = document.getElementById('btn-stop') as HTMLButtonElement;
  const btnTestCursor = document.getElementById('btn-test-cursor') as HTMLButtonElement;
  const btnTestClick = document.getElementById('btn-test-click') as HTMLButtonElement;

  const leftEarVal = document.getElementById('val-left-ear') as HTMLDivElement;
  const leftBlinkVal = document.getElementById('val-left-blink') as HTMLDivElement;
  const rightEarVal = document.getElementById('val-right-ear') as HTMLDivElement;
  const rightBlinkVal = document.getElementById('val-right-blink') as HTMLDivElement;
  const irisOffsetVal = document.getElementById('val-iris-offset') as HTMLDivElement;
  const headPoseVal = document.getElementById('val-head-pose') as HTMLDivElement;

  const pinchDistVal = document.getElementById('val-pinch-dist') as HTMLDivElement;
  const pinchStateVal = document.getElementById('val-pinch-state') as HTMLDivElement;
  const palmFacingVal = document.getElementById('val-palm-facing') as HTMLDivElement;
  const fingersCountVal = document.getElementById('val-fingers-count') as HTMLDivElement;
  const gestureNameVal = document.getElementById('val-gesture-name') as HTMLDivElement;
  const pinchPointVal = document.getElementById('val-pinch-point') as HTMLDivElement;

  const cameraManager = new VideoStreamManager({ width: 1280, height: 720, frameRate: 60 });
  const mockGenerator = new MockStreamGenerator({ width: 1280, height: 720 });
  const mouseBridge = new DesktopMouseBridge();
  const faceLandmarker = new FaceLandmarkerService();
  const handLandmarker = new HandLandmarkerService();

  let simTimer: number | null = null;
  let procTimer: number | null = null;

  const log = (msg: string) => {
    logEl.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  };

  const setStatus = (text: string, colorBg: string, colorText: string) => {
    statusBadge.textContent = text;
    statusBadge.style.backgroundColor = colorBg;
    statusBadge.style.color = colorText;
  };

  // Check desktop bridge status on load
  mouseBridge.checkAvailability().then((avail) => {
    if (avail) {
      bridgeBadge.textContent = 'Native Desktop .EXE: CONNECTED';
      bridgeBadge.style.color = '#4ade80';
      mouseBridge.getScreenDimensions().then((dim) => {
        if (dim) screenBadge.textContent = `Windows Screen: ${dim.width}x${dim.height}px`;
      });
      log('Connected to EyeHand.exe Win32 desktop mouse engine.');
    } else {
      bridgeBadge.textContent = 'Web Browser Sandbox Mode';
      bridgeBadge.style.color = '#94a3b8';
      screenBadge.textContent = `Browser Viewport: ${window.innerWidth}x${window.innerHeight}px`;
      log('Running in browser sandbox mode. Launch EyeHand.exe for OS-level mouse control.');
    }
  });

  btnTestCursor.addEventListener('click', async () => {
    const screen = await mouseBridge.getScreenDimensions();
    const cx = screen ? screen.width / 2 : window.innerWidth / 2;
    const cy = screen ? screen.height / 2 : window.innerHeight / 2;
    await mouseBridge.moveCursor(cx, cy);
    log(`Dispatched OS cursor move to (${cx}, ${cy}).`);
  });

  btnTestClick.addEventListener('click', async () => {
    await mouseBridge.click('left');
    log('Dispatched OS left click event.');
  });

  btnStartCamera.addEventListener('click', async () => {
    try {
      log('Requesting camera & initializing Face + Hand Landmarkers...');
      setStatus('INITIALIZING', '#ca8a04', '#fef08a');
      await cameraManager.start();
      await cameraManager.attachTo(videoElement);
      await Promise.all([faceLandmarker.init(), handLandmarker.init()]);

      videoElement.style.display = 'block';
      simCanvas.style.display = 'none';
      placeholder.style.display = 'none';
      btnStop.style.display = 'inline-block';
      btnStartCamera.style.display = 'none';
      btnStartSim.style.display = 'none';

      setStatus('STREAMING LIVE', '#16a34a', '#bbf7d0');
      log('WebCam stream & Vision pipelines active at 60 FPS.');

      const processLoop = () => {
        if (cameraManager.isStreaming()) {
          const now = performance.now();
          const faceSummary = faceLandmarker.processVideoFrame(videoElement, now);
          if (faceSummary) {
            updateFaceTelemetry(faceSummary);
          }

          const hands = handLandmarker.processVideoFrame(videoElement, now);
          if (hands && hands.length > 0) {
            updateHandTelemetry(hands[0]);
          }
        }
        procTimer = requestAnimationFrame(processLoop);
      };
      procTimer = requestAnimationFrame(processLoop);
    } catch (err: any) {
      setStatus('ERROR', '#dc2626', '#fecaca');
      log(`Camera Error: ${err.message}`);
    }
  });

  btnStartSim.addEventListener('click', () => {
    log('Starting synthetic test stream...');
    mockGenerator.bindCanvas(simCanvas);

    videoElement.style.display = 'none';
    simCanvas.style.display = 'block';
    placeholder.style.display = 'none';
    btnStop.style.display = 'inline-block';
    btnStartCamera.style.display = 'none';
    btnStartSim.style.display = 'none';

    setStatus('SIMULATOR ACTIVE', '#0d9488', '#ccfbf1');

    let t = 0;
    const tick = () => {
      t += 0.03;
      const eyeX = 0.5 + 0.3 * Math.cos(t);
      const eyeY = 0.5 + 0.2 * Math.sin(t);
      const isBlink = Math.sin(t * 3) < -0.85;

      const isPinch = Math.sin(t * 2) > 0.4;
      const handX = 0.5 + 0.25 * Math.sin(t * 1.5);
      const handY = 0.6 + 0.15 * Math.cos(t * 1.5);

      mockGenerator.renderSyntheticFrame({
        eyeGazeNorm: { x: eyeX, y: eyeY },
        handIndexTipNorm: { x: handX, y: handY },
        isPinching: isPinch,
      });

      // Update telemetry for simulated stream
      const ear = isBlink ? 0.12 : 0.32;
      leftEarVal.textContent = ear.toFixed(2);
      rightEarVal.textContent = ear.toFixed(2);
      leftBlinkVal.textContent = isBlink ? 'BLINKING' : 'OPEN';
      leftBlinkVal.style.color = isBlink ? '#ef4444' : '#4ade80';
      rightBlinkVal.textContent = isBlink ? 'BLINKING' : 'OPEN';
      rightBlinkVal.style.color = isBlink ? '#ef4444' : '#4ade80';

      const normX = (eyeX - 0.5) * 2;
      const normY = (eyeY - 0.5) * 2;
      irisOffsetVal.textContent = `(${normX.toFixed(2)}, ${normY.toFixed(2)})`;
      headPoseVal.textContent = `${(normX * 15).toFixed(0)}° / ${(normY * 10).toFixed(0)}° / 0°`;

      // Hand simulated telemetry
      const pinchDist = isPinch ? 0.03 : 0.45;
      pinchDistVal.textContent = pinchDist.toFixed(2);
      pinchStateVal.textContent = isPinch ? 'PINCHING (ACTIVE)' : 'OPEN (RELEASED)';
      pinchStateVal.style.color = isPinch ? '#22c55e' : '#f59e0b';
      palmFacingVal.textContent = 'FACING CAMERA';
      fingersCountVal.textContent = isPinch ? '3 / 5' : '5 / 5';
      gestureNameVal.textContent = isPinch ? 'PINCH' : 'OPEN PALM';
      pinchPointVal.textContent = `(${handX.toFixed(2)}, ${handY.toFixed(2)})`;

      simTimer = requestAnimationFrame(tick);
    };
    simTimer = requestAnimationFrame(tick);
    log('Synthetic 60 FPS generator active with real-time telemetry.');
  });

  btnStop.addEventListener('click', () => {
    cameraManager.stop();
    faceLandmarker.close();
    handLandmarker.close();
    if (simTimer !== null) {
      cancelAnimationFrame(simTimer);
      simTimer = null;
    }
    if (procTimer !== null) {
      cancelAnimationFrame(procTimer);
      procTimer = null;
    }

    videoElement.style.display = 'none';
    simCanvas.style.display = 'none';
    placeholder.style.display = 'block';
    btnStop.style.display = 'none';
    btnStartCamera.style.display = 'inline-block';
    btnStartSim.style.display = 'inline-block';

    setStatus('DISCONNECTED', '#334155', '#94a3b8');
    log('Stream stopped.');
  });

  function updateFaceTelemetry(summary: any) {
    const leftOffset = EyeGeometry.calculateNormalizedIrisOffset(summary.leftEye);
    const leftEar = summary.leftEye.opennessRatio * 0.17 + 0.15;
    const rightEar = summary.rightEye.opennessRatio * 0.17 + 0.15;
    const leftBlink = EyeGeometry.isBlinking(leftEar);
    const rightBlink = EyeGeometry.isBlinking(rightEar);

    leftEarVal.textContent = leftEar.toFixed(2);
    rightEarVal.textContent = rightEar.toFixed(2);
    leftBlinkVal.textContent = leftBlink ? 'BLINKING' : 'OPEN';
    leftBlinkVal.style.color = leftBlink ? '#ef4444' : '#4ade80';
    rightBlinkVal.textContent = rightBlink ? 'BLINKING' : 'OPEN';
    rightBlinkVal.style.color = rightBlink ? '#ef4444' : '#4ade80';

    irisOffsetVal.textContent = `(${leftOffset.x.toFixed(2)}, ${leftOffset.y.toFixed(2)})`;
    headPoseVal.textContent = `${summary.yaw.toFixed(0)}° / ${summary.pitch.toFixed(0)}° / ${summary.roll.toFixed(0)}°`;
  }

  function updateHandTelemetry(pose: any) {
    const pinch = HandGeometry.calculatePinch(pose.landmarks);
    const fingers = HandGeometry.calculateFingersExtended(pose.landmarks);
    const normal = HandGeometry.calculatePalmNormal(pose.landmarks, pose.handedness);

    const isPinch = pinch.normalizedDistance < 0.08;
    pinchDistVal.textContent = pinch.normalizedDistance.toFixed(2);
    pinchStateVal.textContent = isPinch ? 'PINCHING (ACTIVE)' : 'OPEN (RELEASED)';
    pinchStateVal.style.color = isPinch ? '#22c55e' : '#f59e0b';

    palmFacingVal.textContent = normal.z < 0 ? 'FACING CAMERA' : 'FACING AWAY';
    fingersCountVal.textContent = `${fingers.count} / 5`;
    gestureNameVal.textContent = isPinch ? 'PINCH' : fingers.count === 5 ? 'OPEN PALM' : 'FINGER POSE';
    pinchPointVal.textContent = `(${pinch.contactScreenPoint.x.toFixed(2)}, ${pinch.contactScreenPoint.y.toFixed(2)})`;
  }
}
