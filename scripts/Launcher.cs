using System;
using System.IO;
using System.Diagnostics;
using System.Net;
using System.Text;
using System.Threading;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

[assembly: AssemblyTitle("EyeHand (cc68)")]
[assembly: AssemblyProduct("EyeHand Spatial Desktop")]
[assembly: AssemblyDescription("High-Performance Multimodal Gaze & Hand Tracking System Tray Desktop Application with Custom Windows Cursor Overlay")]
[assembly: AssemblyCompany("EyeHand")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

namespace EyeHand
{
    static class Program
    {
        private static HttpListener listener;
        private static bool isRunning = true;
        private static bool isTrackingActive = true;
        private static NotifyIcon trayIcon;
        private static Process backgroundProcess;
        private static Process appWindowProcess;
        private static CustomCursorOverlay customCursor;
        private const int Port = 6868;

        // Win32 API for OS Cursor and Mouse Input Control
        [DllImport("user32.dll")]
        private static extern bool SetCursorPos(int X, int Y);

        [DllImport("user32.dll")]
        private static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        private const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        private const uint MOUSEEVENTF_LEFTUP = 0x0004;
        private const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
        private const uint MOUSEEVENTF_RIGHTUP = 0x0010;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string distDir = Path.Combine(appDir, "apps", "web", "dist");
            if (!Directory.Exists(distDir))
            {
                distDir = Path.Combine(appDir, "dist");
            }

            // 1. Create and display the dedicated Custom Windows Cursor Overlay immediately on desktop
            customCursor = new CustomCursorOverlay();
            customCursor.Show();

            // 2. Start Win32 Input API & Embedded Web Server
            StartHttpServer(distDir);

            // 3. Setup System Tray Icon & Context Menu (stays silently in tray)
            SetupSystemTray();

            // 4. Start the background eye & hand tracking engine silently (zero browser popup)
            StartBackgroundEngine();

            // 5. Run WinForms message loop to keep System Tray and Overlay active
            Application.Run();

            // 6. Cleanup on exit
            Cleanup();
        }

        static void SetupSystemTray()
        {
            trayIcon = new NotifyIcon();
            trayIcon.Text = "EyeHand (cc68) - Custom Cursor Active";
            trayIcon.Icon = CreateTrayIcon(true);
            trayIcon.Visible = true;

            ContextMenu menu = new ContextMenu();

            MenuItem statusItem = new MenuItem("EyeHand Eye Tracking: Active");
            statusItem.Enabled = false;
            menu.MenuItems.Add(statusItem);

            menu.MenuItems.Add("-");

            MenuItem toggleItem = new MenuItem("Tracking: Active");
            toggleItem.Click += (s, e) =>
            {
                isTrackingActive = !isTrackingActive;
                toggleItem.Text = isTrackingActive ? "Tracking: Active" : "Tracking: Paused";
                statusItem.Text = isTrackingActive ? "EyeHand Eye Tracking: Active" : "EyeHand Eye Tracking: Paused";
                trayIcon.Icon = CreateTrayIcon(isTrackingActive);
                if (customCursor != null)
                {
                    customCursor.SetVisibility(isTrackingActive && customCursor.IsOverlayVisible);
                }
                trayIcon.ShowBalloonTip(
                    1500,
                    "EyeHand Tracking",
                    isTrackingActive ? "Eye tracking resumed." : "Eye tracking paused.",
                    ToolTipIcon.Info
                );
            };
            menu.MenuItems.Add(toggleItem);

            MenuItem cursorOverlayItem = new MenuItem("Custom Cursor Overlay: Visible");
            cursorOverlayItem.Click += (s, e) =>
            {
                if (customCursor != null)
                {
                    bool nextVis = !customCursor.IsOverlayVisible;
                    customCursor.SetVisibility(nextVis);
                    cursorOverlayItem.Text = nextVis ? "Custom Cursor Overlay: Visible" : "Custom Cursor Overlay: Hidden";
                }
            };
            menu.MenuItems.Add(cursorOverlayItem);

            MenuItem styleMenu = new MenuItem("Cursor Style");
            styleMenu.MenuItems.Add(new MenuItem("Spatial Reticle", (s, e) => { if (customCursor != null) customCursor.SetStyle("reticle"); }));
            styleMenu.MenuItems.Add(new MenuItem("Laser Dot", (s, e) => { if (customCursor != null) customCursor.SetStyle("dot"); }));
            styleMenu.MenuItems.Add(new MenuItem("Crosshair", (s, e) => { if (customCursor != null) customCursor.SetStyle("crosshair"); }));
            menu.MenuItems.Add(styleMenu);

            menu.MenuItems.Add("-");

            MenuItem openItem = new MenuItem("Settings & Camera Viewport...", (s, e) => LaunchAppWindow());
            menu.MenuItems.Add(openItem);

            menu.MenuItems.Add("-");

            menu.MenuItems.Add(new MenuItem("Exit EyeHand", (s, e) =>
            {
                trayIcon.Visible = false;
                Cleanup();
                Application.Exit();
            }));

            trayIcon.ContextMenu = menu;
            trayIcon.DoubleClick += (s, e) => LaunchAppWindow();

            // Show startup balloon notification in system tray
            trayIcon.ShowBalloonTip(
                2500,
                "EyeHand is Running",
                "Custom eye-tracking cursor is active on Windows. Look around to control it!",
                ToolTipIcon.Info
            );
        }

        static Icon CreateTrayIcon(bool active)
        {
            using (Bitmap bmp = new Bitmap(32, 32))
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.Clear(Color.Transparent);

                // Eye outer contour
                Color eyeColor = active ? Color.FromArgb(56, 189, 248) : Color.FromArgb(148, 163, 184);
                using (Pen pen = new Pen(eyeColor, 2.5f))
                {
                    g.DrawEllipse(pen, 2, 7, 28, 18);
                }

                // Iris circle
                Color irisColor = active ? Color.FromArgb(34, 197, 94) : Color.FromArgb(100, 116, 139);
                using (SolidBrush brush = new SolidBrush(irisColor))
                {
                    g.FillEllipse(brush, 10, 10, 12, 12);
                }

                // Pupil highlight
                using (SolidBrush whiteBrush = new SolidBrush(Color.White))
                {
                    g.FillEllipse(whiteBrush, 14, 12, 4, 4);
                }

                IntPtr hIcon = bmp.GetHicon();
                return Icon.FromHandle(hIcon);
            }
        }

        static void StartHttpServer(string distDir)
        {
            try
            {
                listener = new HttpListener();
                listener.Prefixes.Add("http://127.0.0.1:" + Port + "/");
                listener.Prefixes.Add("http://localhost:" + Port + "/");
                listener.Start();

                Thread serverThread = new Thread(() =>
                {
                    while (isRunning)
                    {
                        try
                        {
                            HttpListenerContext ctx = listener.GetContext();
                            ThreadPool.QueueUserWorkItem((_) => ProcessRequest(ctx, distDir));
                        }
                        catch
                        {
                            if (!isRunning) break;
                        }
                    }
                });
                serverThread.IsBackground = true;
                serverThread.Start();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Server error: " + ex.Message);
            }
        }

        static void ProcessRequest(HttpListenerContext ctx, string distDir)
        {
            try
            {
                string path = ctx.Request.Url.AbsolutePath.ToLowerInvariant();

                ctx.Response.AddHeader("Access-Control-Allow-Origin", "*");
                ctx.Response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                ctx.Response.AddHeader("Access-Control-Allow-Headers", "Content-Type");

                if (ctx.Request.HttpMethod == "OPTIONS")
                {
                    ctx.Response.StatusCode = 204;
                    ctx.Response.Close();
                    return;
                }

                // 1. Move Custom Windows Cursor & optionally OS cursor
                if (path == "/api/mouse/move")
                {
                    if (isTrackingActive)
                    {
                        int x = int.Parse(ctx.Request.QueryString["x"] ?? "0");
                        int y = int.Parse(ctx.Request.QueryString["y"] ?? "0");
                        bool pinch = (ctx.Request.QueryString["pinch"] == "true" || ctx.Request.QueryString["pinch"] == "1");
                        string syncParam = ctx.Request.QueryString["syncOs"];
                        bool syncOs = (syncParam == "1" || syncParam == "true");

                        if (customCursor != null)
                        {
                            customCursor.UpdatePosition(x, y, pinch, syncOs);
                        }
                        else if (syncOs)
                        {
                            SetCursorPos(x, y);
                        }
                    }
                    SendJson(ctx, "{\"status\":\"ok\",\"active\":" + (isTrackingActive ? "true" : "false") + "}");
                    return;
                }
                // 2. Custom Cursor Overlay Visibility Toggle
                else if (path == "/api/cursor/overlay")
                {
                    string visParam = ctx.Request.QueryString["visible"];
                    if (visParam != null && customCursor != null)
                    {
                        bool show = (visParam == "true" || visParam == "1");
                        customCursor.SetVisibility(show);
                    }
                    bool isVis = customCursor != null && customCursor.IsOverlayVisible;
                    SendJson(ctx, "{\"status\":\"ok\",\"visible\":" + (isVis ? "true" : "false") + "}");
                    return;
                }
                // 3. Custom Cursor Configuration (style, size, color)
                else if (path == "/api/cursor/config")
                {
                    if (customCursor != null)
                    {
                        string style = ctx.Request.QueryString["style"];
                        string sizeStr = ctx.Request.QueryString["size"];
                        string color = ctx.Request.QueryString["color"];
                        int sz;
                        if (int.TryParse(sizeStr, out sz)) customCursor.SetSize(sz);
                        if (!string.IsNullOrEmpty(style)) customCursor.SetStyle(style);
                        if (!string.IsNullOrEmpty(color)) customCursor.SetColor(color);
                    }
                    SendJson(ctx, "{\"status\":\"ok\"}");
                    return;
                }
                // 4. OS Mouse Click (clicks at Custom Cursor's position)
                else if (path == "/api/mouse/click")
                {
                    if (isTrackingActive)
                    {
                        string button = ctx.Request.QueryString["button"] ?? "left";
                        if (customCursor != null)
                        {
                            SetCursorPos(customCursor.CursorX, customCursor.CursorY);
                        }
                        if (button == "right")
                        {
                            mouse_event(MOUSEEVENTF_RIGHTDOWN | MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
                        }
                        else
                        {
                            mouse_event(MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                        }
                    }
                    SendJson(ctx, "{\"status\":\"ok\",\"action\":\"click\"}");
                    return;
                }
                // 5. Mouse Down (e.g. pinch start / drag start)
                else if (path == "/api/mouse/down")
                {
                    if (isTrackingActive)
                    {
                        if (customCursor != null)
                        {
                            SetCursorPos(customCursor.CursorX, customCursor.CursorY);
                        }
                        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                    }
                    SendJson(ctx, "{\"status\":\"ok\",\"action\":\"down\"}");
                    return;
                }
                // 6. Mouse Up (e.g. pinch release / drag end)
                else if (path == "/api/mouse/up")
                {
                    if (isTrackingActive)
                    {
                        if (customCursor != null)
                        {
                            SetCursorPos(customCursor.CursorX, customCursor.CursorY);
                        }
                        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                    }
                    SendJson(ctx, "{\"status\":\"ok\",\"action\":\"up\"}");
                    return;
                }
                // 7. Screen Dimensions & Overlay State
                else if (path == "/api/screen")
                {
                    int screenWidth = Screen.PrimaryScreen.Bounds.Width;
                    int screenHeight = Screen.PrimaryScreen.Bounds.Height;
                    bool overlayVis = customCursor != null && customCursor.IsOverlayVisible;
                    SendJson(ctx, "{\"width\":" + screenWidth + ",\"height\":" + screenHeight + ",\"trayActive\":true,\"customCursorActive\":" + (overlayVis ? "true" : "false") + "}");
                    return;
                }

                // Static Web Assets Server
                string rawUrl = ctx.Request.Url.AbsolutePath.TrimStart('/');
                if (string.IsNullOrEmpty(rawUrl)) rawUrl = "index.html";

                string filePath = Path.Combine(distDir, rawUrl.Replace('/', Path.DirectorySeparatorChar));
                if (!File.Exists(filePath))
                {
                    filePath = Path.Combine(distDir, "index.html");
                }

                if (File.Exists(filePath))
                {
                    byte[] bytes = File.ReadAllBytes(filePath);
                    string ext = Path.GetExtension(filePath).ToLowerInvariant();
                    string mime = "text/plain";
                    switch (ext)
                    {
                        case ".html": mime = "text/html; charset=utf-8"; break;
                        case ".js": mime = "application/javascript"; break;
                        case ".css": mime = "text/css"; break;
                        case ".json": mime = "application/json"; break;
                        case ".png": mime = "image/png"; break;
                        case ".jpg": case ".jpeg": mime = "image/jpeg"; break;
                        case ".svg": mime = "image/svg+xml"; break;
                        case ".ico": mime = "image/x-icon"; break;
                    }
                    ctx.Response.ContentType = mime;
                    ctx.Response.OutputStream.Write(bytes, 0, bytes.Length);
                }
                else
                {
                    ctx.Response.StatusCode = 404;
                }
                ctx.Response.Close();
            }
            catch
            {
                try { ctx.Response.StatusCode = 500; ctx.Response.Close(); } catch { }
            }
        }

        static void SendJson(HttpListenerContext ctx, string json)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(json);
            ctx.Response.ContentType = "application/json";
            ctx.Response.OutputStream.Write(bytes, 0, bytes.Length);
            ctx.Response.Close();
        }

        /// <summary>
        /// Starts the vision tracking engine in a hidden, silent background process (zero browser window).
        /// </summary>
        static void StartBackgroundEngine()
        {
            try
            {
                if (backgroundProcess != null && !backgroundProcess.HasExited)
                {
                    return;
                }

                string url = "http://localhost:" + Port;
                string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
                if (!File.Exists(edgePath))
                {
                    edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
                }

                string dataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "EyeHand68", "AppData");

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = edgePath,
                    Arguments = "--app=\"" + url + "\" --window-position=-32000,-32000 --window-size=1,1 --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required --no-first-run --no-default-browser-check --user-data-dir=\"" + dataDir + "\"",
                    WindowStyle = ProcessWindowStyle.Hidden,
                    CreateNoWindow = true,
                    UseShellExecute = false
                };

                backgroundProcess = Process.Start(psi);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Failed to start background tracking: " + ex.Message);
            }
        }

        /// <summary>
        /// Optional: Opens the settings & camera diagnostic viewport only when requested from the tray.
        /// </summary>
        static void LaunchAppWindow()
        {
            try
            {
                if (appWindowProcess != null && !appWindowProcess.HasExited)
                {
                    SetForegroundWindow(appWindowProcess.MainWindowHandle);
                    return;
                }

                string url = "http://localhost:" + Port;
                string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
                if (!File.Exists(edgePath))
                {
                    edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
                }

                string dataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "EyeHand68", "AppData");

                ProcessStartInfo psi;
                if (File.Exists(edgePath))
                {
                    psi = new ProcessStartInfo
                    {
                        FileName = edgePath,
                        Arguments = "--app=\"" + url + "\" --window-size=1200,800 --user-data-dir=\"" + dataDir + "\"",
                        UseShellExecute = false
                    };
                }
                else
                {
                    psi = new ProcessStartInfo
                    {
                        FileName = url,
                        UseShellExecute = true
                    };
                }

                appWindowProcess = Process.Start(psi);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Failed to launch UI: " + ex.Message);
            }
        }

        static void Cleanup()
        {
            isRunning = false;
            try
            {
                if (customCursor != null && !customCursor.IsDisposed)
                {
                    customCursor.Dispose();
                }
            }
            catch { }

            try
            {
                if (trayIcon != null)
                {
                    trayIcon.Visible = false;
                    trayIcon.Dispose();
                }
            }
            catch { }

            try
            {
                if (listener != null && listener.IsListening)
                {
                    listener.Stop();
                    listener.Close();
                }
            }
            catch { }

            try
            {
                if (backgroundProcess != null && !backgroundProcess.HasExited)
                {
                    backgroundProcess.Kill();
                }
            }
            catch { }

            try
            {
                if (appWindowProcess != null && !appWindowProcess.HasExited)
                {
                    appWindowProcess.Kill();
                }
            }
            catch { }
        }
    }

    /// <summary>
    /// Dedicated Custom Floating Cursor Overlay that displays directly on Windows.
    /// Transparent, click-through, always-on-top, and does not steal window focus.
    /// </summary>
    public class CustomCursorOverlay : Form
    {
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

        [DllImport("user32.dll")]
        private static extern bool SetCursorPos(int X, int Y);

        private static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
        private const uint SWP_NOSIZE = 0x0001;
        private const uint SWP_NOACTIVATE = 0x0010;
        private const uint SWP_SHOWWINDOW = 0x0040;
        private const uint SWP_HIDEWINDOW = 0x0080;

        public int CursorX { get; private set; }
        public int CursorY { get; private set; }
        public bool IsOverlayVisible { get; private set; }

        private bool isPinching;
        private int cursorSize;
        private string cursorStyle;
        private Color primaryColor;
        private Color pinchColor;
        private float pulsePhase;
        private System.Windows.Forms.Timer animTimer;

        public CustomCursorOverlay()
        {
            CursorX = Screen.PrimaryScreen.Bounds.Width / 2;
            CursorY = Screen.PrimaryScreen.Bounds.Height / 2;
            IsOverlayVisible = true;
            isPinching = false;
            cursorSize = 68;
            cursorStyle = "reticle";
            primaryColor = Color.FromArgb(56, 189, 248); // Electric Sky Blue
            pinchColor = Color.FromArgb(34, 197, 94);     // Emerald Green
            pulsePhase = 0f;

            this.FormBorderStyle = FormBorderStyle.None;
            this.ShowInTaskbar = false;
            this.TopMost = true;
            this.StartPosition = FormStartPosition.Manual;
            this.Size = new Size(cursorSize, cursorSize);
            this.Location = new Point(CursorX - cursorSize / 2, CursorY - cursorSize / 2);
            this.BackColor = Color.Magenta;
            this.TransparencyKey = Color.Magenta;
            this.DoubleBuffered = true;

            // Idle pulse animation timer (~40 FPS)
            animTimer = new System.Windows.Forms.Timer();
            animTimer.Interval = 25;
            animTimer.Tick += (s, e) =>
            {
                pulsePhase += 0.08f;
                if (this.IsOverlayVisible && this.IsHandleCreated && !this.IsDisposed)
                {
                    this.Invalidate();
                }
            };
            animTimer.Start();
        }

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                // WS_EX_TRANSPARENT (0x20): All mouse clicks pass directly through to underlying Windows apps
                // WS_EX_LAYERED (0x80000): Layered window transparency
                // WS_EX_TOOLWINDOW (0x80): Hide from Alt-Tab
                // WS_EX_NOACTIVATE (0x08000000): Never steal keyboard or window focus
                cp.ExStyle |= 0x00000020 | 0x00080000 | 0x00000080 | 0x08000000;
                return cp;
            }
        }

        protected override bool ShowWithoutActivation
        {
            get { return true; }
        }

        public void UpdatePosition(int x, int y, bool pinching, bool syncOs)
        {
            CursorX = x;
            CursorY = y;

            if (syncOs)
            {
                SetCursorPos(x, y);
            }

            if (this.IsHandleCreated && !this.IsDisposed && this.IsOverlayVisible)
            {
                int targetLeft = x - cursorSize / 2;
                int targetTop = y - cursorSize / 2;
                SetWindowPos(this.Handle, HWND_TOPMOST, targetLeft, targetTop, 0, 0, SWP_NOSIZE | SWP_NOACTIVATE);

                if (pinching != isPinching)
                {
                    isPinching = pinching;
                    if (this.InvokeRequired)
                    {
                        this.BeginInvoke(new Action(() => this.Invalidate()));
                    }
                    else
                    {
                        this.Invalidate();
                    }
                }
            }
        }

        public void SetVisibility(bool visible)
        {
            IsOverlayVisible = visible;
            if (this.InvokeRequired)
            {
                this.BeginInvoke(new Action(() =>
                {
                    this.Visible = visible;
                    if (visible)
                    {
                        SetWindowPos(this.Handle, HWND_TOPMOST, CursorX - cursorSize / 2, CursorY - cursorSize / 2, 0, 0, SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW);
                    }
                }));
            }
            else
            {
                this.Visible = visible;
                if (visible)
                {
                    SetWindowPos(this.Handle, HWND_TOPMOST, CursorX - cursorSize / 2, CursorY - cursorSize / 2, 0, 0, SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW);
                }
            }
        }

        public void SetSize(int size)
        {
            if (size < 32) size = 32;
            if (size > 140) size = 140;
            cursorSize = size;
            if (this.InvokeRequired)
            {
                this.BeginInvoke(new Action(() =>
                {
                    this.Size = new Size(cursorSize, cursorSize);
                    this.Invalidate();
                }));
            }
            else
            {
                this.Size = new Size(cursorSize, cursorSize);
                this.Invalidate();
            }
        }

        public void SetStyle(string style)
        {
            cursorStyle = style.ToLowerInvariant();
            if (this.InvokeRequired)
            {
                this.BeginInvoke(new Action(() => this.Invalidate()));
            }
            else
            {
                this.Invalidate();
            }
        }

        public void SetColor(string hex)
        {
            try
            {
                if (hex.StartsWith("#")) hex = hex.Substring(1);
                if (hex.Length == 6)
                {
                    int r = Convert.ToInt32(hex.Substring(0, 2), 16);
                    int g = Convert.ToInt32(hex.Substring(2, 2), 16);
                    int b = Convert.ToInt32(hex.Substring(4, 2), 16);
                    primaryColor = Color.FromArgb(r, g, b);
                }
            }
            catch { }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            int cx = cursorSize / 2;
            int cy = cursorSize / 2;

            if (cursorStyle == "dot")
            {
                // Minimalist Precision Laser Dot
                Color dotColor = isPinching ? pinchColor : primaryColor;
                using (SolidBrush glow = new SolidBrush(Color.FromArgb(90, dotColor)))
                {
                    g.FillEllipse(glow, cx - 12, cy - 12, 24, 24);
                }
                using (SolidBrush dot = new SolidBrush(dotColor))
                {
                    g.FillEllipse(dot, cx - 5, cy - 5, 10, 10);
                }
                using (SolidBrush core = new SolidBrush(Color.White))
                {
                    g.FillEllipse(core, cx - 2, cy - 2, 4, 4);
                }
                return;
            }

            if (cursorStyle == "crosshair")
            {
                // Tactical Gaze Crosshair
                Color chColor = isPinching ? pinchColor : primaryColor;
                using (Pen pen = new Pen(chColor, 2.0f))
                {
                    int arm = cursorSize / 3;
                    g.DrawLine(pen, cx - arm, cy, cx - 4, cy);
                    g.DrawLine(pen, cx + 4, cy, cx + arm, cy);
                    g.DrawLine(pen, cx, cy - arm, cx, cy - 4);
                    g.DrawLine(pen, cx, cy + 4, cx, cy + arm);
                    g.DrawEllipse(pen, cx - 8, cy - 8, 16, 16);
                }
                using (SolidBrush core = new SolidBrush(Color.White))
                {
                    g.FillEllipse(core, cx - 2, cy - 2, 4, 4);
                }
                return;
            }

            // Default: "reticle" - Spatial Holographic Gaze Reticle
            if (isPinching)
            {
                // Pinch / Click Active: contracted ring + energy pulse ripple
                int r = (int)(cursorSize * 0.28f);

                // Expanding ripple
                float rip = (float)(Math.Sin(pulsePhase * 3.5) * 0.5 + 0.5);
                int ripR = r + (int)(rip * 14);
                int ripAlpha = (int)((1.0f - rip) * 180);
                if (ripAlpha > 0)
                {
                    using (Pen ripPen = new Pen(Color.FromArgb(ripAlpha, pinchColor), 2.0f))
                    {
                        g.DrawEllipse(ripPen, cx - ripR, cy - ripR, ripR * 2, ripR * 2);
                    }
                }

                // Inner contracted ring
                using (Pen pen = new Pen(pinchColor, 3.0f))
                {
                    g.DrawEllipse(pen, cx - r, cy - r, r * 2, r * 2);
                }

                // Solid tactile grip dot
                using (SolidBrush brush = new SolidBrush(pinchColor))
                {
                    g.FillEllipse(brush, cx - 6, cy - 6, 12, 12);
                }
                using (SolidBrush centerDot = new SolidBrush(Color.White))
                {
                    g.FillEllipse(centerDot, cx - 2, cy - 2, 4, 4);
                }
            }
            else
            {
                // Resting Gaze: Smooth breathing cyan reticle
                float pulse = (float)(Math.Sin(pulsePhase) * 1.5);
                int r = (int)(cursorSize * 0.32f + pulse);

                // Soft outer halo glow
                using (Pen glowPen = new Pen(Color.FromArgb(50, primaryColor), 4.5f))
                {
                    g.DrawEllipse(glowPen, cx - r, cy - r, r * 2, r * 2);
                }

                // Crisp primary ring
                using (Pen pen = new Pen(primaryColor, 2.2f))
                {
                    g.DrawEllipse(pen, cx - r, cy - r, r * 2, r * 2);
                }

                // Crosshair tick marks around ring
                using (Pen tickPen = new Pen(Color.FromArgb(220, primaryColor), 1.8f))
                {
                    g.DrawLine(tickPen, cx, cy - r - 4, cx, cy - r + 3);
                    g.DrawLine(tickPen, cx, cy + r - 3, cx, cy + r + 4);
                    g.DrawLine(tickPen, cx - r - 4, cy, cx - r + 3, cy);
                    g.DrawLine(tickPen, cx + r - 3, cy, cx + r + 4, cy);
                }

                // Precision center aiming dot
                using (SolidBrush dot = new SolidBrush(Color.White))
                {
                    g.FillEllipse(dot, cx - 2, cy - 2, 4, 4);
                }
            }
        }
    }
}
