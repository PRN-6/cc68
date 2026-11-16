"""
Component 4: Transparent Click-Through Figma Cursor Overlay
Creates a native, transparent, click-through, always-on-top window on Windows.
Renders the iconic Figma multiplayer collaborative cursor:
- Tilted arrow polygon (#A259FF) with 1.8px white border and drop shadow
- Signature "You" rounded pill badge
- 1.0-Second circular countdown arc around pointer tip
- Emerald green ripple animation on click
"""

import sys
import math
import tkinter as tk
import ctypes

class FigmaCursorOverlay:
    def __init__(self, size=90):
        self.size = size
        self.root = tk.Tk()
        self.root.overrideredirect(True)
        self.root.wm_attributes('-topmost', True)
        self.root.wm_attributes('-transparentcolor', '#ff00ff')
        self.root.config(bg='#ff00ff')

        # Win32 Extended Styles: WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW
        try:
            hwnd = ctypes.windll.user32.GetParent(self.root.winfo_id())
            # WS_EX_LAYERED (0x80000) | WS_EX_TRANSPARENT (0x20) | WS_EX_TOOLWINDOW (0x80) | WS_EX_NOACTIVATE (0x08000000)
            ex_style = 0x80000 | 0x20 | 0x80 | 0x08000000
            styles = ctypes.windll.user32.GetWindowLongW(hwnd, -20)
            ctypes.windll.user32.SetWindowLongW(hwnd, -20, styles | ex_style)
        except Exception:
            pass

        self.canvas = tk.Canvas(self.root, width=self.size, height=self.size, bg='#ff00ff', highlightthickness=0)
        self.canvas.pack()

        self.tip_x = 18
        self.tip_y = 18
        self.cur_x = 500
        self.cur_y = 500
        self.dwell_progress = 0.0
        self.is_clicking = False
        self.pulse_phase = 0.0

        self.root.geometry(f"{self.size}x{self.size}+{self.cur_x - self.tip_x}+{self.cur_y - self.tip_y}")
        self._redraw()

    def update_position(self, x: int, y: int, progress: float = 0.0, clicking: bool = False):
        """
        Moves the custom cursor overlay to (x, y) coordinates and updates dwell progress.
        """
        self.cur_x = x
        self.cur_y = y
        self.dwell_progress = progress
        self.is_clicking = clicking
        self.pulse_phase += 0.1

        target_left = x - self.tip_x
        target_top = y - self.tip_y
        self.root.geometry(f"{self.size}x{self.size}+{target_left}+{target_top}")
        self._redraw()
        self.root.update_idletasks()

    def _redraw(self):
        self.canvas.delete("all")
        tip_x = self.tip_x
        tip_y = self.tip_y

        fill_color = "#10B981" if self.is_clicking else "#A259FF"

        # 1. Drop shadow
        shadow_arrow = [
            tip_x + 1.5, tip_y + 2.5,
            tip_x + 1.5, tip_y + 24.5,
            tip_x + 7.0, tip_y + 19.0,
            tip_x + 12.0, tip_y + 29.0,
            tip_x + 16.0, tip_y + 27.0,
            tip_x + 11.0, tip_y + 17.0,
            tip_x + 18.5, tip_y + 17.0
        ]
        self.canvas.create_polygon(shadow_arrow, fill="#331144", outline="")

        # 2. Authentic Figma Arrow
        arrow = [
            tip_x, tip_y,
            tip_x, tip_y + 22.0,
            tip_x + 5.5, tip_y + 16.5,
            tip_x + 10.5, tip_y + 26.5,
            tip_x + 14.5, tip_y + 24.5,
            tip_x + 9.5, tip_y + 14.5,
            tip_x + 17.0, tip_y + 14.5
        ]
        self.canvas.create_polygon(arrow, fill=fill_color, outline="white", width=2)

        # 3. Signature Figma Name Badge Pill ("You")
        bx = tip_x + 14
        by = tip_y + 18
        bw = 34
        bh = 17
        r = 4

        # Pill background & white border
        self.canvas.create_rectangle(bx, by, bx + bw, by + bh, fill=fill_color, outline="white", width=1.2)
        self.canvas.create_text(bx + bw // 2, by + bh // 2, text="You", fill="white", font=("Segoe UI", 7, "bold"))

        # 4. 1-Second Stare Dwell Countdown Arc (charging circle around pointer tip)
        if self.dwell_progress > 0.02:
            pr = 12
            extent = int(self.dwell_progress * 359)
            self.canvas.create_arc(
                tip_x - pr, tip_y - pr, tip_x + pr, tip_y + pr,
                start=90, extent=-extent, style="arc", outline="#F59E0B", width=3
            )

        # 5. Click ripple
        if self.is_clicking:
            rip_r = int(12 + math.sin(self.pulse_phase * 3) * 6)
            self.canvas.create_oval(
                tip_x - rip_r, tip_y - rip_r, tip_x + rip_r, tip_y + rip_r,
                outline="#10B981", width=2
            )

    def destroy(self):
        try:
            self.root.destroy()
        except Exception:
            pass

