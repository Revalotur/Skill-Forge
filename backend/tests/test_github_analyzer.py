from app.services.github_analyzer import (
    GithubFetchError,
    _parse_pushed_at,
    _top_repos,
)


def test_github_fetch_error_is_exception():
    assert issubclass(GithubFetchError, Exception)


def test_github_fetch_error_has_status_code():
    err = GithubFetchError("x", status_code=404)
    assert err.status_code == 404
    assert GithubFetchError("y").status_code == 400


def test_parse_pushed_at_valid():
    dt = _parse_pushed_at("2026-08-01T10:00:00Z")
    assert dt is not None
    assert dt.year == 2026


def test_parse_pushed_at_invalid_returns_none():
    assert _parse_pushed_at("not-a-date") is None
    assert _parse_pushed_at(None) is None
    assert _parse_pushed_at("") is None


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
