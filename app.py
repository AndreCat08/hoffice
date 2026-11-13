import os
from pathlib import Path
import sqlite3
import subprocess
import threading
from contextlib import asynccontextmanager, contextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "hoffice.db"
STATIC_DIR = BASE_DIR / "static"

AGENTS = {
    "sandy": {"id": "sandy", "name": "Sandy", "role": "Tech Lead"},
    "chao": {"id": "chao", "name": "Chao", "role": "Backend Engineer"},
    "irene": {"id": "irene", "name": "Irene", "role": "Frontend Engineer"},
    "probe": {"id": "probe", "name": "Probe", "role": "QA Engineer"},
    "robert": {"id": "robert", "name": "Robert", "role": "Security and Code Review"},
    "iroi": {"id": "iroi", "name": "Iroi", "role": "DevOps and SRE"},
    "quill": {"id": "quill", "name": "Quill", "role": "Technical Writer"},
}

# ponytail: in-memory agent status resets on process restart; upgrade to persistent DB/redis state when multi-worker deployment needed
running_agents: set[str] = set()
running_agents_lock = threading.Lock()


def set_agent_running(agent_id: str, is_running: bool):
    with running_agents_lock:
        if is_running:
            running_agents.add(agent_id)
        else:
            running_agents.discard(agent_id)


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                assignee TEXT,
                priority TEXT,
                status TEXT DEFAULT 'todo',
                result TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent TEXT NOT NULL,
                sender TEXT NOT NULL,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)


def log_activity(conn: sqlite3.Connection, event_type: str, message: str):
    conn.execute(
        "INSERT INTO activities (event_type, message) VALUES (?, ?)",
        (event_type, message),
    )


def ensure_static_dir():
    if not STATIC_DIR.exists():
        STATIC_DIR.mkdir(parents=True, exist_ok=True)
    index_file = STATIC_DIR / "index.html"
    if not index_file.exists():
        index_file.write_text(
            "<!DOCTYPE html><html><head><title>hoffice</title></head>"
            "<body><h1>hoffice</h1><p>Virtual Office Backend Active.</p></body></html>",
            encoding="utf-8",
        )


ALLOWED_UPDATE_FIELDS = {"title", "description", "assignee", "priority", "status", "result"}
MAX_MESSAGE_LENGTH = 10000


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    assignee: Optional[str] = None
    priority: Optional[str] = "medium"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    result: Optional[str] = None


class ChatRequest(BaseModel):
    message: Optional[str] = None
    content: Optional[str] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    ensure_static_dir()
    yield


