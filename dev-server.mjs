/**
 * dev-server.mjs - 本地开发预览服务器
 *
 * 生成 PNG → 启动 HTTP 服务 → 打开浏览器
 * 修改代码后 Ctrl+C 重启即可
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateFarm } from './src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

// 确保 dist/ 存在
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

// HTML 预览页
const HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GitHub Farm - Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; color: #eee; font-family: system-ui, sans-serif; }
    header { padding: 16px 24px; background: #16213e; display: flex; align-items: center; gap: 12px; }
    header h1 { font-size: 18px; font-weight: 600; }
    header .badge { background: #0f3460; color: #e94560; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    main { padding: 24px; max-width: 1280px; margin: 0 auto; }
    .farm-stage { position: relative; width: 100%; line-height: 0; }
    .farm-canvas { width: 100%; height: auto; display: block; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.5); image-rendering: pixelated; }
    .farm-img { width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.5); image-rendering: pixelated; }
    .info { margin-top: 16px; display: flex; gap: 24px; font-size: 14px; color: #888; }
    footer { padding: 16px 24px; text-align: center; font-size: 12px; color: #555; }

    #camera-snapshot-btn {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 24px;
      height: 24px;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      z-index: 10;
      line-height: 0;
      transition: transform 0.15s ease, filter 0.15s ease;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.45));
    }
    #camera-snapshot-btn svg { width: 24px; height: 24px; display: block; }
    #camera-snapshot-btn:hover {
      transform: scale(1.18);
      filter: brightness(0.7) drop-shadow(0 1px 2px rgba(0,0,0,0.55));
    }
    #camera-snapshot-btn:active { transform: scale(1.05); }
    #camera-snapshot-btn:disabled { cursor: not-allowed; opacity: 0.45; }
    #camera-toast {
      position: absolute;
      top: 14px;
      right: 46px;
      padding: 4px 10px;
      background: rgba(15,52,96,0.92);
      color: #fff;
      font-size: 12px;
      border-radius: 4px;
      line-height: 1.4;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      white-space: nowrap;
    }
    #camera-toast.show { opacity: 1; }
  </style>
</head>
<body>
  <header>
    <h1>GitHub Farm</h1>
    <span class="badge">Preview</span>
  </header>
  <main>
    <div class="farm-stage" id="farm-stage">
      <canvas class="farm-canvas" id="farm-canvas" width="1216" height="832" aria-label="Farm Preview Canvas"></canvas>
      <span id="camera-toast"></span>
      <button id="camera-snapshot-btn" type="button" title="导出农场快照 PNG" aria-label="导出农场快照 PNG" disabled>
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-hidden="true">
          <rect x="2" y="6" width="20" height="14" fill="#3a3a3a"/>
          <rect x="3" y="7" width="18" height="12" fill="#5a5a5a"/>
          <rect x="8" y="3" width="8" height="4" fill="#3a3a3a"/>
          <rect x="9" y="4" width="6" height="2" fill="#2a2a2a"/>
          <rect x="5" y="9" width="14" height="9" fill="#2f4858"/>
          <rect x="6" y="10" width="12" height="7" fill="#74a9d8"/>
          <rect x="9" y="11" width="6" height="5" fill="#bfe3ff"/>
          <rect x="10" y="12" width="4" height="3" fill="#ffffff"/>
          <rect x="16" y="9" width="3" height="3" fill="#ffd23f"/>
          <rect x="9" y="17" width="6" height="2" fill="#2a2a2a"/>
        </svg>
      </button>
    </div>
    <div class="info">
      <span id="fileSize"></span>
      <span id="timestamp"></span>
    </div>
  </main>
  <footer>Edit code then Ctrl+C &amp; npm run dev to refresh</footer>
  <script>
    fetch('/farm.png', { method: 'HEAD' }).then(r => {
      document.getElementById('fileSize').textContent =
        (r.headers.get('content-length') / 1024).toFixed(1) + ' KB';
      document.getElementById('timestamp').textContent =
        'Updated: ' + r.headers.get('last-modified');
    });

    (function () {
      const canvas = document.getElementById('farm-canvas');
      const btn = document.getElementById('camera-snapshot-btn');
      const toast = document.getElementById('camera-toast');

      let canvasReady = false;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvasReady = true;
        btn.disabled = false;
        btn.title = '导出农场快照 PNG';
      };
      img.onerror = function () {
        canvasReady = false;
        btn.disabled = true;
        showToast('画布加载失败，无法导出');
      };
      img.src = '/farm.png';

      function exportSnapshot() {
        if (!canvasReady) {
          showToast('画布尚未就绪，请稍候…');
          return;
        }
        const ctx = canvas.getContext('2d');
        let hasContent = false;
        try {
          const sample = ctx.getImageData(
            Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1
          ).data;
          hasContent = sample[3] > 0;
        } catch (e) {
          hasContent = true;
        }
        if (!hasContent) {
          showToast('画布仍为空白，暂不导出');
          return;
        }

        canvas.toBlob(function (blob) {
          if (!blob) {
            showToast('导出失败，请重试');
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const now = new Date();
          const pad = (n) => String(n).padStart(2, '0');
          const stamp = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + '-' + pad(now.getHours()) + '-' + pad(now.getMinutes());
          a.href = url;
          a.download = 'github-farm-' + stamp + '.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('已导出农场快照 PNG');
        }, 'image/png');
      }

      let toastTimer = null;
      function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
          toast.classList.remove('show');
        }, 1800);
      }

      btn.addEventListener('click', exportSnapshot);
    })();
  </script>
</body>
</html>`;

const MIME = { '.png': 'image/png', '.html': 'text/html' };

async function start() {
  const username = process.env.FARM_USERNAME || 'YeatsLiao';
  const useMock = !process.env.GITHUB_TOKEN;

  console.log('\n  GitHub Farm Dev Server');
  console.log('  ─────────────────────');
  console.log(`  Username: ${username}`);
  console.log(`  Mode: ${useMock ? 'Mock (set GITHUB_TOKEN for real data)' : 'Real API'}`);

  await generateFarm({
    username,
    token: process.env.GITHUB_TOKEN || '',
    mock: useMock,
    output: path.resolve(DIST, 'farm.png'),
  });

  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HTML);
      return;
    }

    const filePath = path.join(DIST, path.basename(req.url));
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Content-Length': stat.size,
        'Last-Modified': stat.mtime.toUTCString(),
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n  Preview: ${url}`);
    console.log('  Ctrl+C to stop\n');

    // 自动打开浏览器
    if (!global.__farmOpened) {
      global.__farmOpened = true;
      const cmd = process.platform === 'darwin' ? 'open'
        : process.platform === 'win32' ? 'start' : 'xdg-open';
      import('child_process').then(cp => cp.exec(`${cmd} ${url}`));
    }
  });
}

start().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
