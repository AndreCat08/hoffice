let currentAgent = "sandy";
let agentsData = [];

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initChat();
  initTasks();
  initModals();
  loadAll();

  // Poll state every 5 seconds
  setInterval(() => {
    loadAgents();
    loadTasks();
    loadActivities();
    checkHermesStatus();
    if (document.getElementById("tab-chat").classList.contains("active")) {
      loadChatMessages(currentAgent);
    }
  }, 5000);
});

function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      const targetId = tab.dataset.tab;
      document.getElementById(targetId).classList.add("active");

      if (targetId === "tab-chat") {
        loadChatMessages(currentAgent);
      }
    });
  });
}

function initModals() {
  const modal = document.getElementById("task-modal");
  document.getElementById("btn-new-task").addEventListener("click", () => {
    modal.classList.add("active");
  });
  document.getElementById("btn-cancel-task").addEventListener("click", () => {
    modal.classList.remove("active");
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });

  document.getElementById("task-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("task-title-input").value.trim();
    const description = document.getElementById("task-desc-input").value.trim();
    const assignee = document.getElementById("task-assignee-select").value;
    const priority = document.getElementById("task-priority-select").value;
    const syncCheckbox = document.getElementById("task-sync-hermes");
    const sync_hermes = syncCheckbox ? syncCheckbox.checked : false;

    if (!title) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, assignee, priority, sync_hermes })
      });
      if (res.ok) {
        modal.classList.remove("active");
        document.getElementById("task-form").reset();
        if (syncCheckbox) syncCheckbox.checked = true;
        loadTasks();
        loadActivities();
      } else {
        alert("Failed to create task");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating task: " + err.message);
    }
  });
}

