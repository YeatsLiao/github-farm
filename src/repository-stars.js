const API = 'https://api.github.com';
const DAY = 86_400;
const WEEK = 7 * DAY;

export class RepositoryLookupError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function parseRepository(input) {
  const pair = /^([a-z\d](?:[a-z\d-]{0,37}[a-z\d])?)\/([a-z\d_.-]{1,100})$/i.exec(input ?? '');
  if (!pair || ['.', '..'].includes(pair[2]) || /\.git$/i.test(pair[2])) {
    throw new RepositoryLookupError('Use a GitHub repository in OWNER/REPO format', 400);
  }
  return {owner: pair[1], repo: pair[2]};
}

// Measure the previous seven complete GitHub day buckets, excluding today's
// partial bucket. GitHub's weekly timestamp supplies the bucket alignment.
export function recentStarCount(weeks, fetchedAt, createdAt) {
  if (!Array.isArray(weeks) || !weeks.length) return null;
  const now = Math.floor(Date.parse(fetchedAt) / 1000);
  const created = Math.floor(Date.parse(createdAt) / 1000);
  if (!Number.isFinite(now)) return null;
  const origin = weeks[0]?.week;
  if (!Number.isSafeInteger(origin)) return null;
  const current = origin + Math.floor((now - origin) / DAY) * DAY;
  const counts = new Map();
  for (const {week, days} of weeks) {
    if (!Number.isSafeInteger(week) || (week - origin) % WEEK !== 0 || !Array.isArray(days) || days.length !== 7) return null;
    for (const [i, count] of days.entries()) {
      if (!Number.isSafeInteger(count) || count < 0) return null;
      counts.set(week + i * DAY, count);
    }
  }
  let total = 0;
  for (let day = current - WEEK; day < current; day += DAY) {
    if (counts.has(day)) total += counts.get(day);
    else if (!(day + DAY <= created)) return null;
  }
  return total;
}

export async function fetchRepositoryStars(name, {fetchImpl = fetch, token = globalThis.process?.env?.STAR_FARM_GITHUB_TOKEN, now = () => Date.now(), timeoutMs = 5_000} = {}) {
  const {owner, repo} = parseRepository(name);
  const headers = {'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10'};
  if (token) headers.Authorization = `Bearer ${token}`;
  const signal = AbortSignal.timeout(timeoutMs);
  const get = path => fetchImpl(`${API}${path}`, {headers, signal});

  let repository;
  try {
    const response = await get(`/repos/${owner}/${repo}`);
    const rateLimited = response.status === 429 || (response.status === 403
      && (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after')));
    if (rateLimited) throw new RepositoryLookupError('GitHub API rate limit reached', 429);
    if ([403, 404, 451].includes(response.status)) throw new RepositoryLookupError('Repository unavailable', 404);
    if (!response.ok) throw new RepositoryLookupError('GitHub temporarily unavailable', 503);
    repository = await response.json();
  } catch (error) {
    if (error instanceof RepositoryLookupError) throw error;
    throw new RepositoryLookupError('GitHub temporarily unavailable', 503);
  }
  if (repository.visibility !== 'public' || repository.private !== false) throw new RepositoryLookupError('Repository unavailable', 404);
  if (!Number.isSafeInteger(repository.id) || repository.id <= 0 || !Number.isSafeInteger(repository.stargazers_count) || repository.stargazers_count < 0 || typeof repository.full_name !== 'string') {
    throw new RepositoryLookupError('GitHub returned invalid repository data', 503);
  }

  const fetchedAt = new Date(now()).toISOString();
  let newStars7d = null;
  try {
    const canonical = parseRepository(repository.full_name);
    const history = await get(`/repos/${canonical.owner}/${canonical.repo}/stargazers/history?per_page=3`);
    if (history.ok) newStars7d = recentStarCount(await history.json(), fetchedAt, repository.created_at);
  } catch {
    // The total is still valid if GitHub cannot return history.
  }
  return {
    repositoryId: String(repository.id), fullName: repository.full_name,
    stars: repository.stargazers_count, newStars7d, fetchedAt, source: 'github',
  };
}
