import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createStarterScene } from './farm/scene.js';
import { fetchRepositoryStars, parseRepository, RepositoryLookupError } from './repository-stars.js';
import { renderStarCard, renderStarError } from './render/card.js';

const HOUR = 3_600_000;
const MAX_STALE = 24 * HOUR;

function imageResponse(png) {
  return {png, etag: `"${createHash('sha256').update(png).digest('hex')}"`};
}

export function createStarFarmServer({lookup = fetchRepositoryStars, now = Date.now, maxEntries = 64, maxPending = 4} = {}) {
  const cache = new Map();
  const pending = new Map();
  const unavailable = renderStarError('Repository unavailable');
  const expired = renderStarError('GitHub temporarily unavailable');
  const invalid = renderStarError('Use /v1/farm/OWNER/REPO.png');

  function save(key, entry) {
    cache.delete(key);
    cache.set(key, entry);
    while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
  }

  async function refresh(key, name, previous) {
    let snapshot;
    try {
      snapshot = await lookup(name);
    } catch (error) {
      const missing = error instanceof RepositoryLookupError && error.status === 404;
      if (missing) {
        save(key, {status: 404, refreshed: now(), retryAt: now() + 60_000, png: unavailable});
        return cache.get(key);
      }
      const canReuse = previous?.status === 200 && now() - previous.refreshed < MAX_STALE;
      if (!canReuse) throw error;
      const stale = previous.stale ? previous : {
        ...previous, stale: true,
        ...imageResponse(await renderStarCard(createStarterScene({...previous.snapshot, stale: true}))),
      };
      stale.retryAt = Math.min(now() + 60_000, previous.refreshed + MAX_STALE);
      save(key, stale);
      return stale;
    }
    const entry = {
      status: 200, refreshed: now(), snapshot,
      ...imageResponse(await renderStarCard(createStarterScene(snapshot))),
    };
    save(key, entry);
    return entry;
  }

  async function resolve(name) {
    const key = name.toLowerCase();
    const entry = cache.get(key);
    if (entry) {
      const fresh = entry.status === 200 && !entry.stale && now() - entry.refreshed < HOUR;
      if (fresh || now() < (entry.retryAt ?? 0)) {
        save(key, entry);
        return entry;
      }
    }
    if (pending.has(key)) return pending.get(key);
    if (pending.size >= maxPending) throw new RepositoryLookupError('Service busy', 503);
    const request = refresh(key, name, entry).finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
  }

  function send(req, res, entry) {
    const remaining = Math.floor((entry.refreshed + HOUR - now()) / 1000);
    const ttl = Math.max(0, Math.min(300, remaining));
    const headers = {
      'Content-Type': 'image/png', 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': entry.status !== 200 ? 'no-store' : `public, max-age=${entry.stale ? 30 : ttl}`,
    };
    if (entry.etag) headers.ETag = entry.etag;
    const tags = req.headers['if-none-match']?.split(',').map(tag => tag.trim().replace(/^W\//, '')) ?? [];
    if (entry.etag && (tags.includes(entry.etag) || tags.includes('*'))) {
      res.writeHead(304, headers).end();
      return;
    }
    res.writeHead(entry.status, {...headers, 'Content-Length': entry.png.length});
    res.end(req.method === 'HEAD' ? undefined : entry.png);
  }

  return createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, {'Allow': 'GET, HEAD', 'Cache-Control': 'no-store'}).end();
      return;
    }
    if (req.url === '/healthz') {
      res.writeHead(200, {'Content-Type': 'text/plain', 'Cache-Control': 'no-store'});
      res.end(req.method === 'HEAD' ? undefined : 'ok\n');
      return;
    }
    const path = /^\/v1\/farm\/([^/?#]+)\/([^/?#]+)\.png$/.exec(req.url);
    if (!path) {
      send(req, res, {status: 404, png: invalid});
      return;
    }
    try {
      const name = `${path[1]}/${path[2]}`;
      parseRepository(name);
      send(req, res, await resolve(name));
    } catch (error) {
      const status = error instanceof RepositoryLookupError ? error.status : 503;
      send(req, res, {status, png: status === 400 ? invalid : expired});
    }
  });
}
