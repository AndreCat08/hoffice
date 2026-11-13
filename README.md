# Hoffice — Hermes Virtual Office

Virtual Office and Team Command Dashboard for Hermes Agent profiles on VPS `By X`.

Allows monitoring the team in real time, assigning tasks to specific agents, and chatting directly with each agent via their individual profile contexts.

---

## Team Roster

| Profile | Name | Role | Responsibilities |
|---|---|---|---|
| `@sandy` | **Sandy** | Tech Lead | Architecture, scoping, task breakdown, code approval |
| `@chao` | **Chao** | Backend Engineer | APIs, data layer, background tasks, database schema |
| `@irene` | **Irene** | Frontend Engineer | Dashboard UI, responsive CSS, client interactions |
| `@probe` | **Probe** | QA Engineer | Integration tests, edge cases, endpoint verification |
| `@robert` | **Robert** | Security & Review | Code review, command injection prevention, sanitization |
| `@iroi` | **Iroi** | DevOps & SRE | Process management, service runbooks, networking |
| `@quill` | **Quill** | Technical Writer | Documentation, guides, API references |

---

## Features

1. **Office Floor (Live Monitoring)**:
   - View all 7 agents, their active role, and live running/idle status.
   - Quick action buttons to chat or assign a task directly.
2. **Team Chat**:
   - Direct messaging interface with any team member.
   - Executes `hermes -p <agent> chat -q "<msg>" --oneshot -Q` safely in backend.
   - Preserves message history in SQLite.
3. **Task Board**:
   - Kanban-style task columns: **To Do**, **Running**, **Completed / Log**.
   - Create tasks with title, description prompt, priority, and assignee.
   - Execute tasks on demand (`POST /api/tasks/{id}/run`) with live agent output preview.
4. **Activity Stream**:
   - Audit trail of chats, task assignments, status changes, and execution results.

---

## Tech Stack

- **Backend**: Python 3, FastAPI, Uvicorn, SQLite3 (WAL mode).
- **Frontend**: Vanilla HTML5, CSS3 (modern responsive dark theme), ES6 JavaScript. Zero node_modules or build step required.
- **Agent Bridge**: Subprocess execution against local Hermes CLI profiles.

---

## Quickstart

### 1. Run Server
```bash
cd /home/ubuntu/hoffice
./run.sh
```
By default, the server binds to `0.0.0.0:8888`.
To specify a custom port:
```bash
PORT=9090 ./run.sh
```

### 2. Access Web Interface
Open your browser at:
```
http://<VPS-IP>:8888/
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/agents` | List 7 agents with their roles and live status (`idle`/`running`) |
| `GET` | `/api/tasks` | List all tasks |
| `POST` | `/api/tasks` | Create task (`title`, `description`, `assignee`, `priority`) |
| `PATCH` | `/api/tasks/{id}` | Update task details or status (`todo`, `running`, `done`, `failed`) |
| `POST` | `/api/tasks/{id}/run` | Execute task with assigned agent via Hermes CLI |
| `GET` | `/api/chat/{agent}` | Retrieve chat history for agent |
| `POST` | `/api/chat/{agent}` | Send message to agent and receive agent response |
| `GET` | `/api/activities` | Recent 50 audit activities |

---

## Running Automated Tests

Run the test suite verified by Probe:
```bash
cd /home/ubuntu/hoffice
python3 -m tests.test_api
```
All 8 verification checks must pass.
