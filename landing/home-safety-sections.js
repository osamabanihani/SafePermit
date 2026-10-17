/* Shared safety copy and the industrial film. The Guardian helmet lives in home-guardian.js (v13.4).
 * No permit, approval or account data is changed. */
(function () {
  "use strict";
  if (window.SafePermitSafetySections) return;
  const helmet = document.querySelector('[data-sp-safety-section="helmet"]');
  const film = document.querySelector('[data-sp-safety-section="film"]');
  if (!helmet && !film) return;
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = function (value) { return Math.min(1, Math.max(0, value)); };
  const copy = {
    en: {
      helmetKicker: "THE HUMAN STANDARD", helmetAside: "PROTECTION CONNECTED TO THE PERMIT",
      helmetTitle1: "BUILT AROUND", helmetTitle2: "PEOPLE.", helmetIntro: "Behind every work permit is a person. Connect their protection, the hazards and the authorization before the job begins.",
      helmetAlt: "An orange industrial safety helmet", modulesLabel: "Explore permit safety checkpoints", detailLink: "Explore safety review", detailLinkRisk: "Explore risk assessment",
      storyOverview: "Protection", storyWorkflow: "Workflow", storyFeatures: "Controls", storyAI: "AI support", storyRoles: "Roles", storyScroll: "SCROLL TO EXPLORE", storyNavigation: "Explore SafePermit",
      mPpe: "Protective equipment", mHazards: "Hazards", mIsolation: "Isolation", mReview: "Safety review", mAuthorization: "Authorization", mTraceability: "Traceability",
      ppeTitle: "Protection belongs in the plan.", ppeBody: "Keep the required protective equipment alongside the work scope and the safety checklist, ready for review.",
      hazardsTitle: "Make the hazards visible.", hazardsBody: "Capture the task hazards, rate the initial and residual risk and define the controls before the work moves forward.",
      isolationTitle: "Keep controls connected.", isolationBody: "Record isolation and LOTO requirements with the permit, so energy sources are verified safe before work starts.",
      reviewTitle: "Give safety its own decision.", reviewBody: "The safety officer reviews hazards, checklist evidence and residual risk before the permit progresses.",
      authorizationTitle: "A clear permission to proceed.", authorizationBody: "Keep the final authorization and permit status visible to the people responsible for the work.",
      traceabilityTitle: "Every decision has a trail.", traceabilityBody: "Follow the review history, comments and next responsible role in one connected permit record.",
      filmTitle1: "FROM SCREEN", filmTitle2: "TO SITE.", filmIntro: "Digital control belongs beside real work. Scroll to step into the scene.",
      filmKicker: "CLARITY BEFORE THE WORK", filmCaption: "THE RIGHT CONTEXT. A BETTER DECISION.", filmLink: "Follow the permit journey ↗", filmCredit: "Film: Pressmaster / Pexels",
      filmAria: "Industrial worker reviewing a tablet in a factory", playFilm: "Play film", pauseFilm: "Pause film", filmUnavailable: "Replay film"
    },
    ar: {
      helmetKicker: "الإنسان أولًا", helmetAside: "الحماية مرتبطة بالتصريح",
      helmetTitle1: "كلّه يبدأ", helmetTitle2: "بالإنسان.", helmetIntro: "وراء كل تصريح عمل إنسان. اجمع متطلبات حمايته والمخاطر والاعتماد قبل بدء المهمة.",
      helmetAlt: "خوذة سلامة صناعية برتقالية", modulesLabel: "استكشف نقاط مراجعة السلامة في التصريح", detailLink: "استكشف مراجعة السلامة", detailLinkRisk: "استكشف تقييم المخاطر",
      storyOverview: "الحماية", storyWorkflow: "رحلة التصريح", storyFeatures: "الضوابط", storyAI: "دعم الذكاء الاصطناعي", storyRoles: "الأدوار", storyScroll: "مرّر لاستكشاف المنصة", storyNavigation: "استكشف SafePermit",
      mPpe: "معدات الوقاية", mHazards: "المخاطر", mIsolation: "العزل", mReview: "مراجعة السلامة", mAuthorization: "الاعتماد", mTraceability: "سجل القرارات",
      ppeTitle: "الحماية جزء من الخطة.", ppeBody: "اجمع معدات الوقاية المطلوبة مع نطاق العمل وقائمة فحص السلامة، لتكون جاهزة للمراجعة.",
      hazardsTitle: "اجعل المخاطر واضحة.", hazardsBody: "حدّد مخاطر المهمة، وقيّم مستوى الخطر الأولي والمتبقي، وضع الضوابط قبل انتقال العمل إلى المرحلة التالية.",
      isolationTitle: "أبقِ الضوابط مترابطة.", isolationBody: "سجّل متطلبات العزل وإجراءات LOTO ضمن التصريح، للتحقق من أمان مصادر الطاقة قبل بدء العمل.",
      reviewTitle: "للسلامة قرار مستقل.", reviewBody: "يراجع مسؤول السلامة المخاطر وأدلة قائمة الفحص والخطر المتبقي قبل انتقال التصريح للمرحلة التالية.",
      authorizationTitle: "إذن واضح لبدء العمل.", authorizationBody: "أبقِ الاعتماد النهائي وحالة التصريح واضحين للأشخاص المسؤولين عن المهمة.",
      traceabilityTitle: "لكل قرار أثر محفوظ.", traceabilityBody: "تابع سجل المراجعات والتعليقات والدور المسؤول عن الخطوة التالية داخل سجل تصريح مترابط.",
      filmTitle1: "من الشاشة", filmTitle2: "إلى الموقع.", filmIntro: "التحكم الرقمي قريب من العمل الحقيقي. مرّر لتدخل إلى المشهد.",
      filmKicker: "الوضوح قبل العمل", filmCaption: "صورة أوضح. قرار أفضل.", filmLink: "تابع رحلة التصريح ↖", filmCredit: "الفيديو: Pressmaster / Pexels",
      filmAria: "عامل صناعي يراجع جهازًا لوحيًا داخل مصنع", playFilm: "شغّل الفيديو", pauseFilm: "أوقف الفيديو", filmUnavailable: "أعد تشغيل الفيديو"
    }
  };
  const namespace = "home.safety_sections.";
  function t(key) {
    const i18n = window.SafePermitI18n;
    const translated = i18n && i18n.t ? i18n.t(namespace + key) : "";
    if (translated && translated !== namespace + key) return translated;
    return copy[root.lang === "ar" ? "ar" : "en"][key] || key;
  }
  let frame = 0, menuOpen = false;
  let metrics = { filmStart: 0, filmHeight: 1, stageHeight: 1, travel: 1 };
  let filmProgress = null, lastRenderTime = null, synchronizeMotion = true, pageSuspended = false;
  const styles = new WeakMap();
  function setStyle(node, name, value) {
    let cached = styles.get(node);
    if (!cached) { cached = Object.create(null); styles.set(node, cached); }
    if (cached[name] === value) return;
    cached[name] = value;
    node.style.setProperty(name, value);
  }
  function setClass(node, name, value) {
    if (node.classList.contains(name) !== value) node.classList.toggle(name, value);
  }
  const video = film && film.querySelector("video");
  if (video) { video.muted = true; video.playsInline = true; video.loop = true; }
  const filmStage = film && film.querySelector(".sp-safety-film__stage");
  const filmWindow = film && film.querySelector(".sp-safety-film__window");
  const playButton = film && film.querySelector("[data-sp-film-toggle]");
  let loaded = false, userPaused = false, manualPlay = false, autoplayBlocked = false;
  let pendingPlay = false, playRequest = 0, visible = false, unavailable = false;

  function syncVideoLabel() {
    if (!playButton) return;
    const playing = !video.paused && !video.ended;
    const key = playing ? "pauseFilm" : "playFilm";
    const label = playButton.querySelector("[data-sp-film-label]");
    label.setAttribute("data-i18n-text", namespace + key);
    label.textContent = t(key);
    playButton.setAttribute("aria-label", t(key));
    playButton.setAttribute("data-i18n-aria-label", namespace + key);
    playButton.setAttribute("aria-pressed", String(playing));
    playButton.querySelector("[data-sp-icon]").dataset.spIcon = playing ? "pause" : "play";
  }
  function syncLanguage() {
    document.querySelectorAll("[data-sp-safety-text]").forEach(function (node) { node.textContent = t(node.dataset.spSafetyText); });
    if (video) video.setAttribute("aria-label", t("filmAria"));
    syncVideoLabel();
    measure();
  }
  function ensureLoaded() {
    if (!video || loaded) return;
    loaded = true;
    video.src = video.dataset.spVideoSrc;
    video.load();
  }
  function mayPlay() {
    const saveData = navigator.connection && navigator.connection.saveData;
    return visible && !document.hidden && !menuOpen && !userPaused && !unavailable
      && (manualPlay || (!reduced.matches && !saveData && !autoplayBlocked));
  }
  function pauseVideo() {
    if (!video) return;
    playRequest++;
    pendingPlay = false;
    if (!video.paused) video.pause();
    syncVideoLabel();
  }
  function attemptPlay() {
    if (!video || pendingPlay || !video.paused || !mayPlay()) return;
    ensureLoaded();
    pendingPlay = true;
    const request = ++playRequest;
    let playback;
    try { playback = video.play(); }
    catch (error) { pendingPlay = false; autoplayBlocked = true; syncVideoLabel(); return; }
    Promise.resolve(playback).then(function () {
      if (request !== playRequest) return;
      pendingPlay = false;
      if (!mayPlay()) pauseVideo();
      syncVideoLabel();
    }).catch(function () {
      if (request !== playRequest) return;
      pendingPlay = false;
      autoplayBlocked = true;
      syncVideoLabel();
    });
  }
  function measure() {
    // A fixed body can change document coordinates while the public dialog is open.
    if (menuOpen) return;
    if (film) {
      const previousStart = metrics.filmStart, previousTravel = metrics.travel;
      setClass(film, "is-safety-static", reduced.matches || window.innerHeight < 480);
      metrics.filmStart = film.getBoundingClientRect().top + window.scrollY;
      metrics.filmHeight = Math.max(1, film.offsetHeight);
      metrics.stageHeight = Math.max(1, filmStage.offsetHeight || window.innerHeight);
      metrics.travel = Math.max(1, metrics.filmHeight - metrics.stageHeight);
      if (previousStart !== metrics.filmStart || previousTravel !== metrics.travel) synchronizeMotion = true;
    }
    requestRender();
  }
  function render(timestamp) {
    frame = 0;
    if (menuOpen || document.hidden || pageSuspended) { lastRenderTime = null; return; }
    const now = typeof timestamp === "number" ? timestamp : performance.now();
    const elapsed = lastRenderTime === null ? 1000 / 60 : Math.min(64, Math.max(1, now - lastRenderTime));
    const synchronize = synchronizeMotion;
    let following = false;
    const y = window.scrollY || 0;
    if (film) {
      const target = clamp((y - metrics.filmStart) / metrics.travel);
      const inView = y + window.innerHeight > metrics.filmStart && y < metrics.filmStart + metrics.filmHeight;
      const isStatic = film.classList.contains("is-safety-static");
      const immediate = synchronize || isStatic || !inView || filmProgress === null || Math.abs(target - filmProgress) * metrics.travel > window.innerHeight;
      filmProgress = immediate ? target : filmProgress + (target - filmProgress) * (1 - Math.exp(-elapsed / 70));
      if (Math.abs(target - filmProgress) < .00001) filmProgress = target;
      following = following || filmProgress !== target;
      const progress = filmProgress, scaleX = .7 + progress * .3, scaleY = .57 + progress * .43;
      setClass(film, "is-safety-in-view", inView && !isStatic);
      // Keep video layout fixed. Grow its frame with composited transforms instead of width/height.
      setStyle(filmWindow, "--sp-film-scale-x", scaleX.toFixed(5));
      setStyle(filmWindow, "--sp-film-scale-y", scaleY.toFixed(5));
      setStyle(filmWindow, "--sp-film-inverse-x", (1 / scaleX).toFixed(5));
      setStyle(filmWindow, "--sp-film-inverse-y", (1 / scaleY).toFixed(5));
      setStyle(filmWindow, "--sp-film-zoom", (1 + progress * .05).toFixed(5));
      setStyle(filmWindow, "--sp-film-radius-x", (22 * (1 - progress) / scaleX).toFixed(3) + "px");
      setStyle(filmWindow, "--sp-film-radius-y", (22 * (1 - progress) / scaleY).toFixed(3) + "px");
      setStyle(film, "--sp-film-title-opacity", (1 - clamp(progress * 3)).toFixed(3));
      setStyle(film, "--sp-film-progress-width", (progress * 100).toFixed(3) + "%");
      setStyle(filmWindow, "--sp-film-control-inset", (20 + progress * 108).toFixed(3) + "px");
      visible = y + window.innerHeight > metrics.filmStart + Math.min(metrics.filmHeight, window.innerHeight) * .18
        && y < metrics.filmStart + metrics.filmHeight - Math.min(metrics.filmHeight, window.innerHeight) * .12;
      const saveData = navigator.connection && navigator.connection.saveData;
      if (!loaded && !reduced.matches && !saveData && y + window.innerHeight * 1.15 > metrics.filmStart && y < metrics.filmStart + metrics.filmHeight) ensureLoaded();
      if (mayPlay()) attemptPlay();
      else if (!video.paused || pendingPlay) pauseVideo();
    }
    synchronizeMotion = false;
    lastRenderTime = following ? now : null;
    if (following) requestRender();
  }
  // The helmet is no longer a scroll story: its anchors (#features, #controls) scroll to the Guardian section.
  function goToAnchor(hash, options) {
    options = options || {};
    const name = (hash || "").replace(/^#/, "");
    if (!helmet || !name || !(helmet.id === name || Array.from(helmet.querySelectorAll("[id]")).some(function (node) { return node.id === name; }))) return false;
    helmet.scrollIntoView({ behavior: options.behavior || (reduced.matches ? "auto" : "smooth"), block: "start" });
    if (options.focus) {
      const heading = helmet.querySelector("h2");
      heading.setAttribute("tabindex", "-1");
      heading.addEventListener("blur", function () { heading.removeAttribute("tabindex"); }, { once: true });
      heading.focus({ preventScroll: true });
    }
    return true;
  }
  function goToChapter(index, options) { return goToAnchor(helmet ? "#" + helmet.id : "", options); }
  function requestRender() {
    if (!frame && !menuOpen && !document.hidden && !pageSuspended) {
      if (lastRenderTime === null) lastRenderTime = performance.now();
      frame = window.requestAnimationFrame(render);
    }
  }
  function stopMotion() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    lastRenderTime = null;
    synchronizeMotion = true;
    if (film) setClass(film, "is-safety-in-view", false);
  }
  document.addEventListener("click", function (event) {
    const link = event.target.closest && event.target.closest("a[href]");
    if (!link || link.closest("#shared-navbar") || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target === "_blank" || link.hasAttribute("download")) return;
    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin || destination.pathname !== window.location.pathname || !goToAnchor(destination.hash, { focus: true })) return;
    event.preventDefault(); event.stopPropagation();
    window.history.pushState(null, "", destination.hash);
  }, true);
  if (playButton) {
    playButton.addEventListener("click", function () {
      if (!video.paused || pendingPlay) { userPaused = true; pauseVideo(); }
      else {
        if (unavailable) loaded = false;
        userPaused = false;
        manualPlay = true;
        autoplayBlocked = false;
        unavailable = false;
        film.classList.remove("is-film-unavailable");
        measure();
        if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
        render();
        attemptPlay();
      }
    });
    video.addEventListener("play", syncVideoLabel);
    video.addEventListener("pause", syncVideoLabel);
    video.addEventListener("ended", syncVideoLabel);
    video.addEventListener("error", function () {
      unavailable = true;
      pendingPlay = false;
      film.classList.add("is-film-unavailable");
      pauseVideo();
    });
  }
  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  document.addEventListener("safepermit:languagechange", syncLanguage);
  document.addEventListener("safepermit:i18nready", syncLanguage);
  document.addEventListener("safepermit:navigationchange", function (event) {
    menuOpen = event.detail.open;
    if (menuOpen) { stopMotion(); pauseVideo(); }
    else measure();
  });
  document.addEventListener("visibilitychange", function () { if (document.hidden) { stopMotion(); pauseVideo(); } else requestRender(); });
  reduced.addEventListener("change", function () { manualPlay = false; pauseVideo(); measure(); });
  window.addEventListener("pagehide", pauseVideo);
  window.addEventListener("pagehide", function (event) {
    pageSuspended = true;
    stopMotion();
  });
  window.addEventListener("pageshow", function () { pageSuspended = false; measure(); });
  if (navigator.connection && navigator.connection.addEventListener) navigator.connection.addEventListener("change", requestRender);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if (film && window.ResizeObserver) {
    // Measure in the next frame: changing layout inside the callback can trigger a "ResizeObserver loop" warning.
    // The Guardian above the film changes height with language and viewport, which moves the film.
    let resizeFrame = 0;
    const observer = new ResizeObserver(function () {
      if (resizeFrame) return;
      resizeFrame = window.requestAnimationFrame(function () { resizeFrame = 0; measure(); });
    });
    observer.observe(document.querySelector("main") || film);
    window.addEventListener("pagehide", function (event) { if (!event.persisted) observer.disconnect(); });
  }
  window.SafePermitSafetySections = { translations: copy, refresh: measure, goToAnchor: goToAnchor, goToChapter: goToChapter };
  syncLanguage();
  window.addEventListener("hashchange", function () { goToAnchor(window.location.hash, { behavior: "auto" }); });
  if (window.location.hash) goToAnchor(window.location.hash, { behavior: "auto" });
})();