app = FastAPI(title="hoffice", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/agents")
def get_agents():
    with running_agents_lock:
        active = set(running_agents)
    return [
        {**info, "status": "running" if agent_id in active else "idle"}
        for agent_id, info in AGENTS.items()
    ]


@app.get("/api/tasks")
def get_tasks():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM tasks ORDER BY id DESC").fetchall()
        return [dict(r) for r in rows]


@app.post("/api/tasks")
def create_task(task: TaskCreate):
    if task.assignee and task.assignee not in AGENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid assignee '{task.assignee}'. Must be one of: {list(AGENTS.keys())}",
        )
    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO tasks (title, description, assignee, priority, status)
            VALUES (?, ?, ?, ?, 'todo')
            """,
            (task.title, task.description, task.assignee, task.priority),
        )
        task_id = cursor.lastrowid
        log_activity(
            conn,
            "task_created",
            f"Task #{task_id} '{task.title}' created (assignee: {task.assignee or 'unassigned'})",
        )
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return dict(row)


@app.patch("/api/tasks/{task_id}")
def update_task(task_id: int, updates: TaskUpdate):
    if updates.assignee is not None and updates.assignee not in AGENTS and updates.assignee != "":
        raise HTTPException(
            status_code=400,
            detail=f"Invalid assignee '{updates.assignee}'. Must be one of: {list(AGENTS.keys())}",
        )
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail=f"Task #{task_id} not found")

        fields = []
        values = []
        data = updates.model_dump(exclude_unset=True)
        for key, val in data.items():
            if key in ALLOWED_UPDATE_FIELDS:
                fields.append(f"{key} = ?")
                values.append(val)

        if fields:
            fields.append("updated_at = CURRENT_TIMESTAMP")
            values.append(task_id)
            conn.execute(f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?", values)
            log_activity(conn, "task_updated", f"Task #{task_id} updated: {', '.join(data.keys())}")

        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return dict(row)


@app.post("/api/tasks/{task_id}/run")
def run_task(task_id: int):
    with get_db() as conn:
        task = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not task:
            raise HTTPException(status_code=404, detail=f"Task #{task_id} not found")

        assignee = task["assignee"]
        if not assignee or assignee not in AGENTS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid or unassigned task assignee. Must be one of: {list(AGENTS.keys())}",
            )

        title = task["title"]
        prompt = (task["description"] or title).strip() or title
        conn.execute(
            "UPDATE tasks SET status = 'running', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (task_id,),
        )
        log_activity(conn, "task_started", f"Task #{task_id} '{title}' run started by {assignee}")

    set_agent_running(assignee, True)
    try:
        proc = subprocess.run(
            ["hermes", "-p", assignee, "chat", "-q", prompt, "--oneshot", "-Q"],
            capture_output=True,
            text=True,
            timeout=180,
        )
        if proc.returncode == 0:
            status = "done"
            output = proc.stdout.strip()
        else:
            status = "failed"
            output = (proc.stderr or proc.stdout or f"Process exited with code {proc.returncode}").strip()
    except subprocess.TimeoutExpired:
        status = "failed"
        output = "Task timed out after 180 seconds"
    except FileNotFoundError:
        status = "failed"
        output = "hermes CLI not found on system PATH"
    except Exception as e:
        status = "failed"
        output = f"Execution error: {str(e)}"
    finally:
        set_agent_running(assignee, False)

    with get_db() as conn:
        conn.execute(
            "UPDATE tasks SET status = ?, result = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (status, output, task_id),
        )
        log_activity(conn, f"task_{status}", f"Task #{task_id} '{title}' finished: {status}")
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return dict(row)


@app.get("/api/chat/{agent}")
def get_chat(agent: str):
    if agent not in AGENTS:
        raise HTTPException(
            status_code=404,
            detail=f"Agent '{agent}' not found. Must be one of: {list(AGENTS.keys())}",
        )
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE agent = ? ORDER BY id ASC",
            (agent,),
        ).fetchall()
        return [dict(r) for r in rows]


@app.post("/api/chat/{agent}")
def send_chat(agent: str, payload: ChatRequest):
    if agent not in AGENTS:
        raise HTTPException(
            status_code=404,
            detail=f"Agent '{agent}' not found. Must be one of: {list(AGENTS.keys())}",
        )

    msg_text = (payload.message or payload.content or "").strip()
    if not msg_text:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")
    if len(msg_text) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Message too long (max {MAX_MESSAGE_LENGTH} characters)",
        )

    with get_db() as conn:
        conn.execute(
            "INSERT INTO messages (agent, sender, content) VALUES (?, 'user', ?)",
            (agent, msg_text),
        )
        log_activity(conn, "chat_sent", f"User sent message to {agent}")

    set_agent_running(agent, True)
    try:
        proc = subprocess.run(
            ["hermes", "-p", agent, "chat", "-q", msg_text, "--oneshot", "-Q"],
            capture_output=True,
            text=True,
            timeout=180,
        )
        if proc.returncode == 0:
            reply = proc.stdout.strip()
        else:
            reply = (proc.stderr or proc.stdout or f"Process exited with code {proc.returncode}").strip()
    except subprocess.TimeoutExpired:
        reply = "Agent response timed out after 180 seconds"
    except FileNotFoundError:
        reply = "hermes CLI not found on system PATH"
    except Exception as e:
        reply = f"Execution error: {str(e)}"
    finally:
        set_agent_running(agent, False)

    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO messages (agent, sender, content) VALUES (?, ?, ?)",
            (agent, agent, reply),
        )
        response_id = cursor.lastrowid
        log_activity(conn, "chat_response", f"{agent} responded to user")
        row = conn.execute("SELECT * FROM messages WHERE id = ?", (response_id,)).fetchone()
        return dict(row)


@app.get("/api/activities")
def get_activities():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM activities ORDER BY id DESC LIMIT 50"
        ).fetchall()
        return [dict(r) for r in rows]


init_db()
ensure_static_dir()
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8888"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
