async def test_health_liveness(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


async def test_health_readiness_reports_database(client):
    resp = await client.get("/health/ready")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ready"
    # The test DB is reachable, so the database check passes. Redis is not configured in tests
    # (memory:// limiter), so it is not part of the checks.
    assert body["checks"]["database"] == "ok"
    assert "redis" not in body["checks"]


async def test_api_responses_carry_security_headers(client):
    """These lived only in the SPA's nginx config, so the API sent none of them.

    The README described them as a backend feature; this is what makes that true. HSTS is
    absent here on purpose — it is only sent over https, and the test client speaks http.
    """
    resp = await client.get("/api/v1/palettes")

    assert resp.headers["X-Content-Type-Options"] == "nosniff"
    assert resp.headers["X-Frame-Options"] == "DENY"
    assert resp.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "frame-ancestors 'none'" in resp.headers["Content-Security-Policy"]
    assert "Strict-Transport-Security" not in resp.headers


async def test_error_responses_carry_them_too(client):
    """A 404 is a response a browser can be made to load; it needs the headers as much."""
    resp = await client.get("/api/v1/palettes/no-such-slug")
    assert resp.status_code == 404
    assert resp.headers["X-Content-Type-Options"] == "nosniff"
