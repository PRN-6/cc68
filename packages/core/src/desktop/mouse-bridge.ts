export interface ScreenDimensions {
  width: number;
  height: number;
  trayActive?: boolean;
  customCursorActive?: boolean;
}

export interface CustomCursorMoveOptions {
  pinch?: boolean;
  syncOs?: boolean;
  progress?: number;
}

export interface CustomCursorConfig {
  size?: number;
  style?: 'reticle' | 'dot' | 'crosshair';
  color?: string;
}

/**
 * Client interface for the EyeHand Native Windows Desktop Executable (`EyeHand.exe`).
 * Communicates with the local Win32 input injection bridge to control the OS-level mouse
 * cursor and dedicated floating Windows Custom Cursor Overlay.
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
   * Move the Windows system cursor and/or dedicated Custom Cursor Overlay to screen coordinates (X, Y).
   */
  async moveCursor(x: number, y: number, options?: CustomCursorMoveOptions): Promise<void> {
    if (this.isAvailable === false) return;
    const pinch = options?.pinch ? '1' : '0';
    const syncOs = options?.syncOs !== false ? '1' : '0';
    const progress = options?.progress !== undefined ? options.progress.toFixed(2) : '0';
    try {
      await fetch(
        `${this.baseUrl}/mouse/move?x=${Math.round(x)}&y=${Math.round(y)}&pinch=${pinch}&syncOs=${syncOs}&progress=${progress}`,
        { method: 'GET' }
      );
    } catch {
      this.isAvailable = false;
    }
  }

  /**
   * Move specifically the dedicated Custom Windows Cursor Overlay.
   */
  async moveCustomCursor(x: number, y: number, options: CustomCursorMoveOptions = {}): Promise<void> {
    return this.moveCursor(x, y, { syncOs: false, ...options });
  }

  /**
   * Toggle the dedicated Custom Windows Cursor Overlay visibility.
   */
  async setCustomCursorVisible(visible: boolean): Promise<boolean> {
    if (this.isAvailable === false) return false;
    try {
      const res = await fetch(`${this.baseUrl}/cursor/overlay?visible=${visible ? '1' : '0'}`, {
        method: 'GET',
      });
      if (res.ok) {
        const data = await res.json();
        return !!data.visible;
      }
    } catch {
      this.isAvailable = false;
    }
    return false;
  }

  /**
   * Configure the appearance, style, and size of the Custom Windows Cursor Overlay.
   */
  async configureCustomCursor(config: CustomCursorConfig): Promise<void> {
    if (this.isAvailable === false) return;
    const params = new URLSearchParams();
    if (config.size !== undefined) params.set('size', config.size.toString());
    if (config.style) params.set('style', config.style);
    if (config.color) params.set('color', config.color);
    try {
      await fetch(`${this.baseUrl}/cursor/config?${params.toString()}`, { method: 'GET' });
    } catch {
      this.isAvailable = false;
    }
  }

  /**
   * Trigger an OS-level mouse click (clicks at current Custom Cursor position).
   */
  async click(button: 'left' | 'right' = 'left'): Promise<void> {
    if (this.isAvailable === false) return;
    try {
      await fetch(`${this.baseUrl}/mouse/click?button=${button}`, { method: 'GET' });
    } catch {
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
    } catch {
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
    } catch {
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
