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
[assembly: AssemblyDescription("High-Performance Multimodal Gaze & Hand Tracking System Tray Desktop Application")]
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
        private static Process appWindowProcess;
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

            // 1. Start Win32 Input API & Embedded Web Server
            StartHttpServer(distDir);

            // 2. Setup System Tray Icon & Context Menu
            SetupSystemTray();

            // 3. Launch UI Window on startup
            LaunchAppWindow();

            // 4. Run WinForms message loop to keep System Tray active
            Application.Run();

            // 5. Cleanup on exit
            Cleanup();
        }

        static void SetupSystemTray()
        {
            trayIcon = new NotifyIcon();
            trayIcon.Text = "EyeHand (cc68) - Multimodal Tracking";
            trayIcon.Icon = CreateTrayIcon(true);
            trayIcon.Visible = true;

            ContextMenu menu = new ContextMenu();

            MenuItem openItem = new MenuItem("Open EyeHand Dashboard", (s, e) => LaunchAppWindow());
            openItem.DefaultItem = true; // Bold font, triggered on double-click
            menu.MenuItems.Add(openItem);

            menu.MenuItems.Add("-");

            MenuItem toggleItem = new MenuItem("Tracking: Active");
            toggleItem.Click += (s, e) =>
            {
                isTrackingActive = !isTrackingActive;
                toggleItem.Text = isTrackingActive ? "Tracking: Active" : "Tracking: Paused";
                trayIcon.Icon = CreateTrayIcon(isTrackingActive);
                trayIcon.ShowBalloonTip(
                    1500,
                    "EyeHand Tracking",
                    isTrackingActive ? "Eye & Hand tracking resumed." : "Eye & Hand tracking paused.",
                    ToolTipIcon.Info
                );
            };
            menu.MenuItems.Add(toggleItem);

            menu.MenuItems.Add(new MenuItem("Calibrate Gaze", (s, e) => {
                LaunchAppWindow();
            }));

            menu.MenuItems.Add("-");

            menu.MenuItems.Add(new MenuItem("Exit EyeHand", (s, e) =>
            {
                trayIcon.Visible = false;
                Cleanup();
                Application.Exit();
            }));

            trayIcon.ContextMenu = menu;
            trayIcon.DoubleClick += (s, e) => LaunchAppWindow();

            // Show startup notification in tray
            trayIcon.ShowBalloonTip(
                2000,
                "EyeHand is Running",
                "EyeHand is active in your system tray. Click to view dashboard.",
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

                // Win32 OS Cursor Control API Endpoints
                if (path == "/api/mouse/move")
                {
                    if (isTrackingActive)
                    {
                        int x = int.Parse(ctx.Request.QueryString["x"] ?? "0");
                        int y = int.Parse(ctx.Request.QueryString["y"] ?? "0");
                        SetCursorPos(x, y);
                    }
                    SendJson(ctx, "{\"status\":\"ok\",\"active\":" + (isTrackingActive ? "true" : "false") + "}");
                    return;
                }
                else if (path == "/api/mouse/click")
                {
                    if (isTrackingActive)
                    {
                        string button = ctx.Request.QueryString["button"] ?? "left";
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
                else if (path == "/api/mouse/down")
                {
                    if (isTrackingActive)
                    {
                        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                    }
                    SendJson(ctx, "{\"status\":\"ok\",\"action\":\"down\"}");
                    return;
                }
                else if (path == "/api/mouse/up")
                {
                    if (isTrackingActive)
                    {
                        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                    }
                    SendJson(ctx, "{\"status\":\"ok\",\"action\":\"up\"}");
                    return;
                }
                else if (path == "/api/screen")
                {
                    int screenWidth = Screen.PrimaryScreen.Bounds.Width;
                    int screenHeight = Screen.PrimaryScreen.Bounds.Height;
                    SendJson(ctx, "{\"width\":" + screenWidth + ",\"height\":" + screenHeight + ",\"trayActive\":true}");
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

        static void LaunchAppWindow()
        {
            try
            {
                if (appWindowProcess != null && !appWindowProcess.HasExited)
                {
                    // If already running, bring window to front
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
                        Arguments = "--app=\"" + url + "\" --window-size=1280,800 --user-data-dir=\"" + dataDir + "\"",
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
                if (appWindowProcess != null && !appWindowProcess.HasExited)
                {
                    appWindowProcess.Kill();
                }
            }
            catch { }
        }
    }
}
