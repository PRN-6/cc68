import { CORE_VERSION } from '@cc68/core';

console.log(`EyeHand Web initialized with Core v${CORE_VERSION}`);
const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <div style="font-family: sans-serif; padding: 2rem; text-align: center;">
      <h1>EyeHand (cc68)</h1>
      <p>High-Performance Multimodal Gaze & Hand Tracking Interaction Platform</p>
      <p>Foundation Initialized (Core v${CORE_VERSION})</p>
    </div>
  `;
}
