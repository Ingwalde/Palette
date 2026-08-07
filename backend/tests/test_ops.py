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
