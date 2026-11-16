"""
fetcher.py - GitHub contribution data fetcher (Python 版)

复刻 src/fetcher.js 的数据形态，支持两种数据来源：
  1. GitHub GraphQL API（需 token）
  2. mock 数据（无需网络，用于本地开发与对比验证）

返回结构（与 fetcher.js 保持一致）:
  {
    total_contributions: int,
    weeks: [ { days: [ { count, date, weekday, level } ] } ],
    streak: { current, longest },
    total_prs: int,
    total_issues: int,
    total_repos: int,
    languages: [ { name, color, count } ],
    season: str,
  }
"""

import datetime
import json
import random
import urllib.request

GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"

CONTRIBUTION_QUERY = """
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
"""


def get_contribution_level(count: int) -> int:
    """复刻 fetcher.js getContributionLevel"""
    if count == 0:
        return 0
    if count <= 3:
        return 1
    if count <= 6:
        return 2
    if count <= 10:
        return 3
    return 4


def get_current_season() -> str:
    """复刻 fetcher.js getCurrentSeason"""
    month = datetime.date.today().month
    if 3 <= month <= 5:
        return "spring"
    if 6 <= month <= 8:
        return "summer"
    if 9 <= month <= 11:
        return "autumn"
    return "winter"


def calculate_streak(weeks):
    """复刻 fetcher.js calculateStreak"""
    all_days = [day for week in weeks for day in week["days"]]
    current = 0
    for day in reversed(all_days):
        if day["count"] > 0:
            current += 1
        else:
            break
    longest = 0
    temp = 0
    for day in all_days:
        if day["count"] > 0:
            temp += 1
            longest = max(longest, temp)
        else:
            temp = 0
    return {"current": current, "longest": longest}


def parse_languages(repos) -> list:
    """复刻 fetcher.js parseLanguages"""
    lang_map = {}
    for repo in repos:
        lang = repo.get("primaryLanguage")
        if lang:
            name, color = lang.get("name"), lang.get("color")
            if name:
                if name in lang_map:
                    lang_map[name]["count"] += 1
                else:
                    lang_map[name] = {"name": name, "color": color, "count": 1}
    langs = sorted(lang_map.values(), key=lambda l: l["count"], reverse=True)
    return langs[:8]


def parse_response(user_data) -> dict:
    """复刻 fetcher.js parseResponse"""
    calendar = user_data["contributionsCollection"]["contributionCalendar"]
    weeks = []
    for week in calendar["weeks"]:
        days = [
            {
                "count": day["contributionCount"],
                "date": day["date"],
                "weekday": day["weekday"],
                "level": get_contribution_level(day["contributionCount"]),
            }
            for day in week["contributionDays"]
        ]
        weeks.append({"days": days})

    streak = calculate_streak(weeks)
    languages = parse_languages(user_data["repositories"].get("nodes", []))

    return {
        "total_contributions": calendar["totalContributions"],
        "weeks": weeks,
        "streak": streak,
        "total_prs": user_data["pullRequests"]["totalCount"],
        "total_issues": user_data["issues"]["totalCount"],
        "total_repos": user_data["repositoriesContributedTo"]["totalCount"],
        "languages": languages,
        "season": get_current_season(),
    }


def fetch_contributions(username: str, token: str) -> dict:
    """通过 GitHub GraphQL API 抓取贡献数据"""
    payload = json.dumps({
        "query": CONTRIBUTION_QUERY,
        "variables": {"username": username},
    }).encode("utf-8")

    req = urllib.request.Request(GITHUB_GRAPHQL_URL, data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"GitHub API error ({e.code}): {e.read().decode('utf-8')}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"GitHub API network error: {e.reason}") from e

    if data.get("errors"):
        raise RuntimeError(f"GraphQL errors: {json.dumps(data['errors'])}")
    if not data.get("data", {}).get("user"):
        raise RuntimeError(f"User '{username}' not found or token lacks permission")

    return parse_response(data["data"]["user"])


def generate_mock_data(seed=None) -> dict:
    """复刻 fetcher.js generateMockData：生成 52 周模拟贡献数据"""
    rng = random.Random(seed)
    weeks = []
    total_contributions = 0
    start = datetime.date(2025, 1, 1)

    for w in range(52):
        days = []
        for d in range(7):
            r = rng.random()
            if r < 0.35:
                count = 0
            elif r < 0.55:
                count = rng.randint(1, 3)
            elif r < 0.75:
                count = rng.randint(3, 5)
            elif r < 0.90:
                count = rng.randint(6, 8)
            else:
                count = rng.randint(9, 12)
            total_contributions += count
            date = (start + datetime.timedelta(weeks=w, days=d)).isoformat()
            days.append({
                "count": count,
                "date": date,
                "weekday": d,
                "level": get_contribution_level(count),
            })
        weeks.append({"days": days})

    return {
        "total_contributions": total_contributions,
        "weeks": weeks,
        "streak": {"current": 12, "longest": 45},
        "total_prs": 67,
        "total_issues": 34,
        "total_repos": 28,
        "languages": [
            {"name": "JavaScript", "color": "#f1e05a", "count": 15},
            {"name": "Python", "color": "#3572A5", "count": 10},
            {"name": "Java", "color": "#b07219", "count": 8},
            {"name": "TypeScript", "color": "#3178c6", "count": 6},
            {"name": "Go", "color": "#00AED8", "count": 3},
        ],
        "season": get_current_season(),
    }
