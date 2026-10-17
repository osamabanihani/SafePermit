/* SafePermit — scroll-driven clipboard hero.
   One normalized scroll progress p (0..1) is the single source of truth; every visual is derived from it.
   Texts come from the existing i18n system (window.SafePermitI18n.t); theme comes from the existing CSS tokens. */
(function () {
  "use strict";
  var hero = document.getElementById("cbHero");
  if (!hero) return;

  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return v < a ? a : v > b ? b : v; };
  var eo = function (t) { return 1 - Math.pow(1 - t, 3); };
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)");
  var I18N = function () { return window.SafePermitI18n; };
  var t = function (k) { var i = I18N(); return i && i.t ? i.t(k) : k; };

  var ICON = [
    "<circle cx='12' cy='8' r='4'/><path d='M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8'/>",
    "<path d='M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z'/><circle cx='12' cy='12' r='3'/>",
    "<path d='M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'/><path d='M8.5 12l2.5 2.5L16 9.5'/>",
    "<path d='M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z'/>"
  ];
  /* s/e = scroll range, side = entry side (mirrored in RTL), rot/ry/rx = 3D approach, a = accent token */
  var ROLES = [
    { key: "home.worker", d: "home.cb_d1", s: .15, e: .32, side: -1, rot: -4, ry: 34, rx: 6, a: "var(--sp-primary-600)", two: false, ck: [["home.cb_c1", .27]] },
    { key: "home.supervisor", d: "home.cb_d2", s: .32, e: .49, side: 1, rot: 3.5, ry: 26, rx: -4, a: "var(--sp-warning)", two: false, ck: [["home.cb_c2a", .385], ["home.cb_c2b", .425], ["home.cb_c2c", .46]] },
    { key: "home.safety_officer", d: "home.cb_d3", s: .49, e: .68, side: -1, rot: -3, ry: 42, rx: 8, a: "var(--sp-success)", two: true, ck: [["home.cb_c3a", .56], ["home.cb_c3b", .595], ["home.cb_c3c", .63], ["home.cb_c3d", .66]] },
    { key: "home.admin", d: "home.cb_d4", s: .68, e: .84, side: 1, rot: 4, ry: 30, rx: -6, a: "var(--sp-secondary)", two: false, ck: [["home.cb_c4a", .765], ["home.cb_c4b", .80]] }
  ];
  var ENTER = .30, EXIT = .88;
  /* [id, label key, value key, group, fills at] */
  var FIELDS = [
    ["by", "home.cb_f_by", "home.cb_v_by", 1, .20], ["area", "home.cb_f_area", "home.cb_v_area", 1, .23],
    ["type", "home.cb_f_type", "home.cb_v_type", 1, .26], ["date", "home.cb_f_date", "home.cb_v_date", 1, .29],
    ["scope", "home.cb_f_scope", "home.cb_v_scope", 2, .44], ["risk", "home.risk_level", "home.medium", 3, .60],
    ["safety", "home.cb_f_safety", "home.cb_v_safety", 3, .645], ["final", "home.final_approval", "home.cb_v_final", 4, .79]
  ];
  var STATUS = [[0, "home.draft", 0], [.32, "home.cb_requested", 25], [.49, "home.cb_under_review", 50], [.68, "home.cb_safety_cleared", 78], [.84, "home.approved", 100]];
  var DONE_AT = [.32, .49, .68, .84];
  var STEP_KEYS = ["home.cb_step_details", "home.cb_step_review", "home.safety", "home.cb_step_approval"];

  /* ---------- build the clipboard once ---------- */
  var board = $("#cbBoard");
  board.innerHTML =
    '<div class="cb-clip" aria-hidden="true"></div><div class="cb-paper" id="cbPaper" data-cur="1">' +
    '<header class="cb-hd"><div><h2 id="cbTitle"></h2><small id="cbPid"></small></div>' +
    '<div class="cb-status" id="cbStatus" role="status" aria-live="polite"></div>' +
    '<ol class="cb-steps" id="cbSteps">' + STEP_KEYS.map(function () { return "<li></li>"; }).join("") + "</ol></header>" +
    '<div class="cb-main"><div class="cb-copy" id="cbCopy"></div><div class="cb-stage" id="cbStage" data-i18n-ignore aria-live="polite">' +
    '<div class="cb-final" id="cbFinal"><div class="cb-stamp" id="cbStamp"></div><div class="cb-safe" id="cbSafe"><b></b><span></span></div></div></div></div>' +
    '<div class="cb-fields" id="cbFields"></div><div class="cb-chips" id="cbChips"></div></div>';

  /* the headline/copy/CTAs stay in the page as normal data-i18n-text elements (moved into the board) */
  $("#cbCopy").appendChild($("#cbCopySrc"));
  var paper = $("#cbPaper"), stage = $("#cbStage"), fin = $("#cbFinal"), stamp = $("#cbStamp"), safe = $("#cbSafe");
  ["#cbTitle", "#cbPid", "#cbStatus", "#cbSteps", "#cbFields", "#cbChips"].forEach(function (s) { $(s).setAttribute("data-i18n-ignore", ""); });

  var cards = ROLES.map(function (r, i) {
    var el = document.createElement("div"); /* not <article>: shared.js auto-decorates "main article" with its own motion */
    el.setAttribute("role", "group");
    el.className = "cb-card"; el.style.setProperty("--cb-a", r.a); el.setAttribute("aria-hidden", "true");
    el.innerHTML = '<div class="cb-ch"><span class="cb-ico"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[i] + '</svg></span><h3></h3><span class="cb-sn">' + (i + 1) + "/4</span></div><p></p>" +
      '<ul class="cb-cks' + (r.two ? " two" : "") + '">' + r.ck.map(function () { return "<li><i></i><span></span></li>"; }).join("") + "</ul>";
    stage.insertBefore(el, fin);
    return { el: el, lis: $$("li", el), h: $("h3", el), p: $("p", el) };
  });
  $("#cbFields").innerHTML = FIELDS.map(function (f) { return '<div class="cb-f" data-g="' + f[3] + '"><span class="cb-fl"></span><span class="cb-fv"><span></span></span></div>'; }).join("");
  $("#cbChips").innerHTML = ROLES.map(function () { return '<span class="cb-chip"></span>'; }).join("") + '<span class="cb-hint" id="cbHint"></span>';
  var fEls = $$(".cb-f"), chips = $$(".cb-chip"), steps = $$("#cbSteps li"), statusEl = $("#cbStatus"), hint = $("#cbHint");

  function fillText() {
    $("#cbTitle").textContent = t("home.cb_title");
    $("#cbPid").textContent = t("home.cb_permit_id") + ": PTW-1024";
    steps.forEach(function (li, i) { li.textContent = t(STEP_KEYS[i]); });
    ROLES.forEach(function (r, i) {
      cards[i].h.textContent = t(r.key); cards[i].p.textContent = t(r.d);
      r.ck.forEach(function (c, j) { $("span", cards[i].lis[j]).textContent = t(c[0]); });
      chips[i].textContent = t(r.key);
    });
    FIELDS.forEach(function (f, i) { $(".cb-fl", fEls[i]).textContent = t(f[1]); $(".cb-fv span", fEls[i]).textContent = t(f[2]); });
    stamp.textContent = t("home.approved");
    $("b", safe).textContent = t("home.cb_safe"); $("span", safe).textContent = t("home.cb_safe_sub");
    hint.textContent = t("home.cb_hint");
  }

  /* ---------- progress: the only DOM read happens on scroll/resize ---------- */
  var start = 0, span = 1, raf = 0, fit = [1, 1, 1, 1];
  var progress = null, lastTime = null, sync = true, menuOpen = false, suspended = false;
  function scrollY() { return window.scrollY || window.pageYOffset || 0; }
  function style(node, name, value) { value = String(value); if (node.style[name] !== value) node.style[name] = value; }
  var st = { status: -1, f: [], step: "", pulse: false, hint: "" };
  function measure() {
    if (menuOpen) return;
    var previousStart = start, previousSpan = span;
    var r = hero.getBoundingClientRect();
    start = r.top + scrollY(); span = Math.max(1, hero.offsetHeight - window.innerHeight);
    if (previousStart !== start || previousSpan !== span) sync = true;
    /* if a card is taller than the reserved stage (very short phones), shrink it a little instead of letting it clip */
    var sh = stage.clientHeight - 10;
    cards.forEach(function (c, i) { var nh = c.el.offsetHeight || 1; fit[i] = clamp(sh / nh, .8, 1); });
  }

  function render(force, p) {
    if (p == null) p = clamp((scrollY() - start) / span);
    var rtl = root.dir === "rtl" ? -1 : 1, rm = RM.matches;

    ROLES.forEach(function (r, i) {
      var c = cards[i], el = c.el, u = (p - r.s) / (r.e - r.s), op = 0, tf = "";
      if (u > 0 && u < 1) {
        var k = eo(clamp(u / ENTER)), q = u > EXIT ? (u - EXIT) / (1 - EXIT) : 0, sd = r.side * rtl;
        var settle = u < ENTER + .12 ? Math.sin(clamp((u - ENTER) / .12) * Math.PI) * .8 : 0;
        if (rm) { op = clamp(u / .12) * (1 - q); tf = fit[i] < 1 ? "scale(" + fit[i].toFixed(3) + ")" : "none"; }
        else {
          var x = sd * (1 - k) * 118, ry = -sd * (1 - k) * r.ry + sd * settle, rx = (1 - k) * r.rx, z = -(1 - k) * 140;
          var rz = (1 - k) * sd * -6 + r.rot * k * (1 - q) * .8, sc = (1 - .32 * q) * fit[i], y = q * 18;
          op = clamp(u / .08) * (1 - q);
          tf = "translate3d(" + x.toFixed(2) + "%," + y.toFixed(2) + "%," + z.toFixed(1) + "px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) rotateZ(" + rz.toFixed(2) + "deg) scale(" + sc.toFixed(3) + ")";
        }
      }
      var o = op.toFixed(3);
      if (force || el._o !== o || el._t !== tf) { el._o = o; el._t = tf; el.style.opacity = o; el.style.transform = tf; }
      var act = op > .5; if (el._a !== act) { el._a = act; el.setAttribute("aria-hidden", act ? "false" : "true"); }
      r.ck.forEach(function (ck, j) { var on = p >= ck[1], li = c.lis[j]; if (force || li._on !== on) { li._on = on; li.classList.toggle("on", on); } });
    });

    FIELDS.forEach(function (f, i) { var on = p >= f[4]; if (force || st.f[i] !== on) { st.f[i] = on; fEls[i].classList.toggle("on", on); } });

    var s = STATUS[0]; STATUS.forEach(function (x) { if (p >= x[0]) s = x; });
    var sk = s[1] + "|" + s[2];
    if (force || st.status !== sk) { st.status = sk; statusEl.textContent = t(s[1]) + " · " + s[2] + "%"; }
    var key = DONE_AT.map(function (d) { return p >= d ? 1 : 0; }).join("");
    if (force || st.step !== key) {
      st.step = key;
      var first = -1; for (var n = 0; n < DONE_AT.length; n++) { if (p < DONE_AT[n]) { first = n; break; } }
      steps.forEach(function (li, i) { li.className = p >= DONE_AT[i] ? "done" : i === first ? "act" : ""; });
      chips.forEach(function (c, i) { c.classList.toggle("on", p >= DONE_AT[i]); });
      paper.setAttribute("data-cur", first < 0 ? 4 : first + 1);
    }

    /* final physical-style approval stamp (inside the stage, after the Admin card has left) */
    var tt = clamp((p - .84) / .16);
    style(fin, "opacity", tt > 0 ? 1 : 0);
    if (tt > 0) {
      var d = eo(clamp(tt / .4)), cc = clamp((tt - .4) / .12);
      var sc2 = (1.35 - .35 * d) - (tt > .4 ? .07 * Math.sin(Math.PI * cc) : 0);
      style(stamp, "opacity", clamp(tt / .12));
      style(stamp, "transform", rm ? "none" : "translateY(" + (-(1 - d) * 70).toFixed(1) + "px) rotate(" + (-15 + 8 * d).toFixed(2) + "deg) scale(" + sc2.toFixed(3) + ")");
      style(safe, "opacity", clamp((tt - .55) / .2));
    } else if (stamp.style.opacity !== "0") {
      stamp.style.opacity = "0"; stamp.style.transform = ""; safe.style.opacity = "0";
    }
    var pulse = tt > .5; if (st.pulse !== pulse) { st.pulse = pulse; fin.classList.toggle("pulse", pulse); }
    var h = clamp(1 - p / .08).toFixed(2); if (st.hint !== h) { st.hint = h; hint.style.opacity = h; }
  }
  function tick(now) {
    raf = 0;
    if (menuOpen || document.hidden || suspended) return;
    var y = scrollY(), target = clamp((y - start) / span);
    var elapsed = lastTime === null ? 1000 / 60 : Math.min(64, Math.max(1, now - lastTime));
    var inView = y + window.innerHeight > start && y < start + span + window.innerHeight;
    var immediate = sync || RM.matches || !inView || progress === null || Math.abs(target - progress) * span > window.innerHeight;
    progress = immediate ? target : progress + (target - progress) * (1 - Math.exp(-elapsed / 70));
    if (Math.abs(target - progress) < .00001) progress = target;
    sync = false;
    render(false, progress);
    lastTime = progress !== target ? now : null;
    if (progress !== target) req();
  }
  function req() {
    if (!raf && !menuOpen && !document.hidden && !suspended) {
      if (lastTime === null) lastTime = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; lastTime = null; sync = true; }
  function full() { fillText(); st.status = ""; measure(); if (!menuOpen) progress = clamp((scrollY() - start) / span); render(true, progress); }

  window.addEventListener("scroll", req, { passive: true });
  window.addEventListener("resize", function () { measure(); req(); });
  window.addEventListener("orientationchange", function () { setTimeout(function () { measure(); req(); }, 250); });
  document.addEventListener("safepermit:languagechange", function () { setTimeout(full, 0); });
  document.addEventListener("safepermit:i18nready", full);
  if (RM.addEventListener) RM.addEventListener("change", function () { sync = true; req(); });
  document.addEventListener("safepermit:navigationchange", function (event) { menuOpen = event.detail.open; if (menuOpen) stop(); else { measure(); req(); } });
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else req(); });
  window.addEventListener("pagehide", function () { suspended = true; stop(); });
  window.addEventListener("pageshow", function () { suspended = false; measure(); req(); });
  if (window.ResizeObserver) new ResizeObserver(function () { measure(); req(); }).observe(document.body);
  full();
})();
