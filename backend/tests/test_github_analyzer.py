import pytest

from app.services.github_analyzer import GithubFetchError, _top_repos


def test_github_fetch_error_is_exception():
    assert issubclass(GithubFetchError, Exception)


def test_top_repos_sorts_by_stars():
    repos = [
        {"name": "a", "stargazers_count": 2},
        {"name": "b", "stargazers_count": 10},
        {"name": "c", "stargazers_count": 5},
    ]
    top = _top_repos(repos)
    assert [r["name"] for r in top] == ["b", "c", "a"]


def test_top_repos_handles_missing_stars():
    repos = [{"name": "x"}, {"name": "y", "stargazers_count": 1}]
    top = _top_repos(repos)
    assert top[0]["name"] == "y"


def test_top_repos_respects_max():
    repos = [{"name": f"r{i}", "stargazers_count": i} for i in range(10)]
    assert len(_top_repos(repos)) <= 5
