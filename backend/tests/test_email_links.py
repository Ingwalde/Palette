"""The links we email must match the routes the React app actually serves.

The vanilla frontend (verify.html / reset-password.html) was removed at the v4.8.0 cutover.
nginx serves index.html for any unknown path, so a stale link does not 404 — React Router
falls through to its `path="*"` catch-all and renders "Not found". These tests pin the
exact path so that regression cannot come back silently.

Source of truth: frontend-react/src/App.tsx.
"""

from urllib.parse import parse_qs, urlparse

import pytest
from app.config import Settings
from app.email_service import build_reset_link, build_verification_link

# (link builder, the React route it must land on) — see frontend-react/src/App.tsx.
REACT_ROUTES = [
    (build_verification_link, "/verify"),
    (build_reset_link, "/reset-password"),
]


@pytest.mark.parametrize("builder,route", REACT_ROUTES)
def test_link_path_matches_react_route(builder, route):
    parsed = urlparse(builder("tok123"))
    assert parsed.path == route
    assert parse_qs(parsed.query)["token"] == ["tok123"]


@pytest.mark.parametrize("builder,_route", REACT_ROUTES)
def test_link_has_no_html_suffix(builder, _route):
    """React Router matches extensionless paths; a .html suffix hits the catch-all."""
    assert ".html" not in builder("tok123")


def test_trailing_slash_in_base_url_does_not_double_up():
    """PUBLIC_BASE_URL with a trailing slash must not produce //verify."""
    configured = Settings(public_base_url="https://palette.example/")
    assert configured.public_base_url == "https://palette.example"
