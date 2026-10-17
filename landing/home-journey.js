/* THE FOUR DECISIONS (v13.4): the Permit Journey as a cinematic command experience.
 * A CSS 3D permit artifact (no WebGL), a Decision Pulse travelling along the review path, role
 * personalities and an illustrative approval finale. Mouse, touch, keyboard, Next/Previous and
 * Play/Pause/Replay; everything is interruptible and the page never locks scrolling.
 * Presentation only: no permit, account, review or storage data is read or written. */
(function () {
  "use strict";
  if (window.SafePermitJourney) return;
  const section = document.querySelector("#workflow.sxj");
  const home = window.SafePermitHomeExperience;
  if (!section || !home || !home.t) return;
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const t = home.t, fill = home.fill;
  const $ = (s, scope) => (scope || section).querySelector(s);
  const $$ = (s, scope) => Array.from((scope || section).querySelectorAll(s));
  const rtl = () => root.dir === "rtl";
  const motion = () => !reduced.matches;
  const svgNS = "http://www.w3.org/2000/svg";

  const tabs = $$("[data-sx-role]");
  const panel = $("#sxRolePanel");
  const swap = $(".sxj-swap", panel);
  const permit = $("#scPermit");
  const rows = $$("[data-sc-check]", permit);
  const stage = $("[data-sx-swipe]");
  const artifact = $("[data-sxj-artifact]");
  const track = $("[data-sxj-track]");
  const ghost = $("[data-sxj-ghost]");
  const playButton = $("[data-sx-play]");
  const stepButtons = $$("[data-sx-step]");
  const roleKeys = ["worker", "supervisor", "safetyOfficer", "admin"];
  const statusKeys = ["draft", "supervisor", "safety", "admin"];
  const dashboards = ["worker/dashboard/", "supervisor/dashboard/", "safety/dashboard/", "admin/dashboard/"];
  // Role personalities: how the permit artifact presents itself to each reviewer (degrees / px).
  const poses = [
    { rx: 14, ry: -18, rz: -3.5, z: -16, y: 10 },  // Worker: drafting on the desk
    { rx: 7, ry: 15, rz: 2, z: 0, y: 6 },          // Supervisor: turned toward operations
    { rx: 11, ry: -7, rz: -1, z: 34, y: 0 },       // Safety officer: brought close for inspection
    { rx: 5, ry: 7, rz: 0, z: 14, y: 0 },          // Admin: presented for the decision
    { rx: 0, ry: 0, rz: 0, z: 46, y: -8 }          // Final: frontal settle
  ];
  const TILT = 7;
  let current = 0, final = false, playing = false, playTimer = 0, introTimer = 0, introState = "idle";
  let pulseFrame = 0, pulseTimers = [], segments = [], pulse = null, geometry = null;

  /* ---------- rendering of the panel and the permit ---------- */
  const index = () => (final ? 4 : current);
  const decided = () => (final ? 4 : current);
  function restart(node, name) { node.classList.remove(name); void node.offsetWidth; node.classList.add(name); }
  function render(animate, forward) {
    const roles = t("roles"), states = t("states"), role = roles[current];
    section.dataset.stage = final ? "final" : String(current);
    tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", String(i === current));
      tab.tabIndex = i === current ? 0 : -1;
      const verb = $("[data-sxj-verb]", tab);
      if (verb) verb.textContent = roles[i].decision;
    });
    panel.setAttribute("aria-labelledby", tabs[current].id);
    $("[data-sx-field='number']", panel).textContent = String(current + 1).padStart(2, "0");
    $("[data-sx-field='role']", panel).textContent = t(roleKeys[current]);
    $("[data-sx-field='title']", panel).textContent = final ? t("finaleTitle") : role.title;
    $("[data-sx-field='body']", panel).textContent = final ? t("finaleBody") : role.body;
    $("[data-sx-field='checks']", panel).replaceChildren(...role.checks.map((text) => { const li = document.createElement("li"); li.textContent = text; return li; }));
    $("[data-sx-field='workspaceText']", panel).textContent = role.workspace;
    $("[data-sx-field='handoff']", panel).textContent = current < 3 ? t("handoff") : "";
    $("[data-sx-field='next']", panel).textContent = current < 3 ? t(roleKeys[current + 1]) : t("handoffEnd");
    const link = $("[data-sx-field='workspace']", panel);
    link.href = dashboards[current];
    $("span", link).textContent = fill(t("openWorkspace"), { role: t(roleKeys[current]) });
    // The illustrative permit artifact.
    const count = decided();
    $("#scPermitStatus").textContent = final ? states.approved : states[statusKeys[current]];
    $("#scCurrentReview").textContent = t(roleKeys[current]);
    $("#scPermitProgress").textContent = "0" + count + " / 04";
    $("#scPermitProgressBar").style.width = (count * 25) + "%";
    rows.forEach((row, i) => {
      const done = i < count, active = !final && i === current;
      row.classList.toggle("is-done", done);
      row.classList.toggle("is-current", active);
      $(".sc-check-state", row).textContent = done ? states.complete : active ? states.inProgress : states.pending;
    });
    permit.dataset.stage = final ? "final" : String(current);
    ghost.textContent = final ? states.approved : role.decision;
    // Controls
    stepButtons.forEach((button) => {
      const step = Number(button.dataset.sxStep);
      button.disabled = step < 0 ? index() === 0 : final;
      if (step > 0) button.setAttribute("aria-label", current === 3 && !final ? t("finalStep") : t("nextStage"));
    });
    syncPlay();
    if (animate && motion()) {
      section.dataset.direction = forward ? "forward" : "back";
      restart(swap, "is-entering");
      restart(section, "is-arriving");
      restart(ghost, "is-entering");
    }
  }

  /* ---------- the review path and the Decision Pulse ---------- */
  const pathLayer = document.createElementNS(svgNS, "svg");
  pathLayer.setAttribute("class", "sxj-path");
  pathLayer.setAttribute("aria-hidden", "true");
  pathLayer.setAttribute("focusable", "false");
  track.insertBefore(pathLayer, track.firstChild);
  for (let i = 0; i < tabs.length - 1; i++) {
    const base = document.createElementNS(svgNS, "path"); base.setAttribute("class", "sxj-path__base");
    const lit = document.createElementNS(svgNS, "path"); lit.setAttribute("class", "sxj-path__lit");
    base.style.setProperty("--sxj-seg", String(i));
    lit.style.setProperty("--sxj-seg", String(i));
    pathLayer.append(base, lit);
    segments.push({ base: base, lit: lit, length: 0 });
  }
  pulse = document.createElementNS(svgNS, "g"); pulse.setAttribute("class", "sxj-pulse");
  const glow = document.createElementNS(svgNS, "circle"); glow.setAttribute("r", "13"); glow.setAttribute("class", "sxj-pulse__glow");
  const core = document.createElementNS(svgNS, "circle"); core.setAttribute("r", "4.5"); core.setAttribute("class", "sxj-pulse__core");
  pulse.append(glow, core);
  pathLayer.appendChild(pulse);
  function layoutPath() {
    const box = track.getBoundingClientRect();
    if (!box.width) return;
    pathLayer.setAttribute("viewBox", "0 0 " + box.width.toFixed(1) + " " + box.height.toFixed(1));
    pathLayer.setAttribute("width", box.width.toFixed(1)); pathLayer.setAttribute("height", box.height.toFixed(1));
    const centres = tabs.map((tab) => {
      const dot = $(".sxj-node__dot", tab).getBoundingClientRect();
      return { x: dot.left + dot.width / 2 - box.left, y: dot.top + dot.height / 2 - box.top, r: dot.width / 2 + 6 };
    });
    geometry = centres;
    segments.forEach((segment, i) => {
      const a = centres[i], b = centres[i + 1], dir = Math.sign(b.x - a.x) || 1;
      const x1 = a.x + dir * a.r, x2 = b.x - dir * b.r, dx = x2 - x1, wave = Math.min(12, Math.abs(dx) * .08);
      const d = "M" + x1.toFixed(1) + " " + a.y.toFixed(1) + " C" + (x1 + dx * .38).toFixed(1) + " " + (a.y - wave).toFixed(1) + " " + (x2 - dx * .38).toFixed(1) + " " + (b.y + wave).toFixed(1) + " " + x2.toFixed(1) + " " + b.y.toFixed(1);
      segment.base.setAttribute("d", d); segment.lit.setAttribute("d", d);
      segment.length = Math.max(1, segment.lit.getTotalLength ? segment.lit.getTotalLength() : Math.abs(dx));
      [segment.base, segment.lit].forEach((p) => p.style.setProperty("--sxj-len", segment.length.toFixed(1)));
    });
  }
  function syncTrack(count) {
    tabs.forEach((tab, i) => tab.classList.toggle("is-decided", i < count));
    segments.forEach((segment, i) => {
      segment.lit.style.transitionDuration = "";
      // Segment i leads to node i + 1: it is lit once that node has been reached.
      segment.lit.classList.toggle("is-lit", i < Math.min(count, 3));
    });
  }
  function cancelPulse() {
    if (pulseFrame) window.cancelAnimationFrame(pulseFrame);
    pulseFrame = 0;
    pulseTimers.forEach(window.clearTimeout); pulseTimers = [];
    pulse.classList.remove("is-travelling");
  }
  const ease = (k) => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  function travel(i, duration, done) {
    const segment = segments[i];
    segment.lit.style.transitionDuration = duration + "ms";
    segment.lit.classList.add("is-lit");
    pulse.classList.add("is-travelling");
    const start = performance.now();
    const frame = (now) => {
      const k = Math.min(1, (now - start) / duration);
      const point = segment.lit.getPointAtLength(ease(k) * segment.length);
      pulse.setAttribute("transform", "translate(" + point.x.toFixed(1) + " " + point.y.toFixed(1) + ")");
      if (k < 1) pulseFrame = window.requestAnimationFrame(frame);
      else { pulseFrame = 0; done(); }
    };
    pulseFrame = window.requestAnimationFrame(frame);
  }
  // A mechanical checkmark: the node and its review record row lock in the decision.
  function confirm(i) {
    tabs[i].classList.add("is-decided");
    restart(tabs[i], "is-confirming");
    if (rows[i]) restart(rows[i], "is-stamping");
  }
  function runPulse(from, to) {
    syncTrack(from);
    const duration = to - from > 1 ? 440 : 680;
    let k = from;
    const next = () => {
      if (k >= to) { pulse.classList.remove("is-travelling"); return; }
      confirm(k);
      if (k === 3) { k++; celebrate(); next(); return; }
      const i = k;
      pulseTimers.push(window.setTimeout(() => travel(i, duration, () => { restart(tabs[i + 1], "is-arrived"); k++; next(); }), 150));
    };
    next();
  }
  function celebrate() {
    if (!motion()) return;
    restart(section, "is-celebrating");
  }

  /* ---------- navigation ---------- */
  function go(next, options) {
    options = options || {};
    next = Math.max(0, Math.min(4, next));
    const from = index();
    if (next === from) return;
    if (options.user) stopPlay();
    endIntro();
    cancelPulse();
    const forward = next > from;
    current = Math.min(3, next); final = next === 4;
    render(true, forward);
    if (!final) section.classList.remove("is-celebrating");
    if (forward && motion()) runPulse(from, next);
    else syncTrack(decided());
    setPose();
  }
  function step(delta, options) { go(index() + delta, options); }
  tabs.forEach((tab, i) => tab.addEventListener("click", () => { if (!(final && i === 3)) go(i, { user: true }); }));
  if (home.arrowKeys) home.arrowKeys(tabs, (i) => { if (!(final && i === 3)) go(i, { user: true }); });
  stepButtons.forEach((button) => button.addEventListener("click", () => step(Number(button.dataset.sxStep), { user: true })));

  /* ---------- Play / Pause / Replay ---------- */
  function syncPlay() {
    if (!playButton) return;
    playButton.setAttribute("aria-pressed", String(playing));
    $("[data-sx-play-label]", playButton).textContent = t(playing ? "pause" : final ? "replay" : "play");
    const icon = $("svg, .sp-icon", playButton);
    if (icon) icon.setAttribute("data-sp-icon", playing ? "pause" : "play");
    playButton.classList.toggle("is-replay", final && !playing);
  }
  function schedule(delay) {
    window.clearTimeout(playTimer);
    playTimer = window.setTimeout(() => {
      if (!playing) return;
      go(index() + 1);
      if (final) stopPlay(); else schedule(2900);
    }, delay);
  }
  function play() {
    if (final) { replay(); return; }
    playing = true; syncPlay(); schedule(700);
  }
  function stopPlay() {
    if (!playing && !playTimer) return;
    playing = false; window.clearTimeout(playTimer); playTimer = 0; syncPlay();
  }
  function replay() {
    stopPlay(); cancelPulse();
    current = 0; final = false;
    section.classList.remove("is-celebrating");
    render(false); syncTrack(0); setPose();
    if (motion()) startIntro(true);
    playing = true; syncPlay(); schedule(motion() ? 1500 : 900);
  }
  if (playButton) playButton.addEventListener("click", () => (playing ? stopPlay() : play()));

  /* ---------- the CSS 3D artifact: poses, pointer tilt with inertia ---------- */
  const keys = ["rx", "ry", "rz", "z", "y"];
  const spring = {}; keys.forEach((k) => { spring[k] = { x: poses[0][k], v: 0 }; });
  const tilt = { x: 0, y: 0 };
  let springFrame = 0, lastTime = 0;
  function target(k) {
    const pose = poses[index()], mirror = rtl() && (k === "ry" || k === "rz") ? -1 : 1;
    let value = pose[k] * mirror;
    if (k === "ry") value += tilt.x * TILT;
    if (k === "rx") value -= tilt.y * TILT;
    return value;
  }
  function paint() {
    const s = spring;
    artifact.style.transform = "translate3d(0," + s.y.x.toFixed(2) + "px," + s.z.x.toFixed(2) + "px) rotateX(" + s.rx.x.toFixed(2) + "deg) rotateY(" + s.ry.x.toFixed(2) + "deg) rotateZ(" + s.rz.x.toFixed(2) + "deg)";
    // The reflection and the floor shadow answer the same motion.
    stage.style.setProperty("--sxj-sheen", (50 - s.ry.x * 3.2 + s.rx.x * 1.2).toFixed(1) + "%");
    stage.style.setProperty("--sxj-shadow-x", (-s.ry.x * 1.6).toFixed(1) + "px");
    stage.style.setProperty("--sxj-shadow-s", (1 - s.z.x / 260).toFixed(3));
  }
  function animate(now) {
    springFrame = 0;
    const dt = lastTime ? Math.min(.032, (now - lastTime) / 1000) : 1 / 60;
    lastTime = now;
    let moving = false;
    keys.forEach((k) => {
      const s = spring[k], goal = target(k);
      // Damped spring: a little overshoot reads as physical weight.
      s.v += (goal - s.x) * 120 * dt;
      s.v *= Math.exp(-15 * dt);
      s.x += s.v * dt;
      if (Math.abs(goal - s.x) > .01 || Math.abs(s.v) > .01) moving = true; else { s.x = goal; s.v = 0; }
    });
    paint();
    if (moving && !document.hidden) springFrame = window.requestAnimationFrame(animate); else lastTime = 0;
  }
  function setPose() {
    if (!motion()) { keys.forEach((k) => { spring[k].x = target(k); spring[k].v = 0; }); paint(); return; }
    if (!springFrame) springFrame = window.requestAnimationFrame(animate);
  }
  stage.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || !motion()) return;
    const box = stage.getBoundingClientRect();
    tilt.x = Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width) * 2 - 1));
    tilt.y = Math.max(-1, Math.min(1, ((event.clientY - box.top) / box.height) * 2 - 1));
    setPose();
  }, { passive: true });
  stage.addEventListener("pointerleave", () => { tilt.x = 0; tilt.y = 0; setPose(); });
  // Swipe the permit on touch screens (direction follows reading order). Vertical scrolling stays native.
  let swipe = null;
  stage.addEventListener("pointerdown", (event) => { endIntro(); if (event.pointerType !== "mouse") swipe = { x: event.clientX, y: event.clientY }; }, { passive: true });
  stage.addEventListener("pointerup", (event) => {
    if (!swipe) return;
    const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
    const forward = rtl() ? dx > 0 : dx < 0;
    step(forward ? 1 : -1, { user: true });
  }, { passive: true });
  stage.addEventListener("pointercancel", () => { swipe = null; }, { passive: true });
  stage.addEventListener("keydown", (event) => {
    let delta = 0;
    if (event.key === "ArrowRight") delta = rtl() ? -1 : 1;
    else if (event.key === "ArrowLeft") delta = rtl() ? 1 : -1;
    else if (event.key === "Home") { event.preventDefault(); go(0, { user: true }); return; }
    else if (event.key === "End") { event.preventDefault(); go(final ? 4 : 3, { user: true }); return; }
    else return;
    event.preventDefault();
    step(delta, { user: true });
  });
  section.addEventListener("keydown", (event) => { if (event.key === "Escape" && playing) stopPlay(); });

  /* ---------- opening sequence ---------- */
  function startIntro(replaying) {
    window.clearTimeout(introTimer);
    section.classList.remove("sxj-armed");
    restart(section, "sxj-intro");
    introState = "running";
    if (replaying) section.classList.add("sxj-intro--short");
    introTimer = window.setTimeout(endIntro, replaying ? 1300 : 2300);
  }
  // Any interaction ends the sequence at once: nothing waits on the intro.
  function endIntro() {
    if (introState === "done") return;
    window.clearTimeout(introTimer);
    introState = "done";
    section.classList.remove("sxj-armed", "sxj-intro", "sxj-intro--short");
  }
  section.addEventListener("pointerdown", endIntro, { passive: true });
  section.addEventListener("focusin", endIntro);

  /* ---------- visibility, language and layout ---------- */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry.isIntersecting) { stopPlay(); return; }
      if (introState === "armed" && entry.intersectionRatio >= .22) startIntro(false);
    }, { threshold: [0, .22, .45] }).observe(section);
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopPlay(); });
  document.addEventListener("safepermit:navigationchange", (event) => { if (event.detail && event.detail.open) stopPlay(); });
  reduced.addEventListener("change", () => { if (reduced.matches) { stopPlay(); endIntro(); cancelPulse(); syncTrack(decided()); } setPose(); });
  function relayout() { layoutPath(); syncTrack(decided()); }
  function language() { render(false); setPose(); window.requestAnimationFrame(relayout); }
  document.addEventListener("safepermit:languagechange", language);
  document.addEventListener("safepermit:i18nready", language);
  if (window.ResizeObserver) {
    let frame = 0;
    new ResizeObserver(() => { if (!frame) frame = window.requestAnimationFrame(() => { frame = 0; layoutPath(); }); }).observe(track);
  } else window.addEventListener("resize", layoutPath, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutPath);

  render(false);
  layoutPath();
  syncTrack(0);
  keys.forEach((k) => { spring[k].x = target(k); });
  paint();
  // Arm the opening sequence only while the section is still below the fold.
  if (motion() && "IntersectionObserver" in window && section.getBoundingClientRect().top > window.innerHeight * .55) {
    section.classList.add("sxj-armed"); introState = "armed";
  } else introState = "done";
  window.SafePermitJourney = Object.freeze({
    go: (i) => go(i, { user: true }), next: () => step(1, { user: true }), previous: () => step(-1, { user: true }),
    play, pause: stopPlay, replay, endIntro,
    state: () => ({ stage: current, final, playing, intro: introState, decided: decided(), geometry: geometry && geometry.length })
  });
})();
