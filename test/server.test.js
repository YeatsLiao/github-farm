import { once } from 'node:events';
import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchRepositoryStars, recentStarCount, RepositoryLookupError } from '../src/repository-stars.js';
import { createStarFarmServer } from '../src/server.js';

test('history combines the two weeks without including the current partial day', () => {
  const day = 86_400;
  const sunday = Date.parse('2026-11-15T00:00:00Z') / 1000;
  const weeks = [
    {week: sunday, days: [8, 99, 0, 0, 0, 0, 0]},
    {week: sunday - 7 * day, days: [1, 2, 3, 4, 5, 6, 7]},
  ];
  assert.equal(recentStarCount(weeks, '2026-11-16T12:00:00Z'), 35);
  assert.equal(recentStarCount(weeks.slice(0, 1), '2026-11-16T12:00:00Z'), null);
  assert.equal(recentStarCount(weeks.slice(0, 1), '2026-11-16T12:00:00Z', '2026-11-15T08:00:00Z'), 8);
});

test('repository data uses a stable numeric ID and tolerates unavailable history', async () => {
  const repository = {id: 123, full_name: 'owner/renamed', private: false, visibility: 'public', stargazers_count: 8};
  const urls = [];
  const fetchImpl = async url => {
    urls.push(url);
    return urls.length === 1 ? Response.json(repository) : new Response(null, {status: 404});
  };
  const snapshot = await fetchRepositoryStars('owner/original', {fetchImpl, token: ''});
  assert.equal(snapshot.repositoryId, '123');
  assert.equal(snapshot.stars, 8);
  assert.equal(snapshot.newStars7d, null);
  assert.ok(urls[1].includes('/owner/renamed/'));
  await assert.rejects(fetchRepositoryStars('owner/private', {
    fetchImpl: async () => Response.json({...repository, private: true, visibility: 'private'}), token: '',
  }), {status: 404});
});

test('PNG endpoint shares in-flight work, supports ETags, expires stale cards and clears deleted repos', async t => {
  const hour = 3_600_000;
  let clock = Date.parse('2026-11-15T10:00:00Z');
  let calls = 0;
  let error;
  const server = createStarFarmServer({
    now: () => clock,
    lookup: async name => {
      calls++;
      if (error) throw error;
      return {repositoryId: '123', fullName: name, stars: 5, newStars7d: 2, source: 'github', fetchedAt: new Date(clock).toISOString()};
    },
  });
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/v1/farm`;
  const url = `${base}/owner/farm.png`;
  const [first, duplicate] = await Promise.all([fetch(url), fetch(`${base}/Owner/Farm.png`)]);
  const png = Buffer.from(await first.arrayBuffer());
  assert.equal(first.headers.get('content-type'), 'image/png');
  assert.equal(png.readUInt32BE(16), 1280);
  assert.equal(png.readUInt32BE(20), 960);
  assert.deepEqual(Buffer.from(await duplicate.arrayBuffer()), png);
  assert.equal(calls, 1);
  const etag = first.headers.get('etag');
  assert.equal((await fetch(url, {headers: {'If-None-Match': `W/${etag}`}})).status, 304);
  const head = await fetch(url, {method: 'HEAD'});
  assert.equal(Number(head.headers.get('content-length')), png.length);
  assert.equal((await head.arrayBuffer()).byteLength, 0);

  error = new RepositoryLookupError('unavailable', 503);
  clock += hour;
  const stale = await fetch(url);
  assert.equal(stale.status, 200);
  assert.notEqual(stale.headers.get('etag'), etag);
  assert.equal(stale.headers.get('cache-control'), 'public, max-age=30');
  clock += 23 * hour;
  assert.equal((await fetch(url)).status, 503);
  error = undefined;
  assert.equal((await fetch(url)).status, 200);
  clock += hour;
  error = new RepositoryLookupError('not found', 404);
  assert.equal((await fetch(url)).status, 404);
  clock += 60_000;
  error = new RepositoryLookupError('unavailable', 503);
  assert.equal((await fetch(url)).status, 503);
});
