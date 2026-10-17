/* Presentation only: no permit, account or review data is written here. */
(function () {
  "use strict";
  const page = document.querySelector(".sc-page");
  if (!page) return;
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");
  const hoverPointer = window.matchMedia("(hover: hover)");
  const $ = (selector) => page.querySelector(selector);
  const $$ = (selector) => Array.from(page.querySelectorAll(selector));
  const clamp = (number, min = 0, max = 1) => Math.min(max, Math.max(min, number));
  const text = {
    en: {
      skip: "Skip to content", brandCaption: "WORK. UNDER CONTROL.", navigation: "Main navigation",
      navWorkflow: "Workflow", navControls: "Safety controls", navWorkspaces: "Workspaces", navAbout: "About",
      signIn: "Sign in", heroEyebrow: "INDUSTRIAL SAFETY. DIGITAL CONTROL.", heroTitle1: "SAFER WORK.", heroTitle2: "STARTS HERE.",
      heroDescription: "From the first risk check to the final approval. Bring every permit, every review and every responsibility into one clear workflow.",
      enterPlatform: "Enter SafePermit", followPermit: "Follow a permit", safetyPrinciple: "Safety principle",
      heroNote: "SAFETY STARTS\nBEFORE THE WORK.", reviewRoles: "REVIEW ROLES", controlledWorkflow: "CONTROLLED WORKFLOW",
      permitToWork: "PERMIT TO WORK", scrollDiscover: "SCROLL TO DISCOVER",
      purposeLabel: "THE PURPOSE", purposeAside: "PEOPLE FIRST. ALWAYS.", purposeTitle1: "EVERY TASK.", purposeTitle2: "EVERY RISK.", purposeTitle3: "UNDER CONTROL.",
      purposeLead: "Good work begins with a clear decision to proceed.",
      purposeBody: "SafePermit connects the people doing the work with the people responsible for reviewing it. Scope, hazards, safety checks and approvals stay together, so each role can make an informed decision.",
      aboutPlatform: "Meet SafePermit", workflowLabel: "THE PERMIT JOURNEY", workflowAside: "SCROLL TO FOLLOW THE REVIEW", workflowAsideStatic: "CHOOSE A REVIEW STAGE",
      workflowTitle1: "ONE PERMIT.", workflowTitle2: "FOUR EXPERT", workflowTitle3: "DECISIONS.",
      reviewStages: "Permit review stages", worker: "Worker", supervisor: "Supervisor", safety: "Safety", safetyOfficer: "Safety officer", admin: "Admin",
      exploreTracking: "Explore approval tracking", illustrativePermit: "Illustrative permit workflow",
      permitExample: "WORKFLOW EXAMPLE", workPermit: "WORK PERMIT", workType: "WORK TYPE", workTypeValue: "Equipment maintenance",
      workArea: "WORK AREA", workAreaValue: "Manufacturing hall", riskLevel: "RISK LEVEL", medium: "Medium", currentReview: "CURRENT REVIEW",
      reviewRecord: "REVIEW RECORD", checkScope: "Scope & team", checkScopeSub: "Worker submission",
      checkOperations: "Operational readiness", checkOperationsSub: "Supervisor review", checkSafety: "Hazards & safety controls",
      checkSafetySub: "Safety officer review", checkApproval: "Final decision", checkApprovalSub: "Admin approval",
      reviewProgress: "REVIEW PROGRESS", approved: "APPROVED", clearToProceed: "REVIEW COMPLETE",
      permitCaption: "An illustrative journey through the four review roles.",
      controlsLabel: "BUILT INTO THE WORKFLOW", controlsAside: "CLARITY AT EVERY STEP",
      controlsTitle1: "READY", controlsTitle2: "MEANS", controlsTitle3: "VERIFIED.",
      controlsIntro: "Give each decision the context it needs. Keep the work, the risk and the review connected.",
      riskTitle: "Know the hazards.", riskBody: "Capture the hazards, assess the risk and define the controls before the work moves forward.", riskLink: "Risk assessment",
      safetyTitle: "Check the readiness.", safetyBody: "Bring PPE, checklist completion and safety controls into the review, with a dedicated safety officer decision.", safetyLink: "Safety review",
      trackingTitle: "Follow every decision.", trackingBody: "See where a permit stands, who reviews it next and how it progresses through the approval path.", trackingLink: "Approval tracking",
      aiLabel: "AI DECISION SUPPORT", aiAside: "PEOPLE DECIDE", aiTitle1: "AI HELPS", aiTitle2: "THE", aiTitle3: "REVIEWER.",
      aiIntro: "The AI assistant can suggest hazards, control measures, PPE, and missing information. Every approval or rejection remains a human decision.",
      aiHazardTitle: "Suggested hazards and controls.", aiHazardBody: "For electrical maintenance: unexpected energization. Add LOTO and verify zero voltage before work begins.",
      aiPpeTitle: "Suggested PPE.", aiPpeBody: "Arc-rated protection: electrical gloves, face shield, and safety footwear.",
      aiHumanTitle: "It never replaces the reviewer.", aiHumanBody: "Suggestions require user review before they are added to the permit.",
      recordLabel: "ONE PERMIT RECORD", recordAside: "CLEAR TERMINOLOGY", recordTitle1: "RISK LEVEL", recordTitle2: "IS NOT", recordTitle3: "PERMIT STATUS.",
      recordIntro: "SafePermit keeps safety risk separate from workflow progress, making dashboards and decisions easier to understand.",
      trailTitle: "Approval trail.", trailBody: "Track decisions, comments, reviewers, and timestamps for every permit.",
      checklistTitle: "Safety checklist.", checklistBody: "Verify required safety items and prevent missing mandatory checks.",
      qrTitle: "QR permit reference.", qrBody: "A permit QR opens its demo verification page. It does not authorize work or prove permit validity; live status must come from an authenticated backend.",
      workspacesLabel: "CLEAR RESPONSIBILITY", workspacesAside: "A WORKSPACE FOR EVERY ROLE", workspacesTitle1: "YOUR ROLE.", workspacesTitle2: "YOUR WORKSPACE.",
      workspacesIntro: "The right tools and the right review, for the people responsible at each stage.",
      workerWorkspace: "Create permits, complete safety checks and track your submissions.",
      supervisorWorkspace: "Review the work scope, the team and the operational readiness.",
      safetyWorkspace: "Assess hazards, verify controls and review the residual risk.",
      adminWorkspace: "Review the approval trail and make the final permit decision.",
      openWorkspace: "Open workspace", finalEyebrow: "THE NEXT STEP IS YOURS.", finalTitle1: "LET'S GET", finalTitle2: "TO SAFER WORK.",
      footerTagline: "Work permits. Shared responsibility.", footerNavigation: "Footer navigation", resources: "Resources", contact: "Contact", backTop: "Back to top ↑",
      pageTitle: "SafePermit — Safer work starts here", languageButton: "عربي", switchLanguage: "Switch to Arabic",
      switchLight: "Switch to light theme", switchDark: "Switch to dark theme", openMenu: "Open navigation", closeMenu: "Close navigation",
      draft: "DRAFT", supervisorStatus: "SUPERVISOR REVIEW", safetyStatus: "SAFETY REVIEW", pending: "PENDING", inProgress: "IN PROGRESS", complete: "COMPLETE",
      workerTitle: "Define the work.", workerBody: "Describe the job, identify the hazards and complete the required checklist before submitting the permit.",
      supervisorTitle: "Review the operation.", supervisorBody: "Check the scope, the team, the location and the timing, so the work is operationally ready.",
      safetyRoleTitle: "Verify the controls.", safetyRoleBody: "Review hazards, protective equipment, safety checks and the remaining risk before clearing the permit.",
      adminTitle: "Make the final decision.", adminBody: "Review the approval trail and make the final permit decision after the preceding reviews."
    },
    ar: {
      skip: "انتقل إلى المحتوى", brandCaption: "العمل… تحت السيطرة.", navigation: "التنقل الرئيسي",
      navWorkflow: "رحلة التصريح", navControls: "ضوابط السلامة", navWorkspaces: "مساحات العمل", navAbout: "عن المنصة",
      signIn: "تسجيل الدخول", heroEyebrow: "سلامة صناعية. تحكّم رقمي.", heroTitle1: "عمل أكثر أمانًا.", heroTitle2: "يبدأ من هنا.",
      heroDescription: "من أول تقييم للمخاطر إلى الاعتماد النهائي. كل تصريح، وكل مراجعة، وكل مسؤولية ضمن مسار عمل واحد وواضح.",
      enterPlatform: "ادخل إلى SafePermit", followPermit: "تابع رحلة التصريح", safetyPrinciple: "مبدأ السلامة",
      heroNote: "السلامة تبدأ\nقبل بدء العمل.", reviewRoles: "أدوار للمراجعة", controlledWorkflow: "مسار عمل موحّد",
      permitToWork: "تصاريح العمل", scrollDiscover: "مرّر لاستكشاف المنصة",
      purposeLabel: "الغاية", purposeAside: "سلامة الأشخاص أولًا.", purposeTitle1: "كل مهمة.", purposeTitle2: "كل خطر.", purposeTitle3: "تحت السيطرة.",
      purposeLead: "العمل الجيد يبدأ بقرار واضح يسمح بالمضيّ قدمًا.",
      purposeBody: "تربط SafePermit الأشخاص الذين ينفّذون العمل بالمسؤولين عن مراجعته. يجتمع نطاق العمل والمخاطر وفحوص السلامة والاعتمادات، ليتمكّن كل دور من اتخاذ قرار مبني على المعلومات.",
      aboutPlatform: "تعرّف على SafePermit", workflowLabel: "رحلة التصريح", workflowAside: "مرّر لمتابعة المراجعات", workflowAsideStatic: "اختر مرحلة المراجعة",
      workflowTitle1: "تصريح واحد.", workflowTitle2: "أربع مراجعات.", workflowTitle3: "قرار مسؤول.",
      reviewStages: "مراحل مراجعة التصريح", worker: "العامل", supervisor: "المشرف", safety: "السلامة", safetyOfficer: "مسؤول السلامة", admin: "الإدارة",
      exploreTracking: "استكشف تتبّع الاعتمادات", illustrativePermit: "مثال توضيحي لمسار التصريح",
      permitExample: "مثال توضيحي", workPermit: "تصريح عمل", workType: "نوع العمل", workTypeValue: "صيانة المعدات",
      workArea: "منطقة العمل", workAreaValue: "قاعة التصنيع", riskLevel: "مستوى الخطر", medium: "متوسط", currentReview: "المراجعة الحالية",
      reviewRecord: "سجل المراجعات", checkScope: "نطاق العمل والفريق", checkScopeSub: "تقديم العامل",
      checkOperations: "الجاهزية التشغيلية", checkOperationsSub: "مراجعة المشرف", checkSafety: "المخاطر وضوابط السلامة",
      checkSafetySub: "مراجعة مسؤول السلامة", checkApproval: "القرار النهائي", checkApprovalSub: "اعتماد الإدارة",
      reviewProgress: "تقدّم المراجعات", approved: "معتمد", clearToProceed: "اكتملت المراجعات",
      permitCaption: "رحلة توضيحية عبر الأدوار الأربعة المسؤولة عن المراجعة.",
      controlsLabel: "جزء من مسار العمل", controlsAside: "وضوح في كل خطوة",
      controlsTitle1: "الجاهزية", controlsTitle2: "تبدأ", controlsTitle3: "بالتحقّق.",
      controlsIntro: "امنح كل قرار المعلومات التي يحتاجها. واربط العمل والمخاطر والمراجعة ضمن مسار واحد.",
      riskTitle: "اعرف المخاطر.", riskBody: "حدّد المخاطر، وقيّم مستواها، وضع ضوابط التعامل معها قبل انتقال العمل إلى المرحلة التالية.", riskLink: "تقييم المخاطر",
      safetyTitle: "تحقّق من الجاهزية.", safetyBody: "راجع معدات الوقاية وقائمة الفحص وضوابط السلامة، وصولًا إلى قرار مسؤول السلامة.", safetyLink: "مراجعة السلامة",
      trackingTitle: "تابع كل قرار.", trackingBody: "اعرف حالة التصريح، ومن يراجعه في المرحلة التالية، وكيف يتقدّم في مسار الاعتماد.", trackingLink: "تتبّع الاعتمادات",
      aiLabel: "دعم القرار بالذكاء الاصطناعي", aiAside: "القرار للبشر", aiTitle1: "الذكاء الاصطناعي", aiTitle2: "يساعد", aiTitle3: "المراجع.",
      aiIntro: "يمكن لمساعد الذكاء الاصطناعي اقتراح المخاطر وإجراءات التحكم ومعدات الوقاية والمعلومات الناقصة، لكن كل قرار موافقة أو رفض يبقى قرارًا بشريًا.",
      aiHazardTitle: "مخاطر وإجراءات تحكم مقترحة.", aiHazardBody: "في الصيانة الكهربائية: تغذية غير متوقعة بالطاقة. أضف إجراءات LOTO وتحقق من انعدام الجهد قبل بدء العمل.",
      aiPpeTitle: "معدات وقاية شخصية مقترحة.", aiPpeBody: "حماية مقاومة للقوس الكهربائي: قفازات كهربائية وواقي وجه وأحذية سلامة.",
      aiHumanTitle: "لا يحل محل المراجع أبدًا.", aiHumanBody: "تتطلب الاقتراحات مراجعة المستخدم قبل إضافتها إلى التصريح.",
      recordLabel: "سجل تصريح واحد", recordAside: "مصطلحات واضحة", recordTitle1: "مستوى المخاطر", recordTitle2: "ليس", recordTitle3: "حالة التصريح.",
      recordIntro: "يفصل SafePermit بين مخاطر السلامة وتقدم سير العمل، مما يجعل لوحات التحكم والقرارات أوضح.",
      trailTitle: "سجل الموافقات.", trailBody: "تتبع القرارات والتعليقات والمراجعين والتوقيتات لكل تصريح.",
      checklistTitle: "قائمة تحقق السلامة.", checklistBody: "تحقق من عناصر السلامة المطلوبة وتأكد من عدم إغفال الفحوصات الإلزامية.",
      qrTitle: "مرجع QR للتصريح.", qrBody: "يفتح رمز QR صفحة التحقق التجريبية للتصريح. لا يمنح تفويضًا بالعمل ولا يثبت صلاحية التصريح؛ يجب أن تأتي الحالة الفعلية من خادم موثّق.",
      workspacesLabel: "مسؤوليات واضحة", workspacesAside: "مساحة عمل لكل دور", workspacesTitle1: "دورك.", workspacesTitle2: "مساحة عملك.",
      workspacesIntro: "الأدوات والمراجعات المناسبة للأشخاص المسؤولين في كل مرحلة.",
      workerWorkspace: "أنشئ التصاريح، وأكمل فحوص السلامة، وتابع طلباتك.",
      supervisorWorkspace: "راجع نطاق العمل والفريق والجاهزية التشغيلية.",
      safetyWorkspace: "قيّم المخاطر، وتحقّق من الضوابط، وراجع الخطر المتبقي.",
      adminWorkspace: "راجع سجل الاعتمادات واتخذ القرار النهائي للتصريح.",
      openWorkspace: "افتح مساحة العمل", finalEyebrow: "الخطوة التالية تبدأ منك.", finalTitle1: "لنبدأ", finalTitle2: "عملًا أكثر أمانًا.",
      footerTagline: "تصاريح العمل. مسؤولية مشتركة.", footerNavigation: "روابط أسفل الصفحة", resources: "المصادر", contact: "تواصل معنا", backTop: "إلى أعلى الصفحة ↑",
      pageTitle: "SafePermit — العمل الأكثر أمانًا يبدأ من هنا", languageButton: "EN", switchLanguage: "التبديل إلى الإنجليزية",
      switchLight: "التبديل إلى الوضع الفاتح", switchDark: "التبديل إلى الوضع الداكن", openMenu: "افتح قائمة التنقل", closeMenu: "أغلق قائمة التنقل",
      draft: "مسودة", supervisorStatus: "مراجعة المشرف", safetyStatus: "مراجعة السلامة", pending: "بانتظار المراجعة", inProgress: "قيد المراجعة", complete: "مكتمل",
      workerTitle: "حدّد العمل.", workerBody: "صِف المهمة، وحدّد المخاطر، وأكمل قائمة الفحص المطلوبة قبل تقديم التصريح.",
      supervisorTitle: "راجع العملية.", supervisorBody: "تحقّق من نطاق العمل والفريق والموقع والتوقيت للتأكد من الجاهزية التشغيلية.",
      safetyRoleTitle: "تحقّق من الضوابط.", safetyRoleBody: "راجع المخاطر ومعدات الوقاية وفحوص السلامة ومستوى الخطر المتبقي قبل إجازة التصريح.",
      adminTitle: "اتخذ القرار النهائي.", adminBody: "راجع سجل الاعتمادات واتخذ القرار النهائي للتصريح بعد اكتمال المراجعات السابقة."
    }
  };
  const hero = $("#hero");
  const heroStage = $(".sc-hero-stage");
  const revealItems = $$(".sc-reveal");
  let language = root.lang === "ar" ? "ar" : "en";
  let raf = 0;
  let publicMenuOpen = false;
  let scrollPosition = null, scrollTime = null, pageSuspended = false;
  const visualStyles = new WeakMap();
  function visualStyle(node, name, value) {
    let cached = visualStyles.get(node);
    if (!cached) { cached = Object.create(null); visualStyles.set(node, cached); }
    if (cached[name] !== value) { cached[name] = value; node.style.setProperty(name, value); }
  }
  let metrics = { heroStart: 0, heroTravel: 1, heroEnd: 1, pageTravel: 1 };
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const t = (key) => text[language][key] || text.en[key] || key;
  const colorReveal = createColorReveal();

  function createColorReveal() {
    const factory = $("#scFactory");
    const engineer = $("#scEngineer");
    const everyday = $("#scEngineerEveryday");
    let canvases, contexts, mask, maskContext, safetyLayer, safetyContext, ordinaryLayer, threeScene;
    let enabled = false, active = false;
    let width = 0, height = 0, brushRadius = 0;
    const revealLifetime = 1000;
    let lastTime = null, lastPoint = null, lastPointer = null;
    let expiresAt = 0, resetTimer = 0;
    let backgroundBox, engineerBox;
    let lastMotion = { bgX: 0, bgY: 0, bgScale: 1.04, personX: 0, personY: 0 };
    const pending = [];

    function clear() {
      active = false;
      lastTime = lastPoint = null;
      expiresAt = 0;
      if (resetTimer) window.clearTimeout(resetTimer);
      resetTimer = 0;
      pending.length = 0;
      if (contexts) contexts.forEach((context) => context.clearRect(-1, -1, width + 2, height + 2));
      if (maskContext) maskContext.clearRect(-1, -1, width + 2, height + 2);
      if (safetyContext) safetyContext.clearRect(-1, -1, width + 2, height + 2);
      // Preserve the ordinary outfit when the trail expires or the tab is hidden.
      if (enabled && engineerBox) {
        drawPerson(lastMotion, false);
        paintThree(performance.now(), lastMotion, false);
      }
    }

    function createCanvases() {
      if (canvases) return true;
      const layers = [document.createElement("canvas"), document.createElement("canvas")];
      const brushMask = document.createElement("canvas");
      const safetyCanvas = document.createElement("canvas");
      const ordinaryCanvas = document.createElement("canvas");
      let layerContexts, brushContext, outfitContext, ordinaryContext;
      try {
        layerContexts = layers.map((canvas) => canvas.getContext("2d"));
        brushContext = brushMask.getContext("2d");
        outfitContext = safetyCanvas.getContext("2d");
        ordinaryContext = ordinaryCanvas.getContext("2d");
      } catch (error) { return false; }
      if (layerContexts.some((context) => !context) || !brushContext || !outfitContext || !ordinaryContext) return false;
      // Browsers without canvas filters keep the full-color safety portrait.
      if (!("filter" in layerContexts[1])) return false;
      layerContexts[1].filter = "grayscale(1)";
      if (layerContexts[1].filter !== "grayscale(1)") return false;
      layerContexts[1].filter = "none";
      ordinaryCanvas.id = "scOrdinaryPortrait";
      ordinaryCanvas.className = "sc-portrait-source";
      safetyCanvas.className = "sc-safety-source";
      prepareOrdinary(ordinaryCanvas, ordinaryContext);
      layers.forEach((canvas, index) => {
        canvas.className = "sc-color-canvas " + (index === 0 ? "sc-color-background" : "sc-color-engineer");
        canvas.setAttribute("aria-hidden", "true");
        heroStage.appendChild(canvas);
      });
      canvases = layers;
      contexts = layerContexts;
      mask = brushMask;
      maskContext = brushContext;
      safetyLayer = safetyCanvas;
      safetyContext = outfitContext;
      ordinaryLayer = ordinaryCanvas;
      if (window.SafePermitThreeScene) {
        threeScene = window.SafePermitThreeScene.create({ stage: heroStage, factory, engineer,
          ordinary: ordinaryCanvas, mask: brushMask, onInvalidate() { clear(); requestRender(); } });
      }
      return true;
    }

    function prepareOrdinary(canvas, context) {
      const w = engineer.naturalWidth, h = engineer.naturalHeight;
      canvas.width = w;
      canvas.height = h;
      // One canonical silhouette: alternate clothes never add another outline.
      context.drawImage(engineer, 0, 0, w, h);
      context.globalCompositeOperation = "source-atop";
      // Keep all head pixels from the original, including helmet and eyewear.
      const neckline = Math.round(h * .3);
      const sourceNeckline = Math.round(everyday.naturalHeight * .3);
      // Cover vest edges outside the alternate shirt before applying its texture.
      context.fillStyle = "#182f47";
      context.fillRect(0, neckline, w, h - neckline);
      context.drawImage(everyday, 0, sourceNeckline, everyday.naturalWidth, everyday.naturalHeight - sourceNeckline,
        0, neckline, w, h - neckline);
      // Preserve the tablet and both hands from the same original photograph.
      // These polygons are in the 1024 × 1536 source coordinate space.
      context.save();
      context.beginPath();
      [
        [[82, 872], [345, 842], [407, 886], [439, 994], [421, 1035], [293, 1046], [260, 1065], [224, 1097], [174, 1090], [140, 1060], [126, 1020], [126, 956], [80, 917]],
        [[336, 967], [397, 941], [422, 912], [447, 918], [467, 950], [520, 973], [564, 1008], [578, 1098], [521, 1110], [474, 1080], [415, 1052], [360, 1025], [328, 996]]
      ].forEach((polygon) => {
        polygon.forEach((point, index) => {
          const x = point[0] / 1024 * w, y = point[1] / 1536 * h;
          if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.closePath();
      });
      context.clip();
      context.globalCompositeOperation = "copy";
      context.drawImage(engineer, 0, 0, w, h);
      context.restore();
      context.globalCompositeOperation = "source-over";
    }

    function resize() {
      enabled = false;
      clear();
      lastPointer = null;
      heroStage.classList.remove("sc-color-ready");
      heroStage.classList.remove("sc-three-ready");
      if (reduced.matches || !finePointer.matches || !hoverPointer.matches
        || [factory, engineer, everyday].some((image) => !image || !image.complete || !image.naturalWidth || !image.naturalHeight)) return;
      // Both costumes share one registration box, including RTL and parallax.
      if (Math.abs(everyday.naturalWidth / everyday.naturalHeight - engineer.naturalWidth / engineer.naturalHeight) > .002) return;
      if (engineer.naturalWidth * engineer.naturalHeight > 2400000) return;
      const stageRect = heroStage.getBoundingClientRect();
      width = stageRect.width;
      height = stageRect.height;
      if (!width || !height || !createCanvases()) return;
      // Keep memory bounded on large screens; the small mask only stores opacity.
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2400000 / (width * height)));
      const maskRatio = Math.min(.35, 640 / width);
      canvases.forEach((canvas, index) => {
        canvas.width = Math.ceil(width * ratio);
        canvas.height = Math.ceil(height * ratio);
        contexts[index].setTransform(ratio, 0, 0, ratio, 0, 0);
      });
      safetyLayer.width = canvases[1].width;
      safetyLayer.height = canvases[1].height;
      safetyContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      mask.width = Math.ceil(width * maskRatio);
      mask.height = Math.ceil(height * maskRatio);
      maskContext.setTransform(maskRatio, 0, 0, maskRatio, 0, 0);
      brushRadius = clamp(width * .075, 78, 155);
      const wrapRect = $(".sc-factory-wrap").getBoundingClientRect();
      const position = window.getComputedStyle(factory).objectPosition.split(" ");
      const fit = Math.max(wrapRect.width / factory.naturalWidth, wrapRect.height / factory.naturalHeight);
      const fittedWidth = factory.naturalWidth * fit;
      const fittedHeight = factory.naturalHeight * fit;
      backgroundBox = {
        x: wrapRect.left - stageRect.left, y: wrapRect.top - stageRect.top,
        width: wrapRect.width, height: wrapRect.height, fittedWidth, fittedHeight,
        offsetX: (wrapRect.width - fittedWidth) * (Number.isFinite(parseFloat(position[0])) ? parseFloat(position[0]) / 100 : .5),
        offsetY: (wrapRect.height - fittedHeight) * (Number.isFinite(parseFloat(position[1])) ? parseFloat(position[1]) / 100 : .5)
      };
      const personRect = engineer.getBoundingClientRect();
      engineerBox = {
        x: personRect.left - stageRect.left - (parseFloat(heroStage.style.getPropertyValue("--sc-person-x")) || 0),
        y: personRect.top - stageRect.top - (parseFloat(heroStage.style.getPropertyValue("--sc-person-y")) || 0),
        width: personRect.width, height: personRect.height,
        opacity: Number(window.getComputedStyle(engineer).opacity) || 1
      };
      canvases[1].style.opacity = String(engineerBox.opacity);
      lastMotion = {
        bgX: parseFloat(heroStage.style.getPropertyValue("--sc-bg-x")) || 0,
        bgY: parseFloat(heroStage.style.getPropertyValue("--sc-bg-y")) || 0,
        bgScale: parseFloat(heroStage.style.getPropertyValue("--sc-bg-scale")) || 1.04,
        personX: parseFloat(heroStage.style.getPropertyValue("--sc-person-x")) || 0,
        personY: parseFloat(heroStage.style.getPropertyValue("--sc-person-y")) || 0
      };
      enabled = true;
      if (threeScene) threeScene.resize(width, height, backgroundBox, engineerBox);
      drawPerson(lastMotion, false);
      paintThree(performance.now(), lastMotion, false);
      heroStage.classList.add("sc-color-ready");
    }

    function addPoint(x, y) {
      if (!enabled) return;
      // Duplicate events and tiny pointer jitter must not keep the outfit revealed.
      if (lastPointer && Math.hypot(x - lastPointer.x, y - lastPointer.y) < 2) return;
      lastPointer = { x, y };
      if (!active) lastTime = null;
      active = true;
      expiresAt = performance.now() + revealLifetime;
      if (resetTimer) window.clearTimeout(resetTimer);
      // Restore the first outfit even when animation frames are slow or paused.
      resetTimer = window.setTimeout(() => { clear(); requestRender(); }, revealLifetime);
      pending.push({ x, y });
      if (pending.length > 32) pending.shift();
    }

    function stamp(x, y) {
      const gradient = maskContext.createRadialGradient(x, y, 0, x, y, brushRadius);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(.7, "rgba(255,255,255,1)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      maskContext.fillStyle = gradient;
      maskContext.fillRect(x - brushRadius, y - brushRadius, brushRadius * 2, brushRadius * 2);
    }

    function paintThree(timestamp, motion, reveal) {
      return threeScene && threeScene.render({ timestamp, motion, reveal, point: lastPointer, expiresAt, lifetime: revealLifetime });
    }

    function drawPerson(motion, reveal) {
      const person = contexts[1];
      const x = engineerBox.x + motion.personX, y = engineerBox.y + motion.personY;
      person.globalCompositeOperation = "source-over";
      person.globalAlpha = 1;
      person.filter = "none";
      person.clearRect(-1, -1, width + 2, height + 2);
      person.filter = "grayscale(1)";
      person.drawImage(ordinaryLayer, x, y, engineerBox.width, engineerBox.height);
      person.filter = "none";
      if (!reveal) return;
      // Replace the ordinary clothing inside the brush; both share one silhouette.
      person.globalCompositeOperation = "destination-out";
      person.drawImage(mask, 0, 0, mask.width, mask.height, 0, 0, width, height);
      safetyContext.globalCompositeOperation = "source-over";
      safetyContext.globalAlpha = 1;
      safetyContext.clearRect(-1, -1, width + 2, height + 2);
      safetyContext.drawImage(engineer, x, y, engineerBox.width, engineerBox.height);
      safetyContext.globalCompositeOperation = "destination-in";
      safetyContext.drawImage(mask, 0, 0, mask.width, mask.height, 0, 0, width, height);
      safetyContext.globalCompositeOperation = "source-over";
      // Add the complementary premultiplied layers for an even crossfade.
      person.globalCompositeOperation = "lighter";
      person.drawImage(safetyLayer, 0, 0, safetyLayer.width, safetyLayer.height, 0, 0, width, height);
      person.globalCompositeOperation = "source-over";
    }

    function render(timestamp, motion, visible) {
      if (!enabled) return false;
      lastMotion = motion;
      if (!visible) { if (active) clear(); return false; }
      if (!active) { if (!paintThree(timestamp, motion, false)) drawPerson(motion, false); return false; }
      const now = Number.isFinite(timestamp) ? timestamp : performance.now();
      if (now >= expiresAt) { clear(); return false; }
      const delta = lastTime === null ? 16 : Math.max(0, now - lastTime);
      lastTime = now;
      maskContext.globalCompositeOperation = "destination-out";
      maskContext.fillStyle = "rgba(0,0,0," + (1 - Math.exp(-delta / 900)).toFixed(5) + ")";
      maskContext.fillRect(0, 0, width, height);
      maskContext.globalCompositeOperation = "source-over";
      if (pending.length) {
        pending.forEach((point) => {
          if (lastPoint) {
            const distance = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
            const steps = Math.max(1, Math.ceil(distance / (brushRadius * .28)));
            for (let index = 1; index <= steps; index++) {
              stamp(lastPoint.x + (point.x - lastPoint.x) * index / steps, lastPoint.y + (point.y - lastPoint.y) * index / steps);
            }
          } else stamp(point.x, point.y);
          lastPoint = point;
        });
        pending.length = 0;
      }
      if (paintThree(now, motion, true)) return true;
      const background = contexts[0], box = backgroundBox;
      background.globalCompositeOperation = "source-over";
      background.globalAlpha = 1;
      background.clearRect(-1, -1, width + 2, height + 2);
      background.drawImage(factory,
        box.x + box.width / 2 + motion.bgX + (box.offsetX - box.width / 2) * motion.bgScale,
        box.y + box.height / 2 + motion.bgY + (box.offsetY - box.height / 2) * motion.bgScale,
        box.fittedWidth * motion.bgScale, box.fittedHeight * motion.bgScale);
      background.globalCompositeOperation = "destination-in";
      background.drawImage(mask, 0, 0, mask.width, mask.height, 0, 0, width, height);
      background.globalCompositeOperation = "source-over";
      drawPerson(motion, true);
      return true;
    }

    return { resize, addPoint, render, clear, endStroke() { lastPoint = lastPointer = null; pending.length = 0; } };
  }

  function applyLanguage() {
    language = root.lang === "ar" ? "ar" : "en";
    $$("[data-sc-text]").forEach((node) => { node.textContent = t(node.dataset.scText); });
    $$("[data-sc-aria]").forEach((node) => { node.setAttribute("aria-label", t(node.dataset.scAria)); });
    document.title = t("pageTitle");
    measure();
  }

  function measure() {
    if (publicMenuOpen) return;
    metrics.heroStart = hero.getBoundingClientRect().top + window.scrollY;
    const stickyDistance = hero.offsetHeight - heroStage.offsetHeight;
    metrics.heroTravel = Math.max(1, stickyDistance > 0 ? stickyDistance : heroStage.offsetHeight * .6);
    metrics.heroEnd = metrics.heroStart + hero.offsetHeight;
    metrics.pageTravel = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    colorReveal.resize();
    scrollPosition = window.scrollY || 0;
    scrollTime = null;
    requestRender();
  }

  function frame(timestamp) {
    raf = 0;
    if (publicMenuOpen || document.hidden || pageSuspended) return;
    const actualY = window.scrollY || 0;
    const elapsed = scrollTime === null ? 1000 / 60 : Math.min(64, Math.max(1, timestamp - scrollTime));
    const immediate = reduced.matches || scrollPosition === null || Math.abs(actualY - scrollPosition) > window.innerHeight;
    scrollPosition = immediate ? actualY : scrollPosition + (actualY - scrollPosition) * (1 - Math.exp(-elapsed / 70));
    if (Math.abs(actualY - scrollPosition) < .04) scrollPosition = actualY;
    const following = scrollPosition !== actualY;
    const y = scrollPosition;
    const heroProgress = clamp((y - metrics.heroStart) / metrics.heroTravel);
    visualStyle($("#scPageProgress"), "width", (clamp(y / metrics.pageTravel) * 100).toFixed(3) + "%");
    const heroVisible = actualY < metrics.heroEnd;
    if (!reduced.matches && heroVisible) {
      pointer.x += (pointer.targetX - pointer.x) * .11;
      pointer.y += (pointer.targetY - pointer.y) * .11;
      visualStyle(heroStage, "--sc-bg-x", (pointer.x * 9).toFixed(2) + "px");
      visualStyle(heroStage, "--sc-bg-y", (pointer.y * 7 - heroProgress * 28).toFixed(2) + "px");
      visualStyle(heroStage, "--sc-bg-scale", (1.04 + heroProgress * .065).toFixed(3));
      visualStyle(heroStage, "--sc-person-x", (pointer.x * 19).toFixed(2) + "px");
      visualStyle(heroStage, "--sc-person-y", (pointer.y * 10 + heroProgress * 29).toFixed(2) + "px");
      visualStyle(heroStage, "--sc-word-y", (-heroProgress * 100 + pointer.y * 4).toFixed(2) + "px");
      visualStyle(heroStage, "--sc-copy-y", (-heroProgress * 30).toFixed(2) + "px");
      visualStyle(heroStage, "--sc-copy-opacity", (1 - heroProgress * .18).toFixed(3));
      visualStyle(heroStage, "--sc-note-y", (-heroProgress * 65).toFixed(2) + "px");
      if (Math.abs(pointer.targetX - pointer.x) + Math.abs(pointer.targetY - pointer.y) > .005) requestRender();
    }
    if (colorReveal.render(timestamp, {
      bgX: pointer.x * 9, bgY: pointer.y * 7 - heroProgress * 28, bgScale: 1.04 + heroProgress * .065,
      personX: pointer.x * 19, personY: pointer.y * 10 + heroProgress * 29
    }, heroVisible)) requestRender();
    scrollTime = following ? timestamp : null;
    if (following) requestRender();
  }

  function requestRender() {
    if (!raf && !publicMenuOpen && !document.hidden && !pageSuspended) {
      if (scrollTime === null) scrollTime = performance.now();
      raf = window.requestAnimationFrame(frame);
    }
  }
  function suspendScroll() {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    scrollTime = null;
    scrollPosition = null;
  }

  heroStage.addEventListener("pointermove", (event) => {
    if (reduced.matches || !finePointer.matches || event.pointerType === "touch") return;
    const rect = heroStage.getBoundingClientRect();
    pointer.targetX = clamp((event.clientX - rect.left) / rect.width, 0, 1) * 2 - 1;
    pointer.targetY = clamp((event.clientY - rect.top) / rect.height, 0, 1) * 2 - 1;
    colorReveal.addPoint(clamp(event.clientX - rect.left, 0, rect.width), clamp(event.clientY - rect.top, 0, rect.height));
    requestRender();
  }, { passive: true });
  heroStage.addEventListener("pointerleave", () => { pointer.targetX = 0; pointer.targetY = 0; colorReveal.endStroke(); requestRender(); });
  finePointer.addEventListener("change", measure);
  hoverPointer.addEventListener("change", measure);
  document.addEventListener("visibilitychange", () => { if (document.hidden) { suspendScroll(); colorReveal.clear(); } else requestRender(); });
  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", () => {
    measure();
  }, { passive: true });
  document.addEventListener("safepermit:languagechange", applyLanguage);
  document.addEventListener("safepermit:i18nready", applyLanguage);
  document.addEventListener("safepermit:navigationchange", (event) => {
    publicMenuOpen = event.detail.open;
    // Recompute document coordinates after the modal restores the fixed body.
    if (publicMenuOpen) suspendScroll();
    else measure();
  });
  window.addEventListener("pagehide", () => { pageSuspended = true; suspendScroll(); });
  window.addEventListener("pageshow", () => { pageSuspended = false; measure(); });
  window.addEventListener("storage", (event) => {
    if (event.key === "safePermitTheme" && (event.newValue === "dark" || event.newValue === "light")) {
      root.setAttribute("data-theme", event.newValue);
      }
    if (event.key === "safePermitLanguage" && (event.newValue === "ar" || event.newValue === "en")) {
      root.lang = event.newValue;
      root.dir = event.newValue === "ar" ? "rtl" : "ltr";
      root.setAttribute("data-language", event.newValue);
      applyLanguage();
    }
  });

  if ("IntersectionObserver" in window && !reduced.matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: "0px 0px -25px 0px" });
    revealItems.forEach((item) => observer.observe(item));
    page.classList.add("sc-ready");
  } else revealItems.forEach((item) => item.classList.add("is-visible"));
  reduced.addEventListener("change", () => {
    if (reduced.matches) {
      pointer.x = pointer.y = pointer.targetX = pointer.targetY = 0;
      revealItems.forEach((item) => item.classList.add("is-visible"));
    }
    measure();
  });
  $$("img").forEach((image) => { if (!image.complete) image.addEventListener("load", measure, { once: true }); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  applyLanguage();
})();
