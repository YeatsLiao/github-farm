/** 本地动态农场样板；仅监听回环地址，不作为生产托管服务。 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchContributions } from './src/fetcher.js';
import { createDemoData, createFarmScene } from './src/living-farm.js';
import { renderLivingFarm } from './src/renderer.js';
import { generateFarm } from './src/index.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FILES = new Map([
  ['/', ['web/index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['web/index.html', 'text/html; charset=utf-8']],
  ['/web/style.css', ['web/style.css', 'text/css; charset=utf-8']],
  ['/web/app.js', ['web/app.js', 'text/javascript; charset=utf-8']],
  ['/src/living-farm.js', ['src/living-farm.js', 'text/javascript; charset=utf-8']],
  ['/src/art-catalog.js', ['src/art-catalog.js', 'text/javascript; charset=utf-8']],
  ['/src/farm-objects.js', ['src/farm-objects.js', 'text/javascript; charset=utf-8']],
  ['/src/farm-terrain.js', ['src/farm-terrain.js', 'text/javascript; charset=utf-8']],
  ['/assets/spring/catalog.png', ['assets/spring/catalog.png', 'image/png']],
  ['/assets/spring/catalog24.png', ['assets/spring/catalog.png', 'image/png']],
  ['/assets/spring/catalog40.png', ['assets/spring/catalog.png', 'image/png']],
  ['/assets/spring/resident-actions.png', ['assets/spring/resident-actions.png', 'image/png']],
  ['/assets/spring/background.png', ['assets/spring/background.png', 'image/png']],
  ['/assets/spring/sprites.png', ['assets/spring/sprites.png', 'image/png']],
  ['/assets/spring/manifest.json', ['assets/spring/manifest.json', 'application/json; charset=utf-8']],
  ['/farm.png', ['dist/farm.png', 'image/png']],
]);
function fail(status, message) { return Object.assign(new Error(message), { status }); }
function send(res, status, body, type = 'application/json; charset=utf-8', head = false) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': type, 'Content-Length': buffer.length, 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  });
  res.end(head ? undefined : buffer);
}

export function createPreviewServer({ token = process.env.GITHUB_TOKEN || '', defaultUsername = process.env.FARM_USERNAME || 'YeatsLiao', fetchData = fetchContributions } = {}) {
  const cache = new Map(), inflight = new Map();
  let minute = Date.now(), requests = 0;
  async function getScene(params) {
    const username = (params.get('user') || defaultUsername).trim();
    if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username) || username.includes('--')) {
      throw fail(400, '无效的 GitHub 用户名');
    }
    const mode = params.get('mode') || 'demo', profile = params.get('profile') || 'medium';
    if (!['demo', 'github'].includes(mode)) throw fail(400, '不支持的数据来源');
    if (!['low', 'medium', 'high'].includes(profile)) throw fail(400, '不支持的演示档位');
    if (mode === 'demo') return createFarmScene(createDemoData(profile, username), username);
    if (!token) throw fail(503, '尚未配置服务端 GITHUB_TOKEN，请先使用演示数据。');
    const key = username.toLowerCase();
    const stored = cache.get(key);
    if (stored && stored.expires > Date.now()) return createFarmScene(stored.data, username);
    if (!inflight.has(key)) {
      if (Date.now() - minute >= 60000) { minute = Date.now(); requests = 0; }
      if (requests >= 20 || inflight.size >= 4) throw fail(429, '请求较多，请稍后再试。');
      requests++;
      const pending = (async () => {
        try {
          const data = await fetchData(username, token);
          if (cache.size >= 64) cache.delete(cache.keys().next().value);
          cache.set(key, { data, expires: Date.now() + 600000 });
          return data;
        } catch (error) {
          if (error.code === 'USER_NOT_FOUND') throw fail(404, '没有找到这个 GitHub 用户。');
          throw fail(502, 'GitHub 数据暂时不可用，请检查服务端 Token、网络或 API 额度后重试。');
        }
      })();
      inflight.set(key, pending);
      // 使用两条清理回调，避免 finally 派生出未处理的拒绝 Promise。
      pending.then(() => inflight.delete(key), () => inflight.delete(key));
    }
    return createFarmScene(await inflight.get(key), username);
  }
  return http.createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); throw fail(405, '仅支持 GET 和 HEAD'); }
      const head = req.method === 'HEAD';
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
      if (url.pathname === '/api/config') {
        send(res, 200, { githubAvailable: Boolean(token), defaultUsername }, undefined, head); return;
      }
      if (url.pathname === '/api/farm' || url.pathname === '/api/preview.png') {
        const scene = await getScene(url.searchParams);
        if (url.pathname.endsWith('.png')) {
          const png = await renderLivingFarm(scene, 1536, 1024, { evening: url.searchParams.get('evening') === '1' });
          send(res, 200, png, 'image/png', head);
        } else send(res, 200, scene, undefined, head);
        return;
      }
      const file = FILES.get(url.pathname);
      if (!file) throw fail(404, '未找到资源');
      send(res, 200, await readFile(path.resolve(ROOT, file[0])), file[1], head);
    } catch (error) {
      send(res, error.status || 500, { error: error.status ? error.message : '服务暂时不可用，请检查本地资源文件。' }, undefined, req.method === 'HEAD');
    }
  });
}

async function start() {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 必须是 1–65535 的整数');
  await generateFarm({ mock: true, username: process.env.FARM_USERNAME || 'YeatsLiao' });
  const server = createPreviewServer();
  server.on('error', error => { console.error(`启动失败：${error.message}`); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => {
    console.log(`\n春日动态农场：http://127.0.0.1:${port}`);
    console.log('默认展示确定性演示数据；配置 GITHUB_TOKEN 后可在页面切换真实数据。');
    console.log('Ctrl+C 停止服务。');
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start().catch(error => { console.error(error.message); process.exitCode = 1; });
}
