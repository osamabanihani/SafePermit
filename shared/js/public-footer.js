/* SafePermit public footer — vanilla port of the Shutter Glyph Footer.
 * The SAFEPERMIT wordmark is drawn as geometric SVG (rectangles, slanted strokes, elliptical bands),
 * so no font is loaded. The shutter sits beside the wordmark as its own decorative button.
 * Colors come from tokens through CSS (fill: currentColor / custom properties); nothing is hard-coded here.
 * Link scrambling is provided by letter-swap.js ([data-letter-scramble]) so one effect owns each link.
 */
(function (root) {
  "use strict";
  if (root.SafePermitPublicFooter) return;

  /* ---------------- geometry (ported from the component, unchanged) ---------------- */
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const CAP = 100;
  const S = 19; // stem
  const B = 17; // bar
  const f = n => String(Math.round(n * 100) / 100);
  const rect = (x, y, w, h) => "M" + f(x) + " " + f(y) + "H" + f(x + w) + "V" + f(y + h) + "H" + f(x) + "Z";
  const slant = (x1, y1, x2, y2, t) => "M" + f(x1) + " " + f(y1) + "H" + f(x1 + t) + "L" + f(x2 + t) + " " + f(y2) + "H" + f(x2) + "Z";
  const at = (cx, cy, rx, ry, deg) => {
    const a = (deg * Math.PI) / 180;
    return f(cx + rx * Math.cos(a)) + " " + f(cy + ry * Math.sin(a));
  };
  const band = (cx, cy, rx, ry, tx, ty, a0, a1) => {
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    const cw = a1 > a0 ? 1 : 0;
    const irx = rx - tx, iry = ry - ty;
    return "M" + at(cx, cy, rx, ry, a0) +
      "A" + f(rx) + " " + f(ry) + " 0 " + large + " " + cw + " " + at(cx, cy, rx, ry, a1) +
      "L" + at(cx, cy, irx, iry, a1) +
      "A" + f(irx) + " " + f(iry) + " 0 " + large + " " + (1 - cw) + " " + at(cx, cy, irx, iry, a0) + "Z";
  };
  const ring = (cx, cy, rx, ry, tx, ty) => {
    const e = (r1, r2) => "M" + f(cx - r1) + " " + f(cy) +
      "A" + f(r1) + " " + f(r2) + " 0 1 1 " + f(cx + r1) + " " + f(cy) +
      "A" + f(r1) + " " + f(r2) + " 0 1 1 " + f(cx - r1) + " " + f(cy) + "Z";
    return e(rx, ry) + e(rx - tx, ry - ty);
  };
  const bowl = (x, y, w, h, t, tb) => {
    const ry = h / 2, rx = Math.min(w - t, ry * 0.95), sx = x + w - rx;
    return "M" + f(x) + " " + f(y) + "H" + f(sx) +
      "A" + f(rx) + " " + f(ry) + " 0 0 1 " + f(sx) + " " + f(y + h) + "H" + f(x) + "Z" +
      "M" + f(x + t) + " " + f(y + tb) + "H" + f(sx) +
      "A" + f(rx - t) + " " + f(ry - tb) + " 0 0 1 " + f(sx) + " " + f(y + h - tb) + "H" + f(x + t) + "Z";
  };
  const SPACE = { w: 42, d: [] };
  const GLYPHS = {
    A: { w: 96, d: [slant(37, 0, 0, 100, 23), slant(37, 0, 73, 100, 23), rect(18, 60, 60, 16)] },
    E: { w: 72, d: [rect(0, 0, S, 100), rect(0, 0, 72, B), rect(0, 41.5, 64, B), rect(0, 100 - B, 72, B)] },
    F: { w: 70, d: [rect(0, 0, S, 100), rect(0, 0, 70, B), rect(0, 43, 62, B)] },
    I: { w: S + 2, d: [rect(0, 0, S + 2, 100)] },
    M: { w: 112, d: [rect(0, 0, S + 3, 100), slant(0, 0, 46, 100, 9), slant(68, 0, 40, 100, 22), rect(112 - S - 3, 0, S + 3, 100)] },
    P: { w: 80, d: [rect(0, 0, S, 100), bowl(0, 0, 80, 60, S, B)] },
    R: { w: 84, d: [rect(0, 0, S, 100), bowl(0, 0, 82, 58, S, B), slant(34, 50, 62, 100, 22)] },
    // Two bands that meet on the spine: r = (CAP + B) / 4 makes it exactly B thick.
    S: { w: 80, d: [band(40, 29.25, 40, 29.25, S, B, -22, -273), band(40, 70.75, 40, 29.25, S, B, -93, 158)] },
    T: { w: 82, d: [rect(0, 0, 82, B), rect(41 - S / 2 - 1, 0, S + 2, 100)] }
  };
  const glyphOf = ch => GLYPHS[String(ch).toUpperCase()] || SPACE;

  const SHUTTER = 100;
  const K = 21;
  const REST = 77;
  const turn = (x, y, turns) => {
    const n = ((turns % 4) + 4) % 4;
    let a = x, b = y;
    for (let i = 0; i < n; i++) { const t = a; a = SHUTTER - b; b = t; }
    return [a, b];
  };
  const restPivot = turns => turn(REST, REST, turns);
  const blades = (px, py, turns) => {
    const q = turn(clamp(px, 8, 92), clamp(py, 8, 92), -turns);
    const qx = q[0], qy = q[1];
    const shapes = [
      [0, 0, K, 0, qx, qy, 0, K],
      [qx, 0, SHUTTER, 0, SHUTTER, K, qx, qy],
      [0, qy, qx, qy, K, SHUTTER, 0, SHUTTER]
    ];
    return shapes.map(s => {
      const out = [];
      for (let i = 0; i < s.length; i += 2) out.push(...turn(s[i], s[i + 1], turns));
      return out;
    });
  };
  const layout = (word, gap) => {
    const g = gap == null ? 12 : gap;
    const items = [];
    let x = 0;
    Array.from(word).forEach(ch => {
      const w = glyphOf(ch).w;
      items.push({ ch, x, w });
      x += w + g;
    });
    return { items, width: Math.max(1, x - (items.length ? g : 0)) };
  };
  const approach = (from, to, k, dt) => to + (from - to) * Math.pow(1 - clamp(k, 0, 1), clamp(dt, 0, 0.1) * 60);

  const geometry = Object.freeze({ clamp, CAP, rect, slant, band, ring, bowl, GLYPHS, glyphOf, SHUTTER, REST, turn, restPivot, blades, layout, approach, f });

  /* ---------------- component ---------------- */
  const WORD = "SAFEPERMIT";
  const SHUTTER_GAP = 12; // the original layout gap between items
  const NS = "http://www.w3.org/2000/svg";
  const instances = new WeakMap();
  let uid = 0;

  function svgEl(name, attrs) {
    const node = root.document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(key => node.setAttribute(key, attrs[key]));
    return node;
  }

  // The component HTML deliberately contains no inline <svg>: VS Code Live Server injects its reload
  // script before every </svg> of a served .html file and then truncates the response, which cut the
  // footer off after the first links. Icons are drawn here instead.
  const ICONS = Object.freeze({
    arrow: "M1 6h9.2M6.4 2.2 10.2 6l-3.8 3.8",
    up: "M6 11V1.8M2.2 5.6 6 1.8l3.8 3.8"
  });
  function buildIcons(scope) {
    scope.querySelectorAll("[data-sp-pf-icon]").forEach(function (slot) {
      if (slot.querySelector("svg")) return;
      const kind = slot.getAttribute("data-sp-pf-icon");
      const icon = svgEl("svg", { viewBox: "0 0 12 12", focusable: "false", "aria-hidden": "true" });
      if (kind === "up") icon.setAttribute("class", "sp-pfooter__up-arrow");
      icon.appendChild(svgEl("path", { d: ICONS[kind] || ICONS.arrow, fill: "none", stroke: "currentColor", "stroke-linecap": "square", "stroke-width": "1.3" }));
      slot.appendChild(icon);
    });
  }

  function buildMark(mark, id) {
    // One row like the original: the ten letters, then the shutter after the T, same cap height and gap.
    const { items, width } = layout(WORD);
    const sx = width + SHUTTER_GAP;
    const total = sx + SHUTTER;
    const upId = "sp-pfooter-up-" + id, dnId = "sp-pfooter-dn-" + id;
    const host = mark.querySelector("[data-sp-pfooter-word]");

    const word = svgEl("svg", { class: "sp-pfooter__word", viewBox: "0 0 " + f(total) + " " + CAP, "aria-hidden": "true", focusable: "false" });
    word.style.aspectRatio = total + " / " + CAP;
    const defs = svgEl("defs");
    // Every letter is drawn twice, cut at its waist; hover slides the halves apart.
    const up = svgEl("clipPath", { id: upId, clipPathUnits: "userSpaceOnUse" });
    up.appendChild(svgEl("rect", { x: -40, y: -200, width: 400, height: 252.6 }));
    const dn = svgEl("clipPath", { id: dnId, clipPathUnits: "userSpaceOnUse" });
    dn.appendChild(svgEl("rect", { x: -40, y: 51.4, width: 400, height: 250 }));
    defs.append(up, dn);
    word.appendChild(defs);
    items.forEach(function (it, i) {
      const g = glyphOf(it.ch);
      const place = svgEl("g", { transform: "translate(" + f(it.x) + " 0)" });
      const rise = svgEl("g", { class: "sp-pfooter__rise" });
      rise.style.setProperty("--sp-pf-d", 200 + i * 90 + "ms");
      const glyph = svgEl("g", { class: "sp-pfooter__glyph sp-pfooter__flip" });
      glyph.appendChild(svgEl("rect", { width: g.w, height: CAP, fill: "transparent" }));
      [[upId, "sp-pfooter__half sp-pfooter__up"], [dnId, "sp-pfooter__half sp-pfooter__dn"]].forEach(function (half) {
        const clip = svgEl("g", { "clip-path": "url(#" + half[0] + ")" });
        const inner = svgEl("g", { class: half[1] });
        g.d.forEach(d => inner.appendChild(svgEl("path", { d, "fill-rule": "evenodd" })));
        clip.appendChild(inner);
        glyph.appendChild(clip);
      });
      rise.appendChild(glyph);
      place.appendChild(rise);
      word.appendChild(place);
    });

    // The shutter: three ink blades meeting at a pivot, in the same SVG row as the letters.
    const place = svgEl("g", { transform: "translate(" + f(sx) + " 0)" });
    const rise = svgEl("g", { class: "sp-pfooter__rise" });
    rise.style.setProperty("--sp-pf-d", 200 + items.length * 90 + "ms");
    const sh = svgEl("g", { class: "sp-pfooter__glyph sp-pfooter__sh" });
    sh.appendChild(svgEl("rect", { width: SHUTTER, height: CAP, fill: "transparent" }));
    const polys = [0, 1, 2].map(() => sh.appendChild(svgEl("polygon", { class: "sp-pfooter__blade" })));
    rise.appendChild(sh);
    place.appendChild(rise);
    word.appendChild(place);

    // An accessible button sits exactly over the shutter (keyboard and screen readers).
    const button = host.querySelector("[data-sp-shutter]");
    button.style.left = (sx / total * 100).toFixed(4) + "%";
    button.style.width = (SHUTTER / total * 100).toFixed(4) + "%";
    host.insertBefore(word, button);
    return { word, polys, sx, total };
  }

  function init(footer) {
    if (!footer || !root.document) return null;
    if (instances.has(footer)) return instances.get(footer);
    const mark = footer.querySelector("[data-sp-pfooter-mark]");
    const button = footer.querySelector("[data-sp-shutter]");
    if (!mark || !button) return null;
    const reduced = root.matchMedia("(prefers-reduced-motion: reduce)");
    buildIcons(footer);
    const parts = buildMark(mark, ++uid);
    footer.querySelectorAll(".sp-pfooter__fade").forEach((item, i) => item.style.setProperty("--sp-pf-d", (i + 1) * 60 + "ms"));
    const off = [];
    const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); off.push(() => target.removeEventListener(type, fn, opts)); };

    let turns = 0;
    let pivot = restPivot(0);
    let painted = "";
    const ptr = { x: 0, y: 0, inside: false };
    let visible = false;
    let raf = 0;
    let last = 0;

    const still = () => reduced.matches;
    function paint(x, y) {
      const key = f(x) + "," + f(y) + "," + turns;
      if (key === painted) return;
      painted = key;
      blades(x, y, turns).forEach((pts, i) => parts.polys[i].setAttribute("points", pts.map(f).join(" ")));
    }
    function canAnimate() { return visible && !root.document.hidden && !still(); }
    function tick(now) {
      raf = 0;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const rest = restPivot(turns);
      const tx = ptr.inside ? clamp(ptr.x, 8, 92) : rest[0];
      const ty = ptr.inside ? clamp(ptr.y, 8, 92) : rest[1];
      pivot = [approach(pivot[0], tx, 0.12, dt), approach(pivot[1], ty, 0.12, dt)];
      paint(pivot[0], pivot[1]);
      // Stop the loop once the pivot has settled; pointer movement wakes it again.
      if (Math.abs(pivot[0] - tx) < 0.02 && Math.abs(pivot[1] - ty) < 0.02) { pivot = [tx, ty]; paint(tx, ty); return; }
      if (canAnimate()) raf = root.requestAnimationFrame(tick);
    }
    function wake() {
      if (!canAnimate()) {
        if (still()) { pivot = restPivot(turns); paint(pivot[0], pivot[1]); }
        return;
      }
      if (raf) return;
      last = root.performance.now();
      raf = root.requestAnimationFrame(tick);
    }
    function sleep() { if (raf) root.cancelAnimationFrame(raf); raf = 0; }

    function onPointer(event) {
      ptr.inside = event.type !== "pointerleave";
      if (still()) return;
      // Pointer in the shutter's own units, from the SVG's on-screen box (as in the original).
      const r = parts.word.getBoundingClientRect();
      const scale = r.width / parts.total || 1;
      ptr.x = (event.clientX - r.left) / scale - parts.sx;
      ptr.y = (event.clientY - r.top) / scale;
      wake();
    }
    on(footer, "pointermove", onPointer, { passive: true });
    on(footer, "pointerenter", onPointer, { passive: true });
    on(footer, "pointerleave", onPointer, { passive: true });

    on(button, "click", function () {
      turns += 1;
      button.dataset.turns = String(turns % 4);
      // Animated: the pivot eases to its new rest. Otherwise the new position is drawn at once.
      if (!canAnimate()) { pivot = restPivot(turns); paint(pivot[0], pivot[1]); return; }
      wake();
    });

    // Short flip on click or tap; never under reduced motion.
    on(parts.word, "click", function (event) {
      const glyph = event.target.closest && event.target.closest(".sp-pfooter__flip");
      if (!glyph || still()) return;
      glyph.classList.remove("is-flip");
      void glyph.getBoundingClientRect();
      glyph.classList.add("is-flip");
    });
    on(parts.word, "animationend", function (event) {
      const glyph = event.target.closest && event.target.closest(".sp-pfooter__flip");
      if (glyph) glyph.classList.remove("is-flip");
    });

    const backTop = footer.querySelector("[data-sp-back-to-top]");
    if (backTop) on(backTop, "click", function () {
      root.scrollTo({ top: 0, behavior: still() ? "auto" : "smooth" });
      const target = root.document.querySelector("#shared-navbar .sp-brand") || root.document.querySelector("main");
      if (target) {
        if (!target.matches("a[href],button") && !target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    });

    // Reveal once, the first time the footer is on screen; the shutter only tracks while it is.
    // The markup is visible by default: it is hidden here only after the reveal is wired up,
    // so a script failure can never leave an empty footer.
    function inView() {
      const r = footer.getBoundingClientRect();
      const h = root.innerHeight || root.document.documentElement.clientHeight;
      return r.top < h * 0.95 && r.bottom > 0;
    }
    function setVisible(next) {
      visible = next;
      if (visible) footer.dataset.in = "true";
      if (visible) wake(); else sleep();
    }
    const io = typeof root.IntersectionObserver === "function"
      ? new root.IntersectionObserver(function (entries) { setVisible(entries.some(e => e.isIntersecting)); }, { threshold: 0.1 })
      : null;
    if (io) io.observe(footer);
    // Backup for browsers or scroll setups where the observer reports late or not at all.
    let scrollQueued = 0;
    function onScroll() {
      if (scrollQueued) return;
      scrollQueued = root.setTimeout(function () {
        scrollQueued = 0;
        const now = inView();
        if (now !== visible) setVisible(now);
      }, 100);
    }
    on(root, "scroll", onScroll, { passive: true });
    on(root, "resize", onScroll, { passive: true });
    on(root.document, "visibilitychange", function () { if (root.document.hidden) sleep(); else wake(); });
    const onReduced = function () { if (still()) { sleep(); footer.dataset.in = "true"; pivot = restPivot(turns); paint(pivot[0], pivot[1]); } };
    on(reduced, "change", onReduced);
    // Last-resort reveal: scroll events and IntersectionObserver are tied to rendering, which some
    // embedded or throttled views skip. A cheap timer check runs only until the first reveal.
    let poll = 0;
    function stopPoll() { if (poll) root.clearInterval(poll); poll = 0; }
    if (still()) footer.dataset.in = "true";
    else {
      footer.dataset.in = "false";
      // Already on screen (short page, or the user scrolled down before the script ran): play the reveal now.
      if (inView()) root.setTimeout(function () { setVisible(true); }, 60);
      poll = root.setInterval(function () {
        if (footer.dataset.in === "true") { stopPoll(); return; }
        if (inView()) { setVisible(true); stopPoll(); }
      }, 300);
    }
    paint(pivot[0], pivot[1]);

    // Clean up if the footer is replaced (e.g. the host is re-injected).
    const host = footer.parentNode;
    const watch = host ? new MutationObserver(function () { if (!footer.isConnected) instance.destroy(); }) : null;
    if (watch) watch.observe(host, { childList: true });

    const instance = {
      turns: () => turns,
      destroy() {
        sleep();
        if (io) io.disconnect();
        if (scrollQueued) root.clearTimeout(scrollQueued);
        stopPoll();
        if (watch) watch.disconnect();
        off.splice(0).forEach(fn => fn());
        instances.delete(footer);
      }
    };
    instances.set(footer, instance);
    if (root.SafePermitLetterSwap) root.SafePermitLetterSwap.init(footer);
    return instance;
  }

  function initAll() {
    if (!root.document) return;
    root.document.querySelectorAll("[data-sp-public-footer]").forEach(init);
  }

  root.SafePermitPublicFooter = Object.freeze({ init, initAll, geometry, WORD });
})(typeof window !== "undefined" ? window : globalThis);
