@echo off
title EyeHand - Eye & Gaze Cursor Tracker
echo =======================================================
echo   EyeHand (cc68) - Python Gaze & Eye Cursor Controller
echo =======================================================
echo.
echo Starting tracker...
echo - 5-Point Calibration will run to align your eyes with your screen.
echo - Press [C] anytime to re-run calibration.
echo - Press [D] to toggle between Live Smooth Follow and 1.0s Stare Dwell.
echo - Press [Space] to auto-center neutral gaze.
echo - Press [ESC] or [Q] to quit.
echo.
python "%~dp0scripts\eye_mouse_tracker.py"
pause