function initChat() {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event("submit"));
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !currentAgent) return;

    input.value = "";
    input.disabled = true;
    const sendBtn = document.getElementById("chat-send-btn");
    sendBtn.disabled = true;
    sendBtn.innerText = "Sending...";

    // Append temporary user bubble
    appendMessage({ sender: "user", content: text, created_at: "Just now" });

    try {
      const res = await fetch(`/api/chat/${currentAgent}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      if (res.ok) {
        const data = await res.json();
        loadChatMessages(currentAgent);
        loadActivities();
      } else {
        const err = await res.json();
        appendMessage({ sender: "system", content: "Error: " + (err.detail || "Failed to get reply"), created_at: "Error" });
      }
    } catch (err) {
      appendMessage({ sender: "system", content: "Network error: " + err.message, created_at: "Error" });
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      sendBtn.innerText = "Send";
      input.focus();
    }
  });
}

function initTasks() {
  const syncBtn = document.getElementById("btn-sync-kanban");
  if (syncBtn) {
    syncBtn.addEventListener("click", async () => {
      syncBtn.disabled = true;
      syncBtn.innerText = "Syncing...";
      try {
        const res = await fetch("/api/kanban/sync", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          alert(`Hermes Kanban synced: ${data.synced_count} tasks synced (${data.total_tasks} total)`);
          await loadTasks();
          await loadActivities();
          await checkHermesStatus();
        } else {
          alert("Failed to sync Hermes Kanban");
        }
      } catch (err) {
        alert("Error syncing Hermes Kanban: " + err.message);
      } finally {
        syncBtn.disabled = false;
        syncBtn.innerText = "🔄 Sync Hermes Kanban";
      }
    });
  }
}

async function checkHermesStatus() {
  const badgeText = document.getElementById("hermes-status-text");
  const badgeDot = document.getElementById("hermes-status-dot");
  if (!badgeText) return;
  try {
    const res = await fetch("/api/kanban/status");
    if (res.ok) {
      const data = await res.json();
      if (data.connected) {
        badgeText.innerText = "Hermes: Connected";
        badgeDot.style.backgroundColor = "var(--success)";
        badgeDot.style.boxShadow = "0 0 8px var(--success)";
        return;
      }
    }
    badgeText.innerText = "Hermes: Disconnected";
    badgeDot.style.backgroundColor = "var(--text-muted)";
    badgeDot.style.boxShadow = "none";
  } catch (err) {
    badgeText.innerText = "Hermes: Offline";
    badgeDot.style.backgroundColor = "var(--danger)";
    badgeDot.style.boxShadow = "none";
  }
}

async function loadAll() {
  await loadAgents();
  await loadTasks();
  await loadActivities();
  await checkHermesStatus();
  loadChatMessages(currentAgent);
}

async function loadAgents() {
  try {
    const res = await fetch("/api/agents");
    if (!res.ok) return;
    agentsData = await res.json();

    if (typeof window.updateIsometricAgents === "function") {
      window.updateIsometricAgents(agentsData);
    }

    // Update Header Meta
    const activeCount = agentsData.filter(a => a.status === "running").length;
    document.getElementById("active-status-text").innerText = `${agentsData.length} agents (${activeCount} active)`;

    // Render Office Cards
    const grid = document.getElementById("agents-grid");
    grid.innerHTML = "";
    const assigneeSelect = document.getElementById("task-assignee-select");
    const existingAssignee = assigneeSelect.value;
    assigneeSelect.innerHTML = '<option value="">-- Unassigned --</option>';

    // Render Chat Sidebar
    const chatSidebar = document.getElementById("chat-agent-list");
    chatSidebar.innerHTML = "";

    agentsData.forEach(agent => {
      // Add to select
      const opt = document.createElement("option");
      opt.value = agent.id;
      opt.innerText = `${agent.name} (${agent.role})`;
      assigneeSelect.appendChild(opt);

      // Office Card
      const card = document.createElement("div");
      card.className = "agent-card";
      const avatarSvg = window.HofficeAvatars ? window.HofficeAvatars.getAgentAvatarSvg(agent.id) : `<div class="avatar-fallback">${agent.name[0]}</div>`;
      card.innerHTML = `
        <div class="agent-top">
          <div class="agent-avatar">${avatarSvg}</div>
          <div class="agent-info">
            <h3>${agent.name}</h3>
            <div class="role">${agent.role}</div>
          </div>
          <span class="agent-badge ${agent.status}">${agent.status}</span>
        </div>
        <div class="agent-actions">
          <button class="btn btn-sm btn-secondary" onclick="openChatWith('${agent.id}')">💬 Chat</button>
          <button class="btn btn-sm" onclick="openTaskModalFor('${agent.id}')">📋 Assign Task</button>
        </div>
      `;
      grid.appendChild(card);

      // Chat Sidebar Item
      const item = document.createElement("div");
      item.className = `agent-list-item ${agent.id === currentAgent ? 'active' : ''}`;
      item.onclick = () => selectAgent(agent.id);
      item.innerHTML = `
        <div class="item-avatar">${avatarSvg}</div>
        <div class="item-text">
          <h4>${agent.name}</h4>
          <p>${agent.role}</p>
        </div>
      `;
      chatSidebar.appendChild(item);
    });

    if (existingAssignee) assigneeSelect.value = existingAssignee;
  } catch (err) {
    console.error("loadAgents error", err);
  }
}

function selectAgent(agentId) {
  currentAgent = agentId;
  const agent = agentsData.find(a => a.id === agentId);
  if (agent) {
    document.getElementById("chat-target-name").innerText = agent.name;
    document.getElementById("chat-target-role").innerText = `${agent.role} (@${agent.id})`;
    const avatarContainer = document.getElementById("chat-target-avatar");
    if (avatarContainer && window.HofficeAvatars) {
      avatarContainer.innerHTML = window.HofficeAvatars.getAgentAvatarSvg(agent.id);
    }
  }
  document.querySelectorAll(".agent-list-item").forEach(item => {
    item.classList.remove("active");
  });
  loadChatMessages(agentId);
  loadAgents();
}

function openChatWith(agentId) {
  selectAgent(agentId);
  const chatTabBtn = document.querySelector('[data-tab="tab-chat"]');
  chatTabBtn.click();
}
window.openChatWith = openChatWith;

function openTaskModalFor(agentId) {
  const modal = document.getElementById("task-modal");
  document.getElementById("task-assignee-select").value = agentId;
  modal.classList.add("active");
}

async function loadChatMessages(agentId) {
  try {
    const res = await fetch(`/api/chat/${agentId}`);
    if (!res.ok) return;
    const messages = await res.json();
    const stream = document.getElementById("messages-stream");
    stream.innerHTML = "";
    if (messages.length === 0) {
      stream.innerHTML = `<div style="text-align:center;color:var(--text-muted);margin:auto;">No messages yet. Send a prompt to start chat with @${agentId}.</div>`;
      return;
    }
    messages.forEach(msg => appendMessage(msg));
    stream.scrollTop = stream.scrollHeight;
  } catch (err) {
    console.error("loadChatMessages error", err);
  }
}

function appendMessage(msg) {
  const stream = document.getElementById("messages-stream");
  const bubble = document.createElement("div");
  const isUser = msg.sender === "user";
  const senderId = isUser ? "user" : (msg.agent || currentAgent || "sandy");
  const avatarSvg = window.HofficeAvatars ? window.HofficeAvatars.getAgentAvatarSvg(senderId) : "";
  bubble.className = `message-bubble ${isUser ? 'user' : 'agent'}`;
  bubble.innerHTML = `
    <div class="message-row">
      <div class="message-avatar-thumb">${avatarSvg}</div>
      <div class="message-body">
        <div class="message-content">${escapeHtml(msg.content)}</div>
        <div class="message-meta">${isUser ? 'You' : (msg.sender || msg.agent || currentAgent)} • ${msg.created_at || ''}</div>
      </div>
    </div>
  `;
  stream.appendChild(bubble);
  stream.scrollTop = stream.scrollHeight;
}

async function loadTasks() {
  try {
    const res = await fetch("/api/tasks");
    if (!res.ok) return;
    const tasks = await res.json();

    const todoList = document.getElementById("tasks-todo");
    const runningList = document.getElementById("tasks-running");
    const doneList = document.getElementById("tasks-done");

    todoList.innerHTML = "";
    runningList.innerHTML = "";
    doneList.innerHTML = "";

    let todoCount = 0, runningCount = 0, doneCount = 0;

    tasks.forEach(task => {
      const el = createTaskElement(task);
      if (task.status === "todo") {
        todoList.appendChild(el);
        todoCount++;
      } else if (task.status === "running") {
        runningList.appendChild(el);
        runningCount++;
      } else {
        doneList.appendChild(el);
        doneCount++;
      }
    });

    document.getElementById("count-todo").innerText = todoCount;
    document.getElementById("count-running").innerText = runningCount;
    document.getElementById("count-done").innerText = doneCount;
  } catch (err) {
    console.error("loadTasks error", err);
  }
}

function createTaskElement(task) {
  const div = document.createElement("div");
  div.className = "task-item";
  const priorityClass = `priority-${task.priority || 'medium'}`;

  let resultHtml = "";
  if (task.result) {
    resultHtml = `<div class="task-result">${escapeHtml(task.result)}</div>`;
  }

  let actionBtns = "";
  if (task.status === "todo") {
    actionBtns = `
      <button class="btn btn-sm" onclick="runTask(${task.id})">▶ Run Task</button>
      <button class="btn btn-sm btn-secondary" onclick="updateTaskStatus(${task.id}, 'done')">Mark Done</button>
    `;
  } else if (task.status === "running") {
    actionBtns = `<span style="font-size:12px;color:var(--accent);">⚡ Agent executing in background...</span>`;
  } else if (task.status === "done" || task.status === "failed") {
    actionBtns = `
      <button class="btn btn-sm btn-secondary" onclick="runTask(${task.id})">🔄 Rerun</button>
      <button class="btn btn-sm btn-secondary" onclick="updateTaskStatus(${task.id}, 'todo')">Reopen</button>
    `;
  }

  const assigneeId = (task.assignee || "").toLowerCase();
  const assigneeAvatar = (assigneeId && window.HofficeAvatars)
    ? `<span class="task-assignee-avatar">${window.HofficeAvatars.getAgentAvatarSvg(assigneeId)}</span>`
    : "";

  div.innerHTML = `
    <div class="task-title">${escapeHtml(task.title)}</div>
    ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
    <div class="task-meta">
      <span class="task-assignee">${assigneeAvatar}@${task.assignee || 'unassigned'}</span>
      <span class="task-priority ${priorityClass}">${task.priority || 'medium'}</span>
      ${task.hermes_id ? `<span class="task-priority" style="background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.4);">Hermes (${escapeHtml(task.hermes_id)})</span>` : ''}
    </div>
    ${resultHtml}
    <div class="task-actions">${actionBtns}</div>
  `;
  return div;
}

async function runTask(taskId) {
  try {
    loadTasks();
    const res = await fetch(`/api/tasks/${taskId}/run`, { method: "POST" });
    if (res.ok) {
      loadTasks();
      loadActivities();
    } else {
      const err = await res.json();
      alert("Error running task: " + (err.detail || "Unknown error"));
      loadTasks();
    }
  } catch (err) {
    alert("Network error running task: " + err.message);
    loadTasks();
  }
}

async function updateTaskStatus(taskId, status) {
  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      loadTasks();
      loadActivities();
    }
  } catch (err) {
    console.error("updateTaskStatus error", err);
  }
}

async function loadActivities() {
  try {
    const res = await fetch("/api/activities");
    if (!res.ok) return;
    const activities = await res.json();
    const container = document.getElementById("activities-container");
    container.innerHTML = "";

    if (activities.length === 0) {
      container.innerHTML = `<div style="color:var(--text-muted);text-align:center;">No activities recorded yet.</div>`;
      return;
    }

    activities.forEach(act => {
      const item = document.createElement("div");
      item.className = "activity-item";
      let icon = "⚡";
      if (act.event_type.startsWith("chat")) icon = "💬";
      if (act.event_type.startsWith("task")) icon = "📋";

      item.innerHTML = `
        <div class="activity-icon">${icon}</div>
        <div class="activity-text">
          <h4>${escapeHtml(act.message)}</h4>
          <span>${act.created_at}</span>
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    console.error("loadActivities error", err);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
