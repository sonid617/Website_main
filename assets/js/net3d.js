/* ============================================================
   Hero 3D — rotating network sphere
   Self-contained 3D point cloud projected to 2D canvas.
   Reads --accent from CSS so it follows the Tweaks panel.
   ============================================================ */
(function () {
  "use strict";
  const canvas = document.getElementById("net3d");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  let R = 160;               // sphere radius in css px
  const FOCAL = 460;         // perspective focal length

  // ---- build points on a fibonacci sphere ----
  function buildPoints(n) {
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      pts.push({
        x: Math.cos(theta) * r,
        y: y,
        z: Math.sin(theta) * r,
        pulse: Math.random() * Math.PI * 2,
        big: Math.random() < 0.22,
      });
    }
    return pts;
  }

  // ---- precompute edges: link each point to nearest neighbours ----
  function buildEdges(pts, k) {
    const edges = [];
    const seen = new Set();
    for (let i = 0; i < pts.length; i++) {
      const d = [];
      for (let j = 0; j < pts.length; j++) {
        if (i === j) continue;
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dz = pts[i].z - pts[j].z;
        d.push([dx * dx + dy * dy + dz * dz, j]);
      }
      d.sort((a, b) => a[0] - b[0]);
      for (let m = 0; m < k; m++) {
        const j = d[m][1];
        const key = i < j ? i + "_" + j : j + "_" + i;
        if (!seen.has(key)) { seen.add(key); edges.push([i, j]); }
      }
    }
    return edges;
  }

  let POINTS = [];
  let EDGES = [];

  function rebuild() {
    const n = W < 520 ? 90 : 140;
    POINTS = buildPoints(n);
    EDGES = buildEdges(POINTS, 3);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    R = Math.min(W, H) * 0.46;
    rebuild();
  }

  // ---- accent colour (cached, refreshed periodically) ----
  let accent = { r: 43, g: 43, b: 242 };
  function refreshAccent() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    const c = parseColor(raw);
    if (c) accent = c;
  }
  function parseColor(s) {
    if (!s) return null;
    if (s[0] === "#") {
      let h = s.slice(1);
      if (h.length === 3) h = h.split("").map((x) => x + x).join("");
      const num = parseInt(h, 16);
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }
    const m = s.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    return null;
  }

  // ---- interaction ----
  let rotY = 0, rotX = -0.25;
  let targetX = -0.25, targetY = 0;
  let curX = -0.25, curY = 0;
  const host = canvas.closest(".hero-portrait") || canvas;
  if (!reduced && window.matchMedia("(pointer:fine)").matches) {
    window.addEventListener("mousemove", (e) => {
      const r = host.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      targetY = ((e.clientX - cx) / window.innerWidth) * 1.1;
      targetX = -0.25 + ((e.clientY - cy) / window.innerHeight) * 0.9;
    });
  }

  resize();
  refreshAccent();
  window.addEventListener("resize", resize);

  let frame = 0, t = 0;
  function draw() {
    frame++;
    if (frame % 20 === 0) refreshAccent();
    t += 0.016;
    if (!reduced) rotY += 0.0028;
    curX += (targetX - curX) * 0.05;
    curY += (targetY - curY) * 0.05;
    const ay = rotY + curY;
    const ax = curX;

    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const sinY = Math.sin(ay), cosY = Math.cos(ay);
    const sinX = Math.sin(ax), cosX = Math.cos(ax);

    // project all points
    const proj = new Array(POINTS.length);
    for (let i = 0; i < POINTS.length; i++) {
      const p = POINTS[i];
      let x = p.x * R, y = p.y * R, z = p.z * R;
      // rotate Y
      let x1 = x * cosY - z * sinY;
      let z1 = x * sinY + z * cosY;
      // rotate X
      let y1 = y * cosX - z1 * sinX;
      let z2 = y * sinX + z1 * cosX;
      const scale = FOCAL / (FOCAL + z2);
      proj[i] = { sx: cx + x1 * scale, sy: cy + y1 * scale, z: z2, scale: scale };
    }

    const { r, g, b } = accent;

    // edges
    ctx.lineWidth = 1;
    for (let e = 0; e < EDGES.length; e++) {
      const a = proj[EDGES[e][0]], c = proj[EDGES[e][1]];
      const depth = (a.z + c.z) / 2;
      const alpha = Math.max(0, Math.min(0.5, (R - depth) / (R * 3.4)));
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(c.sx, c.sy);
      ctx.stroke();
    }

    // points (depth-sorted back-to-front)
    const order = proj.map((p, i) => i).sort((i, j) => proj[j].z - proj[i].z);
    for (let oi = 0; oi < order.length; oi++) {
      const i = order[oi];
      const p = proj[i], src = POINTS[i];
      const depthA = Math.max(0.12, Math.min(1, (R * 1.6 - p.z) / (R * 2.6)));
      let rad = (src.big ? 2.6 : 1.5) * p.scale;
      let a = depthA;
      if (src.big) {
        const pl = (Math.sin(t * 1.6 + src.pulse) + 1) / 2;
        rad += pl * 1.6 * p.scale;
        a = Math.min(1, depthA + pl * 0.3);
        // glow ring
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rad + 3.5 * p.scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.06 * a})`;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, rad, 0, Math.PI * 2);
      ctx.fillStyle = src.big ? `rgba(${r},${g},${b},${a})` : `rgba(${r},${g},${b},${a * 0.7})`;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
