import os
from pathlib import Path
import secrets
import sqlite3
import subprocess
import threading
import time
from contextlib import asynccontextmanager, contextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "hoffice.db"
STATIC_DIR = BASE_DIR / "static"
HERMES_DB_PATH = Path(os.getenv("HERMES_KANBAN_DB", "/home/ubuntu/.hermes/kanban.db"))

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
running_actions: dict[str, Optional[str]] = {}
running_agents_lock = threading.Lock()


def set_agent_running(agent_id: str, is_running: bool, action: Optional[str] = None):
    with running_agents_lock:
        if is_running:
            running_agents.add(agent_id)
            running_actions[agent_id] = action
        else:
            running_agents.discard(agent_id)
            running_actions[agent_id] = None


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
                hermes_id TEXT,
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
        try:
            conn.execute("ALTER TABLE tasks ADD COLUMN hermes_id TEXT;")
        except sqlite3.OperationalError:
            pass


def ensure_hermes_table(conn: sqlite3.Connection):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            body TEXT,
            assignee TEXT,
            status TEXT NOT NULL,
            priority INTEGER DEFAULT 0,
            workspace_kind TEXT NOT NULL DEFAULT 'scratch',
            created_by TEXT,
            created_at INTEGER NOT NULL
        );
        """
    )


@contextmanager
def get_hermes_db():
    if not HERMES_DB_PATH.exists():
        yield None
        return
    conn = sqlite3.connect(HERMES_DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def read_hermes_tasks() -> list[dict]:
    if not HERMES_DB_PATH.exists():
        return []
    with get_hermes_db() as conn:
        if conn is None:
            return []
        try:
            rows = conn.execute(
                "SELECT * FROM tasks WHERE status != 'archived' ORDER BY created_at DESC"
            ).fetchall()
            return [dict(r) for r in rows]
        except sqlite3.OperationalError:
            return []


def write_hermes_task(
    task_id: str,
    title: str,
    description: Optional[str] = "",
    assignee: Optional[str] = None,
) -> bool:
    if not HERMES_DB_PATH.exists():
        return False
    with get_hermes_db() as conn:
        if conn is None:
            return False
        ensure_hermes_table(conn)
        now = int(time.time())
        conn.execute(
            """
            INSERT INTO tasks (id, title, body, assignee, status, priority, workspace_kind, created_by, created_at)
            VALUES (?, ?, ?, ?, 'todo', 0, 'scratch', 'hoffice', ?)
            """,
            (task_id, title, description or "", assignee, now),
        )
        return True


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


ALLOWED_UPDATE_FIELDS = {"title", "description", "assignee", "priority", "status", "result", "hermes_id"}
MAX_MESSAGE_LENGTH = 10000


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    assignee: Optional[str] = None
    priority: Optional[str] = "medium"
    sync_hermes: Optional[bool] = False


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
        actions = dict(running_actions)
    return [
        {
            **info,
            "status": "running" if agent_id in active else "idle",
            "action": actions.get(agent_id) or "Idle" if agent_id in active else "Idle",
        }
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
    hermes_id = None
    if task.sync_hermes:
        if HERMES_DB_PATH.exists():
            hermes_id = "t_" + secrets.token_hex(4)
            write_hermes_task(hermes_id, task.title, task.description, task.assignee)

    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO tasks (title, description, assignee, priority, status, hermes_id)
            VALUES (?, ?, ?, ?, 'todo', ?)
            """,
            (task.title, task.description, task.assignee, task.priority, hermes_id),
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

    set_agent_running(assignee, True, f"Task #{task_id}: {title}")
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


@app.get("/api/kanban/hermes")
def get_hermes_kanban():
    return read_hermes_tasks()


@app.get("/api/kanban/status")
def get_hermes_status():
    exists = HERMES_DB_PATH.exists()
    return {"connected": exists, "db_path": str(HERMES_DB_PATH)}


@app.post("/api/kanban/sync")
def sync_hermes_kanban():
    hermes_tasks = read_hermes_tasks()
    synced_count = 0
    with get_db() as conn:
        for ht in hermes_tasks:
            h_id = ht.get("id")
            h_title = (ht.get("title") or "").strip()
            if not h_title:
                continue
            h_body = ht.get("body") or ""
            h_assignee = ht.get("assignee")
            if h_assignee:
                if h_assignee not in AGENTS:
                    h_assignee = None
            h_raw_status = (ht.get("status") or "todo").lower()
            if h_raw_status == "running":
                h_status = "running"
            elif h_raw_status in {"done", "completed", "closed"}:
                h_status = "done"
            elif h_raw_status == "failed":
                h_status = "failed"
            else:
                h_status = "todo"

            existing = None
            if h_id:
                existing = conn.execute("SELECT * FROM tasks WHERE hermes_id = ?", (h_id,)).fetchone()
            if not existing:
                existing = conn.execute("SELECT * FROM tasks WHERE title = ?", (h_title,)).fetchone()

            if existing:
                conn.execute(
                    """
                    UPDATE tasks
                    SET hermes_id = COALESCE(?, hermes_id),
                        description = COALESCE(NULLIF(?, ''), description),
                        assignee = COALESCE(?, assignee),
                        status = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (h_id, h_body, h_assignee, h_status, existing["id"]),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO tasks (title, description, assignee, priority, status, hermes_id)
                    VALUES (?, ?, ?, 'medium', ?, ?)
                    """,
                    (h_title, h_body, h_assignee, h_status, h_id),
                )
            synced_count += 1

        total_tasks = conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
        log_activity(
            conn,
            "kanban_synced",
            f"Hermes Kanban synced: {synced_count} tasks synced, {total_tasks} total in board",
        )
        return {
            "status": "ok",
            "synced_count": synced_count,
            "total_tasks": total_tasks,
        }


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

    set_agent_running(agent, True, "Replying to chat...")
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
