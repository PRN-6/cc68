import { CORE_VERSION } from '@cc68/core';
import { VISION_VERSION, VideoStreamManager, MockStreamGenerator } from '@cc68/vision';

console.log(`EyeHand Web initialized with Core v${CORE_VERSION}, Vision v${VISION_VERSION}`);

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 2rem auto; padding: 2rem; background: #0f172a; border-radius: 12px; color: #f8fafc; border: 1px solid #1e293b;">
      <header style="margin-bottom: 2rem; text-align: center;">
        <h1 style="font-size: 2rem; margin: 0 0 0.5rem 0; color: #38bdf8;">EyeHand (cc68)</h1>
        <p style="color: #94a3b8; margin: 0;">Milestone M1 — Computer Vision & Sensor Pipeline</p>
        <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; justify-content: center;">
          <span style="background: #1e293b; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: #38bdf8;">Core v${CORE_VERSION}</span>
          <span style="background: #1e293b; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: #4ade80;">Vision v${VISION_VERSION}</span>
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem;">
        <div style="background: #020617; border-radius: 8px; padding: 1rem; border: 1px solid #1e293b;">
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

          <div id="camera-log" style="margin-top: 1rem; padding: 0.75rem; background: #0f172a; border-radius: 6px; font-family: monospace; font-size: 0.8rem; color: #94a3b8; min-height: 24px;">
            Ready.
          </div>
        </div>
      </div>
    </div>
  `;

  const videoElement = document.getElementById('camera-preview') as HTMLVideoElement;
  const simCanvas = document.getElementById('sim-canvas') as HTMLCanvasElement;
  const placeholder = document.getElementById('video-placeholder') as HTMLDivElement;
  const statusBadge = document.getElementById('stream-status') as HTMLSpanElement;
  const logEl = document.getElementById('camera-log') as HTMLDivElement;
  const btnStartCamera = document.getElementById('btn-start-camera') as HTMLButtonElement;
  const btnStartSim = document.getElementById('btn-start-sim') as HTMLButtonElement;
  const btnStop = document.getElementById('btn-stop') as HTMLButtonElement;

  const cameraManager = new VideoStreamManager({ width: 1280, height: 720, frameRate: 60 });
  const mockGenerator = new MockStreamGenerator({ width: 1280, height: 720 });

  let simTimer: number | null = null;

  const setStatus = (text: string, colorBg: string, colorText: string) => {
    statusBadge.textContent = text;
    statusBadge.style.backgroundColor = colorBg;
    statusBadge.style.color = colorText;
  };

  const log = (msg: string) => {
    logEl.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  };

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
