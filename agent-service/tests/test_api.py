from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_ta_hint_returns_tags() -> None:
    response = client.post(
        "/api/ta/hint",
        json={
            "playerId": "player-1",
            "portalId": "portal-cs-debugging",
            "question": "Binary search tests 3 and 4 are failing",
            "testOutput": "index error near upper bound",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert "hint" in body
    assert "off_by_one" in body["conceptTags"]


def test_quest_status_completed_from_output() -> None:
    response = client.post(
        "/api/quest/status",
        json={"playerId": "player-1", "portalId": "portal-cs-debugging", "testOutput": "All tests passed"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "completed"
