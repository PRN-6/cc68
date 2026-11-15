import { CORE_VERSION, DesktopMouseBridge } from '@cc68/core';
import { VISION_VERSION, VideoStreamManager, MockStreamGenerator } from '@cc68/vision';

console.log(`EyeHand Web initialized with Core v${CORE_VERSION}, Vision v${VISION_VERSION}`);

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 840px; margin: 2rem auto; padding: 2rem; background: #0f172a; border-radius: 12px; color: #f8fafc; border: 1px solid #1e293b;">
      <header style="margin-bottom: 2rem; text-align: center;">
        <h1 style="font-size: 2rem; margin: 0 0 0.5rem 0; color: #38bdf8;">EyeHand (cc68)</h1>
        <p style="color: #94a3b8; margin: 0;">Multimodal Gaze & Hand Desktop Executable Application</p>
        <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
          <span style="background: #1e293b; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: #38bdf8;">Core v${CORE_VERSION}</span>
          <span style="background: #1e293b; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: #4ade80;">Vision v${VISION_VERSION}</span>
          <span id="bridge-status-badge" style="background: #1e293b; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: #f59e0b;">Checking Native Desktop Bridge...</span>
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem;">
        <!-- Camera Stream Controller -->
        <div style="background: #020617; border-radius: 8px; padding: 1.25rem; border: 1px solid #1e293b;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h2 style="font-size: 1.1rem; margin: 0;">Camera Stream Controller</h2>
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

        <!-- Windows Native Mouse Injection Controller -->
        <div style="background: #020617; border-radius: 8px; padding: 1.25rem; border: 1px solid #1e293b;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h2 style="font-size: 1.1rem; margin: 0;">Windows OS Mouse Injection (EyeHand.exe)</h2>
            <span id="screen-res-badge" style="font-size: 0.8rem; color: #64748b;">Screen: Detecting...</span>
          </div>
          <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 0; margin-bottom: 1rem;">
            When launched via <code style="color: #38bdf8;">EyeHand.exe</code>, this bridge can move and click the actual Windows desktop mouse pointer outside the browser window.
          </p>

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

  const cameraManager = new VideoStreamManager({ width: 1280, height: 720, frameRate: 60 });
  const mockGenerator = new MockStreamGenerator({ width: 1280, height: 720 });
  const mouseBridge = new DesktopMouseBridge();

  let simTimer: number | null = null;

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
      log('Requesting camera permissions...');
      setStatus('CONNECTING', '#ca8a04', '#fef08a');
      await cameraManager.start();
      await cameraManager.attachTo(videoElement);

      videoElement.style.display = 'block';
      simCanvas.style.display = 'none';
      placeholder.style.display = 'none';
      btnStop.style.display = 'inline-block';
      btnStartCamera.style.display = 'none';
      btnStartSim.style.display = 'none';

      setStatus('STREAMING LIVE', '#16a34a', '#bbf7d0');
      log('WebCam stream active at 60 FPS.');
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

    const tick = () => {
      mockGenerator.renderSyntheticFrame();
      simTimer = requestAnimationFrame(tick);
    };
    simTimer = requestAnimationFrame(tick);
    log('Synthetic 60 FPS generator active.');
  });

  btnStop.addEventListener('click', () => {
    cameraManager.stop();
    if (simTimer !== null) {
      cancelAnimationFrame(simTimer);
      simTimer = null;
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
}
