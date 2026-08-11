from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"
MAX_REPOS = 5
MAX_ROOT_ITEMS = 30
ACTIVE_DAYS = 90

_SESSION_HEADERS = {"Accept": "application/vnd.github+json"}


class GithubFetchError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def _headers() -> dict[str, str]:
    headers = dict(_SESSION_HEADERS)
    if settings.github_token:
        headers["Authorization"] = f"Bearer {settings.github_token}"
    return headers


async def _get(client: httpx.AsyncClient, path: str) -> Any:
    resp = await client.get(f"{GITHUB_API}{path}")
    if resp.status_code == 404:
        raise GithubFetchError("Username GitHub tidak ditemukan", status_code=404)
    if resp.status_code == 429 or (
        resp.status_code == 403 and resp.headers.get("x-ratelimit-remaining") == "0"
    ):
        raise GithubFetchError(
            "Rate limit GitHub API tercapai. Tunggu beberapa menit atau atur GITHUB_TOKEN.",
            status_code=429,
        )
    resp.raise_for_status()
    return resp.json()


def _parse_pushed_at(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _score_profile(profile: dict[str, Any]) -> tuple[int, list[str]]:
    points = 0
    recs: list[str] = []
    checks = [
        ("name", 4),
        ("bio", 3),
        ("location", 2),
        ("blog", 2),
    ]
    for field, pts in checks:
        if profile.get(field):
            points += pts
        elif field == "bio":
            recs.append("Tambahkan bio di profil GitHub (bidang yang kamu tekuni).")
        elif field == "blog":
            recs.append("Isi kolom website/blog di profil GitHub.")
    if int(profile.get("followers", 0) or 0) >= 5:
        points += 5
    else:
        recs.append("Aktif berkontribusi di repo orang lain agar lebih dikenal.")
    if int(profile.get("public_repos", 0) or 0) >= 3:
        points += 4
    else:
        recs.append("Publikasikan minimal 3 repo (project pribadi pun boleh).")
    return min(points, 20), recs


def _top_repos(repos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    def stars(r: dict[str, Any]) -> int:
        try:
            return int(r.get("stargazers_count", 0) or 0)
        except (TypeError, ValueError):
            return 0

    return sorted(repos, key=stars, reverse=True)[:MAX_REPOS]


def _repo_score(top: list[dict[str, Any]]) -> int:
    total_stars = sum(int(r.get("stargazers_count", 0) or 0) for r in top)
    if total_stars >= 20:
        return 10
    if total_stars >= 5:
        return 6
    if top:
        return 3
    return 0


async def _analyze_repo_root(
    client: httpx.AsyncClient, owner: str, repo: dict[str, Any]
) -> dict[str, Any]:
    name = repo["name"]
    try:
        items = await _get(client, f"/repos/{owner}/{name}/contents")
    except (GithubFetchError, httpx.HTTPError) as exc:
        logger.info("Repo %s root gagal dibaca: %s", name, exc)
        return {"has_readme": False, "has_license": False, "has_ci": False, "has_tests": False}

    names = [i.get("name", "").lower() for i in items[:MAX_ROOT_ITEMS]] if isinstance(items, list) else []
    return {
        "has_readme": any(n.startswith("readme") for n in names),
        "has_license": any("license" in n or n == "copying" for n in names),
        "has_ci": any(n == ".github" or "workflow" in n or n == ".gitlab-ci.yml" for n in names),
        "has_tests": any("test" in n or "spec" in n for n in names),
    }


async def _analyze_top_repos(
    client: httpx.AsyncClient, username: str, top: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    async def _enrich(repo: dict[str, Any]) -> dict[str, Any]:
        return {
            "name": repo["name"],
            "description": repo.get("description") or "",
            "stars": int(repo.get("stargazers_count", 0) or 0),
            "forks": int(repo.get("forks_count", 0) or 0),
            "language": repo.get("language"),
            "is_fork": bool(repo.get("fork", False)),
            "pushed_at": repo.get("pushed_at"),
            **await _analyze_repo_root(client, username, repo),
        }

    return list(await asyncio.gather(*(_enrich(repo) for repo in top)))


async def fetch_github_profile(username: str) -> dict[str, Any]:
    """Ambil profil + repos publik, analisis best-practices, hitung skor 0-85."""
    async with httpx.AsyncClient(timeout=15, headers=_headers()) as client:
        try:
            profile = await _get(client, f"/users/{username}")
            repos = await _get(client, f"/users/{username}/repos?sort=pushed&per_page=100")
        except GithubFetchError:
            raise
        except httpx.HTTPError as exc:
            logger.warning("GitHub API error untuk %s: %s", username, exc)
            raise GithubFetchError(
                "Layanan GitHub sedang gangguan, coba lagi nanti.", status_code=502
            ) from exc
        if not isinstance(repos, list):
            repos = []
        top = _top_repos(repos)
        repo_details = await _analyze_top_repos(client, username, top)

    techs = sorted({r.get("language") for r in repo_details if r.get("language")})
    readmes = [r for r in repo_details if r["has_readme"]]
    licenses = [r for r in repo_details if r["has_license"]]
    cis = [r for r in repo_details if r["has_ci"]]
    tests = [r for r in repo_details if r["has_tests"]]

    cutoff = datetime.now(timezone.utc) - timedelta(days=ACTIVE_DAYS)
    active = [r for r in repo_details if (parsed := _parse_pushed_at(r.get("pushed_at"))) and parsed >= cutoff]

    score, recs = _score_profile(profile)
    score += _repo_score(repo_details)
    if len(repo_details) and len(readmes) == len(repo_details):
        score += 15
    elif readmes:
        score += int(15 * len(readmes) / len(repo_details))
    else:
        recs.append("Tambahkan README di setiap repo agar project terlihat profesional.")
    if len(repo_details) and len(licenses) >= max(1, len(repo_details) // 2):
        score += 10
    else:
        recs.append("Tambahkan LICENSE (MIT) di repo public utama.")
    if cis:
        score += 10
    else:
        recs.append("Pasang CI sederhana (GitHub Actions) di salah satu repo.")
    if tests:
        score += 10
    else:
        recs.append("Tambahkan direktori test/ atau spec/ di project utama.")
    if active:
        score += 10
    else:
        recs.append("Aktifkan kembali repo agar profil terlihat produktif.")

    score = max(0, min(100, score))

    return {
        "username": username,
        "source": "github",
        "profile": {
            "name": profile.get("name") or "",
            "bio": profile.get("bio") or "",
            "avatar_url": profile.get("avatar_url") or "",
            "followers": int(profile.get("followers", 0) or 0),
            "following": int(profile.get("following", 0) or 0),
            "public_repos": int(profile.get("public_repos", 0) or 0),
            "location": profile.get("location") or "",
            "blog": profile.get("blog") or "",
            "html_url": profile.get("html_url") or "",
        },
        "repos": repo_details,
        "tech_stack": techs,
        "best_practices": {
            "readme_count": len(readmes),
            "license_count": len(licenses),
            "ci_count": len(cis),
            "test_count": len(tests),
        },
        "score": score,
        "recommendations": list(dict.fromkeys(recs))[:6],
    }
