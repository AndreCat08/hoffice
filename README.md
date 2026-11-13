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

1. **Office Floor (2.5D Isometric Live Viewport)**:
   - Interactive 2.5D diamond isometric canvas (`isometric.js`, 64x32 tile ratio).
   - Renders 7 agent desks with custom furniture and pixel avatars.
   - Whiteboard mounted on the top office wall.
   - Real-time status/thought bubbles above avatar heads showing live actions (`Idle`, `Running task #...`, `Replying to chat...`).
   - Click avatar to open Team Chat directly; click Whiteboard to jump to Task Board.
2. **Team Chat**:
   - Direct messaging interface with any team member.
   - Executes `hermes -p <agent> chat -q "<msg>" --oneshot -Q` safely in backend.
   - Preserves message history in SQLite.
3. **Task Board & Hermes Kanban Sync**:
   - Kanban-style task columns: **To Do**, **Running**, **Completed / Log**.
   - Create tasks with title, description prompt, priority, and assignee.
   - Direct bidirectional sync with native Hermes Kanban (`~/.hermes/kanban.db`).
   - Execute tasks on demand (`POST /api/tasks/{id}/run`) with live agent output preview.
4. **Activity Stream**:
   - Audit trail of chats, task assignments, status changes, and execution results.

---

## Tech Stack

- **Backend**: Python 3, FastAPI, Uvicorn, SQLite3 (WAL mode).
- **Frontend**: Vanilla HTML5 Canvas (2.5D Isometric engine), CSS3 (dark theme), ES6 JavaScript. Zero node_modules or build step required.
- **Kanban Sync**: Direct read/write bridge with `~/.hermes/kanban.db`.
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
| `GET` | `/api/agents` | List 7 agents with their roles, live status (`idle`/`running`), and current action |
| `GET` | `/api/tasks` | List all tasks |
| `POST` | `/api/tasks` | Create task (`title`, `description`, `assignee`, `priority`, `sync_hermes`) |
| `PATCH` | `/api/tasks/{id}` | Update task details or status (`todo`, `running`, `done`, `failed`) |
| `POST` | `/api/tasks/{id}/run` | Execute task with assigned agent via Hermes CLI |
| `GET` | `/api/kanban/status` | Check connection to `~/.hermes/kanban.db` |
| `GET` | `/api/kanban/hermes` | List active tasks directly from Hermes Kanban |
| `POST` | `/api/kanban/sync` | Sync tasks from Hermes Kanban into Hoffice |
| `GET` | `/api/chat/{agent}` | Retrieve chat history for agent |
| `POST` | `/api/chat/{agent}` | Send message to agent and receive agent response |
| `GET` | `/api/activities` | Recent 50 audit activities |

---

## Running Automated Tests

Run the test suite verified by Probe:
```bash
cd /home/ubuntu/hoffice
PYTHONPATH=. python3 tests/test_api.py
```
All 13 verification checks must pass.
