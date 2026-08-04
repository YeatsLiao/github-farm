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
    .farm-img { width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.5); image-rendering: pixelated; }
    .info { margin-top: 16px; display: flex; gap: 24px; font-size: 14px; color: #888; }
    footer { padding: 16px 24px; text-align: center; font-size: 12px; color: #555; }
  </style>
</head>
<body>
  <header>
    <h1>GitHub Farm</h1>
    <span class="badge">Preview</span>
  </header>
  <main>
    <img class="farm-img" src="/farm.png" alt="Farm Preview">
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
