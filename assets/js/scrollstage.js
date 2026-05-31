/* ============================================================
   Scroll Stage — Apple-style scroll-scrubbed 3D drone
   Pure-white cinematic stage. A quadcopter is choreographed
   entirely by scroll: assemble -> push-in -> exploded view
   -> reassemble & settle. Props spin throughout.
   Reads --accent / --ink so it follows the Tweaks panel.
   ============================================================ */
(function () {
  "use strict";
  const section = document.getElementById("reveal");
  const canvas = document.getElementById("ss-canvas");
  if (!section || !canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const caps = [...document.querySelectorAll(".ss-cap")];
  const hint = document.querySelector(".ss-hint");
  const railFill = document.querySelector(".ss-rail-fill");
  const scrim = document.querySelector(".ss-scrim");

  const TAU = Math.PI * 2;
  const FOCAL = 540;
  let W = 0, H = 0, DPR = 1, R = 220;

  /* ---------- helpers ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  function kf(p, stops) {
    if (p <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (p <= stops[i][0]) {
        const t = (p - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
        return lerp(stops[i - 1][1], stops[i][1], ease(clamp(t, 0, 1)));
      }
    }
    return stops[stops.length - 1][1];
  }
  function parseColor(s, fb) {
    if (!s) return fb;
    s = s.trim();
    if (s[0] === "#") {
      let h = s.slice(1);
      if (h.length === 3) h = h.split("").map((x) => x + x).join("");
      const n = parseInt(h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const m = s.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3] } : fb;
  }
  let accent = { r: 43, g: 43, b: 242 };
  let ink = { r: 21, g: 20, b: 14 };
  function refreshColors() {
    const cs = getComputedStyle(document.documentElement);
    accent = parseColor(cs.getPropertyValue("--accent"), accent);
    ink = parseColor(cs.getPropertyValue("--ink"), ink);
  }
  const rgba = (c, a) => `rgba(${c.r},${c.g},${c.b},${a})`;
  const mix = (c, t) => ({ r: lerp(c.r, 255, t), g: lerp(c.g, 255, t), b: lerp(c.b, 255, t) });

  /* ---------- drone geometry ---------- */
  const ARM = 0.92, HUB = 0.24, MOT_H = 0.16, PROP_R = 0.52, PROP_N = 22;
  let NODES = [], EDGES = [], PROPS = [];

  function buildDrone() {
    NODES = []; EDGES = []; PROPS = [];
    const add = (x, y, z, ex) => { NODES.push({ x, y, z, ex }); return NODES.length - 1; };
    const edge = (a, b, kind) => EDGES.push([a, b, kind || "frame"]);

    // central hub octagon + top
    const hubEx = { x: 0, y: 0.12, z: 0 };
    const top = add(0, 0.13, 0, hubEx);
    const ring = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      ring.push(add(Math.cos(a) * HUB, 0, Math.sin(a) * HUB, hubEx));
    }
    for (let k = 0; k < 8; k++) {
      edge(ring[k], ring[(k + 1) % 8]);
      if (k % 2 === 0) edge(ring[k], top);
    }

    // gimbal / camera box underneath
    const gimEx = { x: 0, y: -0.6, z: 0 };
    const gw = 0.12, gh = 0.12, gy = -0.16, gz = 0.04;
    const gb = [
      add(-gw, gy, -gh + gz, gimEx), add(gw, gy, -gh + gz, gimEx),
      add(gw, gy, gh + gz, gimEx), add(-gw, gy, gh + gz, gimEx),
      add(-gw, gy - gh, -gh + gz, gimEx), add(gw, gy - gh, -gh + gz, gimEx),
      add(gw, gy - gh, gh + gz, gimEx), add(-gw, gy - gh, gh + gz, gimEx),
    ];
    [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([a,b]) => edge(gb[a], gb[b]));
    edge(top, gb[0]); edge(top, gb[2]);

    // landing skids
    const gearEx = { x: 0, y: -0.5, z: 0 };
    [-1, 1].forEach((s) => {
      const a = add(s * 0.18, -0.02, -0.22, gearEx);
      const b = add(s * 0.5, -0.36, -0.22, gearEx);
      const c = add(s * 0.5, -0.36, 0.22, gearEx);
      const d = add(s * 0.18, -0.02, 0.22, gearEx);
      edge(a, b); edge(b, c); edge(c, d);
      edge(ring[s > 0 ? 0 : 4], a);
    });

    // 4 arms + motors + props (X config)
    for (let i = 0; i < 4; i++) {
      const ang = Math.PI / 4 + i * (Math.PI / 2);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const ex = { x: ca * 0.55, y: 0.4, z: sa * 0.55 };
      const base = add(ca * HUB, 0, sa * HUB, ex);
      const tipB = add(ca * ARM, 0, sa * ARM, ex);
      const tipT = add(ca * ARM, MOT_H, sa * ARM, ex);
      edge(base, tipB, "arm");
      edge(tipB, tipT, "motor");
      edge(top, base);
      PROPS.push({ cx: ca * ARM, cy: MOT_H + 0.02, cz: sa * ARM, phase: i * 1.3, dir: i % 2 ? 1 : -1, ex });
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    R = Math.min(W, H) * 0.34;
    buildDrone();
  }

  /* ---------- scroll ---------- */
  let rawP = 0, dispP = 0;
  function computeP() {
    const rect = section.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    rawP = total > 0 ? clamp(-rect.top, 0, total) / total : 0;
  }

  /* ---------- projection ---------- */
  let ay = 0, ax = 0, sinY = 0, cosY = 1, sinX = 0, cosX = 1, Rp = 200, cx = 0, cy = 0;
  function project(x, y, z) {
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    const sc = FOCAL / (FOCAL + z2 * Rp / 200);
    return { sx: cx + x1 * Rp * sc, sy: cy + y1 * Rp * sc, z: z2, sc };
  }

  /* ---------- captions ---------- */
  function updateCaptions(p) {
    let maxOp = 0;
    for (const cap of caps) {
      const from = +cap.dataset.from, to = +cap.dataset.to, fade = 0.055;
      const op = clamp(Math.min((p - from) / fade, (to - p) / fade), 0, 1);
      maxOp = Math.max(maxOp, op);
      cap.style.opacity = op.toFixed(3);
      cap.style.transform = `translate(-50%,-50%) scale(${(0.965 + 0.035 * op).toFixed(4)}) translateY(${((1 - op) * 22).toFixed(1)}px)`;
      cap.style.pointerEvents = "none";
    }
    if (scrim) scrim.style.opacity = (maxOp * 0.82).toFixed(3);
    if (hint) hint.style.opacity = clamp(1 - p / 0.03, 0, 1).toFixed(2);
    if (railFill) railFill.style.transform = `scaleY(${p.toFixed(3)})`;
  }

  /* ---------- render ---------- */
  let t = 0, frame = 0, running = false;
  /* user drag-to-rotate (with momentum + ease back to scroll orientation) */
  let userYaw = 0, userPitch = 0, velYaw = 0, velPitch = 0, dragging = false, lpx = 0, lpy = 0;
  function render() {
    frame++;
    if (frame % 18 === 0) refreshColors();
    t += 0.016;
    dispP += (rawP - dispP) * (reduced ? 1 : 0.085);
    const p = reduced ? 0.5 : dispP;
    updateCaptions(p);

    // drag momentum / spring back toward scroll-driven orientation
    if (!dragging) {
      userYaw += velYaw; userPitch += velPitch;
      velYaw *= 0.94; velPitch *= 0.94;
      userYaw *= 0.95; userPitch *= 0.95;
    }
    userPitch = clamp(userPitch, -0.7, 0.7);

    const assemble = ease(clamp(p / 0.14, 0, 1));
    ay = p * TAU * 1.6 + t * 0.05 + userYaw;
    ax = kf(p, [[0, -0.5], [0.3, -0.32], [0.55, -0.12], [0.8, -0.42], [1, -0.5]]) + userPitch;
    const zoom = kf(p, [[0, 0.5], [0.2, 0.82], [0.4, 1.28], [0.5, 1.12], [0.66, 1.14], [0.82, 0.95], [1, 0.9]]);
    const explode = kf(p, [[0, 0], [0.44, 0], [0.53, 1], [0.64, 1], [0.73, 0], [1, 0]]) * 0.75;
    const propA = t * 9 + p * 8;
    Rp = R * zoom * (0.82 + 0.18 * assemble);
    sinY = Math.sin(ay); cosY = Math.cos(ay); sinX = Math.sin(ax); cosX = Math.cos(ax);
    cx = W / 2; cy = H / 2 + H * 0.04;

    ctx.clearRect(0, 0, W, H);

    // grounding shadow
    const groundY = cy + Rp * 1.15;
    const shScale = clamp(1.4 - explode * 0.4, 0.6, 1.6) * (0.8 + 0.2 * assemble);
    const sg = ctx.createRadialGradient(cx, groundY, 0, cx, groundY, Rp * shScale);
    sg.addColorStop(0, rgba(ink, 0.16 * assemble));
    sg.addColorStop(1, rgba(ink, 0));
    ctx.save();
    ctx.translate(cx, groundY); ctx.scale(1, 0.22); ctx.translate(-cx, -groundY);
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(cx, groundY, Rp * shScale, 0, TAU); ctx.fill();
    ctx.restore();

    // project static nodes
    const proj = NODES.map((n) => project(
      n.x + n.ex.x * explode, n.y + n.ex.y * explode, n.z + n.ex.z * explode
    ));

    // frame edges
    ctx.lineCap = "round";
    for (const [a, b, kind] of EDGES) {
      const pa = proj[a], pb = proj[b];
      const col = kind === "motor" ? accent : ink;
      const w = kind === "arm" ? 2.2 : kind === "motor" ? 3 : 1.6;
      ctx.strokeStyle = rgba(col, (kind === "frame" ? 0.55 : 0.85) * assemble);
      ctx.lineWidth = w * ((pa.sc + pb.sc) / 2);
      ctx.beginPath(); ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pb.sx, pb.sy); ctx.stroke();
    }

    // joints
    for (let i = 0; i < NODES.length; i++) {
      const pr = proj[i];
      ctx.beginPath(); ctx.arc(pr.sx, pr.sy, 2.1 * pr.sc, 0, TAU);
      ctx.fillStyle = rgba(ink, 0.7 * assemble); ctx.fill();
    }

    // props
    for (const pr of PROPS) {
      const centerX = pr.cx + pr.ex.x * explode;
      const centerY = pr.cy + pr.ex.y * explode;
      const centerZ = pr.cz + pr.ex.z * explode;
      const ringPts = [];
      for (let k = 0; k <= PROP_N; k++) {
        const a = (k / PROP_N) * TAU + propA * pr.dir + pr.phase;
        ringPts.push(project(centerX + Math.cos(a) * PROP_R, centerY, centerZ + Math.sin(a) * PROP_R));
      }
      // spin disc
      ctx.beginPath();
      ringPts.forEach((q, k) => k ? ctx.lineTo(q.sx, q.sy) : ctx.moveTo(q.sx, q.sy));
      ctx.closePath();
      ctx.fillStyle = rgba(accent, 0.07 * assemble);
      ctx.fill();
      ctx.strokeStyle = rgba(accent, 0.6 * assemble);
      ctx.lineWidth = 1.4 * ringPts[0].sc;
      ctx.stroke();
      // blades
      const c0 = project(centerX, centerY, centerZ);
      for (let bld = 0; bld < 2; bld++) {
        const a = propA * pr.dir + pr.phase + bld * Math.PI;
        const tip = project(centerX + Math.cos(a) * PROP_R, centerY, centerZ + Math.sin(a) * PROP_R);
        ctx.strokeStyle = rgba(mix(accent, 0.15), 0.85 * assemble);
        ctx.lineWidth = 2.4 * c0.sc;
        ctx.beginPath(); ctx.moveTo(c0.sx, c0.sy); ctx.lineTo(tip.sx, tip.sy); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(c0.sx, c0.sy, 3 * c0.sc, 0, TAU);
      ctx.fillStyle = rgba(accent, 0.95 * assemble); ctx.fill();
    }

    if (running) requestAnimationFrame(render);
  }
  function start() { if (!running) { running = true; requestAnimationFrame(render); } }
  function stop() { running = false; }

  resize();
  refreshColors();
  computeP();
  window.addEventListener("resize", () => { resize(); computeP(); });
  window.addEventListener("scroll", computeP, { passive: true });

  /* ---------- drag to rotate ---------- */
  if (!reduced) {
    canvas.style.cursor = "grab";
    canvas.style.touchAction = "pan-y";
    const down = (x, y) => { dragging = true; lpx = x; lpy = y; velYaw = velPitch = 0; canvas.style.cursor = "grabbing"; };
    const move = (x, y) => {
      if (!dragging) return;
      const dx = x - lpx, dy = y - lpy; lpx = x; lpy = y;
      userYaw += dx * 0.007; userPitch += dy * 0.005;
      velYaw = dx * 0.007; velPitch = dy * 0.005;
    };
    const up = () => { dragging = false; canvas.style.cursor = "grab"; };
    canvas.addEventListener("pointerdown", (e) => { down(e.clientX, e.clientY); });
    window.addEventListener("pointermove", (e) => { if (dragging) { move(e.clientX, e.clientY); } });
    window.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
  }

  if (reduced) { render(); return; }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting ? start() : stop()), { threshold: 0 }).observe(section);
  } else { start(); }
})();
