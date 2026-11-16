"""
Component 5: Physical OS Mouse Driver & Clicks
Controls the native Windows cursor via Win32 SetCursorPos and mouse_event.
Detects EAR blinks and triggers clicks.
"""

import time
import ctypes

MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010

class MouseController:
    def __init__(self, click_cooldown_s=0.75):
        self.click_cooldown_s = click_cooldown_s
        self.last_click_time = 0
        self.blink_start_time = None

    def move_cursor(self, x: int, y: int):
        """
        Moves the physical OS mouse cursor to (x, y) immediately.
        """
        try:
            ctypes.windll.user32.SetCursorPos(int(x), int(y))
        except Exception:
            pass

    def click(self, x=None, y=None, button="left"):
        """
        Dispatches a physical mouse click at specified or current coordinates.
        """
        if x is not None and y is not None:
            self.move_cursor(x, y)

        down_flag = MOUSEEVENTF_LEFTDOWN if button == "left" else MOUSEEVENTF_RIGHTDOWN
        up_flag = MOUSEEVENTF_LEFTUP if button == "left" else MOUSEEVENTF_RIGHTUP

        try:
            ctypes.windll.user32.mouse_event(down_flag | up_flag, 0, 0, 0, 0)
            self.last_click_time = time.time()
        except Exception:
            pass

    def check_blink_click(self, is_blinking: bool, current_x: int, current_y: int) -> bool:
        """
        Detects an intentional blink and clicks when held for 0.22s.
        """
        now = time.time()
        if is_blinking:
            if self.blink_start_time is None:
                self.blink_start_time = now
            elif (now - self.blink_start_time) >= 0.22:
                if (now - self.last_click_time) > self.click_cooldown_s:
                    self.click(current_x, current_y)
                    self.blink_start_time = None
                    return True
        else:
            self.blink_start_time = None

        return False
