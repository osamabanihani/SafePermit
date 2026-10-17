/* SafePermit Home — interactive product experience (v13.3, journey moved to home-journey.js in v13.4).
 * Shared Home copy, AI Decision Support simulation and Permit Intelligence inspector.
 * Presentation only: nothing here reads or writes permits, accounts, reviews or storage.
 * The AI section is a simulation with predefined scenarios; it runs no AI and saves nothing.
 */
(function () {
  "use strict";
  const page = document.querySelector(".sc-page");
  if (!page || window.SafePermitHomeExperience) return;
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const $ = (s, scope) => (scope || page).querySelector(s);
  const $$ = (s, scope) => Array.from((scope || page).querySelectorAll(s));
  const lang = () => (root.lang === "ar" ? "ar" : "en");
  const rtl = () => root.dir === "rtl";

  /* ---------------- copy ---------------- */
  const copy = {
    en: {
      purposeLead: "Good work begins with a clear decision to proceed.",
      purposeBody: "Scope, hazards, safety checks and approvals stay together in one permit record, so every role decides with the full picture.",
      purposeSteps: "From planning to work", stepPlan: "Plan", stepCheck: "Check", stepApprove: "Approve", stepWork: "Work", aboutPlatform: "Meet SafePermit",
      journeyKicker: "THE FOUR DECISIONS", journeyTitle1: "ONE PERMIT.", journeyTitle2: "FOUR DECISIONS.",
      journeyIntro: "Follow the same permit through every review. Each role makes one decision before the permit moves on.",
      reviewStages: "Permit review stages", checksLabel: "WHAT THIS ROLE CHECKS", handoff: "Hands the permit to", handoffEnd: "Ready for activation",
      prevStage: "Previous stage", nextStage: "Next stage", play: "Play the journey", pause: "Pause the journey",
      trackingLink: "Explore approval tracking", swipeHint: "Swipe the permit to change role",
      replay: "Replay the journey", finalStep: "Record the final decision (demo)", stageLabel: "Illustrative permit. Use the arrow keys to change role.",
      finaleNote: "Illustrative demo. No real permit is approved.", finaleTitle: "Four decisions. One approved permit.",
      finaleBody: "Every role decided with the full picture, and the approval trail is complete. In SafePermit, the approved permit is then activated before work starts.",
      states: { draft: "DRAFT", supervisor: "SUPERVISOR REVIEW", safety: "SAFETY REVIEW", admin: "ADMIN APPROVAL", approved: "APPROVED", pending: "PENDING", inProgress: "IN REVIEW", complete: "DECIDED" },
      worker: "Worker", supervisor: "Supervisor", safetyOfficer: "Safety Officer", admin: "Admin",
      openWorkspace: "Open the {role} workspace",
      roles: [
        { decision: "Submit", title: "Define the work.", body: "Describe the job, identify the hazards and complete the required checklist before submitting the permit.",
          checks: ["Work scope, location and schedule", "Hazards with initial and residual risk", "Mandatory safety checklist"],
          workspace: "Create permits, complete safety checks and track your submissions." },
        { decision: "Release", title: "Review the operation.", body: "Check the scope, the team, the location and the timing, so the work is operationally ready.",
          checks: ["Scope, team and competency", "Location and timing conflicts", "Operational readiness"],
          workspace: "Review the work scope, the team and the operational readiness." },
        { decision: "Clear", title: "Verify the controls.", body: "Review hazards, protective equipment, safety checks and the remaining risk before clearing the permit.",
          checks: ["Hazards, controls and residual risk", "PPE and isolation (LOTO)", "Checklist evidence"],
          workspace: "Assess hazards, verify controls and review the residual risk." },
        { decision: "Approve", title: "Make the final decision.", body: "Review the complete approval trail and make the final permit decision after the preceding reviews.",
          checks: ["Complete, documented approval trail", "Final decision with a comment", "Activation of the approved permit"],
          workspace: "Review the approval trail and make the final permit decision." }
      ],
      aiKicker: "AI DECISION SUPPORT", aiTitle1: "AI SUGGESTS.", aiTitle2: "PEOPLE DECIDE.",
      aiIntro: "Pick a scenario and run a review to see how decision support works: suggested hazards, controls and PPE, plus missing information to confirm.",
      simBadge: "Simulation with predefined scenarios. No live AI analysis runs here.",
      scenarioLabel: "Choose a scenario", consoleTitle: "Review assistant", consoleTag: "SIMULATED",
      ready: "Ready. Run the simulated review for this scenario.", run: "Run simulated review", rerun: "Run again", reset: "Reset",
      checking: ["Reading the work scope…", "Matching hazards to the task…", "Checking controls and PPE…", "Looking for missing information…"],
      done: "Review complete. Accept or dismiss each suggestion.",
      accept: "Accept", dismiss: "Dismiss", accepted: "Accepted", dismissed: "Dismissed",
      summary: "{a} accepted · {d} dismissed · {p} to review",
      summaryNote: "Kept in this demo only. Nothing is saved to any permit.",
      decisionNote: "Final decision: a human reviewer. The assistant cannot approve, reject or change a permit.",
      kinds: { hazard: "HAZARD", control: "CONTROL", ppe: "PPE", missing: "MISSING", check: "CHECK" },
      scenarios: [
        { name: "Electrical maintenance", place: "Motor control panel MCC-3 · Manufacturing hall", icon: "electric", findings: [
          ["hazard", "Unexpected energization of the panel during work."],
          ["control", "Apply LOTO and verify zero voltage before the panel is opened."],
          ["ppe", "Arc-rated face shield, insulated gloves and safety footwear."],
          ["missing", "The isolation point is not recorded in the permit."],
          ["check", "Confirm electrical authorization for both workers."]] },
        { name: "Hot work", place: "Pipe repair · Plant B utility area", icon: "hot", findings: [
          ["hazard", "Sparks reaching combustible material near the repair."],
          ["control", "Clear combustibles and keep a fire watch during and after the work."],
          ["ppe", "Welding helmet, flame-resistant clothing and leather gloves."],
          ["missing", "No gas test result is attached to the permit."],
          ["check", "Another permit is active in the same area. Review the simultaneous operations."]] },
        { name: "Confined space entry", place: "Tank 04 inspection · Tank farm", icon: "confined", findings: [
          ["hazard", "Oxygen deficiency or a toxic atmosphere inside the tank."],
          ["control", "Continuous gas monitoring and forced ventilation before and during entry."],
          ["ppe", "Full-body harness with a retrieval line and a personal gas detector."],
          ["missing", "The standby attendant and rescue plan are not named."],
          ["check", "Keep an entry log of every person inside the space."]] }
      ],
      intelKicker: "PERMIT INTELLIGENCE", intelTitle1: "RISK LEVEL", intelTitle2: "IS NOT PERMIT STATUS.",
      intelIntro: "SafePermit keeps safety risk separate from workflow progress. Change either one and see what it means for the permit.",
      riskLegend: "Residual risk", statusLegend: "Permit status", illustrative: "Illustrative permit · demo data",
      risks: ["Low", "Medium", "High", "Critical"],
      statuses: ["Draft", "Pending Supervisor Review", "Pending Safety Review", "Pending Admin Approval", "Approved", "Active"],
      verdictBase: "{risk} risk · {status}. Risk describes the hazard after controls; status shows where the permit is in its review. Changing one never changes the other.",
      verdictBlocked: "Blocked: SafePermit only approves a permit when the residual risk is below High. Reduce the risk with stronger controls first.",
      verdictPending: "The Safety Officer must see the residual risk reduced below High before this permit can be approved.",
      tabTrail: "Approval trail", tabChecklist: "Checklist", tabQr: "QR reference", panelLabel: "Permit details",
      trail: [
        ["Submitted", "Omar Worker", "Worker", "Hazards and checklist completed."],
        ["Approved", "Ahmad Khalil", "Supervisor", "Team and schedule confirmed."],
        ["Approved", "Sarah Nasser", "Safety Officer", "Controls verified, residual risk accepted."],
        ["Approved", "Rana Haddad", "Admin", "Final decision recorded."],
        ["Activated", "Rana Haddad", "Admin", "Work may start under site controls."]
      ],
      waiting: "Waiting for", trailEmpty: "Not submitted yet. The trail starts when the worker submits.",
      checklist: [["Protective equipment available", true], ["Work area barricaded", true], ["Isolation verified (LOTO)", true], ["Gas test recorded", true], ["Fire extinguisher at hand", false], ["Team briefed on the hazards", true]],
      checklistMeta: "{done} / {total} complete", checklistBlocked: "{n} mandatory item missing. Submission stays blocked.", checklistBlockedMany: "{n} mandatory items missing. Submission stays blocked.",
      checklistOk: "All mandatory items are complete.", mandatory: "Mandatory", optional: "Optional",
      qrBody: "A permit QR opens its demo verification page. It does not authorize work or prove permit validity; live status must come from an authenticated backend.",
      qrLink: "Open demo verification", qrAlt: "QR reference for permit PTW-1024",
      finalTitle: "LET'S GET TO SAFER WORK.", enterPlatform: "Enter SafePermit"
    },
    ar: {
      purposeLead: "العمل الجيد يبدأ بقرار واضح يسمح بالمضيّ قدمًا.",
      purposeBody: "يجتمع نطاق العمل والمخاطر وفحوص السلامة والاعتمادات في سجل تصريح واحد، ليتخذ كل دور قراره بصورة كاملة.",
      purposeSteps: "من التخطيط إلى التنفيذ", stepPlan: "خطّط", stepCheck: "افحص", stepApprove: "اعتمد", stepWork: "نفّذ", aboutPlatform: "تعرّف على SafePermit",
      journeyKicker: "القرارات الأربعة", journeyTitle1: "تصريح واحد.", journeyTitle2: "أربعة قرارات.",
      journeyIntro: "تابع التصريح نفسه عبر كل مراجعة. يتخذ كل دور قرارًا واحدًا قبل أن ينتقل التصريح إلى الخطوة التالية.",
      reviewStages: "مراحل مراجعة التصريح", checksLabel: "ما يتحقق منه هذا الدور", handoff: "ينتقل التصريح إلى", handoffEnd: "جاهز للتفعيل",
      prevStage: "المرحلة السابقة", nextStage: "المرحلة التالية", play: "شغّل الرحلة", pause: "أوقف الرحلة",
      trackingLink: "استكشف تتبّع الاعتمادات", swipeHint: "اسحب التصريح لتغيير الدور",
      replay: "أعد تشغيل الرحلة", finalStep: "سجّل القرار النهائي (عرض توضيحي)", stageLabel: "تصريح توضيحي. استخدم مفاتيح الأسهم لتغيير الدور.",
      finaleNote: "عرض توضيحي. لا يُعتمد أي تصريح حقيقي.", finaleTitle: "أربعة قرارات. تصريح واحد معتمد.",
      finaleBody: "اتخذ كل دور قراره بصورة كاملة، واكتمل سجل الاعتمادات. في SafePermit يُفعَّل التصريح المعتمد بعد ذلك قبل بدء العمل.",
      states: { draft: "مسودة", supervisor: "مراجعة المشرف", safety: "مراجعة السلامة", admin: "موافقة الإدارة", approved: "معتمد", pending: "بانتظار المراجعة", inProgress: "قيد المراجعة", complete: "تم القرار" },
      worker: "العامل", supervisor: "المشرف", safetyOfficer: "مسؤول السلامة", admin: "الإدارة",
      openWorkspace: "افتح مساحة عمل {role}",
      roles: [
        { decision: "تقديم", title: "حدّد العمل.", body: "صِف المهمة، وحدّد المخاطر، وأكمل قائمة الفحص المطلوبة قبل تقديم التصريح.",
          checks: ["نطاق العمل والموقع والجدول الزمني", "المخاطر مع مستوى الخطر الأولي والمتبقي", "قائمة فحص السلامة الإلزامية"],
          workspace: "أنشئ التصاريح، وأكمل فحوص السلامة، وتابع طلباتك." },
        { decision: "إحالة", title: "راجع العملية.", body: "تحقّق من نطاق العمل والفريق والموقع والتوقيت للتأكد من الجاهزية التشغيلية.",
          checks: ["نطاق العمل والفريق والكفاءة", "تعارضات الموقع والتوقيت", "الجاهزية التشغيلية"],
          workspace: "راجع نطاق العمل والفريق والجاهزية التشغيلية." },
        { decision: "إجازة", title: "تحقّق من الضوابط.", body: "راجع المخاطر ومعدات الوقاية وفحوص السلامة ومستوى الخطر المتبقي قبل إجازة التصريح.",
          checks: ["المخاطر والضوابط والخطر المتبقي", "معدات الوقاية والعزل (LOTO)", "أدلة قائمة الفحص"],
          workspace: "قيّم المخاطر، وتحقّق من الضوابط، وراجع الخطر المتبقي." },
        { decision: "اعتماد", title: "اتخذ القرار النهائي.", body: "راجع سجل الاعتمادات كاملًا واتخذ القرار النهائي للتصريح بعد اكتمال المراجعات السابقة.",
          checks: ["سجل اعتمادات كامل وموثّق", "قرار نهائي مع تعليق", "تفعيل التصريح المعتمد"],
          workspace: "راجع سجل الاعتمادات واتخذ القرار النهائي للتصريح." }
      ],
      aiKicker: "دعم القرار بالذكاء الاصطناعي", aiTitle1: "الذكاء الاصطناعي يقترح.", aiTitle2: "الإنسان يقرّر.",
      aiIntro: "اختر سيناريو وشغّل المراجعة لترى كيف يعمل دعم القرار: مخاطر وضوابط ومعدات وقاية مقترحة، ومعلومات ناقصة يجب تأكيدها.",
      simBadge: "محاكاة بسيناريوهات معدّة مسبقًا. لا يجري هنا أي تحليل حيّ بالذكاء الاصطناعي.",
      scenarioLabel: "اختر سيناريو", consoleTitle: "مساعد المراجعة", consoleTag: "محاكاة",
      ready: "جاهز. شغّل المراجعة المحاكاة لهذا السيناريو.", run: "شغّل المراجعة المحاكاة", rerun: "شغّل مرة أخرى", reset: "إعادة تعيين",
      checking: ["قراءة نطاق العمل…", "مطابقة المخاطر مع المهمة…", "فحص الضوابط ومعدات الوقاية…", "البحث عن المعلومات الناقصة…"],
      done: "اكتملت المراجعة. اقبل كل اقتراح أو تجاهله.",
      accept: "قبول", dismiss: "تجاهل", accepted: "مقبول", dismissed: "متجاهَل",
      summary: "{a} مقبول · {d} متجاهَل · {p} بانتظار المراجعة",
      summaryNote: "تبقى داخل هذا العرض فقط، ولا يُحفظ شيء في أي تصريح.",
      decisionNote: "القرار النهائي لمراجع بشري. لا يستطيع المساعد اعتماد تصريح أو رفضه أو تعديله.",
      kinds: { hazard: "خطر", control: "ضابط", ppe: "معدات وقاية", missing: "ناقص", check: "تحقّق" },
      scenarios: [
        { name: "صيانة كهربائية", place: "لوحة تحكم المحركات MCC-3 · قاعة التصنيع", icon: "electric", findings: [
          ["hazard", "تغذية غير متوقعة للوحة بالطاقة أثناء العمل."],
          ["control", "طبّق إجراءات LOTO وتحقّق من انعدام الجهد قبل فتح اللوحة."],
          ["ppe", "واقي وجه مقاوم للقوس الكهربائي، وقفازات عازلة، وأحذية سلامة."],
          ["missing", "نقطة العزل غير مسجلة في التصريح."],
          ["check", "تأكد من التفويض الكهربائي لكلا العاملين."]] },
        { name: "أعمال ساخنة", place: "إصلاح أنابيب · منطقة المرافق في المصنع B", icon: "hot", findings: [
          ["hazard", "وصول الشرر إلى مواد قابلة للاشتعال قرب موقع الإصلاح."],
          ["control", "أزل المواد القابلة للاشتعال، وخصّص مراقبًا للحريق أثناء العمل وبعده."],
          ["ppe", "خوذة لحام، وملابس مقاومة للهب، وقفازات جلدية."],
          ["missing", "لا توجد نتيجة فحص غاز مرفقة بالتصريح."],
          ["check", "يوجد تصريح آخر نشط في المنطقة نفسها. راجع العمليات المتزامنة."]] },
        { name: "دخول الأماكن المحصورة", place: "فحص الخزان 04 · منطقة الخزانات", icon: "confined", findings: [
          ["hazard", "نقص الأكسجين أو وجود جو سام داخل الخزان."],
          ["control", "مراقبة مستمرة للغاز وتهوية قسرية قبل الدخول وأثناءه."],
          ["ppe", "حزام أمان كامل مع حبل سحب، وكاشف غاز شخصي."],
          ["missing", "لم يُحدَّد المراقب الاحتياطي ولا خطة الإنقاذ."],
          ["check", "سجّل كل شخص يدخل المكان المحصور."]] }
      ],
      intelKicker: "ذكاء التصريح", intelTitle1: "مستوى الخطر", intelTitle2: "ليس حالة التصريح.",
      intelIntro: "يفصل SafePermit بين خطر السلامة وتقدّم سير العمل. غيّر أيًّا منهما لترى ما يعنيه للتصريح.",
      riskLegend: "الخطر المتبقي", statusLegend: "حالة التصريح", illustrative: "تصريح توضيحي · بيانات تجريبية",
      risks: ["منخفض", "متوسط", "مرتفع", "حرج"],
      statuses: ["مسودة", "بانتظار مراجعة المشرف", "بانتظار مراجعة السلامة", "بانتظار موافقة الإدارة", "معتمد", "نشط"],
      verdictBase: "خطر {risk} · {status}. يصف الخطر مستوى المخاطرة بعد الضوابط، وتوضح الحالة موقع التصريح في المراجعة. تغيير أحدهما لا يغيّر الآخر.",
      verdictBlocked: "محظور: لا يعتمد SafePermit تصريحًا إلا إذا كان الخطر المتبقي أقل من مرتفع. خفّض الخطر بضوابط أقوى أولًا.",
      verdictPending: "يجب أن يرى مسؤول السلامة الخطر المتبقي أقل من مرتفع قبل أن يُعتمد هذا التصريح.",
      tabTrail: "سجل الاعتمادات", tabChecklist: "قائمة الفحص", tabQr: "مرجع QR", panelLabel: "تفاصيل التصريح",
      trail: [
        ["تم التقديم", "عمر العامل", "العامل", "اكتملت المخاطر وقائمة الفحص."],
        ["معتمد", "أحمد خليل", "المشرف", "تم تأكيد الفريق والجدول الزمني."],
        ["معتمد", "سارة ناصر", "مسؤول السلامة", "تم التحقق من الضوابط وقبول الخطر المتبقي."],
        ["معتمد", "رنا حداد", "الإدارة", "تم تسجيل القرار النهائي."],
        ["مفعّل", "رنا حداد", "الإدارة", "يمكن بدء العمل وفق ضوابط الموقع."]
      ],
      waiting: "بانتظار", trailEmpty: "لم يُقدَّم بعد. يبدأ السجل عندما يقدّم العامل التصريح.",
      checklist: [["معدات الوقاية متوفرة", true], ["منطقة العمل محاطة بحواجز", true], ["تم التحقق من العزل (LOTO)", true], ["تم تسجيل فحص الغاز", true], ["طفاية حريق في المتناول", false], ["تم إطلاع الفريق على المخاطر", true]],
      checklistMeta: "{done} / {total} مكتمل", checklistBlocked: "{n} بند إلزامي ناقص. يبقى التقديم محظورًا.", checklistBlockedMany: "{n} بنود إلزامية ناقصة. يبقى التقديم محظورًا.",
      checklistOk: "اكتملت جميع البنود الإلزامية.", mandatory: "إلزامي", optional: "اختياري",
      qrBody: "يفتح رمز QR صفحة التحقق التجريبية للتصريح. لا يمنح تفويضًا بالعمل ولا يثبت صلاحية التصريح؛ يجب أن تأتي الحالة الفعلية من خادم موثّق.",
      qrLink: "افتح صفحة التحقق التجريبية", qrAlt: "مرجع QR للتصريح PTW-1024",
      finalTitle: "لنبدأ عملًا أكثر أمانًا.", enterPlatform: "ادخل إلى SafePermit"
    }
  };
  const t = (key) => { const v = copy[lang()][key]; return v === undefined ? copy.en[key] : v; };
  const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (_, k) => (map[k] === undefined ? "" : map[k]));
  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
  const svgIcon = (name) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("data-sp-icon", name); return s; };

  function applyStatic() {
    $$("[data-sx]").forEach((n) => { const v = t(n.dataset.sx); if (typeof v === "string") n.textContent = v; });
    $$("[data-sx-aria]").forEach((n) => n.setAttribute("aria-label", t(n.dataset.sxAria)));
  }

  /* Arrow-key navigation for a set of tab/radio buttons (RTL aware). */
  function arrowKeys(buttons, onPick) {
    buttons.forEach((button, index) => button.addEventListener("keydown", (event) => {
      const n = buttons.length;
      let next = index;
      if (event.key === "ArrowRight") next = (index + (rtl() ? n - 1 : 1)) % n;
      else if (event.key === "ArrowLeft") next = (index + (rtl() ? 1 : n - 1)) % n;
      else if (event.key === "ArrowDown") next = (index + 1) % n;
      else if (event.key === "ArrowUp") next = (index + n - 1) % n;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = n - 1;
      else return;
      event.preventDefault();
      onPick(next, true);
      buttons[next].focus({ preventScroll: true });
    }));
  }

  /* 2. The Four Decisions (Permit Journey) lives in home-journey.js and reads this copy. */

  /* ---------------- 4. AI Decision Support simulation ---------------- */
  const ai = (function () {
    const section = $("#ai-support");
    if (!section) return null;
    const scenarioButtons = $$("[data-sx-scenario]", section);
    const list = $("[data-sx-findings]", section);
    const status = $("[data-sx-status]", section);
    const runButton = $("[data-sx-run]", section);
    const summary = $("[data-sx-summary]", section);
    let scenario = 0, state = "idle", decisions = [], timers = [];

    function clearTimers() { timers.forEach((id) => window.clearTimeout(id)); timers = []; }
    function renderScenario() {
      const s = t("scenarios")[scenario];
      scenarioButtons.forEach((b, i) => {
        b.setAttribute("aria-checked", String(i === scenario));
        b.tabIndex = i === scenario ? 0 : -1;
        const sc = t("scenarios")[i];
        $("[data-sx-scenario-name]", b).textContent = sc.name;
        $("[data-sx-scenario-place]", b).textContent = sc.place;
      });
      $("[data-sx-console-name]", section).textContent = s.name;
      $("[data-sx-console-place]", section).textContent = s.place;
      $("[data-sx-console-icon]", section).setAttribute("data-sp-icon", s.icon);
    }
    function renderFindings(count, revealIndex) {
      const s = t("scenarios")[scenario];
      const kinds = t("kinds");
      list.replaceChildren(...s.findings.slice(0, count).map((f, i) => {
        const li = el("li", "sx-finding" + (i === revealIndex ? " is-new" : ""));
        li.dataset.kind = f[0];
        li.dataset.decision = decisions[i] || "";
        li.append(el("span", "sx-finding__kind", kinds[f[0]]), el("p", "sx-finding__text", f[1]));
        const actions = el("div", "sx-finding__actions");
        ["accept", "dismiss"].forEach((act) => {
          const b = el("button", "sx-finding__btn sx-finding__btn--" + act, decisions[i] === act ? t(act === "accept" ? "accepted" : "dismissed") : t(act));
          b.type = "button";
          b.setAttribute("aria-pressed", String(decisions[i] === act));
          b.addEventListener("click", () => {
            decisions[i] = decisions[i] === act ? "" : act;
            renderFindings(count);
            renderSummary();
            const again = list.children[i] && list.children[i].querySelector(".sx-finding__btn--" + act);
            if (again) again.focus({ preventScroll: true });
          });
          actions.append(b);
        });
        li.append(actions);
        return li;
      }));
    }
    function renderSummary() {
      const total = t("scenarios")[scenario].findings.length;
      const a = decisions.filter((d) => d === "accept").length, d = decisions.filter((x) => x === "dismiss").length;
      summary.replaceChildren();
      if (state !== "done") return;
      summary.append(el("strong", null, fill(t("summary"), { a, d, p: total - a - d })), el("span", null, t("summaryNote")));
    }
    function renderState() {
      runButton.textContent = t(state === "done" ? "rerun" : "run");
      runButton.disabled = state === "running";
      section.dataset.state = state;
      if (state === "idle") status.textContent = t("ready");
      if (state === "done") status.textContent = t("done");
    }
    function reset() {
      clearTimers();
      state = "idle";
      decisions = [];
      list.replaceChildren();
      renderState();
      renderSummary();
    }
    function run() {
      clearTimers();
      decisions = [];
      const findings = t("scenarios")[scenario].findings.length;
      if (reduced.matches) {
        state = "done"; renderFindings(findings); renderState(); renderSummary(); return;
      }
      state = "running";
      list.replaceChildren();
      renderState();
      renderSummary();
      const steps = t("checking");
      steps.forEach((line, i) => timers.push(window.setTimeout(() => { status.textContent = line; }, i * 420)));
      for (let i = 1; i <= findings; i++) timers.push(window.setTimeout(() => renderFindings(i, i - 1), steps.length * 420 + (i - 1) * 380));
      timers.push(window.setTimeout(() => { state = "done"; renderState(); renderSummary(); }, steps.length * 420 + findings * 380));
    }
    function pick(i) {
      if (i === scenario && state !== "running") { renderScenario(); return; }
      scenario = i;
      renderScenario();
      reset();
    }
    scenarioButtons.forEach((b, i) => b.addEventListener("click", () => pick(i)));
    arrowKeys(scenarioButtons, pick);
    runButton.addEventListener("click", run);
    return {
      render() {
        renderScenario();
        renderState();
        const shown = list.children.length;
        if (shown) renderFindings(shown);
        renderSummary();
      }
    };
  })();

  /* ---------------- 5. Permit Intelligence inspector ---------------- */
  const intel = (function () {
    const section = $("#permit-record");
    if (!section) return null;
    const riskButtons = $$("[data-sx-risk]", section);
    const range = $("[data-sx-status-range]", section);
    const tabs = $$("[data-sx-tab]", section);
    const panel = $("[data-sx-panel]", section);
    let risk = 1, status = 2, tab = 0;
    let checks = null;

    function verdict() {
      const v = $("[data-sx-verdict]", section);
      const high = risk >= 2;
      v.dataset.tone = high && status >= 3 ? "blocked" : high ? "warn" : "ok";
      v.replaceChildren(el("span", null, fill(t("verdictBase"), { risk: t("risks")[risk], status: t("statuses")[status] })));
      if (high) v.append(el("strong", null, status >= 3 ? t("verdictBlocked") : t("verdictPending")));
    }
    function renderGauges() {
      section.style.setProperty("--sx-risk", String(risk));
      section.dataset.risk = String(risk);
      riskButtons.forEach((b, i) => { b.setAttribute("aria-checked", String(i === risk)); b.tabIndex = i === risk ? 0 : -1; b.textContent = t("risks")[i]; });
      $("[data-sx-risk-value]", section).textContent = t("risks")[risk];
      range.value = String(status);
      range.setAttribute("aria-valuetext", t("statuses")[status]);
      $("[data-sx-status-value]", section).textContent = t("statuses")[status];
      section.style.setProperty("--sx-status", String(status / 5));
      $$("[data-sx-status-step]", section).forEach((s, i) => {
        s.classList.toggle("is-done", i < status);
        s.classList.toggle("is-current", i === status);
        $("[data-sx-status-name]", s).textContent = t("statuses")[i];
      });
      verdict();
    }
    function renderTrail() {
      const trail = t("trail");
      const shown = status === 0 ? 0 : Math.min(trail.length, status === 5 ? 5 : status);
      const roleOrder = [t("worker"), t("supervisor"), t("safetyOfficer"), t("admin"), t("admin")];
      if (!shown) return [el("p", "sx-panel__empty", t("trailEmpty"))];
      const ol = el("ol", "sx-trail");
      trail.slice(0, shown).forEach((e, i) => {
        const li = el("li", "sx-trail__item");
        li.append(el("span", "sx-trail__dot"), el("strong", null, e[0]));
        const who = el("span", "sx-trail__who");
        who.append(el("span", null, e[1]), el("span", null, e[2]));
        li.append(who, el("p", null, e[3]));
        ol.append(li);
      });
      if (status < 4) {
        const li = el("li", "sx-trail__item is-waiting");
        li.append(el("span", "sx-trail__dot"), el("strong", null, t("waiting")), el("span", "sx-trail__who", roleOrder[status]));
        ol.append(li);
      }
      return [ol];
    }
    function renderChecklist() {
      const items = t("checklist");
      if (!checks) checks = items.map((_, i) => i !== 3);
      const done = checks.filter(Boolean).length;
      const missing = items.filter((it, i) => it[1] && !checks[i]).length;
      const wrap = el("div", "sx-checklist");
      const meter = el("div", "sx-checklist__meter");
      meter.style.setProperty("--sx-done", String(done / items.length));
      meter.append(el("strong", null, fill(t("checklistMeta"), { done, total: items.length })), el("span", "sx-checklist__bar"));
      const note = el("p", "sx-checklist__note", missing ? fill(t(missing === 1 ? "checklistBlocked" : "checklistBlockedMany"), { n: missing }) : t("checklistOk"));
      note.dataset.tone = missing ? "blocked" : "ok";
      note.setAttribute("aria-live", "polite");
      const ul = el("ul", "sx-checklist__items");
      items.forEach((it, i) => {
        const li = el("li");
        const label = el("label", "sx-check");
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = checks[i];
        box.addEventListener("change", () => { checks[i] = box.checked; renderPanel(true, i); });
        label.append(box, el("span", "sx-check__box"), el("span", "sx-check__text", it[0]), el("span", "sx-check__tag", t(it[1] ? "mandatory" : "optional")));
        li.append(label);
        ul.append(li);
      });
      wrap.append(meter, note, ul);
      return [wrap];
    }
    function renderQr() {
      const wrap = el("div", "sx-qr");
      const img = document.createElement("img");
      img.src = "shared/qr/permit-codes/PTW-1024.svg";
      img.alt = t("qrAlt");
      img.width = 148; img.height = 148; img.loading = "lazy";
      const text = el("div", "sx-qr__text");
      const link = el("a", "sx-link");
      link.href = "permit-verify/?id=PTW-1024";
      link.append(el("span", null, t("qrLink")), el("span", null, "↗"));
      link.lastChild.setAttribute("aria-hidden", "true");
      text.append(el("strong", null, "PTW-1024"), el("p", null, t("qrBody")), link);
      wrap.append(img, text);
      return [wrap];
    }
    function renderPanel(keepFocus, focusIndex) {
      tabs.forEach((b, i) => { b.setAttribute("aria-selected", String(i === tab)); b.tabIndex = i === tab ? 0 : -1; b.textContent = t(["tabTrail", "tabChecklist", "tabQr"][i]); });
      panel.setAttribute("aria-labelledby", tabs[tab].id);
      panel.replaceChildren(...[renderTrail, renderChecklist, renderQr][tab]());
      // Animate tab changes only; checklist ticks update in place without replaying the entrance.
      if (!keepFocus) { panel.classList.remove("is-entering"); void panel.offsetWidth; panel.classList.add("is-entering"); }
      if (keepFocus && focusIndex != null) { const box = panel.querySelectorAll("input")[focusIndex]; if (box) box.focus({ preventScroll: true }); }
    }
    function pickRisk(i) { risk = i; renderGauges(); }
    riskButtons.forEach((b, i) => b.addEventListener("click", () => pickRisk(i)));
    arrowKeys(riskButtons, pickRisk);
    range.addEventListener("input", () => { status = Number(range.value); renderGauges(); if (tab === 0) renderPanel(); });
    function pickTab(i) { tab = i; renderPanel(); }
    tabs.forEach((b, i) => b.addEventListener("click", () => pickTab(i)));
    arrowKeys(tabs, pickTab);
    return { render() { renderGauges(); renderPanel(); } };
  })();

  function renderAll() {
    applyStatic();
    if (ai) ai.render();
    if (intel) intel.render();
  }
  document.addEventListener("safepermit:languagechange", renderAll);
  document.addEventListener("safepermit:i18nready", renderAll);
  renderAll();
  window.SafePermitHomeExperience = Object.freeze({ copy, t, fill, arrowKeys, ai, intel });
})();
