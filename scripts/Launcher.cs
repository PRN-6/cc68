using System;
using System.IO;
using System.Diagnostics;
using System.Net;
using System.Text;
using System.Threading;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;

[assembly: AssemblyTitle("EyeHand (cc68)")]
[assembly: AssemblyProduct("EyeHand Spatial Desktop")]
[assembly: AssemblyDescription("High-Performance Multimodal Gaze & Hand Tracking Desktop Interaction")]
[assembly: AssemblyCompany("EyeHand")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

namespace EyeHand
{
    static class Program
    {
        private static HttpListener listener;
        private static bool isRunning = true;
        private const int Port = 6868;

        // Win32 API for OS Cursor and Mouse Input Control
        [DllImport("user32.dll")]
        private static extern bool SetCursorPos(int X, int Y);

        [DllImport("user32.dll")]
        private static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);

        private const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        private const uint MOUSEEVENTF_LEFTUP = 0x0004;
        private const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
        private const uint MOUSEEVENTF_RIGHTUP = 0x0010;
        private const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
        private const uint MOUSEEVENTF_MIDDLEUP = 0x0040;

        [STAThread]
        static void Main()
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string distDir = Path.Combine(appDir, "apps", "web", "dist");
            if (!Directory.Exists(distDir))
            {
                distDir = Path.Combine(appDir, "dist");
            }

            // 1. Start Win32 Input API & Embedded Web Server
            StartHttpServer(distDir);

            // 2. Launch Native Window
            LaunchAppWindow();

            // 3. Cleanup on exit
            Cleanup();
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

                // CORS Headers
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
                    int x = int.Parse(ctx.Request.QueryString["x"] ?? "0");
                    int y = int.Parse(ctx.Request.QueryString["y"] ?? "0");
                    SetCursorPos(x, y);
                    SendJson(ctx, "{\"status\":\"ok\",\"x\":" + x + ",\"y\":" + y + "}");
                    return;
                }
                else if (path == "/api/mouse/click")
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
                    SendJson(ctx, "{\"status\":\"ok\",\"action\":\"click\"}");
                    return;
                }
                else if (path == "/api/mouse/down")
                {
                    mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                    SendJson(ctx, "{\"status\":\"ok\",\"action\":\"down\"}");
                    return;
                }
                else if (path == "/api/mouse/up")
                {
                    mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                    SendJson(ctx, "{\"status\":\"ok\",\"action\":\"up\"}");
                    return;
                }
                else if (path == "/api/screen")
                {
                    int screenWidth = Screen.PrimaryScreen.Bounds.Width;
                    int screenHeight = Screen.PrimaryScreen.Bounds.Height;
                    SendJson(ctx, "{\"width\":" + screenWidth + ",\"height\":" + screenHeight + "}");
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

            Process appProc = Process.Start(psi);
            if (appProc != null)
            {
                appProc.WaitForExit();
            }
        }

        static void Cleanup()
        {
            isRunning = false;
            try
            {
                if (listener != null && listener.IsListening)
                {
                    listener.Stop();
                    listener.Close();
                }
            }
            catch { }
        }
    }
}
