import { CORE_VERSION, DesktopMouseBridge, GazeStabilizer2D, GazeDwellController, Vector2 } from '@cc68/core';
import {
  VISION_VERSION,
  VideoStreamManager,
  MockStreamGenerator,
  FaceLandmarkerService,
  HandLandmarkerService,
  EyeGeometry,
  EyeNoseGazeTracker,
  HandGeometry,
} from '@cc68/vision';

console.log(`EyeHand Web initialized with Core v${CORE_VERSION}, Vision v${VISION_VERSION}`);

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 1.5rem auto; padding: 2rem; background: #0f172a; border-radius: 12px; color: #f8fafc; border: 1px solid #1e293b; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);">
      <header style="margin-bottom: 1.5rem; text-align: center;">
        <h1 style="font-size: 2.2rem; margin: 0 0 0.5rem 0; color: #38bdf8; letter-spacing: -0.5px;">EyeHand (cc68)</h1>
        <p style="color: #94a3b8; margin: 0; font-size: 1rem;">Dedicated Windows Custom Cursor & Multimodal Gaze/Hand Controller</p>
        <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
          <span style="background: #1e293b; padding: 3px 10px; border-radius: 6px; font-size: 0.8rem; color: #38bdf8;">Core v${CORE_VERSION}</span>
          <span style="background: #1e293b; padding: 3px 10px; border-radius: 6px; font-size: 0.8rem; color: #4ade80;">Vision v${VISION_VERSION}</span>
          <span id="bridge-status-badge" style="background: #1e293b; padding: 3px 10px; border-radius: 6px; font-size: 0.8rem; color: #f59e0b; border: 1px solid #334155;">Connecting to System Tray Bridge...</span>
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1fr; gap: 1.25rem;">
        <!-- Windows Native Mouse & Custom Cursor Controller -->
        <div style="background: #020617; border-radius: 8px; padding: 1.25rem; border: 1px solid #1e293b;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.2rem;">🎯</span>
              <h2 style="font-size: 1.1rem; margin: 0; color: #f8fafc;">Windows Custom Cursor & Input Bridge</h2>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <span id="overlay-status-badge" style="font-size: 0.8rem; color: #4ade80; background: #064e3b; padding: 2px 8px; border-radius: 4px; border: 1px solid #059669;">Custom Cursor Active</span>
              <span id="screen-res-badge" style="font-size: 0.8rem; color: #64748b; background: #0f172a; padding: 2px 8px; border-radius: 4px;">Detecting Screen...</span>
            </div>
          </div>
          
          <!-- Mode Toggles -->
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; margin-bottom: 0.75rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: #1e293b; padding: 8px 14px; border-radius: 6px; font-size: 0.85rem; color: #38bdf8; font-weight: 600; border: 1px solid #334155; user-select: none;">
              <input type="checkbox" id="chk-custom-cursor" checked style="cursor: pointer; width: 18px; height: 18px; accent-color: #38bdf8;" />
              <span>Show Custom Windows Cursor Overlay</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: #1e293b; padding: 8px 14px; border-radius: 6px; font-size: 0.85rem; color: #94a3b8; font-weight: 500; border: 1px solid #334155; user-select: none;">
              <input type="checkbox" id="chk-sync-real-mouse" style="cursor: pointer; width: 18px; height: 18px; accent-color: #38bdf8;" />
              <span>Sync Real OS Mouse Pointer</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; background: #1e293b; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; color: #f8fafc; border: 1px solid #334155;">
              <span style="color: #94a3b8;">Gaze Mode:</span>
              <select id="sel-gaze-mode" style="background: #0f172a; color: #38bdf8; border: 1px solid #334155; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; font-weight: 600;">
                <option value="live" selected>Live Smooth Follow (Real-time)</option>
                <option value="dwell">1-Second Stare Dwell Lock</option>
              </select>
            </label>
          </div>

          <!-- Style & Size Controls -->
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; padding-top: 0.5rem; border-top: 1px solid #1e293b;">
            <span style="font-size: 0.8rem; color: #94a3b8;">Cursor Style:</span>
            <select id="sel-cursor-style" style="background: #1e293b; color: #f8fafc; border: 1px solid #334155; padding: 5px 10px; border-radius: 5px; font-size: 0.85rem; cursor: pointer;">
              <option value="figma" selected>Normal Figma Cursor</option>
              <option value="reticle">Spatial Hologram Reticle</option>
              <option value="dot">Precision Laser Dot</option>
              <option value="crosshair">Tactical Crosshair</option>
            </select>

            <span style="font-size: 0.8rem; color: #94a3b8; margin-left: 0.5rem;">Size:</span>
            <div style="display: flex; gap: 0.25rem;">
              <button class="btn-sz" data-sz="48" style="background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Small</button>
              <button class="btn-sz" data-sz="68" style="background: #0284c7; color: white; border: 1px solid #38bdf8; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; font-weight: bold;">Medium</button>
              <button class="btn-sz" data-sz="96" style="background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Large</button>
            </div>

            <div style="margin-left: auto; display: flex; gap: 0.5rem;">
              <button id="btn-test-cursor" style="background: #334155; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-size: 0.8rem;">
                Center Cursor
              </button>
              <button id="btn-test-click" style="background: #334155; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-size: 0.8rem;">
                Test Click
              </button>
            </div>
          </div>

          <div id="bridge-helper-note" style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.6rem;">
            💡 <em>Your custom cursor floats transparently on top of all Windows apps without stealing focus. Pinching triggers physical clicks at its exact location!</em>
          </div>
        </div>

        <!-- Camera Stream Controller & Viewport -->
        <div style="background: #020617; border-radius: 8px; padding: 1.25rem; border: 1px solid #1e293b;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h2 style="font-size: 1.1rem; margin: 0;">Camera Stream & Vision Viewport</h2>
            <span id="stream-status" style="padding: 2px 10px; border-radius: 9999px; font-size: 0.75rem; background: #16a34a; color: #bbf7d0; font-weight: 600;">ACTIVE IN BACKGROUND</span>
          </div>

          <div id="viewport-container" style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 1px solid #334155;">
            <video id="camera-preview" style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); display: none;"></video>
            <canvas id="sim-canvas" style="width: 100%; height: 100%; display: none;"></canvas>
            <div id="video-placeholder" style="color: #64748b; font-size: 0.95rem; text-align: center; line-height: 1.6;">
              Eye tracking engine is active in the background.<br/>
              Your separate custom cursor is floating on Windows desktop.
            </div>
            
            <!-- Real-time Visual Gaze Reticle in Viewport -->
            <div id="gaze-reticle" style="position: absolute; width: 32px; height: 32px; border: 2.5px solid #38bdf8; border-radius: 50%; pointer-events: none; transform: translate(-50%, -50%); display: none; box-shadow: 0 0 14px rgba(56, 189, 248, 0.7); z-index: 20; transition: border-color 0.1s, transform 0.05s ease-out;">
              <div style="position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; background: #38bdf8; border-radius: 50%; transform: translate(-50%, -50%);"></div>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap;">
            <button id="btn-start-camera" style="background: #0284c7; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">
              Restart Webcam
            </button>
            <button id="btn-start-sim" style="background: #0d9488; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">
              Run Simulator
            </button>
            <button id="btn-stop" style="background: #ef4444; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">
              Pause Tracking
            </button>
          </div>
        </div>

        <!-- Eye & Nose Tracking Telemetry -->
        <div style="background: #020617; border-radius: 8px; padding: 1.25rem; border: 1px solid #1e293b;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h2 style="font-size: 1.1rem; margin: 0;">Eye & Nose Gaze Telemetry</h2>
            <button id="btn-recenter-nose" style="background: #1e293b; color: #38bdf8; border: 1px solid #334155; padding: 3px 10px; border-radius: 5px; font-size: 0.75rem; cursor: pointer;">
              🎯 Recenter Nose Anchor
            </button>
          </div>
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
              <div style="font-size: 0.75rem; color: #94a3b8;">BINOCULAR IRIS GAZE</div>
              <div id="val-iris-offset" style="font-size: 1.1rem; font-family: monospace; color: #a78bfa;">(0.00, 0.00)</div>
              <div style="font-size: 0.75rem; color: #64748b;">Normalized [-1, 1]</div>
            </div>
            <div style="background: #0f172a; padding: 0.75rem; border-radius: 6px; border: 1px solid #334155;">
              <div style="font-size: 0.75rem; color: #94a3b8;">NOSE TIP (X, Y)</div>
              <div id="val-nose-pos" style="font-size: 1.1rem; font-family: monospace; color: #f59e0b;">(0.50, 0.50)</div>
              <div id="val-nose-anchor" style="font-size: 0.75rem; color: #4ade80;">ANCHOR: CALIBRATED</div>
            </div>
          </div>
          <!-- Screen Coverage Reach Selector -->
          <div style="display: flex; gap: 0.75rem; align-items: center; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #1e293b; flex-wrap: wrap;">
            <span style="font-size: 0.8rem; color: #94a3b8;">Screen Coverage Reach:</span>
            <div style="display: flex; gap: 0.25rem;">
              <button class="btn-range" data-gain="1.25" style="background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Relaxed (1.25x)</button>
              <button class="btn-range" data-gain="1.65" style="background: #0284c7; color: white; border: 1px solid #38bdf8; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; font-weight: bold;">Full Screen (1.65x)</button>
              <button class="btn-range" data-gain="2.20" style="background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Maximum Reach (2.20x)</button>
            </div>
            <span style="font-size: 0.75rem; color: #64748b; margin-left: auto;">Effortlessly reaches all 4 borders &amp; corners of your display</span>
          </div>
        </div>

        <!-- 3D Hand Pose & Pinch Telemetry -->
        <div style="background: #020617; border-radius: 8px; padding: 1.25rem; border: 1px solid #1e293b;">
          <h2 style="font-size: 1.1rem; margin: 0 0 0.75rem 0;">3D Hand Pose & Pinch Telemetry</h2>
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
          Initializing background tracking engine...
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
  const overlayBadge = document.getElementById('overlay-status-badge') as HTMLSpanElement;
  const logEl = document.getElementById('camera-log') as HTMLDivElement;

  const chkCustomCursor = document.getElementById('chk-custom-cursor') as HTMLInputElement;
  const chkSyncRealMouse = document.getElementById('chk-sync-real-mouse') as HTMLInputElement;
  const selCursorStyle = document.getElementById('sel-cursor-style') as HTMLSelectElement;
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
  const nosePosVal = document.getElementById('val-nose-pos') as HTMLDivElement;
  const noseAnchorVal = document.getElementById('val-nose-anchor') as HTMLDivElement;
  const btnRecenterNose = document.getElementById('btn-recenter-nose') as HTMLButtonElement;

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
  const eyeNoseTracker = new EyeNoseGazeTracker();

  if (btnRecenterNose) {
    btnRecenterNose.addEventListener('click', () => {
      eyeNoseTracker.calibrate();
      noseAnchorVal.textContent = 'ANCHOR: RECENTERING...';
      noseAnchorVal.style.color = '#f59e0b';
      log('Nose anchor re-centered. Next frame will set new resting center.');
    });
  }

  // Fixation-Lock GazeStabilizer: eliminates ocular tremor and sensor noise
  const gazeStabilizer = new GazeStabilizer2D({
    deadzoneRadiusPixels: 35,
    releaseThresholdPixels: 55,
    fixationVelocityThreshold: 180,
    settleDurationMs: 90,
    oneEuroMinCutoff: 0.5,
    oneEuroBeta: 0.018,
  });

  // 1-Second Stare Dwell Controller:
  // "move the cursor when user sees a specific position and stares at it for 1 sec, until then don't move"
  const dwellController = new GazeDwellController({
    stareDurationMs: 1000, // 1.0 second
    stareRadiusPixels: 120,
    minTargetDistancePixels: 45,
  });

  let initialCursorDispatched = false;
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

  // Update in-viewport visual reticle
  const updateReticle = (normX: number, normY: number, isPinch: boolean, dwellProgress: number) => {
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
    } else if (dwellProgress > 0.05) {
      // Staring at candidate position: charging progress ring up to 1 second
      gazeReticle.style.borderColor = '#f59e0b';
      gazeReticle.style.boxShadow = `0 0 ${12 + dwellProgress * 12}px rgba(245, 158, 11, 0.8)`;
      gazeReticle.style.transform = `translate(-50%, -50%) scale(${1.0 + dwellProgress * 0.25})`;
    } else {
      gazeReticle.style.borderColor = '#38bdf8';
      gazeReticle.style.boxShadow = '0 0 14px rgba(56, 189, 248, 0.7)';
      gazeReticle.style.transform = 'translate(-50%, -50%) scale(1.0)';
    }
  };

  const selGazeMode = document.getElementById('sel-gaze-mode') as HTMLSelectElement;

  // Dispatch coordinates to OS-level Custom Windows Cursor Overlay & Win32 bridge
  const dispatchLivePointer = async (normX: number, normY: number, isPinch: boolean, timestamp: number) => {
    const clampedX = Math.max(0, Math.min(1, normX));
    const clampedY = Math.max(0, Math.min(1, normY));

    const rawTargetX = clampedX * screenDims.width;
    const rawTargetY = clampedY * screenDims.height;

    // 1. Stabilize raw gaze with Fixation-Lock
    const stabilized = gazeStabilizer.filter(new Vector2(rawTargetX, rawTargetY), timestamp);

    const isLiveMode = !selGazeMode || selGazeMode.value === 'live';

    let activeCursor = stabilized.point;
    let dwellProgress = 0.0;
    let shouldMove = true;

    if (!isLiveMode) {
      // 2. Feed to 1-Second Stare Dwell Controller:
      const dwell = dwellController.update(stabilized.point, timestamp);
      activeCursor = dwell.cursorPosition;
      dwellProgress = dwell.dwellProgress;
      shouldMove = dwell.hasMoved || !initialCursorDispatched || dwellProgress > 0.02;
    }

    // Visual feedback in viewport
    updateReticle(activeCursor.x / screenDims.width, activeCursor.y / screenDims.height, isPinch, dwellProgress);

    if (isConnectedToNative) {
      if (shouldMove) {
        if (!isDispatchingMove) {
          isDispatchingMove = true;
          const syncOs = chkSyncRealMouse ? chkSyncRealMouse.checked : false;
          mouseBridge
            .moveCursor(activeCursor.x, activeCursor.y, { pinch: isPinch, syncOs, progress: dwellProgress })
            .finally(() => {
              isDispatchingMove = false;
            });
          initialCursorDispatched = true;
        }
      }

      // Handle pinch click / drag state transitions at current cursor position
      if (isPinch && !lastPinchState) {
        mouseBridge.mouseDown();
        log('Pinch DOWN dispatched to Windows.');
      } else if (!isPinch && lastPinchState) {
        mouseBridge.mouseUp();
        log('Pinch UP dispatched to Windows.');
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
          if (dim.customCursorActive !== undefined) {
            overlayBadge.textContent = dim.customCursorActive ? 'Custom Cursor Active' : 'Custom Cursor Hidden';
            overlayBadge.style.backgroundColor = dim.customCursorActive ? '#064e3b' : '#334155';
          }
        }
        log('Connected to EyeHand.exe Win32 engine in System Tray.');
      } else {
        bridgeBadge.textContent = 'Web Sandbox Mode (EyeHand.exe not detected)';
        bridgeBadge.style.color = '#94a3b8';
        bridgeBadge.style.borderColor = '#334155';
        screenBadge.textContent = `Browser Viewport: ${window.innerWidth}x${window.innerHeight}px`;
        overlayBadge.textContent = 'Custom Cursor Offline';
        overlayBadge.style.backgroundColor = '#334155';
      }
    }
  };

  checkBridge();
  setInterval(checkBridge, 2000);

  // Toggle Custom Cursor Overlay Visibility
  chkCustomCursor.addEventListener('change', async () => {
    const vis = await mouseBridge.setCustomCursorVisible(chkCustomCursor.checked);
    overlayBadge.textContent = vis ? 'Custom Cursor Active' : 'Custom Cursor Hidden';
    overlayBadge.style.backgroundColor = vis ? '#064e3b' : '#334155';
    log(`Custom Windows Cursor visibility set to ${vis}.`);
  });

  // Change Cursor Style
  selCursorStyle.addEventListener('change', async () => {
    const style = selCursorStyle.value as 'figma' | 'reticle' | 'dot' | 'crosshair';
    await mouseBridge.configureCustomCursor({ style });
    log(`Custom cursor style changed to: ${style}`);
  });

  // Change Cursor Size
  document.querySelectorAll('.btn-sz').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      document.querySelectorAll('.btn-sz').forEach((b) => {
        (b as HTMLElement).style.background = '#1e293b';
        (b as HTMLElement).style.color = '#cbd5e1';
        (b as HTMLElement).style.borderColor = '#334155';
        (b as HTMLElement).style.fontWeight = 'normal';
      });
      const target = e.currentTarget as HTMLElement;
      target.style.background = '#0284c7';
      target.style.color = 'white';
      target.style.borderColor = '#38bdf8';
      target.style.fontWeight = 'bold';

      const sz = parseInt(target.getAttribute('data-sz') || '68', 10);
      await mouseBridge.configureCustomCursor({ size: sz });
      log(`Custom cursor size changed to: ${sz}px`);
    });
  });

  // Screen Coverage Reach Buttons
  document.querySelectorAll('.btn-range').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-range').forEach((b) => {
        (b as HTMLElement).style.background = '#1e293b';
        (b as HTMLElement).style.color = '#cbd5e1';
        (b as HTMLElement).style.borderColor = '#334155';
        (b as HTMLElement).style.fontWeight = 'normal';
      });
      const target = e.currentTarget as HTMLElement;
      target.style.background = '#0284c7';
      target.style.color = 'white';
      target.style.borderColor = '#38bdf8';
      target.style.fontWeight = 'bold';

      const gain = parseFloat(target.getAttribute('data-gain') || '1.65');
      eyeNoseTracker.setRangeGain(gain);
      log(`Screen coverage gain set to ${gain}x (Full display reach).`);
    });
  });

  btnTestCursor.addEventListener('click', async () => {
    const cx = screenDims.width / 2;
    const cy = screenDims.height / 2;
    await mouseBridge.moveCursor(cx, cy, { syncOs: chkSyncRealMouse.checked });
    log(`Dispatched Custom Cursor move to center (${cx}, ${cy}).`);
  });

  btnTestClick.addEventListener('click', async () => {
    await mouseBridge.click('left');
    log('Dispatched OS left click event at Custom Cursor position.');
  });

  // Start Real WebCam & MediaPipe Tracking Pipeline
  async function startWebcamPipeline() {
    try {
      log('Starting camera & initializing Face + Hand Landmarkers...');
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
      log('Eye & hand tracking active at 60 FPS.');

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

          // 2. Eye & Nose tracking gaze estimation (ignores head pose; suppresses head tremor)
          const faceSummary = faceLandmarker.processVideoFrame(videoElement, now);
          if (faceSummary) {
            updateFaceTelemetry(faceSummary);
            const gaze = eyeNoseTracker.estimateGaze(faceSummary);
            dispatchLivePointer(gaze.screenPointNorm.x, gaze.screenPointNorm.y, currentPinch, now);
          }
        }
        procTimer = requestAnimationFrame(processLoop);
      };
      procTimer = requestAnimationFrame(processLoop);
    } catch (err: any) {
      log(`Camera not available (${err.message}). Starting simulator fallback.`);
      startSimPipeline();
    }
  }

  // Fallback / Standalone Synthetic Tracking Simulation
  function startSimPipeline() {
    if (simTimer !== null) return;
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
      nosePosVal.textContent = `(${(0.5 + normX * 0.1).toFixed(2)}, ${(0.5 + normY * 0.1).toFixed(2)})`;
      noseAnchorVal.textContent = 'ANCHOR: CALIBRATED';
      noseAnchorVal.style.color = '#4ade80';

      const pinchDist = isPinch ? 0.03 : 0.45;
      pinchDistVal.textContent = pinchDist.toFixed(2);
      pinchStateVal.textContent = isPinch ? 'PINCHING (ACTIVE)' : 'OPEN (RELEASED)';
      pinchStateVal.style.color = isPinch ? '#22c55e' : '#f59e0b';
      palmFacingVal.textContent = 'FACING CAMERA';
      fingersCountVal.textContent = isPinch ? '3 / 5' : '5 / 5';
      gestureNameVal.textContent = isPinch ? 'PINCH' : 'OPEN PALM';
      pinchPointVal.textContent = `(${handX.toFixed(2)}, ${handY.toFixed(2)})`;

      dispatchLivePointer(eyeX, eyeY, isPinch, performance.now());

      simTimer = requestAnimationFrame(tick);
    };
    simTimer = requestAnimationFrame(tick);
    log('Synthetic 60 FPS generator active.');
  }

  btnStartCamera.addEventListener('click', () => {
    if (simTimer !== null) {
      cancelAnimationFrame(simTimer);
      simTimer = null;
    }
    startWebcamPipeline();
  });

  btnStartSim.addEventListener('click', () => {
    cameraManager.stop();
    faceLandmarker.close();
    handLandmarker.close();
    if (procTimer !== null) {
      cancelAnimationFrame(procTimer);
      procTimer = null;
    }
    startSimPipeline();
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
    gazeStabilizer.reset();
    dwellController.reset();
    eyeNoseTracker.reset();

    videoElement.style.display = 'none';
    simCanvas.style.display = 'none';
    placeholder.style.display = 'block';
    btnStop.style.display = 'none';
    btnStartCamera.style.display = 'inline-block';
    btnStartSim.style.display = 'inline-block';

    setStatus('PAUSED', '#334155', '#94a3b8');
    log('Tracking paused.');
  });

  function updateFaceTelemetry(summary: any) {
    const gaze = eyeNoseTracker.estimateGaze(summary);
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

    irisOffsetVal.textContent = `(${gaze.eyeGazeOffset.x.toFixed(2)}, ${gaze.eyeGazeOffset.y.toFixed(2)})`;
    nosePosVal.textContent = `(${gaze.nosePosition.x.toFixed(2)}, ${gaze.nosePosition.y.toFixed(2)})`;
    if (gaze.isCalibrated) {
      noseAnchorVal.textContent = 'ANCHOR: CALIBRATED';
      noseAnchorVal.style.color = '#4ade80';
    } else {
      noseAnchorVal.textContent = 'ANCHOR: CALIBRATING...';
      noseAnchorVal.style.color = '#f59e0b';
    }
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

  // AUTO-START on launch: Runs immediately in the background without needing user clicks
  startWebcamPipeline();
}
