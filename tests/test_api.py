import sys
from fastapi.testclient import TestClient
from app import app, AGENTS

client = TestClient(app)

def test_all():
    print("[1] Test GET /api/agents...")
    res = client.get("/api/agents")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    agents = res.json()
    assert len(agents) == 7, f"Expected 7 agents, got {len(agents)}"
    agent_ids = {a["id"] for a in agents}
    assert agent_ids == set(AGENTS.keys()), f"Agent IDs mismatch: {agent_ids}"
    print(f"    OK: Found {len(agents)} agents: {list(agent_ids)}")

    print("[2] Test POST /api/tasks...")
    payload = {
        "title": "Probe Integration Test Task",
        "description": "Verification check by Probe",
        "assignee": "probe",
        "priority": "high"
    }
    res = client.post("/api/tasks", json=payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    task = res.json()
    assert task["id"] > 0
    assert task["title"] == payload["title"]
    assert task["assignee"] == "probe"
    assert task["status"] == "todo"
    task_id = task["id"]
    print(f"    OK: Created task #{task_id}")

    print("[3] Test GET /api/tasks...")
    res = client.get("/api/tasks")
    assert res.status_code == 200
    tasks = res.json()
    found = any(t["id"] == task_id for t in tasks)
    assert found, f"Task #{task_id} not found in /api/tasks"
    print(f"    OK: Task #{task_id} listed in /api/tasks")

    print("[4] Test PATCH /api/tasks/{task_id}...")
    res = client.patch(f"/api/tasks/{task_id}", json={"status": "done", "result": "Verified by Probe"})
    assert res.status_code == 200
    updated = res.json()
    assert updated["status"] == "done"
    assert updated["result"] == "Verified by Probe"
    print(f"    OK: Task #{task_id} updated to status=done")

    print("[5] Test Validation on invalid assignee...")
    res = client.post("/api/tasks", json={"title": "Hacker Task", "assignee": "evil_bot"})
    assert res.status_code == 400, f"Expected 400 on invalid assignee, got {res.status_code}"
    print("    OK: Rejected invalid assignee with 400")

    print("[6] Test Validation on invalid chat agent...")
    res = client.get("/api/chat/unknown_agent")
    assert res.status_code == 404, f"Expected 404 on invalid agent, got {res.status_code}"
    print("    OK: Rejected invalid agent chat endpoint with 404")

    print("[7] Test GET /api/activities...")
    res = client.get("/api/activities")
    assert res.status_code == 200
    activities = res.json()
    assert len(activities) > 0, "Expected at least 1 activity record"
    print(f"    OK: Activities count = {len(activities)}")

    print("[8] Test Static Files index.html...")
    res = client.get("/")
    assert res.status_code == 200
    assert "Hoffice" in res.text
    print("    OK: Static index.html served cleanly")

    print("\nALL VERIFICATION CHECKS PASSED.")

if __name__ == "__main__":
    test_all()
