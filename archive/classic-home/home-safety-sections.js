/* Scroll presentation and film controls. No permit, approval or account data is changed. */
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
      helmetAlt: "An orange industrial safety helmet", modulesLabel: "Explore permit safety checkpoints", detailLink: "Explore safety review",
      storyOverview: "Protection", storyWorkflow: "Workflow", storyFeatures: "Controls", storyAI: "AI support", storyRoles: "Roles", storyScroll: "SCROLL TO EXPLORE", storyNavigation: "Explore SafePermit",
      mPpe: "Protective equipment", mHazards: "Hazards", mIsolation: "Isolation", mReview: "Safety review", mAuthorization: "Authorization", mTraceability: "Traceability",
      ppeTitle: "Protection belongs in the plan.", ppeBody: "Keep the required protective equipment alongside the work scope and the safety checklist, ready for review.",
      hazardsTitle: "Make the hazards visible.", hazardsBody: "Bring task hazards, initial risk and control measures together so reviewers can see the full context.",
      isolationTitle: "Keep controls connected.", isolationBody: "Record the isolation and control requirements with the permit so they stay part of the review.",
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
      helmetAlt: "خوذة سلامة صناعية برتقالية", modulesLabel: "استكشف نقاط مراجعة السلامة في التصريح", detailLink: "استكشف مراجعة السلامة",
      storyOverview: "الحماية", storyWorkflow: "رحلة التصريح", storyFeatures: "الضوابط", storyAI: "دعم الذكاء الاصطناعي", storyRoles: "الأدوار", storyScroll: "مرّر لاستكشاف المنصة", storyNavigation: "استكشف SafePermit",
      mPpe: "معدات الوقاية", mHazards: "المخاطر", mIsolation: "العزل", mReview: "مراجعة السلامة", mAuthorization: "الاعتماد", mTraceability: "سجل القرارات",
      ppeTitle: "الحماية جزء من الخطة.", ppeBody: "اجمع معدات الوقاية المطلوبة مع نطاق العمل وقائمة فحص السلامة، لتكون جاهزة للمراجعة.",
      hazardsTitle: "اجعل المخاطر واضحة.", hazardsBody: "اجمع مخاطر المهمة ومستوى الخطر الأولي والضوابط، ليشاهد المراجع الصورة كاملة.",
      isolationTitle: "أبقِ الضوابط مترابطة.", isolationBody: "سجّل متطلبات العزل والضوابط ضمن التصريح حتى تبقى جزءًا من المراجعة.",
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
  const modules = ["ppe", "hazards", "isolation", "review", "authorization", "traceability"];
  const moduleButtons = helmet ? Array.from(helmet.querySelectorAll("[data-sp-safety-module]")) : [];
  let selected = 0, frame = 0, menuOpen = false;
  let metrics = { helmetStart: 0, helmetHeight: 1, helmetTravel: 1, filmStart: 0, filmHeight: 1, stageHeight: 1, travel: 1, chapterStarts: [] };
  let helmetProgress = null, filmProgress = null, lastRenderTime = null, synchronizeMotion = true, pageSuspended = false;
  let normalHelmetFlow = false;
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
  const helmetStage = helmet && helmet.querySelector(".sp-safety-helmet__stage");
  const helmetProduct = helmet && helmet.querySelector(".sp-safety-helmet__product");
  let helmetScene = null, helmetSceneAttempted = false;
  const chapters = helmet ? Array.from(helmet.querySelectorAll("[data-sp-helmet-chapter]")) : [];
  const chapterButtons = helmet ? Array.from(helmet.querySelectorAll("[data-sp-story-chapter]")) : [];
  const chapterStates = chapters.map(function () { return { active: null, visible: null }; });
  let activeChapter = -1, lastScrollModule = -1, pendingFocus = null;
  const rows = chapters.map(function (chapter) {
    const list = Array.from(chapter.querySelectorAll(".sp-safety-helmet__intro > p, .sp-safety-module, .sp-safety-helmet__detail"));
    list.forEach(function (row) { row.setAttribute("data-sp-story-reveal", ""); });
    return list;
  });
  const rowStarts = rows.map(function (list) {
    return list.map(function (row, index) {
      if (row.matches(".sp-safety-module")) return .04 + moduleButtons.indexOf(row) * .055;
      if (row.matches(".sp-safety-helmet__detail")) return .03;
      return 0;
    });
  });
  const video = film && film.querySelector("video");
  if (video) { video.muted = true; video.playsInline = true; video.loop = true; }
  const filmStage = film && film.querySelector(".sp-safety-film__stage");
  const filmWindow = film && film.querySelector(".sp-safety-film__window");
  const playButton = film && film.querySelector("[data-sp-film-toggle]");
  let loaded = false, userPaused = false, manualPlay = false, autoplayBlocked = false;
  let pendingPlay = false, playRequest = 0, visible = false, unavailable = false;

  function renderDetail(animate) {
    if (!helmet) return;
    moduleButtons.forEach(function (button, index) {
      button.setAttribute("aria-selected", String(index === selected));
      button.tabIndex = index === selected ? 0 : -1;
    });
    const name = modules[selected];
    helmet.dataset.spSafetyCheckpoint = name;
    helmet.querySelector("[data-sp-safety-number]").textContent = String(selected + 1).padStart(2, "0");
    ["Title", "Body"].forEach(function (suffix) {
      const node = helmet.querySelector('[data-sp-safety-detail="' + suffix.toLowerCase() + '"]');
      node.setAttribute("data-i18n-text", namespace + name + suffix);
      node.textContent = t(name + suffix);
    });
    helmet.querySelector("[role='tabpanel']").setAttribute("aria-labelledby", moduleButtons[selected].id);
    helmet.style.setProperty("--sp-helmet-ring", selected * 60 + "deg");
    setStyle(helmet.querySelector("[data-sp-safety-detail='title']").parentElement, "--sp-detail-motion", animate && !reduced.matches ? "sp-detail-enter-" + (selected % 2 ? "a" : "b") : "none");
  }
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
    if (helmet) {
      helmet.querySelector("img").alt = t("helmetAlt");
      helmet.querySelector("[role='tablist']").setAttribute("aria-label", t("modulesLabel"));
      if (chapterButtons.length) helmet.querySelector(".sp-helmet-story__nav").setAttribute("aria-label", t("storyNavigation"));
      renderDetail();
    }
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
    if (helmet) {
      const previousStart = metrics.helmetStart, previousTravel = metrics.helmetTravel, previousFlow = normalHelmetFlow;
      setClass(helmet, "is-safety-static", reduced.matches);
      setClass(helmet, "is-safety-compact", !reduced.matches && (window.innerHeight < 780 || window.innerWidth < 1100));
      const space = helmet.querySelector(".sp-helmet-story__chapters");
      if (!reduced.matches && !helmet.classList.contains("is-safety-compact") && space && space.clientHeight > 0 && chapters.some(function (chapter) { return chapter.scrollHeight > space.clientHeight + 3; })) helmet.classList.add("is-safety-compact");
      metrics.helmetStart = helmet.getBoundingClientRect().top + window.scrollY;
      metrics.helmetHeight = Math.max(1, helmet.offsetHeight);
      metrics.helmetTravel = Math.max(1, metrics.helmetHeight - (helmetStage.offsetHeight || window.innerHeight));
      if (helmetScene && helmetScene.resize) helmetScene.resize();
      normalHelmetFlow = reduced.matches || helmet.classList.contains("is-safety-compact");
      // Read document coordinates together, never between animation style writes.
      metrics.chapterStarts = normalHelmetFlow ? chapters.map(function (chapter) { return chapter.getBoundingClientRect().top + window.scrollY; }) : [];
      if (previousStart !== metrics.helmetStart || previousTravel !== metrics.helmetTravel || previousFlow !== normalHelmetFlow) synchronizeMotion = true;
    }
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
    if (helmet) {
      const isStatic = helmet.classList.contains("is-safety-static");
      const compact = helmet.classList.contains("is-safety-compact");
      const target = isStatic ? 0 : compact
        ? clamp((y + window.innerHeight - metrics.helmetStart) / (metrics.helmetHeight + window.innerHeight))
        : clamp((y - metrics.helmetStart) / metrics.helmetTravel);
      const inView = y + window.innerHeight > metrics.helmetStart && y < metrics.helmetStart + metrics.helmetHeight;
      setClass(helmet, "is-safety-in-view", inView && !isStatic);
      // A short, time-based follow works equally at 60/120 Hz, without intercepting scroll.
      // Jumps, layout changes and offscreen content catch up immediately.
      const progressDistance = compact ? metrics.helmetHeight + window.innerHeight : metrics.helmetTravel;
      const immediate = synchronize || isStatic || !inView || helmetProgress === null
        || Math.abs(target - helmetProgress) * progressDistance > window.innerHeight;
      helmetProgress = immediate ? target : helmetProgress + (target - helmetProgress) * (1 - Math.exp(-elapsed / 70));
      if (Math.abs(target - helmetProgress) < .00001) helmetProgress = target;
      following = helmetProgress !== target;
      const progress = helmetProgress;
      setStyle(helmet, "--sp-helmet-progress", progress.toFixed(5));
      if (!helmetProduct.classList.contains("is-helmet-3d")) {
        setStyle(helmet, "--sp-helmet-turn", ((progress - .5) * 22).toFixed(2) + "deg");
        setStyle(helmet, "--sp-helmet-tilt", ((progress - .5) * 8).toFixed(2) + "deg");
        setStyle(helmet, "--sp-helmet-y", (Math.sin(progress * Math.PI) * -18).toFixed(2) + "px");
      }
      renderChapters(progress, normalHelmetFlow, y);
      const checkpoint = Math.min(5, Math.floor(progress * 6));
      if (!normalHelmetFlow && checkpoint !== lastScrollModule) {
        lastScrollModule = checkpoint;
        // Keep manual/keyboard selection while focus is inside the protection controls.
        if (selected !== checkpoint && !helmet.contains(document.activeElement)) { selected = checkpoint; renderDetail(true); }
      }
      const engine = window.SafePermitHelmetScene;
      const available = engine && (!engine.needsThree || (window.SafePermitTHREE && window.SafePermitHelmetModel));
      const nearView = y + window.innerHeight * 1.25 > metrics.helmetStart && y < metrics.helmetStart + metrics.helmetHeight;
      if (nearView && !isStatic && available) {
        if (!helmetScene && !helmetSceneAttempted) {
          helmetSceneAttempted = true;
          helmetScene = engine.create(helmetProduct);
        }
        if (inView && helmetScene) helmetScene.setProgress(progress, root.dir === "rtl", immediate);
      }
    }
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
  function renderChapters(progress, normalFlow, scrollPosition) {
    if (!chapters.length) return;
    const previousFocus = document.activeElement;
    const position = Math.min(chapters.length - .00001, progress * chapters.length);
    let index = Math.floor(position), local = position - index;
    if (normalFlow) {
      index = 0;
      metrics.chapterStarts.forEach(function (start, i) { if (start <= scrollPosition + window.innerHeight * .45) index = i; });
      local = 1;
    }
    const transition = normalFlow || index === chapters.length - 1 ? 0 : clamp((local - .82) / .18);
    chapters.forEach(function (chapter, i) {
      const active = normalFlow || i === index;
      const visible = normalFlow || i === index || (i === index + 1 && transition > 0);
      const state = chapterStates[i];
      if (state.active !== active) {
        state.active = active;
        chapter.classList.toggle("is-story-active", active);
        chapter.inert = !active;
        if (active) { chapter.removeAttribute("inert"); chapter.removeAttribute("aria-hidden"); }
        else { chapter.setAttribute("inert", ""); chapter.setAttribute("aria-hidden", "true"); }
      }
      if (state.visible !== visible) {
        state.visible = visible;
        chapter.classList.toggle("is-story-visible", visible);
      }
      if (!visible) return;
      const opacity = normalFlow ? 1 : i === index ? 1 - transition : i === index + 1 ? transition : 0;
      const offset = normalFlow ? 0 : i === index ? -transition * 36 : 36 * (1 - transition);
      setStyle(chapter, "--sp-chapter-opacity", opacity.toFixed(4));
      setStyle(chapter, "--sp-chapter-y", offset.toFixed(2) + "px");
      rows[i].forEach(function (row, j) {
        // Reveal protection copy and checkpoint rows from one reversible scroll position.
        const reveal = normalFlow ? 1 : clamp((position - i - rowStarts[i][j]) / .15);
        setStyle(row, "--sp-story-row-opacity", reveal.toFixed(4));
        setStyle(row, "--sp-story-row-y", ((1 - reveal) * 20).toFixed(2) + "px");
      });
    });
    if (activeChapter !== index) {
      if (!normalFlow && activeChapter >= 0 && chapters[activeChapter].contains(previousFocus) && chapterButtons[index]) chapterButtons[index].focus({ preventScroll: true });
      activeChapter = index;
      helmet.dataset.spActiveChapter = chapters[index].dataset.spHelmetChapter;
      chapterButtons.forEach(function (button, i) { button.setAttribute("aria-current", i === index ? "step" : "false"); });
    }
    setStyle(helmet, "--sp-helmet-story-progress", (progress * 100).toFixed(3) + "%");
    if (pendingFocus && (normalFlow || index === pendingFocus.index)) {
      const target = chapters[pendingFocus.index];
      pendingFocus = null;
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
        target.addEventListener("blur", function () { target.removeAttribute("tabindex"); }, { once: true });
      }
      target.focus({ preventScroll: true });
    }
  }
  function goToChapter(index, options) {
    options = options || {};
    index = Math.max(0, Math.min(chapters.length - 1, index));
    if (!chapters[index]) return false;
    const normalFlow = helmet.classList.contains("is-safety-static") || helmet.classList.contains("is-safety-compact");
    if (options.focus) pendingFocus = { index: index };
    if (options.behavior === "auto") synchronizeMotion = true;
    if (normalFlow) {
      chapters[index].scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" });
    } else {
      window.scrollTo({ top: metrics.helmetStart + metrics.helmetTravel * (index + .5) / chapters.length, behavior: options.behavior || "smooth" });
    }
    requestRender();
    return true;
  }
  function goToAnchor(hash, options) {
    const name = (hash || "").replace(/^#/, "");
    const index = chapters.findIndex(function (chapter) { return chapter.dataset.spHelmetChapter === name || chapter.id === name || Array.from(chapter.querySelectorAll("[id]")).some(function (node) { return node.id === name; }); });
    return index < 0 ? false : goToChapter(index, options);
  }
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
    if (helmet) setClass(helmet, "is-safety-in-view", false);
    if (film) setClass(film, "is-safety-in-view", false);
  }
  chapterButtons.forEach(function (button, index) {
    button.addEventListener("click", function () { goToChapter(index); });
  });
  document.addEventListener("click", function (event) {
    const link = event.target.closest && event.target.closest("a[href]");
    if (!link || link.closest("#shared-navbar") || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target === "_blank" || link.hasAttribute("download")) return;
    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin || destination.pathname !== window.location.pathname || !goToAnchor(destination.hash, { focus: true })) return;
    event.preventDefault(); event.stopPropagation();
    window.history.pushState(null, "", destination.hash);
  }, true);
  moduleButtons.forEach(function (button, index) {
      button.addEventListener("click", function () { selected = index; renderDetail(true); });
    button.addEventListener("keydown", function (event) {
      const rtl = root.dir === "rtl";
      let next = index;
      if (event.key === "ArrowRight") next = (index + (rtl ? 5 : 1)) % 6;
      else if (event.key === "ArrowLeft") next = (index + (rtl ? 1 : 5)) % 6;
      else if (event.key === "ArrowDown") next = (index + 1) % 6;
      else if (event.key === "ArrowUp") next = (index + 5) % 6;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = 5;
      else return;
      event.preventDefault();
      selected = next;
      renderDetail(true);
      moduleButtons[next].focus({ preventScroll: true });
    });
  });
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
    if (!event.persisted && helmetScene) { helmetScene.dispose(); helmetScene = null; }
  });
  window.addEventListener("pageshow", function () { pageSuspended = false; measure(); });
  if (navigator.connection && navigator.connection.addEventListener) navigator.connection.addEventListener("change", requestRender);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if (helmet) helmet.querySelector("img").addEventListener("load", measure, { once: true });
  if (helmet && window.ResizeObserver) {
    const observer = new ResizeObserver(measure);
    observer.observe(helmetStage);
    observer.observe(helmetProduct);
    window.addEventListener("pagehide", function (event) { if (!event.persisted) observer.disconnect(); });
  }
  window.SafePermitSafetySections = { translations: copy, refresh: measure, goToAnchor: goToAnchor, goToChapter: goToChapter };
  syncLanguage();
  window.addEventListener("hashchange", function () { goToAnchor(window.location.hash, { behavior: "auto" }); });
  if (window.location.hash) goToAnchor(window.location.hash, { behavior: "auto" });
})();
