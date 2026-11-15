export interface ScreenDimensions {
  width: number;
  height: number;
}

/**
 * Client interface for the EyeHand Native Windows Desktop Executable (`EyeHand.exe`).
 * Communicates with the local Win32 input injection bridge to control the OS-level mouse cursor.
 */
export class DesktopMouseBridge {
  private isAvailable: boolean | null = null;
  private cachedScreen: ScreenDimensions | null = null;

  constructor(private baseUrl: string = 'http://localhost:6868/api') {}

  /**
   * Check if the native Windows desktop bridge is running.
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/screen`, { method: 'GET' });
      if (res.ok) {
        this.cachedScreen = await res.json();
        this.isAvailable = true;
        return true;
      }
    } catch {
      this.isAvailable = false;
    }
    return false;
  }

  /**
   * Move the Windows system cursor to screen coordinates (X, Y).
   */
  async moveCursor(x: number, y: number): Promise<void> {
    if (this.isAvailable === false) return;
    try {
      await fetch(`${this.baseUrl}/mouse/move?x=${Math.round(x)}&y=${Math.round(y)}`, {
        method: 'GET',
      });
    } catch (err) {
      this.isAvailable = false;
    }
  }

  /**
   * Trigger an OS-level mouse click.
   */
  async click(button: 'left' | 'right' = 'left'): Promise<void> {
    if (this.isAvailable === false) return;
    try {
      await fetch(`${this.baseUrl}/mouse/click?button=${button}`, { method: 'GET' });
    } catch (err) {
      this.isAvailable = false;
    }
  }

  /**
   * Trigger an OS-level mouse button down (e.g. during pinch start).
   */
  async mouseDown(): Promise<void> {
    if (this.isAvailable === false) return;
    try {
      await fetch(`${this.baseUrl}/mouse/down`, { method: 'GET' });
    } catch (err) {
      this.isAvailable = false;
    }
  }

  /**
   * Trigger an OS-level mouse button up (e.g. during pinch release).
   */
  async mouseUp(): Promise<void> {
    if (this.isAvailable === false) return;
    try {
      await fetch(`${this.baseUrl}/mouse/up`, { method: 'GET' });
    } catch (err) {
      this.isAvailable = false;
    }
  }

  /**
   * Get primary screen dimensions from Windows.
   */
  async getScreenDimensions(): Promise<ScreenDimensions | null> {
    if (this.cachedScreen) return this.cachedScreen;
    if (await this.checkAvailability()) {
      return this.cachedScreen;
    }
    return null;
  }

  isConnected(): boolean {
    return this.isAvailable === true;
  }
}
