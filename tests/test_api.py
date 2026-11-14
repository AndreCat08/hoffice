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
    for a in agents:
        assert "action" in a, f"Agent {a['id']} missing action field"
        assert a["action"] == "Idle", f"Agent {a['id']} expected action Idle, got {a['action']}"
    print(f"    OK: Found {len(agents)} agents with action field: {list(agent_ids)}")

    print("[1b] Test GET /api/agents dynamic action tracking...")
    from app import set_agent_running
    set_agent_running("probe", True, "Task #42: Testing Live Action")
    res_active = client.get("/api/agents")
    probe_active = next(a for a in res_active.json() if a["id"] == "probe")
    assert probe_active["status"] == "running"
    assert probe_active["action"] == "Task #42: Testing Live Action"
    set_agent_running("probe", False)
    res_cleared = client.get("/api/agents")
    probe_cleared = next(a for a in res_cleared.json() if a["id"] == "probe")
    assert probe_cleared["status"] == "idle"
    assert probe_cleared["action"] == "Idle"
    print("    OK: Dynamic action tracking running and idle verified")

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

    print("[9] Test Static Files isometric.js...")
    res = client.get("/isometric.js")
    assert res.status_code == 200
    assert "updateIsometricAgents" in res.text
    print("    OK: Static isometric.js served cleanly")

    print("[10] Test GET /api/kanban/status and /api/kanban/hermes...")
    res_status = client.get("/api/kanban/status")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert "connected" in status_data
    assert "db_path" in status_data

    res_hermes = client.get("/api/kanban/hermes")
    assert res_hermes.status_code == 200
    assert isinstance(res_hermes.json(), list)
    print("    OK: Hermes kanban endpoints responsive")

    print("[11] Test POST /api/kanban/sync...")
    res_sync = client.post("/api/kanban/sync")
    assert res_sync.status_code == 200
    sync_data = res_sync.json()
    assert sync_data["status"] == "ok"
    assert "synced_count" in sync_data
    assert "total_tasks" in sync_data
    print(f"    OK: Hermes kanban synced {sync_data['synced_count']} tasks")

    print("[12] Test POST /api/tasks with sync_hermes=True...")
    payload_hermes = {
        "title": "Probe Hermes Sync Task",
        "description": "Created with sync_hermes flag",
        "assignee": "probe",
        "sync_hermes": True
    }
    res_created = client.post("/api/tasks", json=payload_hermes)
    assert res_created.status_code == 200
    created_task = res_created.json()
    assert created_task["id"] > 0
    if status_data["connected"]:
        assert created_task.get("hermes_id") is not None
        assert created_task["hermes_id"].startswith("t_")
    print(f"    OK: Created task with sync_hermes: #{created_task['id']} (hermes_id={created_task.get('hermes_id')})")

    print("[13] Test Security & Sanitization (Robert & Probe check)...")
    # Message length limit rejection
    oversized = "A" * 10001
    res_too_long = client.post("/api/chat/sandy", json={"message": oversized})
    assert res_too_long.status_code == 400
    assert "Message too long" in res_too_long.text

    # Empty message rejection
    res_empty = client.post("/api/chat/sandy", json={"message": "   "})
    assert res_empty.status_code == 400

    # SQL Injection attempt in title & assignee
    res_sqli = client.post("/api/tasks", json={
        "title": "'; DROP TABLE tasks; --",
        "assignee": "sandy",
        "priority": "low"
    })
    assert res_sqli.status_code == 200
    sqli_task = res_sqli.json()
    assert sqli_task["title"] == "'; DROP TABLE tasks; --"
    # Verify tasks table is intact
    res_tasks_intact = client.get("/api/tasks")
    assert res_tasks_intact.status_code == 200
    print("    OK: SQL injection resilient & input boundaries enforced")

    print("[14] Test Agent Avatars & Assets (Irene & Probe check)...")
    res_avatars_js = client.get("/avatars.js")
    assert res_avatars_js.status_code == 200
    js_content = res_avatars_js.text
    assert "HofficeAvatars" in js_content
    for agent_id in ["sandy", "chao", "irene", "probe", "robert", "iroi", "quill", "user"]:
        assert f"{agent_id}:" in js_content
        assert f"<svg" in js_content
        res_char = client.get(f"/characters/{agent_id}.png")
        assert res_char.status_code == 200
        assert len(res_char.content) > 1000
    print("    OK: All 7 agent pixel avatars, user avatar and spritesheets verified")

    res_index = client.get("/")
    assert res_index.status_code == 200
    assert "avatars.js" in res_index.text
    print("    OK: Index includes /avatars.js")

    print("\nALL VERIFICATION CHECKS PASSED.")

if __name__ == "__main__":
    test_all()
