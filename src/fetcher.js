/**
 * fetcher.js - GitHub API contribution data fetcher
  *
 * Fetches user contribution data via GitHub GraphQL API
 * and returns structured data for farm visualization.
 */

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphlq';

const CONTRIBUTION_QUERY = `
  query($username: String!) {
    user(login: $username) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
              weekday
            }
          }
        }
      }
      repositoriesContributedTo(first: 100, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) {
        totalCount
      }
      pullRequests { totalCount }
      issues { totalCount }
      repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: STARGAZERS, direction: DESC}) {
        nodes {
          name
          primaryLanguage { name color }
          stargazerCount
        }
      }
    }
  }
`;

export async function fetchContributions(username, token) {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: CONTRIBUTION_QUERY,
      variables: { username },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${error}`);
  }

  const { data, errors } = await response.json();
  if (errors) throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`);
  return parseResponse(data.user);
}

function parseResponse(userData) {
  const calendar = userData.contributionsCollection.contributionCalendar;
  const weeks = calendar.weeks.map(week => ({
    days: week.contributionDays.map(day => ({
      count: day.contributionCount,
      date: day.date,
      weekday: day.weekday,
      level: getContributionLevel(day.contributionCount),
    })),
  }));

  const streak = calculateStreak(weeks);
  const languages = parseLanguages(userData.repositories.nodes);

  return {
    totalContributions: calendar.totalContributions,
    weeks,
    streak,
    totalPRs: userData.pullRequests.totalCount,
    totalIssues: userData.issues.totalCount,
    totalRepos: userData.repositoriesContributedTo.totalCount,
    languages,
    season: getCurrentSeason(),
  };
}

function getContributionLevel(count) {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 10) return 3;
  return 4;
}

function calculateStreak(weeks) {
  let current = 0, longest = 0, tempStreak = 0;
  const allDays = weeks.flatMap(w => w.days);

  for (let i = allDays.length - 1; i >= 0; i--) {
    if (allDays[i].count > 0) current++;
    else break;
  }
  for (const day of allDays) {
    if (day.count > 0) { tempStreak++; longest = Math.max(longest, tempStreak); }
    else tempStreak = 0;
  }
  return { current, longest };
}

function parseLanguages(repos) {
  const langMap = new Map();
  for (const repo of repos) {
    if (repo.primaryLanguage) {
      const { name, color } = repo.primaryLanguage;
      const existing = langMap.get(name);
      if (existing) existing.count++;
      else langMap.set(name, { name, color, count: 1 });
    }
  }
  return Array.from(langMap.values()).sort((a, b) => b.count - a.count).slice(0, 8);
}

function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export function generateMockData() {
  const weeks = [];
  let totalContributions = 0;
  for (let w = 0; w < 52; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const r = Math.random();
      const count = r < 0.25 ? 0 : r < 0.45 ? Math.floor(Math.random() * 3) + 1
        : r < 0.65 ? Math.floor(Math.random() * 4) + 4
        : r < 0.85 ? Math.floor(Math.random() * 5) + 7
        : Math.floor(Math.random() * 10) + 11;
      totalContributions += count;
      days.push({
        count, date: new Date(2025, 0, 1 + w * 7 + d).toISOString().split('T')[0],
        weekday: d, level: getContributionLevel(count),
      });
    }
    weeks.push({ days });
  }
  return {
    totalContributions, weeks,
    streak: { current: 12, longest: 45 },
    totalPRs: 67, totalIssues: 34, totalRepos: 28,
    languages: [
      { name: 'JavaScript', color: '#f1e05a', count: 15 },
      { name: 'Python', color: '#3572A5', count: 10 },
      { name: 'Java', color: '#b07219', count: 8 },
      { name: 'TypeScript', color: '#3178c6', count: 6 },
      { name: 'Go', color: '#00AED8', count: 3 },
    ],
    season: getCurrentSeason(),
  };
}
