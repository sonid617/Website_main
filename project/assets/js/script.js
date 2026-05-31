/* ============================================================
   Dishank Soni — Portfolio interactions
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Scroll progress + topbar ---------- */
  const progress = document.getElementById("progress");
  const topbar = document.getElementById("topbar");
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    if (progress) progress.style.width = pct + "%";
    if (topbar) topbar.classList.toggle("scrolled", h.scrollTop > 30);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Typing effect ---------- */
  const typedEl = document.getElementById("typed");
  const words = ["drone comms", "embedded systems", "RF & mesh networks", "AI / ML pipelines", "home labs"];
  let wi = 0, ci = 0, deleting = false;
  function typeLoop() {
    if (!typedEl) return;
    const word = words[wi];
    if (!deleting) {
      typedEl.textContent = word.slice(0, ++ci);
      if (ci === word.length) { deleting = true; setTimeout(typeLoop, 1500); return; }
    } else {
      typedEl.textContent = word.slice(0, --ci);
      if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; }
    }
    setTimeout(typeLoop, deleting ? 45 : 85);
  }
  typeLoop();

  /* ---------- Reveal on scroll ---------- */
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Animated skill bars + count-up ---------- */
  const skills = document.querySelectorAll(".skill");
  function countUp(el, target) {
    const dur = 1300, t0 = performance.now();
    function step(now) {
      const k = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(target * eased) + "%";
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window && !reduced) {
    const sio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const fill = e.target.querySelector(".skill-fill");
          if (fill) fill.style.width = e.target.dataset.pct + "%";
          const num = e.target.querySelector("[data-count]");
          if (num) countUp(num, +num.dataset.count);
          sio.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    skills.forEach((s) => sio.observe(s));
  } else {
    skills.forEach((s) => {
      const f = s.querySelector(".skill-fill"); if (f) f.style.width = s.dataset.pct + "%";
      const n = s.querySelector("[data-count]"); if (n) n.textContent = n.dataset.count + "%";
    });
  }

  /* ---------- Scroll-spy nav ---------- */
  const navLinks = document.querySelectorAll("[data-nav]");
  const sections = [...navLinks].map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const id = "#" + e.target.id;
          navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === id));
        }
      });
    }, { threshold: 0.3, rootMargin: "-30% 0px -55% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Portfolio filter ---------- */
  const filterBtns = document.querySelectorAll("[data-filter]");
  const cards = document.querySelectorAll(".work-card");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const f = btn.dataset.filter;
      cards.forEach((card) => {
        const show = f === "all" || card.dataset.cat === f;
        card.classList.toggle("hide", !show);
      });
    });
  });

  /* ---------- Contact form ---------- */
  const form = document.getElementById("contactForm");
  const sendBtn = document.getElementById("sendBtn");
  const status = document.getElementById("formStatus");
  if (form) {
    const inputs = form.querySelectorAll("input, textarea");
    const validate = () => {
      const ok = [...inputs].every((i) => i.value.trim() && (i.type !== "email" || /\S+@\S+\.\S+/.test(i.value)));
      if (sendBtn) sendBtn.disabled = !ok;
    };
    inputs.forEach((i) => i.addEventListener("input", validate));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (sendBtn) { sendBtn.disabled = true; }
      if (status) status.textContent = "✓ Thanks — your message is on its way.";
      form.reset();
      setTimeout(() => { if (status) status.textContent = ""; }, 5000);
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (!reduced && window.matchMedia("(pointer:fine)").matches) {
    document.querySelectorAll(".btn, .nav-cta").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.18}px, ${y * 0.22}px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- Parallax on work imagery ---------- */
  const parallaxImgs = [...document.querySelectorAll(".work-shot-img img")];
  if (!reduced && parallaxImgs.length) {
    let ticking = false;
    const onPx = () => {
      const vh = window.innerHeight;
      parallaxImgs.forEach((img) => {
        const r = img.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const center = r.top + r.height / 2;
        const off = (center - vh / 2) / vh;            // -0.5..0.5
        img.style.transform = `scale(1.12) translateY(${(off * -26).toFixed(1)}px)`;
      });
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(onPx); }
    }, { passive: true });
    onPx();
  }
})();
