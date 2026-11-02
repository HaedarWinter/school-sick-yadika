import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200

@pytest.mark.asyncio
async def test_session_flow(client):
    r = await client.post("/api/session", json={"character": "cat"})
    assert r.status_code == 200
    sid = r.json()["session_id"]

    r = await client.get("/api/leaderboard")
    assert r.status_code == 200

    r = await client.post("/api/leaderboard", json={
        "session_id": sid, "character": "LILY", "score": 100,
        "survivalTime": 42, "nickname": "Tester"
    })
    assert r.status_code == 200

    r = await client.post("/api/leaderboard", json={
        "session_id": sid, "character": "LILY", "score": 100,
        "survivalTime": 42, "nickname": "Tester2"
    })
    assert r.status_code == 409

    r = await client.get("/api/leaderboard")
    assert r.status_code == 200
    assert r.json()["scores"][0]["nickname"] == "Tester"
