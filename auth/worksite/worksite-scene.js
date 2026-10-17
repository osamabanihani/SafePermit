/* SafePermit — THE WORKSITE (v13.9). A procedural miniature permit-to-work site in WebGL, shared by the sign-in
 * and password-setup pages.
 *
 * Presentation only: it never decides sign-in, never sees a password and never navigates. Built entirely from the
 * project's bundled Three.js (window.SafePermitTHREE, r186) with procedural geometry and canvas-generated textures;
 * no model or texture files are loaded. Colours come from the page's CSS tokens (accent, success, danger, studio).
 *
 * API: SafePermitWorksite.mount(host, { reduced, mode: "login" | "reset", onLost }) -> null without WebGL, otherwise
 *   setTyping(bool)        the camera ignores the pointer while a field has focus
 *   setProcessing(bool)    a restrained light travels along the route to the closed gate
 *   flag()                 invalid input: the checkpoint indicator dims toward the danger colour and returns
 *   setSections({ length, upper, number, match })   reset mode only, booleans only: each met requirement places
 *                          one walkway plate in the missing section of the route; a match connects the route
 *   complete(done)         after a successful result only: indicator -> success, the gate opens, the route completes
 *                          to the platform and the camera moves a short way (~0.82 s); done() runs once
 *   reset(), dispose()
 */
