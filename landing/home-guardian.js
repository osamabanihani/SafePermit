/* THE GUARDIAN (v13.4): the Human Standard helmet as a dark studio experience.
 * Reveal from darkness, pointer/touch/keyboard rotation, and three checkpoints (PPE, hazards, isolation)
 * with callouts on real 3D anchor points. Presentation only: no permit, approval or account data is touched.
 * Falls back to the product image when WebGL is unavailable; respects reduced motion. */
(function () {
  "use strict";
  if (window.SafePermitGuardian) return;
  const section = document.querySelector('.sp-guardian[data-sp-safety-section="helmet"]');
  if (!section) return;
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const namespace = "home.safety_sections.";
  const copy = {
    en: {
      guardianHint: "MOVE OR DRAG TO ROTATE", viewportLabel: "Interactive 3D safety helmet. Use the arrow keys to rotate it.", resetView: "Reset view",
      fieldTag: "PROTECTION FIELD", scanTag: "HAZARD SCAN", techTag: "TECHNICAL VIEW",
      ppeLabel: "WHAT THE HELMET PROTECTS AGAINST",
      calloutShell: "Shell", ppeShell: "Resists impact and penetration from above.",
      calloutBrim: "Brim", ppeBrim: "Sheds falling debris, rain and glare.",
      calloutMount: "Accessory slots", ppeMount: "Fit hearing protection, a visor or a lamp.",
      calloutSuspension: "Suspension", ppeSuspension: "Absorbs the blow and keeps the fit.",
      hazardFalling: "Falling objects", hazardImpact: "Head impact", hazardElectric: "Electrical contact",
      chainLabel: "FROM HAZARD TO RESIDUAL RISK", chainHazard: "Hazard", chainHazardValue: "Falling objects from work overhead",
      chainRisk: "Initial risk", chainRiskValue: "High · 12", chainControls: "Controls", chainControlsValue: "Exclusion zone, toe boards, helmet with chin strap",
      chainResidual: "Residual risk", chainResidualValue: "Low · 4",
      chainNote: "Illustrative example. SafePermit only approves a permit when the residual risk is below High.",
      lotoLabel: "LOCKOUT / TAGOUT · WORK PROCEDURE",
      lotoIsolate: "Isolate", lotoIsolateBody: "Switch off and isolate every energy source.",
      lotoLock: "Lock", lotoLockBody: "Each person fits a personal lock at the isolation point.",
      lotoTag: "Tag", lotoTagBody: "Name, date and permit number on every lock.",
      lotoVerify: "Verify zero energy", lotoVerifyBody: "Test before touch: nothing can start or release energy.",
      lotoNote: "LOTO is a work procedure recorded in the permit. It is not a function of the helmet."
    },
    ar: {
      guardianHint: "حرّك المؤشر أو اسحب للتدوير", viewportLabel: "خوذة سلامة تفاعلية ثلاثية الأبعاد. استخدم مفاتيح الأسهم لتدويرها.", resetView: "إعادة ضبط العرض",
      fieldTag: "نطاق الحماية", scanTag: "مسح المخاطر", techTag: "عرض تقني",
      ppeLabel: "ممّا تحمي الخوذة",
      calloutShell: "الغلاف", ppeShell: "يقاوم الصدمات واختراق الأجسام من الأعلى.",
      calloutBrim: "الحافة", ppeBrim: "تُبعد الحطام المتساقط والمطر ووهج الشمس.",
      calloutMount: "منافذ الملحقات", ppeMount: "لتركيب واقيات السمع أو قناع الوجه أو المصباح.",
      calloutSuspension: "نظام التعليق", ppeSuspension: "يمتص الصدمة ويحافظ على ثبات الخوذة.",
      hazardFalling: "سقوط الأجسام", hazardImpact: "اصطدام الرأس", hazardElectric: "التلامس الكهربائي",
      chainLabel: "من الخطر إلى الخطر المتبقي", chainHazard: "الخطر", chainHazardValue: "سقوط أجسام من أعمال في الأعلى",
      chainRisk: "الخطر الأولي", chainRiskValue: "مرتفع · 12", chainControls: "الضوابط", chainControlsValue: "منطقة محظورة، وألواح حماية للأقدام، وخوذة بحزام ذقن",
      chainResidual: "الخطر المتبقي", chainResidualValue: "منخفض · 4",
      chainNote: "مثال توضيحي. لا يعتمد SafePermit تصريحًا إلا إذا كان الخطر المتبقي أقل من مرتفع.",
      lotoLabel: "العزل والإقفال والوسم (LOTO) · إجراء عمل",
      lotoIsolate: "اعزل", lotoIsolateBody: "افصل كل مصادر الطاقة واعزلها.",
      lotoLock: "أقفل", lotoLockBody: "يضع كل شخص قفله الشخصي على نقطة العزل.",
      lotoTag: "ضع البطاقة", lotoTagBody: "الاسم والتاريخ ورقم التصريح على كل قفل.",
      lotoVerify: "تحقّق من انعدام الطاقة", lotoVerifyBody: "اختبر قبل اللمس: لا شيء يمكنه التشغيل أو إطلاق الطاقة.",
      lotoNote: "إجراء LOTO خطوة عمل تُسجَّل في التصريح، وليس وظيفة من وظائف الخوذة."
    }
  };
  const lang = function () { return root.lang === "ar" ? "ar" : "en"; };
  function t(key) {
    const i18n = window.SafePermitI18n;
    const translated = i18n && i18n.t ? i18n.t(namespace + key) : "";
    if (translated && translated !== namespace + key) return translated;
    if (copy[lang()][key]) return copy[lang()][key];
    const shared = window.SafePermitSafetySections && window.SafePermitSafetySections.translations;
    return (shared && shared[lang()] && shared[lang()][key]) || copy.en[key] || key;
  }

  /* ---- Checkpoints: studio pose, shader modes and callouts on named 3D anchors ---- */
  const checkpoints = {
    ppe: { tag: "fieldTag", link: ["resources/safety-review/", "detailLink"],
      pose: { yaw: -.62, pitch: .15, dist: .8, lookY: .34, focus: [.35, .8, .45, 1.25], focusAmt: .4, field: 1, rim: .45, tau: .55 },
      marks: [{ anchor: "shell", key: "calloutShell", dy: -26 }, { anchor: "brim", key: "calloutBrim", dy: 26 }, { anchor: "mount", key: "calloutMount", dy: -22 }] },
    hazards: { tag: "scanTag", link: ["resources/risk-assessment/", "detailLinkRisk"],
      pose: { yaw: .42, pitch: .05, dist: .92, lookY: .2, focus: [0, 1.0, .3, 1.6], focusAmt: .2, scanOn: 1, rim: .85, tau: .55 },
      marks: [{ anchor: "crown", key: "hazardFalling", dy: -30, kind: "hazard" }, { anchor: "ridge", key: "hazardImpact", dy: 10, kind: "hazard" }, { anchor: "side", key: "hazardElectric", dy: 22, kind: "hazard" }] },
    isolation: { tag: "techTag", link: ["resources/safety-review/", "detailLink"],
      pose: { yaw: -1.25, pitch: .04, dist: 1.04, lookY: .14, tech: 1, rim: .25, tau: .6 },
      marks: [] }
  };
  // Image fallback: anchor positions on the product photograph (fractions of the square image).
  const imageAnchors = { shell: [.6, .33], brim: [.2, .8], mount: [.86, .58], suspension: [.93, .7], crown: [.52, .17], ridge: [.42, .32], side: [.25, .55] };

  const viewport = section.querySelector("[data-sp-guardian-viewport]");
  const product = section.querySelector(".sp-guardian__product");
  const image = product.querySelector("img");
  const marksHost = section.querySelector("[data-sp-guardian-marks]");
  const tagNode = section.querySelector("[data-sp-guardian-tag]");
  const resetButton = section.querySelector("[data-sp-guardian-reset]");
  const buttons = Array.from(section.querySelectorAll("[data-sp-safety-module]"));
  const names = buttons.map(function (button) { return button.dataset.spSafetyModule; });
  const detail = section.querySelector("[role='tabpanel']");
  const panels = Array.from(section.querySelectorAll("[data-sp-guardian-panel]"));
  const link = section.querySelector("[data-sp-safety-link]");
  let selected = 0, scene = null, attempted = false, inView = false, menuOpen = false;
  let revealed = false, revealing = false, timers = [], marks = [], size = { w: 1, h: 1 }, keyYaw = 0, keyPitch = 0;
  const later = function (fn, ms) { timers.push(window.setTimeout(fn, ms)); };
  const motionOK = function () { return !reduced.matches; };
  const poseOf = function (index) { return checkpoints[names[index]].pose; };

  /* ---- 3D scene lifecycle ---- */
  function ensureScene() {
    if (scene || attempted) return;
    const engine = window.SafePermitHelmetScene;
    if (!engine || (engine.needsThree && (!window.SafePermitTHREE || !window.SafePermitHelmetModel))) { attempted = true; layoutMarks(); return; }
    attempted = true;
    scene = engine.create(product, { rtl: root.dir === "rtl", reduced: reduced.matches, onFrame: layoutMarks });
    if (!scene) { section.dataset.spGuardianRenderer = "image"; layoutMarks(); return; }
    section.dataset.spGuardianRenderer = "three";
    scene.resize(size.w, size.h);
    scene.setFrame(frameFor());
    scene.setIdle(motionOK());
    if (revealed || !motionOK()) scene.setPose(poseOf(selected), true);
    else scene.setPose(darkPose(), true);
    syncActive();
  }
  function darkPose() {
    const pose = poseOf(selected);
    return Object.assign({}, pose, { exposure: 0, rim: 0, field: 0, scanOn: 0, tech: 0, focusAmt: 0, yaw: pose.yaw + .95, pitch: pose.pitch + .08, dist: pose.dist * 1.4, lookY: pose.lookY + .12 });
  }
  function frameFor() { return size.w < 520 ? 1.34 : size.w < 820 ? 1.16 : 1; }
  function syncActive() { if (scene) scene.setActive(inView && !document.hidden && !menuOpen); }

  /* ---- Reveal from darkness: rim light, light sweep, exposure rise, camera settle ---- */
  function reveal() {
    if (revealed || revealing) return;
    ensureScene();
    if (!motionOK()) { finishReveal(); return; }
    revealing = true;
    section.classList.remove("is-armed");
    section.classList.add("is-revealing");
    if (scene) {
      scene.setPose(darkPose(), true);
      later(function () { scene.setPose(Object.assign({}, darkPose(), { exposure: .3, rim: 1.9, tau: .55 })); }, 80);
      later(function () { scene.sweep(1700); scene.setPose(Object.assign({}, poseOf(selected), { field: 0, scanOn: 0, tech: 0, focusAmt: 0, tau: .85 })); }, 620);
    }
    later(function () { if (scene) scene.setPose(poseOf(selected)); showMarks(); }, 1650);
    later(function () { revealing = false; revealed = true; section.classList.remove("is-revealing"); section.classList.add("is-revealed"); }, 2100);
  }
  // Any interaction during the reveal jumps to the end state: nothing waits on the intro.
  function finishReveal() {
    timers.forEach(window.clearTimeout); timers = [];
    revealing = false; revealed = true;
    section.classList.remove("is-armed", "is-revealing");
    section.classList.add("is-revealed");
    if (scene) scene.setPose(poseOf(selected), !motionOK());
    showMarks();
  }

  /* ---- Callouts and hazard markers anchored to the model ---- */
  function buildMarks() {
    marksHost.replaceChildren();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "sp-guardian__leaders");
    marksHost.appendChild(svg);
    marks = checkpoints[names[selected]].marks.map(function (config, index) {
      const node = document.createElement("div");
      node.className = "sp-guardian__mark" + (config.kind === "hazard" ? " is-hazard" : "");
      node.style.setProperty("--sp-mark-delay", (index * 110) + "ms");
      const pin = document.createElement("i"); pin.className = "sp-guardian__pin";
      const label = document.createElement("span"); label.className = "sp-guardian__callout"; label.textContent = t(config.key);
      node.append(pin, label);
      marksHost.appendChild(node);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("class", "sp-guardian__leader" + (config.kind === "hazard" ? " is-hazard" : ""));
      line.style.setProperty("--sp-mark-delay", (index * 110) + "ms");
      svg.appendChild(line);
      return { config: config, node: node, pin: pin, label: label, line: line, width: 0, side: 0, shown: -1 };
    });
    measureLabels();
    layoutMarks();
    if (revealed || !motionOK()) showMarks();
  }
  function measureLabels() { marks.forEach(function (mark) { mark.width = mark.label.offsetWidth || 90; }); }
  function showMarks() {
    window.requestAnimationFrame(function () { marksHost.classList.add("is-on"); });
  }
  function imagePoint(anchor) {
    const a = imageAnchors[anchor] || [.5, .5];
    const box = Math.min(size.w, size.h) * .92, left = (size.w - box) / 2, top = (size.h - box) / 2;
    return { x: left + a[0] * box, y: top + a[1] * box, facing: 1 };
  }
  function layoutMarks() {
    if (!marks.length) return;
    const three = scene && product.classList.contains("is-helmet-3d");
    const reach = Math.max(34, Math.min(104, size.w * .12));
    marks.forEach(function (mark) {
      const p = three ? scene.project(mark.config.anchor) : imagePoint(mark.config.anchor);
      if (!p) return;
      // Fade callouts on the far side of the helmet.
      const visible = Math.max(0, Math.min(1, (p.facing + .12) / .3));
      // Hysteresis keeps a label on its side while the pin crosses the centre.
      const centre = size.w / 2, margin = size.w * .06;
      if (!mark.side) mark.side = p.x < centre ? -1 : 1;
      else if (mark.side < 0 && p.x > centre + margin) mark.side = 1;
      else if (mark.side > 0 && p.x < centre - margin) mark.side = -1;
      let lx = p.x + mark.side * reach;
      const ly = Math.max(16, Math.min(size.h - 16, p.y + mark.config.dy));
      lx = mark.side < 0 ? Math.max(mark.width + 10, lx) : Math.min(size.w - mark.width - 10, lx);
      mark.pin.style.transform = "translate(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px)";
      mark.label.style.transform = "translate(" + (mark.side < 0 ? lx - mark.width : lx).toFixed(1) + "px," + ly.toFixed(1) + "px) translateY(-50%)";
      mark.line.setAttribute("x1", p.x.toFixed(1)); mark.line.setAttribute("y1", p.y.toFixed(1));
      mark.line.setAttribute("x2", lx.toFixed(1)); mark.line.setAttribute("y2", ly.toFixed(1));
      const opacity = visible.toFixed(2);
      if (mark.shown !== opacity) { mark.shown = opacity; mark.node.style.setProperty("--sp-mark-visible", opacity); mark.line.style.setProperty("--sp-mark-visible", opacity); }
    });
  }

  /* ---- Checkpoint selection ---- */
  function render(animate) {
    const name = names[selected], config = checkpoints[name];
    section.dataset.checkpoint = name;
    buttons.forEach(function (button, index) {
      button.setAttribute("aria-selected", String(index === selected));
      button.tabIndex = index === selected ? 0 : -1;
      button.classList.toggle("is-past", index < selected);
    });
    detail.setAttribute("aria-labelledby", buttons[selected].id);
    detail.querySelector("[data-sp-safety-number]").textContent = String(selected + 1).padStart(2, "0");
    ["title", "body"].forEach(function (part) {
      const node = detail.querySelector('[data-sp-safety-detail="' + part + '"]');
      const key = name + part.charAt(0).toUpperCase() + part.slice(1);
      node.setAttribute("data-i18n-text", namespace + key);
      node.textContent = t(key);
    });
    panels.forEach(function (panel) { panel.hidden = panel.dataset.spGuardianPanel !== name; });
    if (link) {
      link.setAttribute("href", config.link[0]);
      const label = link.querySelector("[data-sp-safety-text]");
      label.dataset.spSafetyText = config.link[1];
      label.setAttribute("data-i18n-text", namespace + config.link[1]);
      label.textContent = t(config.link[1]);
    }
    tagNode.textContent = t(config.tag);
    if (animate && motionOK()) {
      detail.classList.remove("is-switching"); void detail.offsetWidth; detail.classList.add("is-switching");
    }
    marksHost.classList.remove("is-on");
    buildMarks();
  }
  function select(index, user) {
    index = (index + names.length) % names.length;
    if (revealing) finishReveal();
    const changed = index !== selected;
    selected = index;
    render(changed);
    if (scene) {
      scene.setPose(poseOf(selected), !motionOK());
      if (changed && user && motionOK()) scene.sweep(1000);
    }
  }
  function syncLanguage() {
    section.querySelectorAll("[data-sp-guardian-text]").forEach(function (node) { node.textContent = t(node.dataset.spGuardianText); });
    section.querySelectorAll("[data-sp-guardian-aria]").forEach(function (node) { node.setAttribute("aria-label", t(node.dataset.spGuardianAria)); });
    image.alt = t("helmetAlt");
    section.querySelector("[role='tablist']").setAttribute("aria-label", t("modulesLabel"));
    if (scene) scene.setRtl(root.dir === "rtl");
    render(false);
  }

  /* ---- Input: tabs, pointer, touch, keyboard ---- */
  buttons.forEach(function (button, index) {
    button.addEventListener("click", function () { select(index, true); });
    button.addEventListener("keydown", function (event) {
      const rtl = root.dir === "rtl", n = names.length;
      let next = index;
      if (event.key === "ArrowRight") next = (index + (rtl ? n - 1 : 1)) % n;
      else if (event.key === "ArrowLeft") next = (index + (rtl ? 1 : n - 1)) % n;
      else if (event.key === "ArrowDown") next = (index + 1) % n;
      else if (event.key === "ArrowUp") next = (index + n - 1) % n;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = n - 1;
      else return;
      event.preventDefault();
      select(next, true);
      buttons[next].focus({ preventScroll: true });
    });
  });
  let rect = null, drag = null;
  function pointerFraction(event) {
    if (!rect) rect = viewport.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1, y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1 };
  }
  function tiltImage(x, y) {
    // Image fallback: a small CSS turn so the photograph still answers the pointer.
    if (scene) return;
    viewport.style.setProperty("--sp-guardian-turn", (x * 9).toFixed(2) + "deg");
    viewport.style.setProperty("--sp-guardian-tip", (-y * 4).toFixed(2) + "deg");
  }
  viewport.addEventListener("pointerenter", function () { rect = viewport.getBoundingClientRect(); });
  viewport.addEventListener("pointermove", function (event) {
    if (revealing) finishReveal();
    const f = pointerFraction(event);
    if (event.pointerType === "mouse") {
      keyYaw = 0; keyPitch = 0;
      if (scene) scene.hover(f.x, f.y);
      tiltImage(f.x, f.y);
      return;
    }
    if (!drag) return;
    const time = event.timeStamp, dx = (event.clientX - drag.x) / Math.max(1, rect.width);
    if (scene) scene.drag(dx, Math.max(.001, (time - drag.t) / 1000));
    drag.total += dx; drag.x = event.clientX; drag.t = time;
    tiltImage(Math.max(-1, Math.min(1, drag.total * 2)), 0);
  }, { passive: true });
  viewport.addEventListener("pointerleave", function (event) {
    rect = null;
    if (event.pointerType === "mouse") { if (scene) scene.hover(0, 0); tiltImage(0, 0); }
  });
  viewport.addEventListener("pointerdown", function (event) {
    if (revealing) finishReveal();
    if (event.pointerType === "mouse") return;
    rect = viewport.getBoundingClientRect();
    drag = { x: event.clientX, t: event.timeStamp, total: 0 };
    if (scene) scene.dragStart();
  }, { passive: true });
  function endDrag() { if (!drag) return; drag = null; if (scene) scene.dragEnd(); else window.setTimeout(function () { tiltImage(0, 0); }, 1800); }
  viewport.addEventListener("pointerup", endDrag, { passive: true });
  viewport.addEventListener("pointercancel", endDrag, { passive: true });
  viewport.addEventListener("keydown", function (event) {
    const rtl = root.dir === "rtl";
    if (event.key === "ArrowLeft") keyYaw -= rtl ? -.25 : .25;
    else if (event.key === "ArrowRight") keyYaw += rtl ? -.25 : .25;
    else if (event.key === "ArrowUp") keyPitch -= .34;
    else if (event.key === "ArrowDown") keyPitch += .34;
    else if (event.key === "Home" || event.key === "0") { keyYaw = 0; keyPitch = 0; }
    else return;
    event.preventDefault();
    if (revealing) finishReveal();
    keyYaw = Math.max(-1, Math.min(1, keyYaw)); keyPitch = Math.max(-1, Math.min(1, keyPitch));
    if (scene) scene.hover(keyYaw, keyPitch);
    tiltImage(keyYaw, keyPitch);
  });
  resetButton.addEventListener("click", function () {
    keyYaw = 0; keyPitch = 0;
    if (scene) scene.resetPointer();
    tiltImage(0, 0);
  });
  section.addEventListener("focusin", function () { if (revealing) finishReveal(); });

  /* ---- Visibility, pausing and layout ---- */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        inView = entry.isIntersecting;
        if (entry.isIntersecting && entry.intersectionRatio >= .2) reveal();
        syncActive();
      });
    }, { threshold: [0, .2, .4] }).observe(section);
    // Build the scene a little before the section scrolls in.
    new IntersectionObserver(function (entries) { if (entries[0].isIntersecting) ensureScene(); }, { rootMargin: "80% 0px 80% 0px" }).observe(viewport);
  } else { inView = true; ensureScene(); finishReveal(); }
  function measure() {
    size = { w: Math.max(1, viewport.clientWidth), h: Math.max(1, viewport.clientHeight) };
    rect = null;
    if (scene) { scene.resize(size.w, size.h); scene.setFrame(frameFor()); }
    viewport.style.setProperty("--spg-scan-travel", Math.round(size.h * .72) + "px");
    measureLabels();
    layoutMarks();
  }
  if (window.ResizeObserver) {
    let frame = 0;
    new ResizeObserver(function () {
      if (frame) return;
      frame = window.requestAnimationFrame(function () { frame = 0; measure(); });
    }).observe(viewport);
  } else window.addEventListener("resize", measure, { passive: true });
  image.addEventListener("load", layoutMarks);
  document.addEventListener("visibilitychange", syncActive);
  document.addEventListener("safepermit:navigationchange", function (event) { menuOpen = !!(event.detail && event.detail.open); syncActive(); });
  document.addEventListener("safepermit:languagechange", syncLanguage);
  document.addEventListener("safepermit:i18nready", syncLanguage);
  reduced.addEventListener("change", function () {
    if (scene) { scene.setReduced(reduced.matches); scene.setIdle(motionOK()); }
    if (reduced.matches) finishReveal();
  });
  window.addEventListener("pagehide", function (event) {
    if (scene) scene.setActive(false);
    if (!event.persisted && scene) { scene.dispose(); scene = null; attempted = false; }
  });
  window.addEventListener("pageshow", function (event) { if (event.persisted) syncActive(); });

  // Start dark only when the section is still below the fold and motion is allowed.
  const box = section.getBoundingClientRect();
  if (motionOK() && "IntersectionObserver" in window && box.top > window.innerHeight * .6) section.classList.add("is-armed");
  else if (!motionOK()) section.classList.add("is-revealed");
  measure();
  syncLanguage();
  if (!motionOK()) finishReveal();
  window.SafePermitGuardian = {
    select: function (index) { select(index, true); },
    finishReveal: finishReveal,
    state: function () { return { checkpoint: names[selected], revealed: revealed, revealing: revealing, renderer: scene ? "three" : attempted ? "image" : "pending", inView: inView, rendering: !!(scene && scene.isRendering()), lowPower: !!(scene && scene.isLowPower()) }; }
  };
})();
