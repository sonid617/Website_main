/* ============================================================
   Dishank Soni — Storytelling & interactivity layer
   - Guided chapter rail (tracks scroll, click to jump)
   - Per-project case-study overlays
   ============================================================ */
(function () {
  "use strict";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================================================
     Chapter rail
     ============================================================ */
  const CHAPTERS = [
    { id: "top", n: "00", label: "Intro" },
    { id: "reveal", n: "01", label: "The Build" },
    { id: "about", n: "02", label: "About" },
    { id: "focus", n: "03", label: "Craft" },
    { id: "work", n: "04", label: "Work" },
    { id: "resume", n: "05", label: "Path" },
    { id: "writing", n: "06", label: "Words" },
    { id: "contact", n: "07", label: "Contact" },
  ];
  const rail = document.createElement("nav");
  rail.className = "chapters";
  rail.setAttribute("aria-label", "Chapters");
  const chapEls = CHAPTERS.map((c) => {
    const b = document.createElement("button");
    b.className = "chap";
    b.dataset.id = c.id;
    b.innerHTML = `<span class="chap-tick"></span><span class="chap-num">${c.n}</span><span class="chap-label">${c.label}</span>`;
    b.addEventListener("click", () => {
      const el = document.getElementById(c.id);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (c.id === "top" ? 0 : 0), behavior: reduced ? "auto" : "smooth" });
    });
    rail.appendChild(b);
    return b;
  });
  document.body.appendChild(rail);

  const sections = CHAPTERS.map((c) => document.getElementById(c.id));
  function onScroll() {
    const y = window.scrollY;
    rail.classList.toggle("show", y > window.innerHeight * 0.6);
    const mid = y + window.innerHeight * 0.4;
    let active = 0;
    sections.forEach((s, i) => { if (s && s.offsetTop <= mid) active = i; });
    chapEls.forEach((el, i) => el.classList.toggle("active", i === active));
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ============================================================
     Project case-study overlays
     ============================================================ */
  const STORIES = {
    vtx: {
      premise: "Putting a live HD feed in the pilot's eyes — with milliseconds to spare.",
      build: "A digital video-transmission system for UAVs built on OpenHD and WFB-NG, with custom air and ground nodes. I tuned the GStreamer pipeline and RF link for low-latency, long-range streaming that holds up in the field — the difference between flying blind and flying with confidence.",
      tags: ["OpenHD", "WFB-NG", "GStreamer", "RF Link", "Raspberry Pi"],
      role: "Firmware & hardware",
      org: "Abhyuday",
    },
    gcs: {
      premise: "One screen to fly, watch, and command the swarm.",
      build: "A ground control station written in Qt6 / C++ that speaks MAVLink — live telemetry, mission planning, a moving map, and swarm command in a single interface. Built for operators who need to read a whole fleet at a glance and act in real time.",
      tags: ["Qt6", "C++", "MAVLink", "Telemetry", "Maps"],
      role: "Application engineering",
      org: "Abhyuday",
    },
    doorlock: {
      premise: "Your face is the key.",
      build: "An IoT access system on a Raspberry Pi: Pi Camera face recognition gates the lock, every event is logged to Firebase, and the door can be opened remotely. A small, self-contained piece of hardware that quietly does one job well.",
      tags: ["Raspberry Pi", "OpenCV", "Firebase", "IoT"],
      role: "End-to-end build",
      org: "Personal project",
    },
    rover: {
      premise: "A rover that sees, decides, and drives itself.",
      build: "An autonomous ground vehicle running onboard AI inference for live object detection, navigating on its own while streaming real-time telemetry back to base. Edge intelligence on a moving platform — where perception and control meet.",
      tags: ["Computer Vision", "Edge AI", "Autonomy", "Telemetry"],
      role: "Systems & ML",
      org: "Personal project",
    },
    homelab: {
      premise: "My own private cloud, humming 24/7.",
      build: "A self-hosted infrastructure stack on Raspberry Pi 4 — Docker, Pi-hole, Tailscale, and Node-RED running private services around the clock, with Proxmox virtualisation on the roadmap. The lab where I break things on purpose and learn how systems really behave.",
      tags: ["Docker", "Pi-hole", "Tailscale", "Node-RED"],
      role: "Infrastructure & DevOps",
      org: "Home lab",
    },
  };
  const KEYS = ["vtx", "gcs", "doorlock", "rover", "homelab"];

  // overlay shell
  const overlay = document.createElement("div");
  overlay.className = "proj-overlay";
  overlay.innerHTML = `
    <div class="proj-card" role="dialog" aria-modal="true">
      <div class="proj-shot">
        <div class="work-chrome"><i></i><i></i><i></i></div>
        <button class="proj-close" aria-label="Close">&times;</button>
        <div class="proj-shot-img"><img alt="" /></div>
      </div>
      <div class="proj-body">
        <span class="proj-cat"></span>
        <h3 class="proj-title"></h3>
        <p class="proj-premise"></p>
        <div class="proj-grid">
          <div class="proj-build">
            <p class="proj-h">The build</p>
            <p class="proj-build-text"></p>
          </div>
          <div class="proj-side">
            <p class="proj-h">Stack</p>
            <div class="proj-tags"></div>
            <p class="proj-role"></p>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const oImg = overlay.querySelector(".proj-shot-img img");
  const oCat = overlay.querySelector(".proj-cat");
  const oTitle = overlay.querySelector(".proj-title");
  const oPremise = overlay.querySelector(".proj-premise");
  const oBuild = overlay.querySelector(".proj-build-text");
  const oTags = overlay.querySelector(".proj-tags");
  const oRole = overlay.querySelector(".proj-role");

  function openStory(key, card) {
    const s = STORIES[key];
    if (!s) return;
    const img = card.querySelector("img");
    const title = card.querySelector(".work-title");
    const cat = card.querySelector(".work-cat");
    oImg.src = img ? img.src : "";
    oImg.alt = img ? img.alt : "";
    oCat.textContent = cat ? cat.textContent : "";
    oTitle.innerHTML = title ? title.innerHTML : "";
    oPremise.textContent = s.premise;
    oBuild.textContent = s.build;
    oTags.innerHTML = s.tags.map((t) => `<span class="proj-tag">${t}</span>`).join("");
    oRole.innerHTML = `<span class="proj-h" style="margin:18px 0 4px">Role</span>${s.role}<b>${s.org}</b>`;
    overlay.classList.add("open");
    document.body.classList.add("modal-open");
    overlay.querySelector(".proj-card").scrollTop = 0;
  }
  function closeStory() {
    overlay.classList.remove("open");
    document.body.classList.remove("modal-open");
  }

  document.querySelectorAll(".work-card").forEach((card, i) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      openStory(KEYS[i], card);
    });
  });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeStory(); });
  overlay.querySelector(".proj-close").addEventListener("click", closeStory);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeStory(); });
})();