(function (root) {
  "use strict";
  if (root.SafePermitWorksite) return;
  const T = root.SafePermitTHREE;
  const doc = root.document;
  // The project build does not export Color; every material carries one, so borrow its class.
  const Color = T && (T.Color || new T.MeshBasicMaterial().color.constructor);

  /* ---------------- tokens ---------------- */
  function token(name, fallback) {
    const v = getComputedStyle(doc.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  function tokenFrom(el, name, fallback) {
    const v = el ? getComputedStyle(el).getPropertyValue(name).trim() : "";
    return v || token(name, fallback);
  }

  /* ---------------- geometry helpers ---------------- */
  const UP = T && new T.Vector3(0, 1, 0);   // guarded: without the vendor build, attach() still shows the static image
  const dummy = T && new T.Mesh();
  function place(geo, pos, dir, rot) {
    dummy.position.set(0, 0, 0); dummy.rotation.set(0, 0, 0); dummy.quaternion.set(0, 0, 0, 1); dummy.scale.set(1, 1, 1);
    if (dir) dummy.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
    if (rot) dummy.rotation.set(rot[0], rot[1], rot[2]);
    if (pos) dummy.position.set(pos[0], pos[1], pos[2]);
    dummy.updateMatrix();
    geo.applyMatrix4(dummy.matrix);
    return geo;
  }
  const box = (w, h, d, x, y, z, rot) => place(new T.BoxGeometry(w, h, d), [x, y, z], null, rot);
  const cyl = (r, h, x, y, z, seg, dir, r2) => place(new T.CylinderGeometry(r, r2 == null ? r : r2, h, seg || 16), [x, y, z], dir || null);
  function bar(a, b, r, seg) {
    const A = new T.Vector3(a[0], a[1], a[2]), B = new T.Vector3(b[0], b[1], b[2]);
    const d = B.clone().sub(A), len = d.length(), mid = A.clone().add(B).multiplyScalar(.5);
    return place(new T.CylinderGeometry(r, r, len, seg || 8), [mid.x, mid.y, mid.z], d);
  }
  function slab(w, h, d, x, y, z, bevel) {
    const s = new T.Shape(), hw = w / 2, hd = d / 2;
    s.moveTo(-hw, -hd); s.lineTo(hw, -hd); s.lineTo(hw, hd); s.lineTo(-hw, hd); s.lineTo(-hw, -hd);
    const g = new T.ExtrudeGeometry(s, { depth: h - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4 });
    g.rotateX(-Math.PI / 2);
    g.translate(x, y - h / 2 + bevel, z);
    return g;
  }
  // Merge many geometries into one draw call (position, normal, uv).
  function merge(list) {
    let count = 0;
    const parts = list.filter(Boolean).map(g => { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); count += n.attributes.position.count; return n; });
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
    let o = 0;
    parts.forEach(g => {
      pos.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      o += g.attributes.position.count; g.dispose();
    });
    const m = new T.BufferGeometry();
    m.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    m.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
    m.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    return m;
  }
  // A polyline with rounded (filleted) corners, sampled densely so the tube follows true pipe elbows.
  function filleted(points, radius) {
    const P = points.map(p => new T.Vector3(p[0], p[1], p[2])), out = [P[0].clone()];
    for (let i = 1; i < P.length - 1; i++) {
      const a = P[i - 1], b = P[i], c = P[i + 1];
      const d1 = b.clone().sub(a).normalize(), d2 = c.clone().sub(b).normalize();
      const r = Math.min(radius, b.distanceTo(a) / 2, c.distanceTo(b) / 2);
      const s = b.clone().sub(d1.clone().multiplyScalar(r)), e = b.clone().add(d2.clone().multiplyScalar(r));
      out.push(s);
      for (let k = 1; k < 8; k++) {
        const t = k / 8, u = 1 - t;
        out.push(s.clone().multiplyScalar(u * u).add(b.clone().multiplyScalar(2 * u * t)).add(e.clone().multiplyScalar(t * t)));
      }
      out.push(e);
    }
    out.push(P[P.length - 1].clone());
    return out;
  }
  function pipe(points, r, bend) {
    const pts = filleted(points, bend || r * 3);
    let len = 0; for (let i = 1; i < pts.length; i++) len += pts[i].distanceTo(pts[i - 1]);
    const curve = new T.CatmullRomCurve3(pts, false, "centripetal", 0);
    return new T.TubeGeometry(curve, Math.max(24, Math.round(len * 18)), r, 14, false);
  }
  function flange(p, dir, r) {
    return cyl(r * 1.55, r * .5, p[0], p[1], p[2], 18, new T.Vector3(dir[0], dir[1], dir[2]));
  }

  /* ---------------- canvas textures ---------------- */
  function canvasTex(w, h, draw, repeat, srgb) {
    const c = doc.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new T.CanvasTexture(c);
    if (srgb !== false) t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    if (repeat) { t.wrapS = t.wrapT = 1000; t.repeat.set(repeat[0], repeat[1]); } // RepeatWrapping
    return t;
  }
  function noise(ctx, w, h, base, amount, seed) {
    let s = seed || 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (rnd() - .5) * amount; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    ctx.putImageData(img, 0, 0);
  }

  /* ---------------- mount ---------------- */
  function mount(host, options) {
    if (!T || !host) return null;
    const opts = options || {};
    const mode = opts.mode === "reset" ? "reset" : "login";
    const canvas = doc.createElement("canvas");
    canvas.className = "spw-canvas";
    canvas.setAttribute("aria-hidden", "true");
    let gl = null;
    try { gl = canvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "high-performance" }) || canvas.getContext("webgl", { alpha: true, antialias: true }); } catch (_) { gl = null; }
    if (!gl) return null;
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch (_) { return null; }
    const compact = Math.min(host.clientWidth, root.innerWidth) < 640;
    const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    renderer.setClearColor(0, 0);
    // Production setting: skip synchronous shader-log checks (also silences ANGLE/D3D precision notices on Windows).
    renderer.debug.checkShaderErrors = false;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = 1; // PCFShadowMap, softened by the light's radius
    host.appendChild(canvas);

    const accent = new Color(tokenFrom(host, "--spg-accent", "#ff9b51"));
    const success = new Color(token("--color-success", "#2f7d5a")).lerp(new Color("#7fe0a8"), .35);
    const danger = new Color(token("--color-danger", "#b54747"));
    const studio = new Color(tokenFrom(host, "--spg-studio", "#0a151d"));
    const safety = accent.clone().lerp(new Color("#7a3410"), .38);   // painted safety orange, deeper than the UI accent
    const lampColor = accent.clone().lerp(new Color("#fff2e4"), .78);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(compact ? 26 : 22, 1, .5, 200);
    const disposables = [];
    const keep = x => { disposables.push(x); return x; };

    /* ----- studio environment (soft boxes) for reflections ----- */
    const env = keep(canvasTex(512, 256, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#7d8e9a"); g.addColorStop(.46, "#3e4d58"); g.addColorStop(.5, "#252f37"); g.addColorStop(1, "#0d1216");
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      const soft = (x, y, rw, rh, a) => { const r = c.createRadialGradient(x, y, 0, x, y, rw); r.addColorStop(0, "rgba(255,248,240," + a + ")"); r.addColorStop(1, "rgba(255,248,240,0)"); c.save(); c.translate(x, y); c.scale(1, rh / rw); c.translate(-x, -y); c.fillStyle = r; c.fillRect(x - rw, y - rw, rw * 2, rw * 2); c.restore(); };
      soft(150, 50, 110, 40, 1); soft(395, 66, 80, 30, .8); soft(270, 26, 170, 26, .55);
      c.fillStyle = "rgba(255,155,81,.10)"; c.fillRect(0, 120, w, 8);
    }));
    env.mapping = 303; // EquirectangularReflectionMapping
    scene.environment = env;
    scene.environmentIntensity = 1;

    /* ----- materials ----- */
    const concreteMap = keep(canvasTex(512, 512, (c, w, h) => {
      noise(c, w, h, "#7d8287", 26, 11);
      c.globalAlpha = .18; for (let i = 0; i < 1400; i++) { c.fillStyle = Math.random() > .5 ? "#5d6368" : "#9aa0a5"; c.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
      c.globalAlpha = .55; c.strokeStyle = "#4a4f54"; c.lineWidth = 2; for (let k = 0; k <= 4; k++) { c.beginPath(); c.moveTo(k * w / 4, 0); c.lineTo(k * w / 4, h); c.stroke(); c.beginPath(); c.moveTo(0, k * h / 4); c.lineTo(w, k * h / 4); c.stroke(); }
    }, [.2, .2]));
    const brushed = keep(canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = "#8a8a8a"; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y++) { c.fillStyle = "rgba(" + (110 + Math.random() * 70 | 0) + ",0,0,.5)"; c.fillRect(0, y, w, 1); }
    }, [1, 6], false));
    const grating = keep(canvasTex(256, 256, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.fillStyle = "#fff";
      for (let i = 0; i < w; i += 16) c.fillRect(i, 0, 3, h);
      for (let j = 0; j < h; j += 32) c.fillRect(0, j, w, 2);
    }, [10, 6], false));
    const chain = keep(canvasTex(128, 128, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.strokeStyle = "#fff"; c.lineWidth = 2.2;
      for (let k = -h; k < w + h; k += 16) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + h, h); c.stroke(); c.beginPath(); c.moveTo(k + h, 0); c.lineTo(k, h); c.stroke(); }
    }, [5, 2], false));
    const hazard = keep(canvasTex(256, 32, (c, w, h) => {
      c.fillStyle = "#14191d"; c.fillRect(0, 0, w, h);
      c.fillStyle = "#" + safety.getHexString();
      for (let x = -h; x < w + h; x += 32) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 16, h); c.lineTo(x + 16 + h, 0); c.lineTo(x + h, 0); c.closePath(); c.fill(); }
    }, [14, 1]));
    const glow = keep(canvasTex(128, 128, (c, w, h) => {
      const r = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.35, "rgba(255,255,255,.35)"); r.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = r; c.fillRect(0, 0, w, h);
    }));
    const contact = keep(canvasTex(128, 128, (c, w, h) => {
      const r = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      r.addColorStop(0, "rgba(0,0,0,.85)"); r.addColorStop(.55, "rgba(0,0,0,.35)"); r.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = r; c.fillRect(0, 0, w, h);
    }));
    const tankLabel = keep(canvasTex(512, 128, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.fillStyle = "rgba(235,238,236,.86)";
      c.font = "800 92px 'SP Barlow', 'Barlow Condensed', 'Arial Narrow', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("T-01", w / 2, h / 2 + 4);
    }));

    const M = {
      concrete: keep(new T.MeshStandardMaterial({ color: "#868d92", map: concreteMap, roughness: .92, metalness: 0 })),
      concreteSide: keep(new T.MeshStandardMaterial({ color: "#4a5156", map: concreteMap, roughness: .95, metalness: 0 })),
      steel: keep(new T.MeshStandardMaterial({ color: "#4f5961", roughness: .58, metalness: .18 })),
      steelDark: keep(new T.MeshStandardMaterial({ color: "#353e45", roughness: .62, metalness: .15 })),
      metal: keep(new T.MeshStandardMaterial({ color: "#c2c9ce", roughness: .3, metalness: .88, roughnessMap: brushed, envMapIntensity: 1.15 })),
      tank: keep(new T.MeshStandardMaterial({ color: "#6c757c", roughness: .42, metalness: .3, roughnessMap: brushed })),
      safety: keep(new T.MeshStandardMaterial({ color: safety, roughness: .5, metalness: .1 })),
      cabinet: keep(new T.MeshStandardMaterial({ color: "#6b767e", roughness: .55, metalness: .12 })),
      grate: keep(new T.MeshStandardMaterial({ color: "#6a747c", roughness: .55, metalness: .3, alphaMap: grating, alphaTest: .5, side: T.DoubleSide })),
      fence: keep(new T.MeshStandardMaterial({ color: "#808a91", roughness: .45, metalness: .75, alphaMap: chain, alphaTest: .45, side: T.DoubleSide })),
      hazard: keep(new T.MeshStandardMaterial({ map: hazard, roughness: .7, metalness: .1 })),
      lens: keep(new T.MeshBasicMaterial({ color: lampColor.clone().multiplyScalar(.12) })),
      label: keep(new T.MeshBasicMaterial({ map: tankLabel, transparent: true, depthWrite: false })),
      contact: keep(new T.MeshBasicMaterial({ map: contact, transparent: true, depthWrite: false, opacity: .9 }))
    };
    const shadowed = (geo, mat, cast, receive) => { const m = new T.Mesh(geo, mat); m.castShadow = cast !== false; m.receiveShadow = receive !== false; scene.add(m); return m; };

    /* ---------------- the site ---------------- */
    // Layout (top view, metres): foundation 14 x 9, entrance gate front-left, staircase centre, platform at the back,
    // process tank back-right; one route runs gate -> stair -> platform.
    const W = 14, D = 9, deckY = 2.9;
    // Foundation with bevelled edges; the top is lighter concrete, the sides darker; hazard band along the two front faces.
    shadowed(slab(W, 1.0, D, 0, -.5, 0, .05), [M.concrete, M.concreteSide], false, true);
    shadowed(merge([box(W - .14, .2, .02, 0, -.2, D / 2 + .062), box(.02, .2, D - .14, W / 2 + .062, -.2, 0)]), M.hazard, false, false);
    // Soft ground contact under the whole model.
    const ground = new T.Mesh(new T.PlaneGeometry(W * 1.45, D * 1.6), M.contact); ground.rotation.x = -Math.PI / 2; ground.position.y = -1.01; ground.material = keep(M.contact.clone()); ground.material.opacity = .75; scene.add(ground);

    // Platform: I-beam columns, perimeter beams, grating deck, kick plates.
    const P = { x0: -2.6, x1: 3.2, z0: -3.9, z1: -.9 };
    const iBeam = (x, z, h) => { const s = new T.Shape(), a = .13, t = .025; s.moveTo(-a, -a); s.lineTo(a, -a); s.lineTo(a, -a + t); s.lineTo(t / 2, -a + t); s.lineTo(t / 2, a - t); s.lineTo(a, a - t); s.lineTo(a, a); s.lineTo(-a, a); s.lineTo(-a, a - t); s.lineTo(-t / 2, a - t); s.lineTo(-t / 2, -a + t); s.lineTo(-a, -a + t); s.lineTo(-a, -a); const g = new T.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(x, 0, z); return g; };
    const cols = [];
    [[P.x0, P.z0], [P.x1, P.z0], [P.x0, P.z1], [P.x1, P.z1], [(P.x0 + P.x1) / 2, P.z0], [(P.x0 + P.x1) / 2, P.z1]].forEach(c => { cols.push(iBeam(c[0], c[1], deckY - .12)); cols.push(box(.42, .05, .42, c[0], .025, c[1])); });
    const beams = [box(P.x1 - P.x0 + .26, .24, .14, (P.x0 + P.x1) / 2, deckY - .14, P.z0), box(P.x1 - P.x0 + .26, .24, .14, (P.x0 + P.x1) / 2, deckY - .14, P.z1),
      box(.14, .24, P.z1 - P.z0, P.x0, deckY - .14, (P.z0 + P.z1) / 2), box(.14, .24, P.z1 - P.z0, P.x1, deckY - .14, (P.z0 + P.z1) / 2),
      box(.1, .18, P.z1 - P.z0, (P.x0 + P.x1) / 2, deckY - .14, (P.z0 + P.z1) / 2)];
    // Cross bracing between columns (front and back bays).
    const brace = [];
    [[P.x0, (P.x0 + P.x1) / 2], [(P.x0 + P.x1) / 2, P.x1]].forEach(bay => [P.z0].forEach(z => { brace.push(bar([bay[0], .25, z], [bay[1], deckY - .3, z], .035)); brace.push(bar([bay[1], .25, z], [bay[0], deckY - .3, z], .035)); }));
    shadowed(merge(cols.concat(beams, brace)), M.steel);
    const deck = new T.Mesh(new T.BoxGeometry(P.x1 - P.x0, .05, P.z1 - P.z0), M.grate);
    deck.position.set((P.x0 + P.x1) / 2, deckY, (P.z0 + P.z1) / 2); deck.castShadow = deck.receiveShadow = true; scene.add(deck);
    keep(deck.geometry);

    // Staircase from the entrance level up to the platform's front edge (rising toward the back).
    const S = { x0: -1.65, x1: -.55, zb: 2.05, zt: P.z1 };
    const steps = 14, rise = deckY / steps, run = (S.zb - S.zt) / steps;
    const stairGeo = [], stairRail = [];
    for (let i = 0; i < steps; i++) stairGeo.push(box(S.x1 - S.x0 - .1, .045, run + .04, (S.x0 + S.x1) / 2, rise * (i + 1) - .02, S.zb - run * (i + .5)));
    const slope = Math.atan2(deckY, S.zb - S.zt);
    [S.x0, S.x1].forEach(x => stairGeo.push(box(.06, .28, Math.hypot(deckY, S.zb - S.zt) + .2, x, deckY / 2, (S.zb + S.zt) / 2, [slope, 0, 0])));
    shadowed(merge(stairGeo), M.steel);
    [S.x0 - .02, S.x1 + .02].forEach(x => {
      stairRail.push(bar([x, 1.05, S.zb], [x, deckY + 1.05, S.zt], .028));
      stairRail.push(bar([x, .55, S.zb], [x, deckY + .55, S.zt], .02));
      for (let i = 0; i <= 3; i++) { const t = i / 3; stairRail.push(bar([x, deckY * t, S.zb - (S.zb - S.zt) * t], [x, deckY * t + 1.05, S.zb - (S.zb - S.zt) * t], .025)); }
    });

    // Guardrails around the deck (opening at the stair), plus a short catwalk toward the tank.
    const rail = (a, b) => {
      const g = [bar([a[0], deckY + 1.05, a[1]], [b[0], deckY + 1.05, b[1]], .03), bar([a[0], deckY + .55, a[1]], [b[0], deckY + .55, b[1]], .022)];
      const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.4));
      for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; g.push(bar([x, deckY, z], [x, deckY + 1.05, z], .028)); }
      return g;
    };
    const kick = (a, b) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); return box(len, .12, .02, (a[0] + b[0]) / 2, deckY + .085, (a[1] + b[1]) / 2, [0, -ang, 0]); };
    const C = { x0: P.x1, x1: 4.55, z0: -2.6, z1: -1.9 };
    let guard = [].concat(rail([P.x0, P.z0], [P.x1, P.z0]), rail([P.x0, P.z0], [P.x0, P.z1]), rail([P.x0, P.z1], [S.x0, P.z1]), rail([S.x1, P.z1], [P.x1, P.z1]),
      rail([P.x1, P.z1], [P.x1, C.z1]), rail([P.x1, C.z0], [P.x1, P.z0]), rail([C.x0, C.z0], [C.x1, C.z0]), rail([C.x0, C.z1], [C.x1, C.z1]));
    shadowed(merge(guard.concat(stairRail)), M.safety);
    const kicks = [kick([P.x0, P.z0], [P.x1, P.z0]), kick([P.x0, P.z0], [P.x0, P.z1]), kick([P.x0, P.z1], [S.x0, P.z1]), kick([S.x1, P.z1], [P.x1, P.z1]), kick([C.x0, C.z0], [C.x1, C.z0]), kick([C.x0, C.z1], [C.x1, C.z1])];
    const catwalk = [box(C.x1 - C.x0, .05, C.z1 - C.z0, (C.x0 + C.x1) / 2, deckY, (C.z0 + C.z1) / 2), box(C.x1 - C.x0, .16, .08, (C.x0 + C.x1) / 2, deckY - .1, C.z0), box(C.x1 - C.x0, .16, .08, (C.x0 + C.x1) / 2, deckY - .1, C.z1)];
    shadowed(merge(kicks.concat(catwalk)), M.steelDark);

    // Process tank T-01 with a shallow domed head, stiffening rings, a safety band, nozzle, ladder and label.
    const TK = { x: 5.55, z: -2.25, r: 1.15, h: 4.4 };
    const tankParts = [cyl(TK.r, TK.h, TK.x, TK.h / 2 + .12, TK.z, 48)];
    const dome = new T.SphereGeometry(TK.r, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, .32, 1); dome.translate(TK.x, TK.h + .12, TK.z); tankParts.push(dome);
    shadowed(merge(tankParts), M.tank);
    const rings = [cyl(TK.r + .1, .12, TK.x, .06, TK.z, 48)];
    [1.1, 2.2, 3.3].forEach(y => rings.push(place(new T.TorusGeometry(TK.r + .012, .025, 8, 64), [TK.x, y, TK.z], null, [Math.PI / 2, 0, 0])));
    rings.push(cyl(.16, .5, TK.x, TK.h + .5, TK.z, 16), cyl(.24, .06, TK.x, TK.h + .75, TK.z, 16));
    shadowed(merge(rings), M.steel);
    shadowed(cyl(TK.r + .018, .22, TK.x, 3.85, TK.z, 48), M.safety);
    // Ladder on the side facing the catwalk.
    const lad = [], lx = TK.x - TK.r - .09;
    [-.2, .2].forEach(dz => lad.push(bar([lx, .1, TK.z + dz], [lx, TK.h + .1, TK.z + dz], .022)));
    for (let y = .4; y < TK.h; y += .32) lad.push(bar([lx, y, TK.z - .2], [lx, y, TK.z + .2], .016));
    shadowed(merge(lad), M.steel);
    const labelGeo = keep(new T.CylinderGeometry(TK.r + .006, TK.r + .006, .7, 32, 1, true, Math.PI * .1, Math.PI * .5));
    const label = new T.Mesh(labelGeo, M.label); label.position.set(TK.x, 2.75, TK.z); scene.add(label);

    // Pipework: a main header from the tank along the site to a pump, risers to the platform, flanges, supports, valves.
    const pr = .13;
    const pipes = [
      pipe([[TK.x - .2, .62, TK.z + TK.r - .1], [TK.x - .2, .62, .55], [1.6, .62, .55], [1.6, .62, 2.6], [.6, .62, 2.6]], pr, .45),
      pipe([[TK.x + .5, 1.5, TK.z + TK.r - .2], [TK.x + .5, 1.5, .9], [TK.x + .5, deckY + .55, .9], [TK.x + .5, deckY + .55, -.6]], .09, .35),
      pipe([[-4.6, .55, -1.2], [-4.6, 1.9, -1.2], [-3.4, 1.9, -1.2], [-3.4, 1.9, -2.6], [P.x0 + .2, 1.9, -2.6]], .17, .5),
      pipe([[-4.6, .55, -2.7], [-4.6, .55, -3.7], [-1.0, .55, -3.7], [2.6, .55, -3.7], [2.6, .55, TK.z]], .1, .35)
    ];
    const fl = [flange([TK.x - .2, .62, TK.z + TK.r + .02], [0, 0, 1], pr), flange([TK.x - .2, .62, -.2], [0, 0, 1], pr), flange([1.6, .62, 1.6], [0, 0, 1], pr), flange([.62, .62, 2.6], [1, 0, 0], pr),
      flange([-4.6, 1.2, -1.2], [0, 1, 0], .17), flange([-3.4, 1.9, -1.9], [0, 0, 1], .17), flange([TK.x + .5, 2.2, .9], [0, 1, 0], .09), flange([0, .55, -3.7], [1, 0, 0], .1)];
    // Front-right manifold, fed from the main header: low run along the front with a flow meter, ending at a skid.
    pipes.push(pipe([[3.2, .62, .55], [3.2, .62, 3.0], [6.1, .62, 3.0], [6.1, .62, 1.9]], .1, .35), pipe([[4.6, .62, 3.0], [4.6, 1.35, 3.0], [4.6, 1.35, 2.35]], .07, .25));
    fl.push(flange([3.2, .62, 1.7], [0, 0, 1], .1), flange([5.3, .62, 3.0], [1, 0, 0], .1), flange([4.6, 1.0, 3.0], [0, 1, 0], .07));
    // A back pipe rack: two runs on a low frame along the rear edge.
    pipes.push(pipe([[-6.2, 1.15, -4.2], [3.6, 1.15, -4.2], [3.6, 1.15, -3.55]], .08, .3), pipe([[-6.2, 1.38, -4.25], [4.05, 1.38, -4.25], [4.05, 2.4, -4.25], [TK.x - .4, 2.4, -3.2]], .07, .3));
    shadowed(merge(pipes.concat(fl)), M.metal);
    // Pipe supports (small portal frames) and the pump skid.
    const sup = [];
    [[3.2, .55], [1.6, 1.4], [-2.2, -3.7], [.6, -3.7]].forEach(s => { sup.push(box(.08, .6, .08, s[0], .3, s[1] - .3), box(.08, .6, .08, s[0], .3, s[1] + .3), box(.1, .06, .74, s[0], .62 - pr - .03, s[1])); });
    sup.push(box(1.3, .14, .9, -4.6, .07, -1.9), box(.7, .55, .6, -4.6, .42, -1.9));
    [[3.9, 3.0], [5.6, 3.0]].forEach(s2 => sup.push(box(.08, .55, .08, s2[0], .27, s2[1] - .25), box(.08, .55, .08, s2[0], .27, s2[1] + .25), box(.1, .05, .62, s2[0], .5, s2[1])));
    sup.push(box(1.1, .12, .9, 6.1, .06, 1.55), box(.5, .62, .5, 6.1, .43, 1.55));
    [-5.6, -3.6, -1.6].forEach(x => sup.push(box(.07, 1.45, .07, x, .72, -4.22), box(.07, .05, .4, x, 1.06, -4.22)));
    shadowed(merge(sup), M.steelDark);
    const pump = [cyl(.34, .5, -4.6, .62, -1.9, 24, new T.Vector3(0, 0, 1)), cyl(.22, .28, -4.6, .62, -2.3, 20, new T.Vector3(0, 0, 1))];
    pump.push(cyl(.2, .34, 4.25, .62, 3.0, 20, new T.Vector3(1, 0, 0)), box(.24, .2, .16, 4.25, .9, 3.0));
    shadowed(merge(pump), M.cabinet);
    // Valves: body, bonnet and handwheel.
    const valves = [], wheels = [];
    [[1.6, .62, 2.05, "z"], [-3.4, 1.9, -1.6, "z"], [-1.8, .55, -3.7, "x"], [TK.x + .5, 2.6, .9, "y"], [3.2, .62, 2.25, "z"], [5.05, .62, 3.0, "x"]].forEach(v => {
      const [x, y, z, ax] = v, dir = ax === "x" ? new T.Vector3(1, 0, 0) : ax === "y" ? new T.Vector3(0, 1, 0) : new T.Vector3(0, 0, 1);
      valves.push(cyl(.2, .34, x, y, z, 16, dir));
      const up = ax === "y" ? [.32, 0, 0] : [0, .34, 0];
      valves.push(cyl(.04, .34, x + up[0] / 2, y + up[1] / 2, z + up[2] / 2, 8, ax === "y" ? new T.Vector3(1, 0, 0) : UP));
      const wp = [x + up[0], y + up[1], z + up[2]];
      wheels.push(place(new T.TorusGeometry(.16, .022, 8, 28), wp, null, ax === "y" ? [0, Math.PI / 2, 0] : [Math.PI / 2, 0, 0]));
    });
    shadowed(merge(valves), M.steel);
    shadowed(merge(wheels), M.safety);

    // Control cabinets on the ground near the gate and on the platform.
    const cab = [], cabTrim = [], cabLights = [];
    const cabinet = (x, y, z, w, h, d, face) => {
      cab.push(box(w, h, d, x, y + h / 2, z), box(w + .06, .06, d + .06, x, y + h + .03, z), box(w * .9, .06, d * .9, x, y + .03, z));
      const fz = z + d / 2 + .006;
      if (face === "z") { cabTrim.push(box(.012, h * .82, .012, x, y + h / 2, fz), box(.05, .16, .03, x + w * .18, y + h * .55, fz + .01)); cabLights.push([x - w * .28, y + h * .82, fz + .01]); }
      else { const fx = x + w / 2 + .006; cabTrim.push(box(.012, h * .82, .012, fx, y + h / 2, z), box(.03, .16, .05, fx + .01, y + h * .55, z + d * .18)); cabLights.push([fx + .01, y + h * .82, z - d * .28]); }
    };
    // The two ground cabinets stand just behind the walkway so the route between gate and stair stays clear.
    cabinet(-3.35, 0, 1.7, .62, 1.15, .45, "z");
    cabinet(-2.55, 0, 1.78, .48, .9, .4, "z");
    cabinet(.4, deckY, -3.35, .9, 1.1, .5, "z");
    cabinet(1.5, deckY, -3.4, .62, .85, .45, "z");
    cabinet(4.25, 0, .4, .55, 1.0, .5, "x");
    // Rooftop air-handling unit on the platform with a fan grille.
    cab.push(box(1.25, .55, .8, -1.55, deckY + .3, -3.15), box(1.3, .05, .85, -1.55, deckY + .6, -3.15));
    cabTrim.push(cyl(.27, .05, -1.55, deckY + .63, -3.15, 28), box(.04, .5, .82, -2.2, deckY + .3, -3.15));
    // Junction box on a platform column, conduit down to the slab.
    cab.push(box(.36, .46, .2, P.x1 + .18, 1.5, P.z1 + .02));
    cabTrim.push(bar([P.x1 + .18, .02, P.z1 + .05], [P.x1 + .18, 1.27, P.z1 + .05], .03));
    shadowed(merge(cab), M.cabinet);
    shadowed(merge(cabTrim), M.steelDark);

    // Fence along the left edge and the front-left, with an access sign; the gate sits in the front run.
    const G = { x: -5.25, z: 3.75, w: 1.25 };   // gate opening: x from G.x to G.x + G.w
    const fenceRuns = [[[-6.75, -3.9], [-6.75, 3.75]], [[-6.75, 3.75], [G.x - .32, 3.75]], [[G.x + G.w + .32, 3.75], [-3.0, 3.75]]];
    const posts = [], panels = [];
    fenceRuns.forEach(r => {
      const [a, b] = r, len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 1.6));
      for (let i = 0; i <= n; i++) { const t = i / n; posts.push(bar([a[0] + (b[0] - a[0]) * t, 0, a[1] + (b[1] - a[1]) * t], [a[0] + (b[0] - a[0]) * t, 1.45, a[1] + (b[1] - a[1]) * t], .035)); }
      posts.push(bar([a[0], 1.45, a[1]], [b[0], 1.45, b[1]], .025));
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      panels.push(place(new T.PlaneGeometry(len, 1.3), [(a[0] + b[0]) / 2, .72, (a[1] + b[1]) / 2], null, [0, -ang, 0]));
    });
    shadowed(merge(posts), M.steel);
    const fenceMesh = shadowed(merge(panels), M.fence); fenceMesh.material.alphaMap.repeat.set(9, 2);
    const signTex = keep(canvasTex(256, 160, (c, w, h) => {
      c.fillStyle = "#11181d"; c.fillRect(0, 0, w, h); c.fillStyle = "#" + safety.getHexString(); c.fillRect(0, h - 34, w, 34);
      c.fillStyle = "#11181d"; for (let x = -34; x < w + 34; x += 28) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 14, h); c.lineTo(x + 48, h - 34); c.lineTo(x + 34, h - 34); c.fill(); }
      c.strokeStyle = "rgba(236,240,238,.9)"; c.lineWidth = 9; c.beginPath(); c.arc(w / 2, 58, 34, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(w / 2 - 22, 58); c.lineTo(w / 2 + 22, 58); c.stroke();
    }));
    const sign = new T.Mesh(keep(new T.PlaneGeometry(1.0, .62)), keep(new T.MeshStandardMaterial({ map: signTex, roughness: .6 })));
    sign.position.set(-6.72, .98, 1.4); sign.rotation.y = Math.PI / 2; scene.add(sign);

    // Entrance checkpoint: two posts, a reader pillar with an indicator, and a swing gate hinged on the left post.
    const ck = [box(.18, 1.25, .18, G.x - .1, .625, G.z), box(.18, 1.25, .18, G.x + G.w + .1, .625, G.z), box(.26, 1.2, .2, G.x + G.w + .45, .6, G.z + .32),
      box(.3, .05, .24, G.x + G.w + .45, 1.225, G.z + .32)];
    shadowed(merge(ck), M.steelDark);
    const capGeo = merge([box(.2, .04, .2, G.x - .1, 1.27, G.z), box(.2, .04, .2, G.x + G.w + .1, 1.27, G.z)]);
    shadowed(capGeo, M.safety);
    const gate = new T.Group(); gate.position.set(G.x, 0, G.z); scene.add(gate);
    const leaf = [bar([.02, .25, 0], [G.w - .04, .25, 0], .03), bar([.02, 1.0, 0], [G.w - .04, 1.0, 0], .03), bar([G.w - .04, .25, 0], [G.w - .04, 1.0, 0], .03), bar([.02, .2, 0], [.02, 1.05, 0], .035)];
    for (let i = 1; i < 6; i++) leaf.push(bar([G.w * i / 6, .25, 0], [G.w * i / 6, 1.0, 0], .014));
    const leafMesh = new T.Mesh(merge(leaf), M.safety); leafMesh.castShadow = true; gate.add(leafMesh);
    const indicatorMat = keep(new T.MeshBasicMaterial({ color: accent.clone() }));
    const indicator = new T.Mesh(keep(new T.BoxGeometry(.16, .05, .02)), indicatorMat); indicator.position.set(G.x + G.w + .45, 1.05, G.z + .43); scene.add(indicator);
    const reader = new T.Mesh(keep(new T.BoxGeometry(.14, .18, .02)), keep(new T.MeshBasicMaterial({ color: "#0d1a22" }))); reader.position.set(G.x + G.w + .45, .82, G.z + .43); scene.add(reader);
    const indicatorGlow = new T.Mesh(keep(new T.PlaneGeometry(.7, .7)), keep(new T.MeshBasicMaterial({ map: glow, color: accent.clone(), transparent: true, depthWrite: false, blending: 2, opacity: .55 })));
    indicatorGlow.position.set(G.x + G.w + .45, 1.05, G.z + .46); scene.add(indicatorGlow);

    // Practical lights: poles with luminaires and a pool of light on the ground (they switch on in sequence).
    const lampDefs = [[-6.2, 0, 2.4, 1.0], [-3.3, deckY, -3.7, -1.0], [2.9, deckY, -3.7, -1.0], [2.35, 0, 3.75, 1.0], [6.65, 0, .35, 1.0]];
    const poles = [], lamps = [];
    lampDefs.forEach(l => {
      const [x, y, z, face] = l, top = y + (y > 0 ? 1.6 : 2.6);
      poles.push(bar([x, y, z], [x, top, z], .045), box(.5, .05, .07, x + .2 * face, top + .02, z), box(.3, .09, .18, x + .4 * face, top - .03, z));
      const lens = new T.Mesh(keep(new T.BoxGeometry(.26, .02, .14)), keep(M.lens.clone())); lens.position.set(x + .4 * face, top - .085, z); scene.add(lens);
      const flare = new T.Mesh(keep(new T.PlaneGeometry(.9, .9)), keep(new T.MeshBasicMaterial({ map: glow, color: lampColor, transparent: true, depthWrite: false, blending: 2, opacity: 0 })));
      flare.position.set(x + .4 * face, top - .1, z); scene.add(flare);
      const pool = new T.Mesh(keep(new T.PlaneGeometry(3.4, 3.4)), keep(new T.MeshBasicMaterial({ map: glow, color: lampColor.clone().lerp(accent, .25), transparent: true, depthWrite: false, blending: 2, opacity: 0 })));
      pool.rotation.x = -Math.PI / 2; pool.position.set(x + .5 * face, y + .02, z); scene.add(pool);
      lamps.push({ lens, flare, pool, on: 0 });
    });
    shadowed(merge(poles), M.steelDark);

    // Contact shadows (soft occlusion where objects meet the ground).
    const contactAt = (x, z, w, d, y, o) => { const m = new T.Mesh(keep(new T.PlaneGeometry(w, d)), keep(M.contact.clone())); m.material.opacity = o || .65; m.rotation.x = -Math.PI / 2; m.position.set(x, (y || 0) + .012, z); scene.add(m); };
    contactAt(TK.x, TK.z, TK.r * 3, TK.r * 3, 0, .8); contactAt(-3.35, 1.7, 1.4, 1.2); contactAt(-2.55, 1.78, 1.1, 1.0); contactAt(4.25, .4, 1.2, 1.2);
    contactAt(.4, -3.35, 1.8, 1.2, deckY, .5); contactAt(1.5, -3.4, 1.3, 1.1, deckY, .5); contactAt(-4.6, -1.9, 1.9, 1.6); contactAt(6.1, 1.55, 1.7, 1.5); contactAt(4.6, 3.0, 3.4, 1.0, 0, .45);
    contactAt((P.x0 + P.x1) / 2, (P.z0 + P.z1) / 2, P.x1 - P.x0 + 1.6, P.z1 - P.z0 + 1.6, 0, .55);

    // Floor markings: a walkway outline from the gate to the stair and a stop line at the gate.
    const markTex = keep(canvasTex(64, 64, (c, w, h) => { c.fillStyle = "rgba(225,228,226,.55)"; c.fillRect(0, 0, w, h); }));
    const marks = merge([box(G.w + .4, .006, .07, G.x + G.w / 2, .005, G.z - .55), box(4.1, .006, .05, -2.7, .005, 2.92), box(4.1, .006, .05, -2.7, .005, 2.28)]);
    shadowed(marks, keep(new T.MeshStandardMaterial({ map: markTex, roughness: .8, transparent: true })), false, true);

    // Walkway plates: three steel tread plates on the walkway between the gate and the stair. On the sign-in page
    // they are installed; on password setup this is the missing section of the route, marked by three open bays,
    // and each met requirement lowers one plate into place.
    const treadTex = keep(canvasTex(128, 128, (c, w, h) => {
      noise(c, w, h, "#80898f", 18, 5);
      for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < w; x += 16) {
        c.save(); c.translate(x + 4, y + 8); c.rotate((x + y) % 32 ? .7 : -.7);
        c.fillStyle = "rgba(205,212,216,.55)"; c.fillRect(-4, -1.2, 8, 2.4); c.fillStyle = "rgba(20,26,30,.35)"; c.fillRect(-4, 1.2, 8, 1);
        c.restore();
      }
    }, [2.6, 1.6]));
    const plateMat = keep(new T.MeshStandardMaterial({ color: "#9aa3a9", map: treadTex, bumpMap: treadTex, bumpScale: 1.4, roughness: .5, metalness: .5 }));
    const PL = { x0: -4.2, x1: -1.5, z: 2.6, d: .56, gap: .03, top: .034 };
    const plateLen = (PL.x1 - PL.x0 - PL.gap * 2) / 3;
    const plates = [0, 1, 2].map(i => {
      const cx = PL.x0 + plateLen / 2 + i * (plateLen + PL.gap);
      const g = new T.Group(); g.position.set(cx, 0, PL.z); scene.add(g);
      const body = new T.Mesh(keep(new T.BoxGeometry(plateLen, PL.top, PL.d)), plateMat); body.position.y = PL.top / 2; body.castShadow = body.receiveShadow = true; g.add(body);
      const ends = new T.Mesh(keep(merge([box(.035, PL.top + .004, PL.d, -plateLen / 2 + .018, PL.top / 2, 0), box(.035, PL.top + .004, PL.d, plateLen / 2 - .018, PL.top / 2, 0)])), M.safety); g.add(ends);
      return { g, x0: cx - plateLen / 2, x1: cx + plateLen / 2, on: mode === "login" ? 1 : 0, tw: null };
    });
    const bayTex = keep(canvasTex(256, 160, (c, w, h) => {
      c.fillStyle = "rgba(6,10,13,.88)"; c.fillRect(0, 0, w, h);
      c.strokeStyle = "#" + accent.getHexString(); c.globalAlpha = .9; c.lineWidth = 7; c.setLineDash([22, 14]); c.strokeRect(8, 8, w - 16, h - 16);
    }));
    const bays = plates.map(p => {
      const m = new T.Mesh(keep(new T.PlaneGeometry(plateLen - .02, PL.d - .02)), keep(new T.MeshBasicMaterial({ map: bayTex, transparent: true, depthWrite: false })));
      m.rotation.x = -Math.PI / 2; m.position.set(p.g.position.x, .008, PL.z); m.visible = mode === "reset"; scene.add(m);
      return m;
    });
    const DROP = 1.25;
    function placePlate(p, k) {
      p.on = k; p.g.visible = k > .001;
      p.g.position.y = DROP * (1 - k); p.g.rotation.z = .16 * (1 - k);
    }
    plates.forEach(p => placePlate(p, p.on));

    /* ---------- the route: gate -> walkway -> stair -> platform ---------- */
    const routePts = [[G.x + G.w / 2, .03, G.z + .2], [G.x + G.w / 2, .03, 2.6], [(S.x0 + S.x1) / 2, .03, 2.6], [(S.x0 + S.x1) / 2, .03, S.zb + .05]];
    for (let i = 1; i <= steps; i++) routePts.push([(S.x0 + S.x1) / 2, rise * i + .03, S.zb - run * (i - .5)]);
    routePts.push([(S.x0 + S.x1) / 2, deckY + .06, P.z1 - .4], [(S.x0 + S.x1) / 2 + 1.3, deckY + .06, P.z1 - .8]);
    // Ribbon with a normalised distance attribute so the shader can reveal it and run a light along it.
    const pts = filleted(routePts, .4);
    let total = 0; const acc = [0]; for (let i = 1; i < pts.length; i++) { total += pts[i].distanceTo(pts[i - 1]); acc.push(total); }
    // Normalised route distance of the route point nearest to (x, y, z).
    const distAt = (x, y, z) => { let best = 0, bd = Infinity; const q = new T.Vector3(x, y, z); pts.forEach((p, i) => { const d = p.distanceToSquared(q); if (d < bd) { bd = d; best = i; } }); return acc[best] / total; };
    const ribbon = (half, lift) => {
      const pos = [], dist = [], side = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], d = b.clone().sub(a); const n = new T.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(half);
        const q = [[a.clone().add(n), acc[i], 1], [a.clone().sub(n), acc[i], -1], [b.clone().add(n), acc[i + 1], 1], [b.clone().sub(n), acc[i + 1], -1]];
        [0, 1, 2, 1, 3, 2].forEach(k => { pos.push(q[k][0].x, q[k][0].y + lift, q[k][0].z); dist.push(q[k][1] / total); side.push(q[k][2]); });
      }
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("dist", new T.Float32BufferAttribute(dist, 1)); g.setAttribute("side", new T.Float32BufferAttribute(side, 1));
      return { g };
    };
    const gateDist = 0.16;   // normalised distance at which the route passes the gate
    const stairDist = distAt((S.x0 + S.x1) / 2, rise, S.zb - run * .5);   // the first tread: the connected section ends here
    const routeUniforms = { uColor: { value: accent.clone() }, uProgress: { value: 0 }, uPulse: { value: -1 }, uPulseOn: { value: 0 }, uOpacity: { value: 1 }, uSoft: { value: .02 } };
    const routeMat = keep(new T.ShaderMaterial({
      uniforms: routeUniforms, transparent: true, depthWrite: false, blending: 2, side: T.DoubleSide,
      vertexShader: "attribute float dist; attribute float side; varying float vDist; varying float vSide; void main(){ vDist = dist; vSide = side; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 uColor; uniform float uProgress; uniform float uPulse; uniform float uPulseOn; uniform float uOpacity; uniform float uSoft; varying float vDist; varying float vSide;" +
        "void main(){ float edge = 1.0 - smoothstep(0.45, 1.0, abs(vSide)); float shown = 1.0 - smoothstep(uProgress - uSoft, uProgress, vDist);" +
        " float pulse = uPulseOn * exp(-pow((vDist - uPulse) / 0.025, 2.0)); float a = (shown * 0.85 + pulse) * edge * uOpacity;" +
        " gl_FragColor = vec4(uColor * a, a);\n#include <colorspace_fragment>\n}"
    }));
    const routeCore = ribbon(.09, .012), routeHalo = ribbon(.34, .006);
    keep(routeCore.g); keep(routeHalo.g);
    const routeMesh = new T.Mesh(routeCore.g, routeMat); routeMesh.renderOrder = 3; scene.add(routeMesh);
    const haloMat = keep(routeMat.clone()); haloMat.uniforms = Object.assign({}, routeUniforms, { uOpacity: { value: .32 } });
    const haloMesh = new T.Mesh(routeHalo.g, haloMat); haloMesh.renderOrder = 2; scene.add(haloMesh);

    /* ---------- lighting ---------- */
    const hemi = new T.HemisphereLight("#c7d6e2", "#2a3137", .95); scene.add(hemi);
    const key = new T.DirectionalLight("#fff1e4", 2.9);
    key.position.set(-9, 16, 9); key.target.position.set(0, 0, 0); scene.add(key); scene.add(key.target);
    key.castShadow = true;
    const sm = compact || lowEnd ? 1024 : 2048;
    key.shadow.mapSize.set(sm, sm); key.shadow.bias = -.0004; key.shadow.normalBias = .025; key.shadow.radius = 3;
    Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 45 }); key.shadow.camera.updateProjectionMatrix();
    const fill = new T.DirectionalLight("#a9c0d2", .8); fill.position.set(12, 6, 4); scene.add(fill);
    const rim = new T.DirectionalLight("#ffd8b8", .9); rim.position.set(4, 8, -14); scene.add(rim);

    /* ---------- camera rig ---------- */
    const target = new T.Vector3(.2, 1.15, -.45);
    const rest = { az: .72, el: .56, dist: 1, lookX: 0 };
    const cam = { az: rest.az + .1, el: rest.el + .07, dist: 1.1, lookX: 0, yaw: 0, pitch: 0 };
    const user = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0 };
    let baseDist = 30;
    function fitDistance() {
      const vfov = camera.fov * Math.PI / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
      const radius = 7.1; // bounding radius of the model from the framing target
      return Math.max(radius / Math.sin(vfov / 2), radius / Math.sin(hfov / 2)) * (compact ? .86 : .92);
    }
    function placeCamera() {
      const az = cam.az + cam.yaw + user.yaw, el = cam.el + cam.pitch + user.pitch, d = baseDist * cam.dist;
      camera.position.set(target.x + cam.lookX + Math.sin(az) * Math.cos(el) * d, target.y + Math.sin(el) * d, target.z + Math.cos(az) * Math.cos(el) * d);
      camera.lookAt(target.x + cam.lookX, target.y, target.z);
    }
    // Framing guard: the outermost points of the model (foundation corners, tank T-01 and its head, lamp heads).
    // A camera pose "fits" when all of them project inside the viewport with a small margin.
    const extremes = [[-W / 2, 0, -D / 2], [W / 2, 0, -D / 2], [-W / 2, 0, D / 2], [W / 2, 0, D / 2], [-W / 2, -1, D / 2], [W / 2, -1, D / 2], [W / 2, -1, -D / 2],
      [TK.x + TK.r, TK.h + .9, TK.z], [TK.x - TK.r, TK.h + .9, TK.z], [TK.x, TK.h + .9, TK.z + TK.r], [TK.x, TK.h + .9, TK.z - TK.r], [TK.x + TK.r, .1, TK.z + TK.r],
      [-3.3, deckY + 1.7, -3.7], [2.9, deckY + 1.7, -3.7], [6.65, 2.7, .35], [-6.2, 2.7, 2.4]].map(p => new T.Vector3(p[0], p[1], p[2]));
    const probe = new T.Vector3();
    function overflow(pose) {
      const saved = { az: cam.az, el: cam.el, dist: cam.dist, lookX: cam.lookX, yaw: user.yaw, pitch: user.pitch };
      Object.assign(cam, pose); user.yaw = 0; user.pitch = 0; placeCamera(); camera.updateMatrixWorld();
      let m = 0; extremes.forEach(p => { probe.copy(p).project(camera); m = Math.max(m, Math.abs(probe.x), Math.abs(probe.y)); });
      cam.az = saved.az; cam.el = saved.el; cam.dist = saved.dist; cam.lookX = saved.lookX; user.yaw = saved.yaw; user.pitch = saved.pitch; placeCamera();
      return m;
    }
    // The success move goes a short way toward the route; it is scaled down until the whole site, tank T-01
    // included, stays in frame at the current viewport size.
    function successPose() {
      for (const s of [1, .8, .6, .4, .2, 0]) {
        const pose = { az: rest.az - .06 * s, el: rest.el - .03 * s, dist: rest.dist - .1 * s, lookX: -.45 * s };
        if (s === 0 || overflow(pose) <= .985) return pose;
      }
    }

    /* ---------- animation ---------- */
    const reduced = !!opts.reduced;
    const now = () => performance.now();
    const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
    const easeIn = t => Math.pow(Math.min(1, Math.max(0, t)), 3);
    const easeIO = t => { t = Math.min(1, Math.max(0, t)); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    const tweens = new Set();
    function tween(dur, fn, delay, done) { const tw = { start: now() + (delay || 0), dur, fn, done }; tweens.add(tw); wake(); return tw; }
    function stop(tw) { if (tw) tweens.delete(tw); return null; }
    let raf = 0, last = 0, disposed = false, hidden = doc.hidden, processing = false, pulseStart = 0, typing = false, gateAngle = 0, completing = false;
    let indicatorColor = accent.clone(), intro = [], routeTw = null, connected = false, flagTw = null;
    function setLamp(l, v) { l.on = v; l.lens.material.color.copy(lampColor).multiplyScalar(.12 + v * 1.9); l.flare.material.opacity = .7 * v; l.pool.material.opacity = .26 * v; }
    function setIndicator(c) { indicatorColor = c.clone(); indicatorMat.color.copy(c); indicatorGlow.material.color.copy(c); }
    function settledUser() { return Math.abs(user.yaw - user.tYaw) < .0004 && Math.abs(user.pitch - user.tPitch) < .0004; }
    function frame(t) {
      raf = 0; if (disposed || hidden) return;
      const dt = Math.min(.05, last ? (t - last) / 1000 : .016); last = t;
      tweens.forEach(tw => { const k = (t - tw.start) / tw.dur; if (k < 0) return; tw.fn(Math.min(1, k)); if (k >= 1) { tweens.delete(tw); if (tw.done) tw.done(); } });
      const tau = .22; user.yaw += (user.tYaw - user.yaw) * (1 - Math.exp(-dt / tau)); user.pitch += (user.tPitch - user.pitch) * (1 - Math.exp(-dt / tau));
      if (processing) { const p = ((t - pulseStart) / 1400) % 1; routeUniforms.uPulse.value = p * gateDist * 1.05; }
      gate.rotation.y = gateAngle;
      placeCamera();
      renderer.render(scene, camera);
      if (tweens.size || processing || !settledUser()) wake(); else last = 0;
    }
    function wake() { if (!raf && !disposed && !hidden) raf = root.requestAnimationFrame(frame); }

    function resize() {
      const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
      const ratio = Math.min(root.devicePixelRatio || 1, compact ? 1.25 : 1.75, Math.sqrt(2600000 / (w * h)));
      renderer.setPixelRatio(ratio); renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix(); baseDist = fitDistance();
      // Never crop the model at rest: pull the camera back until every outer point is inside the frame.
      for (let i = 0; i < 4; i++) { const m = overflow({ az: rest.az, el: rest.el, dist: rest.dist, lookX: 0 }); if (m <= .985) break; baseDist *= m / .985 + .005; }
      wake();
    }

    // The resting route: to the gate, or on through the connected walkway section to the stair.
    const restProgress = () => connected ? stairDist : gateDist;
    function settle() {
      // Final entrance state (also used by reduced motion and whenever a state change arrives during the entrance).
      intro.forEach(stop); intro = [];
      renderer.toneMappingExposure = 1.12; Object.assign(cam, { az: rest.az, el: rest.el, dist: rest.dist, lookX: 0 }); lamps.forEach(l => setLamp(l, 1));
      if (!routeTw) routeUniforms.uProgress.value = restProgress();
      wake();
    }
    function entrance() {
      if (reduced) { settle(); return; }
      const from = { az: cam.az, el: cam.el, dist: cam.dist };
      // 1. fade into the final lighting; 2. one small camera settle; 3. lights on in sequence; 4. the entrance route.
      intro.push(tween(900, k => { renderer.toneMappingExposure = 1.12 * ease(k); }));
      intro.push(tween(1150, k => { const e = easeIO(k); cam.az = from.az + (rest.az - from.az) * e; cam.el = from.el + (rest.el - from.el) * e; cam.dist = from.dist + (rest.dist - from.dist) * e; }));
      lamps.forEach((l, i) => intro.push(tween(140, k => setLamp(l, ease(k)), 420 + i * 110)));
      intro.push(tween(380, k => { routeUniforms.uProgress.value = gateDist * ease(k); }, 880, () => { intro = []; }));
    }
    function moveRoute(to, dur, delay, curve, done) {
      routeTw = stop(routeTw);
      const from = routeUniforms.uProgress.value;
      if (reduced || !dur) { routeUniforms.uProgress.value = to; wake(); if (done) done(); return; }
      routeTw = tween(dur, k => { routeUniforms.uProgress.value = from + (to - from) * (curve || ease)(k); }, delay, () => { routeTw = null; if (done) done(); });
    }

    // Pointer: a very small, damped camera response on desktop mouse only; never while typing.
    const fine = root.matchMedia("(pointer: fine)");
    function onPointer(e) {
      if (reduced || typing || e.pointerType !== "mouse" || !fine.matches || completing) return;
      const nx = (e.clientX / root.innerWidth) * 2 - 1, ny = (e.clientY / root.innerHeight) * 2 - 1;
      user.tYaw = -nx * .045; user.tPitch = ny * .025; wake();
    }
    function onLeave() { user.tYaw = 0; user.tPitch = 0; wake(); }
    function onVisibility() { hidden = doc.hidden; if (hidden) { if (raf) root.cancelAnimationFrame(raf); raf = 0; } else { last = 0; wake(); } }
    root.addEventListener("pointermove", onPointer, { passive: true });
    doc.documentElement.addEventListener("pointerleave", onLeave);
    doc.addEventListener("visibilitychange", onVisibility);
    let ro = null;
    if (root.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(host); } else root.addEventListener("resize", resize);
    canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); if (opts.onLost) opts.onLost(); });

    resize();
    placeCamera();
    lamps.forEach(l => setLamp(l, 0));
    host.classList.add("is-live");
    entrance();

    const api = {
      setTyping(on) { typing = !!on; if (typing) { user.tYaw = 0; user.tPitch = 0; wake(); } },
      // Pending result: a restrained light runs from the start of the route to the closed gate, nothing more.
      setProcessing(on) {
        if (completing) return;
        processing = !!on && !reduced; routeUniforms.uPulseOn.value = processing ? 1 : 0;
        if (processing) pulseStart = now();
        wake();
      },
      // Invalid input: a subtle checkpoint change only; the gate stays closed and the camera holds.
      flag() {
        if (completing) return;
        flagTw = stop(flagTw);
        if (reduced) { setIndicator(accent); wake(); return; }
        flagTw = tween(520, k => setIndicator(accent.clone().lerp(danger, Math.sin(Math.PI * k) * .75)), 0, () => { flagTw = null; });
      },
      // Password setup: booleans only. Plates follow length / upper / number; a match connects the route through them.
      setSections(flags) {
        if (mode !== "reset" || completing || !flags) return;
        const want = [!!flags.length, !!flags.upper, !!flags.number];
        const link = !!flags.match && want[0] && want[1] && want[2];
        const placed = p => p.target === undefined ? p.on > .5 : p.target;
        if (link === connected && want.every((on, i) => placed(plates[i]) === on)) return;
        // A change during the entrance finishes the entrance first, so the two never fight over the route.
        if (intro.length) settle();
        want.forEach((on, i) => {
          const p = plates[i];
          if (placed(p) === on) return;
          p.target = on; p.tw = stop(p.tw);
          if (reduced) { placePlate(p, on ? 1 : 0); wake(); return; }
          const from = p.on;
          p.tw = on ? tween(380, k => placePlate(p, from + (1 - from) * ease(k)), 0, () => { p.tw = null; })
                    : tween(240, k => placePlate(p, from * (1 - easeIn(k))), 0, () => { p.tw = null; });
        });
        if (link !== connected) {
          connected = link;
          // Connect after the last plate has landed; disconnect at once.
          moveRoute(restProgress(), link ? 420 : 240, link ? 260 : 0, link ? easeIO : ease);
        }
        wake();
      },
      // After a successful result only: indicator -> success (140 ms), the gate opens (100-520 ms), the route completes
      // to the platform (220-780 ms) and the camera moves a short way (220-820 ms); then done() runs once.
      complete(done) {
        let called = false; const finish = () => { if (called) return; called = true; if (typeof done === "function") done(); };
        if (completing) return;
        completing = true; processing = false; routeUniforms.uPulseOn.value = 0; user.tYaw = 0; user.tPitch = 0;
        settle(); flagTw = stop(flagTw);
        plates.forEach(p => { p.tw = stop(p.tw); placePlate(p, 1); });
        const end = successPose();
        if (reduced) { setIndicator(success); gateAngle = 1.35; routeTw = stop(routeTw); routeUniforms.uProgress.value = 1.02; Object.assign(cam, end); wake(); finish(); return; }
        const from = { az: cam.az, el: cam.el, dist: cam.dist, lookX: cam.lookX }, startColor = indicatorColor.clone();
        tween(140, k => setIndicator(startColor.clone().lerp(success, k)));
        tween(420, k => { gateAngle = 1.35 * easeIO(k); }, 100);
        moveRoute(1.02, 560, 220);
        tween(600, k => { const e = easeIO(k); cam.az = from.az + (end.az - from.az) * e; cam.el = from.el + (end.el - from.el) * e; cam.dist = from.dist + (end.dist - from.dist) * e; cam.lookX = from.lookX + (end.lookX - from.lookX) * e; }, 220, finish);
        // A hidden tab pauses rendering: never strand the caller.
        if (doc.hidden) finish();
      },
      // Back to the resting site (used when the page is restored from the back/forward cache).
      reset() {
        tweens.clear(); intro = []; routeTw = flagTw = null; completing = false; processing = false; routeUniforms.uPulseOn.value = 0; gateAngle = 0; setIndicator(accent);
        if (mode === "reset") { connected = false; plates.forEach(p => { p.target = undefined; p.tw = null; placePlate(p, 0); }); }
        settle();
      },
      dispose() {
        disposed = true; if (raf) root.cancelAnimationFrame(raf);
        root.removeEventListener("pointermove", onPointer); doc.documentElement.removeEventListener("pointerleave", onLeave); doc.removeEventListener("visibilitychange", onVisibility);
        if (ro) ro.disconnect(); else root.removeEventListener("resize", resize);
        scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        disposables.forEach(d => { try { d.dispose(); } catch (_) {} });
        renderer.dispose(); canvas.remove(); host.classList.remove("is-live");
      }
    };
    return api;
  }

  // Page helper: mounts the scene into host, or shows the host's static image (.is-fallback) when WebGL is
  // unavailable, fails or is lost later. Always returns the full API, so pages never branch on WebGL:
  // without a scene, complete(done) calls done at once and everything else does nothing.
  function attach(host, mode) {
    if (!host) return null;
    const reduced = !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let api = null;
    function fallback() {
      host.classList.add("is-fallback");
      const lost = api; api = null;
      if (lost) { try { lost.dispose(); } catch (_) {} }
      Array.from(host.querySelectorAll(".spw-canvas")).forEach(c => c.remove());
    }
    try { api = mount(host, { reduced: reduced, mode: mode, onLost: fallback }); } catch (_) { api = null; }
    if (!api) fallback();
    // Leaving for good releases the GPU; a page kept in the back/forward cache keeps its scene.
    root.addEventListener("pagehide", e => { if (!e.persisted && api) { api.dispose(); api = null; } });
    const call = name => function () { if (api) return api[name].apply(api, arguments); };
    return {
      live: () => !!api,
      setTyping: call("setTyping"), setProcessing: call("setProcessing"), flag: call("flag"), setSections: call("setSections"), reset: call("reset"),
      complete(done) { if (api) api.complete(done); else if (typeof done === "function") done(); }
    };
  }

  root.SafePermitWorksite = { mount, attach };
})(typeof window !== "undefined" ? window : globalThis);
