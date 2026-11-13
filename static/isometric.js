// 2.5D Isometric Canvas Viewport for Hoffice
// Tile dimensions: tileWidth = 64, tileHeight = 32

(function () {
  const TILE_WIDTH = 64;
  const TILE_HEIGHT = 32;
  const GRID_SIZE = 10;
  const WALL_HEIGHT = 75;

  const AGENT_CONFIGS = [
    { id: "sandy", name: "Sandy", role: "Tech Lead", gx: 2.5, gy: 2.5, color: "#8b5cf6" },
    { id: "chao", name: "Chao", role: "Backend Engineer", gx: 6.0, gy: 2.0, color: "#10b981" },
    { id: "irene", name: "Irene", role: "Frontend Engineer", gx: 2.0, gy: 6.0, color: "#06b6d4" },
    { id: "probe", name: "Probe", role: "QA Engineer", gx: 5.5, gy: 5.5, color: "#f59e0b" },
    { id: "robert", name: "Robert", role: "Security & Review", gx: 8.0, gy: 2.5, color: "#ef4444" },
    { id: "iroi", name: "Iroi", role: "DevOps & SRE", gx: 2.5, gy: 8.0, color: "#f97316" },
    { id: "quill", name: "Quill", role: "Technical Writer", gx: 7.5, gy: 6.5, color: "#ec4899" }
  ];

  let canvas = null;
  let ctx = null;
  let agentsState = {};
  let hoveredObject = null; // { type: 'agent', agent } | { type: 'whiteboard' } | null
  let mousePos = { x: -1000, y: -1000 };
  let animFrameId = null;
  let animTime = 0;

  // Initialize agent state map
  AGENT_CONFIGS.forEach(a => {
    agentsState[a.id] = { ...a, status: "idle", action: "Idle" };
  });

  function getOrigin() {
    return {
      x: canvas ? canvas.width / 2 : 480,
      y: 110
    };
  }

  function isoToScreen(gx, gy, gz) {
    gz = gz || 0;
    const origin = getOrigin();
    return {
      x: origin.x + (gx - gy) * (TILE_WIDTH / 2),
      y: origin.y + (gx + gy) * (TILE_HEIGHT / 2) - gz
    };
  }

  function screenToIso(sx, sy) {
    const origin = getOrigin();
    const dx = sx - origin.x;
    const dy = sy - origin.y;
    const gx = (dx / (TILE_WIDTH / 2) + dy / (TILE_HEIGHT / 2)) / 2;
    const gy = (dy / (TILE_HEIGHT / 2) - dx / (TILE_WIDTH / 2)) / 2;
    return { gx, gy };
  }

  function initIsometricCanvas() {
    canvas = document.getElementById("isometric-canvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");

    // Handle high DPI displays
    setupCanvasResolution();
    window.addEventListener("resize", setupCanvasResolution);

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("click", onCanvasClick);

    startRenderLoop();
  }

  function setupCanvasResolution() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = rect.width || 960;
    const displayHeight = rect.height || 520;

    canvas.width = Math.round(displayWidth * dpr);
    canvas.height = Math.round(displayHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function startRenderLoop() {
    function loop(t) {
      animTime = t * 0.001;
      render();
      animFrameId = requestAnimationFrame(loop);
    }
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(loop);
  }

  function render() {
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || (canvas.width / (window.devicePixelRatio || 1));
    const height = rect.height || (canvas.height / (window.devicePixelRatio || 1));

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Subtle office floor backdrop glow
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, 450);
    bgGrad.addColorStop(0, "#131d31");
    bgGrad.addColorStop(1, "#0b1120");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Walls
    drawWalls();

    // 2. Draw Whiteboard on top wall
    drawWhiteboard();

    // 3. Draw Floor Tiles
    drawFloor();

    // 4. Draw Desks and Agents sorted by depth (gx + gy)
    const sortedAgents = Object.values(agentsState).sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));
    sortedAgents.forEach(agent => {
      drawAgentDesk(agent);
    });

    // 5. Draw Tooltip if hovering
    if (hoveredObject) {
      drawTooltip();
    }
  }

  // --- Drawing functions ---

  function drawFloor() {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      for (let gy = 0; gy < GRID_SIZE; gy++) {
        const p0 = isoToScreen(gx, gy, 0);
        const p1 = isoToScreen(gx + 1, gy, 0);
        const p2 = isoToScreen(gx + 1, gy + 1, 0);
        const p3 = isoToScreen(gx, gy + 1, 0);

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();

        // Alternating tile shades
        const isAlt = (gx + gy) % 2 === 0;
        ctx.fillStyle = isAlt ? "#1b253b" : "#202c44";
        ctx.fill();

        ctx.strokeStyle = "rgba(51, 65, 85, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  function drawWalls() {
    // Back-left wall (along gx = 0, gy = 0..GRID_SIZE)
    const wl0 = isoToScreen(0, 0, WALL_HEIGHT);
    const wl1 = isoToScreen(0, GRID_SIZE, WALL_HEIGHT);
    const wl2 = isoToScreen(0, GRID_SIZE, 0);
    const wl3 = isoToScreen(0, 0, 0);

    ctx.beginPath();
    ctx.moveTo(wl0.x, wl0.y);
    ctx.lineTo(wl1.x, wl1.y);
    ctx.lineTo(wl2.x, wl2.y);
    ctx.lineTo(wl3.x, wl3.y);
    ctx.closePath();
    ctx.fillStyle = "#111827";
    ctx.fill();
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Wall panels on left wall
    for (let gy = 2; gy < GRID_SIZE; gy += 2) {
      const pTop = isoToScreen(0, gy, WALL_HEIGHT);
      const pBot = isoToScreen(0, gy, 0);
      ctx.beginPath();
      ctx.moveTo(pTop.x, pTop.y);
      ctx.lineTo(pBot.x, pBot.y);
      ctx.strokeStyle = "rgba(51, 65, 85, 0.35)";
      ctx.stroke();
    }

    // Top-right wall (along gy = 0, gx = 0..GRID_SIZE) - Top Wall
    const wr0 = isoToScreen(0, 0, WALL_HEIGHT);
    const wr1 = isoToScreen(GRID_SIZE, 0, WALL_HEIGHT);
    const wr2 = isoToScreen(GRID_SIZE, 0, 0);
    const wr3 = isoToScreen(0, 0, 0);

    ctx.beginPath();
    ctx.moveTo(wr0.x, wr0.y);
    ctx.lineTo(wr1.x, wr1.y);
    ctx.lineTo(wr2.x, wr2.y);
    ctx.lineTo(wr3.x, wr3.y);
    ctx.closePath();
    ctx.fillStyle = "#152033";
    ctx.fill();
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Wall panels on top wall
    for (let gx = 2; gx < GRID_SIZE; gx += 2) {
      const pTop = isoToScreen(gx, 0, WALL_HEIGHT);
      const pBot = isoToScreen(gx, 0, 0);
      ctx.beginPath();
      ctx.moveTo(pTop.x, pTop.y);
      ctx.lineTo(pBot.x, pBot.y);
      ctx.strokeStyle = "rgba(51, 65, 85, 0.35)";
      ctx.stroke();
    }
  }

  // Whiteboard mounted on the top wall (gy = 0, from gx = 3.5 to gx = 6.5)
  function getWhiteboardPolygon() {
    const gxStart = 3.2;
    const gxEnd = 6.8;
    const zTop = 68;
    const zBottom = 18;

    return {
      p0: isoToScreen(gxStart, 0, zTop),
      p1: isoToScreen(gxEnd, 0, zTop),
      p2: isoToScreen(gxEnd, 0, zBottom),
      p3: isoToScreen(gxStart, 0, zBottom)
    };
  }

  function drawWhiteboard() {
    const poly = getWhiteboardPolygon();
    const isHovered = hoveredObject && hoveredObject.type === "whiteboard";

    // Board shadow
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(poly.p0.x, poly.p0.y + 4);
    ctx.lineTo(poly.p1.x, poly.p1.y + 4);
    ctx.lineTo(poly.p2.x, poly.p2.y + 4);
    ctx.lineTo(poly.p3.x, poly.p3.y + 4);
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fill();

    // Board Surface
    ctx.beginPath();
    ctx.moveTo(poly.p0.x, poly.p0.y);
    ctx.lineTo(poly.p1.x, poly.p1.y);
    ctx.lineTo(poly.p2.x, poly.p2.y);
    ctx.lineTo(poly.p3.x, poly.p3.y);
    ctx.closePath();
    ctx.fillStyle = "#f8fafc";
    ctx.fill();

    // Frame
    ctx.strokeStyle = isHovered ? "#38bdf8" : "#94a3b8";
    ctx.lineWidth = isHovered ? 3 : 2;
    if (isHovered) {
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 10;
    }
    ctx.stroke();
    ctx.restore();

    // Board Content - Transform into isometric plane along top wall
    const cx = (poly.p0.x + poly.p1.x + poly.p2.x + poly.p3.x) / 4;
    const cy = (poly.p0.y + poly.p1.y + poly.p2.y + poly.p3.y) / 4;

    ctx.save();
    // Skew text / graphics to match isometric wall slope
    // Along gy=0, dx = dgx * 32, dy = dgx * 16 (slope = 0.5)
    ctx.translate(cx, cy);
    ctx.transform(1, 0.45, 0, 1, 0, 0);

    // Title
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("📋 SPRINT TASK BOARD", 0, -12);

    // Sticky notes on whiteboard
    drawStickyNote(-35, -2, "#fde047", "API");
    drawStickyNote(-10, -2, "#67e8f9", "TEST");
    drawStickyNote(15, -2, "#86efac", "DONE");
    drawStickyNote(40, -2, "#f472b6", "DOCS");

    // Marker tray at bottom
    ctx.restore();

    // Tray rail
    ctx.beginPath();
    ctx.moveTo(poly.p3.x - 4, poly.p3.y + 2);
    ctx.lineTo(poly.p2.x + 4, poly.p2.y + 2);
    ctx.strokeStyle = isHovered ? "#38bdf8" : "#64748b";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function drawStickyNote(x, y, color, label) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(x - 10, y - 6, 20, 14);
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - 10, y - 6, 20, 14);

    ctx.fillStyle = "#0f172a";
    ctx.font = "600 7px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x, y + 4);
    ctx.restore();
  }

  function drawAgentDesk(agent) {
    const { gx, gy, color, status, name, role, id } = agent;
    const isHovered = hoveredObject && hoveredObject.type === "agent" && hoveredObject.agent.id === id;
    const isRunning = status === "running";

    // Base position on floor
    const base = isoToScreen(gx, gy, 0);

    // Hover / Active desk glow ring on floor
    if (isHovered || isRunning) {
      ctx.save();
      ctx.beginPath();
      const ringW = 44;
      const ringH = 22;
      ctx.ellipse(base.x, base.y, ringW, ringH, 0, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? "rgba(56, 189, 248, 0.25)" : "rgba(16, 185, 129, 0.15)";
      ctx.fill();
      ctx.strokeStyle = isHovered ? "#38bdf8" : (isRunning ? "rgba(56, 189, 248, 0.6)" : "rgba(16, 185, 129, 0.4)");
      ctx.lineWidth = isHovered ? 2 : 1;
      if (isHovered || isRunning) {
        ctx.shadowColor = isHovered ? "#38bdf8" : "#10b981";
        ctx.shadowBlur = 8;
      }
      ctx.stroke();
      ctx.restore();
    }

    // --- 1. Isometric Chair (behind desk) ---
    drawChair(gx - 0.25, gy - 0.25);

    // --- 2. Avatar Character ---
    drawAvatar(gx - 0.1, gy - 0.1, color, isRunning);

    // --- 3. Isometric Desk Furniture ---
    drawDeskFurniture(gx, gy, isRunning);

    // --- 4. Status Bubble Badge above agent head ---
    drawStatusBubble(base.x, base.y - 58, status, isRunning, agent.action);

    // --- 5. Name tag & role below desk ---
    drawNameTag(base.x, base.y + 16, name, role, isHovered);
  }

  function drawChair(gx, gy) {
    const chairBase = isoToScreen(gx, gy, 0);
    const chairSeat = isoToScreen(gx, gy, 12);
    const chairBack = isoToScreen(gx - 0.1, gy - 0.1, 26);

    ctx.save();
    // Chair stem
    ctx.beginPath();
    ctx.moveTo(chairBase.x, chairBase.y);
    ctx.lineTo(chairSeat.x, chairSeat.y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Chair base legs (swivel)
    ctx.beginPath();
    ctx.ellipse(chairBase.x, chairBase.y, 10, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#0f172a";
    ctx.fill();

    // Chair Seat
    ctx.beginPath();
    ctx.ellipse(chairSeat.x, chairSeat.y, 11, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#334155";
    ctx.fill();
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Chair Backrest
    ctx.beginPath();
    ctx.ellipse(chairBack.x, chairBack.y - 4, 9, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.restore();
  }

  function drawAvatar(gx, gy, themeColor, isRunning) {
    // Slight idle breathing or typing motion when running
    const wobble = isRunning ? Math.sin(animTime * 10) * 1.5 : Math.sin(animTime * 2) * 0.5;

    const bodyPos = isoToScreen(gx, gy, 14 + wobble);
    const headPos = isoToScreen(gx, gy, 30 + wobble);

    ctx.save();
    // Torso / Body
    ctx.beginPath();
    ctx.ellipse(bodyPos.x, bodyPos.y, 8, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = themeColor;
    ctx.fill();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.7)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Arms extending forward to desk keyboard
    const armL = isoToScreen(gx + 0.15, gy - 0.1, 16);
    const armR = isoToScreen(gx - 0.1, gy + 0.15, 16);
    ctx.beginPath();
    ctx.moveTo(bodyPos.x - 5, bodyPos.y - 2);
    ctx.lineTo(armL.x, armL.y);
    ctx.moveTo(bodyPos.x + 5, bodyPos.y - 2);
    ctx.lineTo(armR.x, armR.y);
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(headPos.x, headPos.y, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = "#fcd34d"; // warm skin tone
    ctx.fill();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.4)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Hair
    ctx.beginPath();
    ctx.arc(headPos.x, headPos.y - 2, 6.5, Math.PI, Math.PI * 2);
    ctx.fillStyle = "#1e293b";
    ctx.fill();

    // Small headset or glasses
    ctx.beginPath();
    ctx.arc(headPos.x, headPos.y, 7, -0.2, 0.2);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  }

  function drawDeskFurniture(gx, gy, isRunning) {
    const dx = 0.52;
    const dy = 0.38;
    const deskZ = 16;
    const slabThickness = 3;

    // Corner points on floor
    const c0 = isoToScreen(gx - dx, gy - dy, 0);
    const c1 = isoToScreen(gx + dx, gy - dy, 0);
    const c2 = isoToScreen(gx + dx, gy + dy, 0);
    const c3 = isoToScreen(gx - dx, gy + dy, 0);

    // Corner points on tabletop bottom
    const b0 = isoToScreen(gx - dx, gy - dy, deskZ - slabThickness);
    const b1 = isoToScreen(gx + dx, gy - dy, deskZ - slabThickness);
    const b2 = isoToScreen(gx + dx, gy + dy, deskZ - slabThickness);
    const b3 = isoToScreen(gx - dx, gy + dy, deskZ - slabThickness);

    // Corner points on tabletop top
    const t0 = isoToScreen(gx - dx, gy - dy, deskZ);
    const t1 = isoToScreen(gx + dx, gy - dy, deskZ);
    const t2 = isoToScreen(gx + dx, gy + dy, deskZ);
    const t3 = isoToScreen(gx - dx, gy + dy, deskZ);

    ctx.save();

    // 4 Desk Legs
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    [ [c0, b0], [c1, b1], [c2, b2], [c3, b3] ].forEach(([foot, top]) => {
      ctx.beginPath();
      ctx.moveTo(foot.x, foot.y);
      ctx.lineTo(top.x, top.y);
      ctx.stroke();
    });

    // Front-Right Slab edge
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.closePath();
    ctx.fillStyle = "#1e293b";
    ctx.fill();

    // Front-Left Slab edge
    ctx.beginPath();
    ctx.moveTo(b3.x, b3.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t3.x, t3.y);
    ctx.closePath();
    ctx.fillStyle = "#25334a";
    ctx.fill();

    // Tabletop Top Surface
    ctx.beginPath();
    ctx.moveTo(t0.x, t0.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t3.x, t3.y);
    ctx.closePath();
    ctx.fillStyle = "#334155";
    ctx.fill();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Keyboard on desk
    const kbCenter = isoToScreen(gx, gy + 0.1, deskZ);
    ctx.beginPath();
    ctx.ellipse(kbCenter.x, kbCenter.y, 6, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#1e293b";
    ctx.fill();

    // Monitor on Desk
    const monCenter = isoToScreen(gx + 0.05, gy - 0.05, deskZ);
    // Monitor stand
    ctx.beginPath();
    ctx.moveTo(monCenter.x, monCenter.y);
    ctx.lineTo(monCenter.x, monCenter.y - 5);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Monitor screen (angled isometric upright rectangle)
    const mw = 14;
    const mh = 10;
    const sx = monCenter.x - mw / 2;
    const sy = monCenter.y - 5 - mh;

    // Bezel
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(sx - 1, sy - 1, mw + 2, mh + 2);

    // Screen display
    if (isRunning) {
      // Glow and active code lines
      const pulse = Math.abs(Math.sin(animTime * 4));
      ctx.fillStyle = `rgba(56, 189, 248, ${0.7 + pulse * 0.3})`;
      ctx.fillRect(sx, sy, mw, mh);

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(sx + 2, sy + 2, mw - 4, 1.5);
      ctx.fillRect(sx + 2, sy + 5, mw - 6, 1.5);
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(sx, sy, mw, mh);

      // Terminal prompt dot
      ctx.fillStyle = "#10b981";
      ctx.fillRect(sx + 2, sy + 3, 2, 2);
    }

    ctx.restore();
  }

  function drawStatusBubble(cx, cy, status, isRunning, action) {
    ctx.save();

    let text;
    if (isRunning) {
      text = action || "Thinking...";
    } else {
      text = action || "Idle";
    }

    ctx.font = "bold 8.5px sans-serif";
    const maxTextWidth = 100;
    let displayText = text;
    if (ctx.measureText(displayText).width > maxTextWidth) {
      let trimmed = displayText;
      while (trimmed.length > 0) {
        if (ctx.measureText(trimmed + "…").width <= maxTextWidth) {
          displayText = trimmed + "…";
          break;
        }
        trimmed = trimmed.slice(0, -1);
      }
    }

    const textWidth = ctx.measureText(displayText).width;
    const paddingX = 8;
    const dotSpace = 13;
    const bw = Math.max(textWidth + dotSpace + paddingX * 2, isRunning ? 70 : 52);
    const bh = 18;
    const bx = cx - bw / 2;
    const by = cy - bh / 2;
    const r = 9;
    const tailW = 7;
    const tailH = 6;

    // Thought / status bubble with downward tail pointing to head
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + r, r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
    ctx.lineTo(cx + tailW / 2, by + bh);
    ctx.lineTo(cx, by + bh + tailH);
    ctx.lineTo(cx - tailW / 2, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.arcTo(bx, by + bh, bx, by + bh - r, r);
    ctx.lineTo(bx, by + r);
    ctx.arcTo(bx, by, bx + r, by, r);
    ctx.closePath();

    const dotX = bx + paddingX + 3;
    const dotY = cy;

    if (isRunning) {
      // Animated glow border
      const pulse = 0.5 + Math.sin(animTime * 4) * 0.5;
      ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 6 + pulse * 6;
      ctx.fill();

      ctx.strokeStyle = "rgba(56, 189, 248, " + (0.7 + pulse * 0.3) + ")";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pulsing indicator dot with outer ripple ring
      const ringCycle = (animTime * 2.5) % 1;
      const ringR = 3 + ringCycle * 4;
      const ringAlpha = 1 - ringCycle;
      ctx.beginPath();
      ctx.arc(dotX, dotY, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(56, 189, 248, " + (ringAlpha * 0.7) + ")";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Core pulsing dot
      const dotR = 2.5 + Math.sin(animTime * 6) * 0.8;
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = "#38bdf8";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 6;
      ctx.fill();

      // Action text
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#e0f2fe";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(displayText, dotX + 8, cy);
    } else {
      // Clean rounded pill
      ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 4;
      ctx.fill();

      ctx.strokeStyle = "rgba(16, 185, 129, 0.7)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Green status dot
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#10b981";
      ctx.shadowColor = "#10b981";
      ctx.shadowBlur = 4;
      ctx.fill();

      // Status text (Idle / Ready)
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#10b981";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(displayText, dotX + 8, cy);
    }

    ctx.restore();
  }

  function drawNameTag(cx, cy, name, role, isHovered) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const nameText = name;
    ctx.font = "600 11px sans-serif";
    const nameWidth = ctx.measureText(nameText).width;

    const tagW = Math.max(nameWidth + 16, 56);
    const tagH = 18;
    const tagX = cx - tagW / 2;
    const tagY = cy - tagH / 2;

    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagW, tagH, 6);
    ctx.fillStyle = isHovered ? "rgba(30, 41, 59, 0.95)" : "rgba(15, 23, 42, 0.8)";
    ctx.fill();
    ctx.strokeStyle = isHovered ? "#38bdf8" : "rgba(51, 65, 85, 0.7)";
    ctx.lineWidth = isHovered ? 1.5 : 1;
    ctx.stroke();

    ctx.fillStyle = isHovered ? "#38bdf8" : "#f8fafc";
    ctx.fillText(nameText, cx, cy);

    // Role text line underneath
    ctx.font = "500 8.5px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(role, cx, cy + 12);

    ctx.restore();
  }

  function drawTooltip() {
    if (!hoveredObject) return;

    let title = "";
    let sub = "";
    let badge = "";
    let hint = "";

    if (hoveredObject.type === "agent") {
      const a = hoveredObject.agent;
      title = `${a.name}`;
      sub = a.role;
      badge = a.status.toUpperCase();
      hint = `💬 Click to chat with @${a.id}`;
    } else if (hoveredObject.type === "whiteboard") {
      title = "📋 Team Whiteboard";
      sub = "Tasks & Delegation";
      hint = "Click to open Task Board";
    }

    const tx = Math.min(mousePos.x + 14, (canvas.width / (window.devicePixelRatio || 1)) - 170);
    const ty = Math.max(mousePos.y - 65, 15);
    const tw = 160;
    const th = badge ? 58 : 46;

    ctx.save();
    // Tooltip Card
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, 8);
    ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 10;
    ctx.stroke();

    ctx.textAlign = "left";
    // Title
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(title, tx + 10, ty + 16);

    // Subtitle / role
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px sans-serif";
    ctx.fillText(sub, tx + 10, ty + 28);

    // Hint
    ctx.fillStyle = "#38bdf8";
    ctx.font = "500 8.5px sans-serif";
    ctx.fillText(hint, tx + 10, ty + (badge ? 46 : 40));

    // Badge if agent
    if (badge) {
      const isRunning = badge === "RUNNING";
      ctx.fillStyle = isRunning ? "#38bdf8" : "#10b981";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(badge, tx + tw - 10, ty + 16);
    }

    ctx.restore();
  }

  // --- Interaction & Hit Testing ---

  function getMouseCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function isPointInPoly(pt, poly) {
    const vertices = [poly.p0, poly.p1, poly.p2, poly.p3];
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].x, yi = vertices[i].y;
      const xj = vertices[j].x, yj = vertices[j].y;
      const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
        (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function detectHit(pos) {
    // 1. Check Whiteboard
    const wbPoly = getWhiteboardPolygon();
    if (isPointInPoly(pos, wbPoly)) {
      return { type: "whiteboard" };
    }

    // 2. Check Agents (hit test desks/avatars)
    // Check in reverse depth order (front to back)
    const sorted = Object.values(agentsState).sort((a, b) => (b.gx + b.gy) - (a.gx + a.gy));
    for (const agent of sorted) {
      const base = isoToScreen(agent.gx, agent.gy, 0);
      // Desk & avatar bounds
      const dx = pos.x - base.x;
      const dy = pos.y - (base.y - 20); // desk center is around y - 20
      // Elliptical hit radius around desk + character + status bubble
      const rx = 34;
      const ry = 48;
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
        return { type: "agent", agent };
      }
    }

    return null;
  }

  function onMouseMove(e) {
    mousePos = getMouseCanvasPos(e);
    hoveredObject = detectHit(mousePos);
    if (canvas) {
      canvas.style.cursor = hoveredObject ? "pointer" : "default";
    }
  }

  function onMouseLeave() {
    hoveredObject = null;
    mousePos = { x: -1000, y: -1000 };
    if (canvas) {
      canvas.style.cursor = "default";
    }
  }

  function onCanvasClick(e) {
    const pos = getMouseCanvasPos(e);
    const hit = detectHit(pos);
    if (!hit) return;

    if (hit.type === "agent") {
      const agentId = hit.agent.id;
      if (typeof window.openChatWith === "function") {
        window.openChatWith(agentId);
      }
    } else if (hit.type === "whiteboard") {
      const taskTabBtn = document.querySelector('[data-tab="tab-tasks"]');
      if (taskTabBtn) {
        taskTabBtn.click();
      }
    }
  }

  // --- Exposed API ---

  window.updateIsometricAgents = function (agentsList) {
    if (!Array.isArray(agentsList)) return;
    agentsList.forEach(item => {
      if (item && item.id && agentsState[item.id]) {
        agentsState[item.id].status = item.status || "idle";
        agentsState[item.id].action = item.action || (item.status === "running" ? "Thinking..." : "Idle");
        if (item.name) agentsState[item.id].name = item.name;
        if (item.role) agentsState[item.id].role = item.role;
      }
    });
  };

  // Init on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initIsometricCanvas);
  } else {
    initIsometricCanvas();
  }
})();
