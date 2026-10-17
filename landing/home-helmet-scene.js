/* The Guardian studio (v13.4): one Three.js helmet with a camera rig, pointer rotation with inertia
 * and a render loop that only runs while something moves and the section is on screen. */
(function () {
  "use strict";
  if (window.SafePermitHelmetScene) return;
  const DEG = Math.PI / 180, YAW_LIMIT = 35 * DEG, PITCH_LIMIT = 10 * DEG;
  // Studio poses. yaw/pitch in radians, dist is a multiple of the framing distance, look* are scene units.
  const BASE = { yaw: -.42, pitch: -.045, dist: 1, lookX: 0, lookY: .12, exposure: 1, rim: .55, tech: 0, focusAmt: 0, field: 0, scanOn: 0, focus: [0, .5, 0, 9], tau: .45 };
  function create(host, options) {
    options = options || {};
    const T = window.SafePermitTHREE, builder = window.SafePermitHelmetModel;
    if (!host || !T || !builder) return null;
    const canvas = document.createElement("canvas");
    canvas.className = "sp-guardian__canvas"; canvas.setAttribute("aria-hidden", "true");
    let gl;
    try { gl = canvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "high-performance" }); }
    catch (error) { return null; }
    if (!gl) return null;
    let renderer, model;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, context: gl, alpha: true, antialias: true, powerPreference: "high-performance" });
      renderer.setClearColor(0, 0);
      model = builder.build(T);
    } catch (error) { if (renderer) renderer.dispose(); return null; }
    const studio = model.userData.studio, anchors = model.userData.anchors || {};
    const scene = new T.Scene(); scene.add(model);
    const camera = new T.PerspectiveCamera(33, 1, .1, 30);
    host.appendChild(canvas);
    const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    let disposed = false, lost = false, ready = false, active = false, dirty = true, raf = 0, last = 0, clock = 0;
    let width = 0, height = 0, quality = lowEnd ? 1 : 1.5, ratio = 1, slowFrames = 0, draws = 0, generation = 0, lowPower = false;
    let reduced = !!options.reduced, rtl = !!options.rtl, idleFloat = true, frame = 1;
    const cur = Object.assign({}, BASE, { focus: BASE.focus.slice() });
    let tgt = Object.assign({}, BASE, { focus: BASE.focus.slice() });
    // Pointer offsets: hover target, drag velocity (inertia) and a slow return home after touch.
    const user = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, velocity: 0, dragging: false, releasedAt: 0, touch: false };
    let sweep = null;
    const now = function () { return window.performance && window.performance.now ? window.performance.now() : Date.now(); };
    const approach = function (a, b, dt, tau) { return tau <= 0 ? b : a + (b - a) * (1 - Math.exp(-dt / tau)); };
    const clampValue = function (v, limit) { return Math.max(-limit, Math.min(limit, v)); };
    function resize(w, h) {
      if (disposed) return;
      w = Math.max(1, Math.round(w || host.clientWidth || 1)); h = Math.max(1, Math.round(h || host.clientHeight || 1));
      const nextRatio = Math.min(window.devicePixelRatio || 1, quality, Math.sqrt(900000 / (w * h)));
      if (w === width && h === height && Math.abs(nextRatio - ratio) < .0001) return;
      width = w; height = h; ratio = nextRatio;
      renderer.setPixelRatio(ratio); renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.updateProjectionMatrix(); dirty = true; wake();
    }
    function placeCamera() {
      const fit = 6.3 / Math.min(1, camera.aspect * 1.05), distance = fit * cur.dist * frame, elevation = .16;
      camera.position.set(cur.lookX, cur.lookY + Math.sin(elevation) * distance, Math.cos(elevation) * distance);
      camera.lookAt(cur.lookX, cur.lookY, 0);
    }
    function settled() {
      const keys = ["yaw", "pitch", "dist", "lookX", "lookY", "exposure", "rim", "tech", "focusAmt", "field", "scanOn"];
      for (let i = 0; i < keys.length; i++) if (Math.abs(cur[keys[i]] - tgt[keys[i]]) > .0005) return false;
      for (let i = 0; i < 4; i++) if (Math.abs(cur.focus[i] - tgt.focus[i]) > .0005) return false;
      return Math.abs(user.yaw - user.tYaw) < .0005 && Math.abs(user.pitch - user.tPitch) < .0005 && !user.dragging && Math.abs(user.velocity) < .001;
    }
    function step(dt) {
      const tau = reduced ? 0 : tgt.tau;
      ["yaw", "pitch", "dist", "lookX", "lookY", "tech", "focusAmt", "scanOn"].forEach(function (k) { cur[k] = approach(cur[k], tgt[k], dt, tau); });
      ["exposure", "rim", "field"].forEach(function (k) { cur[k] = approach(cur[k], tgt[k], dt, reduced ? 0 : tgt.tau * 1.3); });
      for (let i = 0; i < 4; i++) cur.focus[i] = approach(cur.focus[i], tgt.focus[i], dt, tau);
      // Inertia: a released drag keeps turning and decays; touch rotation drifts home after a pause.
      if (!user.dragging && Math.abs(user.velocity) > .001) {
        user.tYaw = clampValue(user.tYaw + user.velocity * dt, YAW_LIMIT);
        user.velocity *= Math.exp(-dt / .32);
        if (Math.abs(user.tYaw) >= YAW_LIMIT) user.velocity = 0;
      }
      if (user.touch && !user.dragging && Math.abs(user.velocity) <= .001 && now() - user.releasedAt > 2600) { user.tYaw = 0; user.tPitch = 0; user.touch = false; }
      const pointerTau = reduced ? 0 : user.dragging ? .06 : .28;
      user.yaw = approach(user.yaw, user.tYaw, dt, pointerTau);
      user.pitch = approach(user.pitch, user.tPitch, dt, pointerTau);
    }
    function applyStudio() {
      const mirror = rtl ? -1 : 1;
      model.rotation.y = mirror * (cur.yaw + user.yaw);
      model.rotation.x = cur.pitch + user.pitch;
      const float = idleFloat && !reduced && !lowPower ? Math.sin(clock * 1.1) * .018 : 0;
      model.position.y = -.42 + float;
      model.rotation.z = idleFloat && !reduced && !lowPower ? Math.sin(clock * .7) * .006 : 0;
      placeCamera();
      // The key light follows the pointer a little, so rotation reads as light moving over the shell.
      studio.uKey.value.set(-2.6 - user.yaw * 3.2 * mirror, 4.0 + user.pitch * 6, 3.2);
      studio.uExposure.value = cur.exposure; studio.uRim.value = cur.rim; studio.uTech.value = cur.tech;
      studio.uFocusAmt.value = cur.focusAmt; studio.uField.value = cur.field; studio.uScanOn.value = cur.scanOn;
      for (let i = 0; i < 4; i++) studio.uFocus.value[i] = cur.focus[i] * (i === 0 ? mirror : 1);
      studio.uTime.value = reduced ? 0 : clock;
      // Scan from above the crown to below the brim, repeating.
      studio.uScan.value = cur.scanOn > .01 ? (reduced ? .35 : 1.05 - ((clock * .62) % 1.85)) : -9;
      if (sweep) {
        const k = Math.min(1, Math.max(0, (now() - sweep.start) / sweep.duration));
        const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        studio.uSweep.value = -2.6 + e * 5.4;
        if (k >= 1) { sweep = null; studio.uSweep.value = -9; }
      }
    }
    function animating() {
      return !settled() || !!sweep || (cur.scanOn > .01 && !reduced) || (cur.field > .01 && !reduced) || (idleFloat && !reduced && !lowPower);
    }
    let skip = false;
    function tick(time) {
      raf = 0;
      if (disposed || lost || !ready || !active || document.hidden) { last = 0; return; }
      const dt = last ? Math.min(.05, Math.max(.001, (time - last) / 1000)) : 1 / 60;
      last = time; clock += dt;
      step(dt);
      const moving = animating();
      // When only the idle float is running, draw every other frame (about 30 fps).
      const onlyIdle = settled() && !sweep && cur.scanOn <= .01 && cur.field <= .01;
      skip = onlyIdle ? !skip : false;
      if (dirty || !skip) draw();
      if (moving) raf = window.requestAnimationFrame(tick); else last = 0;
    }
    function draw() {
      applyStudio();
      const started = now();
      try { renderer.render(scene, camera); }
      catch (error) { ready = false; host.classList.remove("is-helmet-3d"); return; }
      const cost = now() - started;
      dirty = false; draws++;
      // Limit driver/CPU work on slower devices, then drop the decorative idle motion.
      if (draws > 8 && cost > 12) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames >= 6) {
        slowFrames = 0;
        if (quality > 1) { quality = Math.max(1, quality - .25); const w = width, h = height; width = 0; resize(w, h); }
        else if (!lowPower) { lowPower = true; host.dataset.spHelmetQuality = "low"; }
      }
      if (!host.classList.contains("is-helmet-3d")) host.classList.add("is-helmet-3d");
      if (host.dataset.spHelmetRenderer !== "three") host.dataset.spHelmetRenderer = "three";
      if (options.onFrame) options.onFrame(api);
    }
    function wake() {
      if (!raf && active && ready && !disposed && !lost && !document.hidden) raf = window.requestAnimationFrame(tick);
    }
    function setPose(pose, immediate) {
      tgt = Object.assign({}, BASE, pose || {});
      tgt.focus = (pose && pose.focus ? pose.focus : BASE.focus).slice();
      if (immediate) { Object.keys(tgt).forEach(function (k) { if (k !== "focus") cur[k] = tgt[k]; }); cur.focus = tgt.focus.slice(); }
      dirty = true; wake();
    }
    const vector = new T.Vector3(), normal = new T.Vector3(), toCamera = new T.Vector3();
    function project(name) {
      const anchor = anchors[name];
      if (!anchor || !width) return null;
      model.updateMatrixWorld();
      // The helmet is symmetric: in RTL the studio turns the other way, so anchors mirror with it.
      const m = rtl ? -1 : 1;
      vector.set(anchor.p[0] * m, anchor.p[1], anchor.p[2]); model.localToWorld(vector);
      normal.set(anchor.n[0] * m, anchor.n[1], anchor.n[2]).transformDirection(model.matrixWorld);
      toCamera.copy(camera.position).sub(vector).normalize();
      const facing = normal.dot(toCamera);
      vector.project(camera);
      return { x: (vector.x + 1) / 2 * width, y: (1 - vector.y) / 2 * height, facing: facing };
    }
    function prepare() {
      const token = ++generation;
      const complete = function () { if (disposed || lost || token !== generation) return; ready = true; dirty = true; applyStudio(); wake(); if (!active) { draw(); } };
      if (renderer.compileAsync) {
        applyStudio();
        let promise; try { promise = renderer.compileAsync(scene, camera); } catch (error) { ready = false; return; }
        Promise.resolve(promise).then(complete, function () { if (!disposed && token === generation) { ready = false; host.classList.remove("is-helmet-3d"); } });
      } else { if (renderer.compile) renderer.compile(scene, camera); complete(); }
    }
    function contextLost(event) { event.preventDefault(); lost = true; ready = false; generation++; if (raf) window.cancelAnimationFrame(raf); raf = 0; host.classList.remove("is-helmet-3d"); }
    function contextRestored() { lost = false; dirty = true; prepare(); }
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("webglcontextrestored", contextRestored);
    const api = {
      setPose: setPose,
      setActive: function (value) { active = !!value; if (active) { dirty = true; wake(); } else if (raf) { window.cancelAnimationFrame(raf); raf = 0; last = 0; } },
      setReduced: function (value) { reduced = !!value; dirty = true; wake(); },
      setRtl: function (value) { if (rtl !== !!value) { rtl = !!value; dirty = true; wake(); } },
      setIdle: function (value) { idleFloat = !!value; wake(); },
      // Small viewports frame the helmet from further away so the brim is never clipped.
      setFrame: function (value) { if (value > 0 && value !== frame) { frame = value; dirty = true; wake(); } },
      // Hover: normalized pointer position (-1..1) maps to the rotation range.
      hover: function (nx, ny) { if (user.dragging) return; user.tYaw = clampValue(nx, 1) * YAW_LIMIT * (rtl ? -1 : 1); user.tPitch = clampValue(ny, 1) * PITCH_LIMIT; user.velocity = 0; wake(); },
      dragStart: function () { user.dragging = true; user.touch = true; user.velocity = 0; wake(); },
      // dx is a fraction of the viewport width.
      drag: function (dx, dt) {
        const delta = dx * 1.6 * (rtl ? -1 : 1);
        user.tYaw = clampValue(user.tYaw + delta, YAW_LIMIT);
        if (dt > 0) user.velocity = user.velocity * .4 + (delta / dt) * .6;
        wake();
      },
      dragEnd: function () { user.dragging = false; user.releasedAt = now(); if (reduced) user.velocity = 0; user.velocity = clampValue(user.velocity, 3); wake(); },
      resetPointer: function () { user.tYaw = 0; user.tPitch = 0; user.velocity = 0; wake(); },
      sweep: function (duration) { if (reduced) return; sweep = { start: now(), duration: duration || 1400 }; wake(); },
      project: project,
      anchorNames: function () { return Object.keys(anchors); },
      isLowPower: function () { return lowPower; },
      isRendering: function () { return !!raf; },
      resize: resize,
      dispose: function () {
        if (disposed) return; disposed = true; generation++;
        if (raf) window.cancelAnimationFrame(raf); raf = 0;
        canvas.removeEventListener("webglcontextlost", contextLost); canvas.removeEventListener("webglcontextrestored", contextRestored);
        model.children.forEach(function (mesh) { mesh.geometry.dispose(); mesh.material.dispose(); });
        renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
        host.classList.remove("is-helmet-3d"); delete host.dataset.spHelmetRenderer; canvas.remove();
      }
    };
    resize(); placeCamera(); prepare();
    return api;
  }
  window.SafePermitHelmetScene = { create: create, kind: "studio-three-model", needsThree: true, limits: { yaw: YAW_LIMIT, pitch: PITCH_LIMIT } };
})();
