import { CORE_VERSION, DesktopMouseBridge, OneEuroFilter2D, Vector2 } from '@cc68/core';
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
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 1.5rem auto; padding: 2rem; background: #0f172a; border-radius: 12px; color: #f8fafc; border: 1px solid #1e293b; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);">
      <header style="margin-bottom: 1.5rem; text-align: center;">
        <h1 style="font-size: 2.2rem; margin: 0 0 0.5rem 0; color: #38bdf8; letter-spacing: -0.5px;">EyeHand (cc68)</h1>
        <p style="color: #94a3b8; margin: 0; font-size: 1rem;">Multimodal Gaze & 3D Hand Tracking Windows Desktop Controller</p>
        <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
          <span style="background: #1e293b; padding: 3px 10px; border-radius: 6px; font-size: 0.8rem; color: #38bdf8;">Core v${CORE_VERSION}</span>
          <span style="background: #1e293b; padding: 3px 10px; border-radius: 6px; font-size: 0.8rem; color: #4ade80;">Vision v${VISION_VERSION}</span>
          <span id="bridge-status-badge" style="background: #1e293b; padding: 3px 10px; border-radius: 6px; font-size: 0.8rem; color: #f59e0b; border: 1px solid #334155;">Connecting to System Tray Bridge...</span>
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1fr; gap: 1.25rem;">
        <!-- Windows Native Mouse Injection Controller -->
        <div style="background: #020617; border-radius: 8px; padding: 1.25rem; border: 1px solid #1e293b;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.2rem;">🖱️</span>
              <h2 style="font-size: 1.1rem; margin: 0; color: #f8fafc;">Windows OS Mouse Cursor Control</h2>
            </div>
            <span id="screen-res-badge" style="font-size: 0.8rem; color: #64748b; background: #0f172a; padding: 2px 8px; border-radius: 4px;">Detecting Screen...</span>
          </div>
          
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; margin-bottom: 0.5rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: #1e293b; padding: 8px 14px; border-radius: 6px; font-size: 0.9rem; color: #38bdf8; font-weight: 600; border: 1px solid #334155; user-select: none;">
              <input type="checkbox" id="chk-live-cursor" style="cursor: pointer; width: 18px; height: 18px; accent-color: #38bdf8;" />
              <span>Enable Live OS Cursor Control</span>
            </label>
            <button id="btn-test-cursor" style="background: #334155; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500;">
              Center Cursor
            </button>
            <button id="btn-test-click" style="background: #334155; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500;">
              Test Left Click
            </button>
          </div>
          <div id="bridge-helper-note" style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.5rem;">
            💡 <em>When EyeHand.exe runs, it docks into your Windows System Tray (notification overflow menu) and enables OS-level cursor driving.</em>
          </div>
        </div>

        <!-- Camera Stream Controller & Viewport -->
        <div style="background: #020617; border-radius: 8px; padding: 1.25rem; border: 1px solid #1e293b;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h2 style="font-size: 1.1rem; margin: 0;">Camera Stream & Vision Viewport</h2>
            <span id="stream-status" style="padding: 2px 10px; border-radius: 9999px; font-size: 0.75rem; background: #334155; color: #94a3b8; font-weight: 600;">DISCONNECTED</span>
          </div>

          <div id="viewport-container" style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 1px solid #334155;">
            <video id="camera-preview" style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); display: none;"></video>
            <canvas id="sim-canvas" style="width: 100%; height: 100%; display: none;"></canvas>
            <div id="video-placeholder" style="color: #64748b; font-size: 0.95rem; text-align: center; line-height: 1.6;">
              Camera stream is inactive.<br/>
              Click <strong style="color: #38bdf8;">"Start Webcam"</strong> to use your real camera, or <strong style="color: #0d9488;">"Start Simulator"</strong> to test hands-free.
            </div>
            
            <!-- Real-time Visual Gaze Reticle -->
            <div id="gaze-reticle" style="position: absolute; width: 32px; height: 32px; border: 2.5px solid #38bdf8; border-radius: 50%; pointer-events: none; transform: translate(-50%, -50%); display: none; box-shadow: 0 0 14px rgba(56, 189, 248, 0.7); z-index: 20; transition: border-color 0.1s, transform 0.05s ease-out;">
              <div style="position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; background: #38bdf8; border-radius: 50%; transform: translate(-50%, -50%);"></div>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap;">
            <button id="btn-start-camera" style="background: #0284c7; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">
              Start Webcam
            </button>
            <button id="btn-start-sim" style="background: #0d9488; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">
              Start Simulator
            </button>
            <button id="btn-stop" style="background: #ef4444; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem; display: none;">
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

        <div id="camera-log" style="padding: 0.75rem 1rem; background: #020617; border-radius: 6px; font-family: monospace; font-size: 0.85rem; color: #94a3b8; border: 1px solid #1e293b; min-height: 24px;">
          Ready.
        </div>
      </div>
    </div>
  `;

  const videoElement = document.getElementById('camera-preview') as HTMLVideoElement;
  const simCanvas = document.getElementById('sim-canvas') as HTMLCanvasElement;
  const placeholder = document.getElementById('video-placeholder') as HTMLDivElement;
  const viewportContainer = document.getElementById('viewport-container') as HTMLDivElement;
  const gazeReticle = document.getElementById('gaze-reticle') as HTMLDivElement;

  const statusBadge = document.getElementById('stream-status') as HTMLSpanElement;
  const bridgeBadge = document.getElementById('bridge-status-badge') as HTMLSpanElement;
  const screenBadge = document.getElementById('screen-res-badge') as HTMLSpanElement;
  const logEl = document.getElementById('camera-log') as HTMLDivElement;

  const chkLiveCursor = document.getElementById('chk-live-cursor') as HTMLInputElement;
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

  // One-Euro adaptive filter for jitter-free cursor movements
  const cursorFilter = new OneEuroFilter2D({ minCutoff: 1.2, beta: 0.015, dCutoff: 1.0 });

  let simTimer: number | null = null;
  let procTimer: number | null = null;
  let isConnectedToNative = false;
  let screenDims = { width: window.innerWidth, height: window.innerHeight };
  let isDispatchingMove = false;
  let lastPinchState = false;

  const log = (msg: string) => {
    logEl.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  };

  const setStatus = (text: string, colorBg: string, colorText: string) => {
    statusBadge.textContent = text;
    statusBadge.style.backgroundColor = colorBg;
    statusBadge.style.color = colorText;
  };

  // Update on-screen visual reticle inside viewport
  const updateReticle = (normX: number, normY: number, isPinch: boolean) => {
    if (!gazeReticle || !viewportContainer) return;
    gazeReticle.style.display = 'block';
    const rect = viewportContainer.getBoundingClientRect();
    const px = normX * rect.width;
    const py = normY * rect.height;
    gazeReticle.style.left = `${px}px`;
    gazeReticle.style.top = `${py}px`;

    if (isPinch) {
      gazeReticle.style.borderColor = '#4ade80';
      gazeReticle.style.boxShadow = '0 0 16px rgba(74, 222, 128, 0.9)';
      gazeReticle.style.transform = 'translate(-50%, -50%) scale(0.85)';
    } else {
      gazeReticle.style.borderColor = '#38bdf8';
      gazeReticle.style.boxShadow = '0 0 14px rgba(56, 189, 248, 0.7)';
      gazeReticle.style.transform = 'translate(-50%, -50%) scale(1.0)';
    }
  };

  // Dispatch coordinates to OS-level mouse cursor via Win32 bridge
  const dispatchLivePointer = async (normX: number, normY: number, isPinch: boolean, timestamp: number) => {
    // Clamp to valid [0, 1] bounds
    const clampedX = Math.max(0, Math.min(1, normX));
    const clampedY = Math.max(0, Math.min(1, normY));

    // Update the visual viewport reticle
    updateReticle(clampedX, clampedY, isPinch);

    // If live cursor is enabled and EyeHand.exe Win32 bridge is active, drive OS cursor
    if (chkLiveCursor && chkLiveCursor.checked && isConnectedToNative) {
      const rawTargetX = clampedX * screenDims.width;
      const rawTargetY = clampedY * screenDims.height;
      const filtered = cursorFilter.filter(new Vector2(rawTargetX, rawTargetY), timestamp);

      if (!isDispatchingMove) {
        isDispatchingMove = true;
        mouseBridge.moveCursor(filtered.x, filtered.y).finally(() => {
          isDispatchingMove = false;
        });
      }

      // Handle pinch click / drag state transitions
      if (isPinch && !lastPinchState) {
        mouseBridge.mouseDown();
        log('Pinch DOWN dispatched to Windows OS.');
      } else if (!isPinch && lastPinchState) {
        mouseBridge.mouseUp();
        log('Pinch UP dispatched to Windows OS.');
      }
    }

    lastPinchState = isPinch;
  };

  // Poll desktop bridge availability to detect EyeHand.exe launch
  const checkBridge = async () => {
    const avail = await mouseBridge.checkAvailability();
    if (avail !== isConnectedToNative) {
      isConnectedToNative = avail;
      if (avail) {
        bridgeBadge.textContent = 'Native Desktop .EXE: CONNECTED';
        bridgeBadge.style.color = '#4ade80';
        bridgeBadge.style.borderColor = '#22c55e';
        const dim = await mouseBridge.getScreenDimensions();
        if (dim) {
          screenDims = dim;
          screenBadge.textContent = `Windows Display: ${dim.width}x${dim.height}px`;
        }
        log('Connected to EyeHand.exe Win32 desktop mouse engine in System Tray.');
      } else {
        bridgeBadge.textContent = 'Web Sandbox Mode (EyeHand.exe not detected)';
        bridgeBadge.style.color = '#94a3b8';
        bridgeBadge.style.borderColor = '#334155';
        screenBadge.textContent = `Browser Viewport: ${window.innerWidth}x${window.innerHeight}px`;
      }
    }
  };

  checkBridge();
  setInterval(checkBridge, 2000);

  btnTestCursor.addEventListener('click', async () => {
    const cx = screenDims.width / 2;
    const cy = screenDims.height / 2;
    await mouseBridge.moveCursor(cx, cy);
    log(`Dispatched OS cursor move to center (${cx}, ${cy}).`);
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

      let currentPinch = false;

      const processLoop = () => {
        if (cameraManager.isStreaming()) {
          const now = performance.now();

          // 1. Hand tracking & pinch detection
          const hands = handLandmarker.processVideoFrame(videoElement, now);
          if (hands && hands.length > 0) {
            updateHandTelemetry(hands[0]);
            const pinch = HandGeometry.calculatePinch(hands[0].landmarks);
            currentPinch = pinch.normalizedDistance < 0.08;
          } else {
            currentPinch = false;
          }

          // 2. Face tracking & iris gaze estimation
          const faceSummary = faceLandmarker.processVideoFrame(videoElement, now);
          if (faceSummary) {
            updateFaceTelemetry(faceSummary);
            // Normalized iris displacement [-1, 1] mapped to normalized screen [0, 1]
            // Note: Camera feed is mirrored, so horizontal displacement is inverted for screen mapping
            const irisOffset = EyeGeometry.calculateNormalizedIrisOffset(faceSummary.leftEye);
            const normX = 0.5 - irisOffset.x * 0.75;
            const normY = 0.5 + irisOffset.y * 0.75;
            dispatchLivePointer(normX, normY, currentPinch, now);
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

      // Dispatch live pointer to drive reticle and OS mouse cursor
      dispatchLivePointer(eyeX, eyeY, isPinch, performance.now());

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

    if (gazeReticle) gazeReticle.style.display = 'none';
    cursorFilter.reset();

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
