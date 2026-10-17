(function () {
  const instances = new Map();

  function lang() {
    return window.SafePermitI18n && typeof window.SafePermitI18n.getLanguage === "function"
      ? window.SafePermitI18n.getLanguage()
      : (document.documentElement.lang === "ar" ? "ar" : "en");
  }
  function isAr() { return lang() === "ar"; }
  function pick(en, ar) { return isAr() ? ar : en; }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c];
    });
  }
  function title(value) {
    return String(value || "—").replace(/[-_]/g," ").replace(/\b\w/g,function(c){return c.toUpperCase();});
  }
  function risk(score) {
    const n = Number(score) || 0;
    if (n >= 17) return {label:pick("Critical","حرج"), key:"critical"};
    if (n >= 10) return {label:pick("High","مرتفع"), key:"high"};
    if (n >= 5) return {label:pick("Medium","متوسط"), key:"medium"};
    return {label:pick("Low","منخفض"), key:"low"};
  }
  function hazards(permit) {
    return permit && permit.riskAssessment && Array.isArray(permit.riskAssessment.hazards) ? permit.riskAssessment.hazards : [];
  }
  function answers(permit) {
    return permit && permit.safetyChecklist && Array.isArray(permit.safetyChecklist.answers) ? permit.safetyChecklist.answers : [];
  }
  function yes(value) { return /^(yes|true|complete|completed)$/i.test(String(value || "")); }
  function dateValue(date,time) {
    const d = date ? String(date) : ""; const t = time ? String(time) : "00:00";
    const parsed = new Date(d + "T" + t + ":00");
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  function includesAny(text, terms) {
    const value = String(text || "").toLowerCase();
    return terms.some(function(term){ return value.includes(term); });
  }
  function highestResidual(permit) {
    return hazards(permit).reduce(function(max,h){ return Math.max(max, Number(h.residualScore)||0); },0);
  }
  function requiredOpen(permit) {
    return answers(permit).filter(function(a){ return a.required && !yes(a.answer); });
  }
  function allHazardText(permit) {
    return hazards(permit).map(function(h){return [h.hazard,h.controls].join(" ");}).join(" ").toLowerCase();
  }
  function finding(severity, titleEn, titleAr, detailEn, detailAr) {
    return {severity:severity,title:pick(titleEn,titleAr),detail:pick(detailEn,detailAr)};
  }

  const copy = {
    supervisor: {
      icon:"OP", eyebrow:["AI operational decision support","مساعد الذكاء الاصطناعي للمراجعة التشغيلية"],
      title:["AI Operational Review Assistant","مساعد المراجعة التشغيلية بالذكاء الاصطناعي"],
      desc:["Checks scope clarity, team readiness, schedule, location, and handoff quality without replacing Safety Review.","يفحص وضوح نطاق العمل وجاهزية الفريق والوقت والموقع وجودة التسليم دون أن يحل محل مراجعة السلامة."],
      run:["Run Operational Review","تشغيل المراجعة التشغيلية"],
      runTitle:["Review operational readiness","مراجعة الجاهزية التشغيلية"],
      runDesc:["Focuses on what the Supervisor owns: scope, people, place, time, and operational coordination.","يركز على مسؤوليات المشرف: نطاق العمل، الأشخاص، المكان، الوقت، والتنسيق التشغيلي."],
      guard:["Supervisor remains responsible for Approve / Return / Reject.","يبقى المشرف مسؤولًا عن الموافقة أو الإرجاع أو الرفض."],
      questions:[
        ["Is the work scope specific enough for the team to execute?","هل نطاق العمل محدد بما يكفي لتنفيذه؟"],
        ["Are the location, timing, and team appropriate for the operation?","هل الموقع والوقت والفريق مناسبون للعمل؟"],
        ["Are there operational conflicts that need coordination before handoff?","هل توجد تعارضات تشغيلية تحتاج تنسيقًا قبل التسليم؟"]
      ]
    },
    safety: {
      icon:"SH", eyebrow:["AI safety decision support","مساعد الذكاء الاصطناعي لمراجعة السلامة"],
      title:["AI Safety Review Assistant","مساعد مراجعة السلامة بالذكاء الاصطناعي"],
      desc:["Cross-checks hazards, controls, residual risk, PPE/checklist coverage, and permit-type safety expectations.","يراجع المخاطر وإجراءات التحكم والمخاطر المتبقية وتغطية معدات الوقاية وقائمة التحقق ومتطلبات نوع التصريح."],
      run:["Run Safety Review","تشغيل مراجعة السلامة"],
      runTitle:["Cross-check the safety case","مراجعة حالة السلامة"],
      runDesc:["Looks for omissions and inconsistencies. It never makes the Safety Officer decision.","يبحث عن النواقص والتناقضات ولا يتخذ قرار مسؤول السلامة."],
      guard:["Safety Officer remains the human safety decision-maker.","يبقى مسؤول السلامة صاحب القرار البشري في السلامة."],
      questions:[
        ["Are all credible hazards represented for this permit type?","هل تم تمثيل جميع المخاطر المحتملة لهذا النوع من التصاريح؟"],
        ["Do controls plausibly reduce the stated risk?","هل إجراءات التحكم تخفض مستوى الخطر بشكل منطقي؟"],
        ["Are mandatory PPE, isolation, and emergency controls complete?","هل متطلبات معدات الوقاية والعزل والطوارئ الإلزامية مكتملة؟"]
      ]
    },
    admin: {
      icon:"FA", eyebrow:["AI final-review decision support","مساعد الذكاء الاصطناعي للمراجعة النهائية"],
      title:["AI Final Review & Permit Summary","ملخص التصريح والمراجعة النهائية بالذكاء الاصطناعي"],
      desc:["Summarizes the permit, previous human approvals, remaining risk, and audit-readiness before the final Admin decision.","يلخص التصريح والموافقات البشرية السابقة والمخاطر المتبقية وجاهزية سجل التدقيق قبل قرار المسؤول النهائي."],
      run:["Run Final Review","تشغيل المراجعة النهائية"],
      runTitle:["Check final authorization readiness","التحقق من جاهزية الاعتماد النهائي"],
      runDesc:["Verifies that prior stages are complete and highlights anything the Admin should confirm before deciding.","يتحقق من اكتمال المراحل السابقة ويبرز ما يجب على المسؤول التأكد منه قبل القرار."],
      guard:["Admin remains responsible for the final Approve / Return / Reject decision.","يبقى المسؤول صاحب قرار الموافقة أو الإرجاع أو الرفض النهائي."],
      questions:[
        ["Are both prior human approvals present and traceable?","هل الموافقتان البشريتان السابقتان موجودتان وقابلتان للتتبع؟"],
        ["Is any high residual risk still accepted without clear justification?","هل توجد مخاطر متبقية مرتفعة دون تبرير واضح؟"],
        ["Is the permit record complete enough for an audit trail?","هل سجل التصريح مكتمل بما يكفي للتدقيق؟"]
      ]
    }
  };

  function contextValues(permit) {
    const basic = permit.basicInfo || {};
    const h = hazards(permit);
    const max = highestResidual(permit);
    return [
      {label:pick("Permit","التصريح"), value:permit.id || "—"},
      {label:pick("Work context","سياق العمل"), value:(basic.workTitle || title(basic.permitType)) + (basic.area ? " · " + title(basic.area) : "")},
      {label:pick("Risk snapshot","ملخص المخاطر"), value:h.length + " " + pick("hazard(s)","مخاطر") + (h.length ? " · " + risk(max).label + " " + pick("max residual","أعلى متبقي") : "")}
    ];
  }

  function analyzeSupervisor(permit) {
    const b=permit.basicInfo||{}, findings=[];
    const required=["workTitle","description","site","area","startDate","startTime","endDate","endTime","supervisor"];
    const missing=required.filter(function(k){return !String(b[k]||"").trim();});
    if (missing.length) findings.push(finding("high","Operational information is incomplete","المعلومات التشغيلية غير مكتملة",missing.length+" required field(s) are missing before a reliable operational decision.","هناك "+missing.length+" حقلًا مطلوبًا ناقصًا قبل اتخاذ قرار تشغيلي موثوق."));
    if (String(b.description||"").trim().length < 35) findings.push(finding("medium","Work scope needs more detail","نطاق العمل يحتاج تفاصيل أكثر","The job description is brief. Confirm boundaries, method, affected equipment, and handoff conditions.","وصف العمل مختصر. تأكد من الحدود والطريقة والمعدات المتأثرة وشروط التسليم."));
    if (!(Number(b.workerCount)>0)) findings.push(finding("high","Work team is not defined","فريق العمل غير محدد","No valid worker count is recorded for the permit.","لا يوجد عدد صالح للعمال مسجل في التصريح."));
    const start=dateValue(b.startDate,b.startTime), end=dateValue(b.endDate,b.endTime);
    if (start && end && end <= start) findings.push(finding("high","Schedule is invalid","الجدول الزمني غير صالح","The permit end time is not after the start time.","وقت انتهاء التصريح ليس بعد وقت البداية."));
    const residual=highestResidual(permit);
    if (residual>=10) findings.push(finding("medium","High residual risk remains for handoff","ما زالت هناك مخاطر متبقية مرتفعة عند التسليم","Operational approval must not be treated as safety approval. Ensure the high residual risk is clearly handed to Safety Review.","لا تعتبر الموافقة التشغيلية موافقة سلامة. يجب تسليم المخاطر المتبقية المرتفعة بوضوح إلى مراجعة السلامة."));
    const open=requiredOpen(permit);
    if (open.length) findings.push(finding("medium","Mandatory checklist items remain open","عناصر إلزامية في قائمة التحقق ما زالت مفتوحة",open.length+" mandatory item(s) are not confirmed. Do not treat operational approval as a bypass.","هناك "+open.length+" عنصر إلزامي غير مؤكد. لا تستخدم الموافقة التشغيلية لتجاوز ذلك."));
    if (!findings.length) findings.push(finding("good","Operational handoff looks coherent","التسليم التشغيلي يبدو متماسكًا","Scope, team, location, and schedule are populated. Continue with your own operational judgement.","النطاق والفريق والموقع والوقت مكتملة. أكمل باستخدام حكمك التشغيلي."));
    const completeness=Math.round(((required.length-missing.length)/required.length)*100);
    return { findings:findings, metrics:[
      [pick("Scope completeness","اكتمال النطاق"), completeness+"%"],
      [pick("Team size","حجم الفريق"), String(Number(b.workerCount)||0)],
      [pick("Residual risk","الخطر المتبقي"), risk(residual).label]
    ], critical:findings.some(f=>f.severity==="high") };
  }

  const expected = {
    electrical:["energization","electric","arc flash","voltage"],
    "hot-work":["fire","ignition","spark","hot surface"],
    height:["fall","dropped object","height"],
    confined:["oxygen","toxic","gas","entrap","engulf","rescue"],
    excavation:["collapse","trench","underground","utility","buried"]
  };
  function analyzeSafety(permit) {
    const b=permit.basicInfo||{}, hs=hazards(permit), findings=[];
    if (!hs.length) findings.push(finding("high","No hazards are recorded","لا توجد مخاطر مسجلة","A Safety Review cannot be meaningful without a documented hazard assessment.","لا يمكن إجراء مراجعة سلامة ذات معنى دون تقييم مخاطر موثق."));
    hs.forEach(function(h,index){
      const initial=Number(h.initialScore)||0, residual=Number(h.residualScore)||0;
      if (!String(h.controls||"").trim()) findings.push(finding("high","Hazard "+(index+1)+" has no controls","الخطر "+(index+1)+" دون إجراءات تحكم","Document control measures before accepting the residual risk.","وثّق إجراءات التحكم قبل قبول الخطر المتبقي."));
      if (initial>0 && residual>=initial) findings.push(finding("high","Residual risk did not reduce","الخطر المتبقي لم ينخفض","For "+(h.hazard||"a hazard")+", the residual score is not lower than the initial score.","بالنسبة إلى "+(h.hazard||"الخطر")+"، درجة الخطر المتبقي ليست أقل من الدرجة الأولية."));
      if (residual>=10) findings.push(finding("medium","High residual risk needs explicit scrutiny","الخطر المتبقي المرتفع يحتاج مراجعة صريحة",(h.hazard||"This hazard")+" remains "+risk(residual).label+" after controls.",(h.hazard||"هذا الخطر")+" ما زال بمستوى "+risk(residual).label+" بعد إجراءات التحكم."));
    });
    const type=String(b.permitType||""); const terms=expected[type]; const corpus=allHazardText(permit);
    if (terms && !includesAny(corpus,terms)) findings.push(finding("medium","Permit-type hazard coverage may be incomplete","قد تكون تغطية مخاطر نوع التصريح غير مكتملة","The recorded hazards do not clearly cover a common "+title(type)+" hazard family. Verify that no credible hazard is missing.","المخاطر المسجلة لا تغطي بوضوح مجموعة مخاطر شائعة لهذا النوع من التصاريح. تحقق من عدم وجود مخاطر محتملة مفقودة."));
    const open=requiredOpen(permit);
    if (open.length) findings.push(finding("high","Mandatory safety checks are incomplete","فحوصات السلامة الإلزامية غير مكتملة",open.length+" mandatory checklist item(s) are not confirmed.","هناك "+open.length+" عنصرًا إلزاميًا غير مؤكد في قائمة التحقق."));
    if (!permit.safetyChecklist || !permit.safetyChecklist.confirmed) findings.push(finding("medium","Checklist confirmation is missing","تأكيد قائمة التحقق مفقود","The overall checklist confirmation has not been recorded.","لم يتم تسجيل التأكيد النهائي لقائمة التحقق."));
    if (!findings.length) findings.push(finding("good","No obvious consistency gap detected","لم يتم اكتشاف فجوة واضحة في الاتساق","The recorded hazards, controls, residual risk, and mandatory checks are internally consistent. Perform your independent safety review before deciding.","المخاطر وإجراءات التحكم والمخاطر المتبقية والفحوصات الإلزامية متسقة داخليًا. نفّذ مراجعتك المستقلة قبل القرار."));
    const controlled=hs.filter(h=>String(h.controls||"").trim()).length;
    const coverage=hs.length?Math.round(controlled/hs.length*100):0;
    return {findings:findings, metrics:[
      [pick("Hazard control coverage","تغطية إجراءات التحكم"),coverage+"%"],
      [pick("Mandatory open","العناصر الإلزامية المفتوحة"),String(open.length)],
      [pick("Max residual risk","أعلى خطر متبقي"),risk(highestResidual(permit)).label]
    ], critical:findings.some(f=>f.severity==="high")};
  }
  function isApproved(permit,role) {
    return !!window.SafePermitData?.hasApprovalEvidence?.(permit,role);
  }
  function analyzeAdmin(permit) {
    const findings=[], residual=highestResidual(permit), open=requiredOpen(permit);
    if (!isApproved(permit,'supervisor')) findings.push(finding("high","Supervisor approval is not complete","موافقة المشرف غير مكتملة","Final approval should not proceed without a traceable Supervisor approval.","يجب ألا يستمر الاعتماد النهائي دون موافقة مشرف قابلة للتتبع."));
    if (!isApproved(permit,'safety')) findings.push(finding("high","Safety approval is not complete","موافقة السلامة غير مكتملة","Final approval should not proceed without a traceable Safety Officer approval.","يجب ألا يستمر الاعتماد النهائي دون موافقة مسؤول سلامة قابلة للتتبع."));
    if (permit.supervisorDecision && !String(permit.supervisorDecision.comment||"").trim()) findings.push(finding("medium","Supervisor decision has no comment","قرار المشرف دون تعليق","The approval is recorded, but the audit trail has no operational decision comment.","الموافقة مسجلة لكن سجل التدقيق لا يحتوي على تعليق للقرار التشغيلي."));
    if (permit.safetyDecision && !String(permit.safetyDecision.comment||"").trim()) findings.push(finding("medium","Safety decision has no comment","قرار السلامة دون تعليق","The approval is recorded, but the audit trail has no safety decision comment.","الموافقة مسجلة لكن سجل التدقيق لا يحتوي على تعليق لقرار السلامة."));
    if (!answers(permit).length || !permit.safetyChecklist || permit.safetyChecklist.confirmed !== true) {
      findings.push(finding("high","Safety checklist verification is missing","تأكيد قائمة تحقق السلامة مفقود","A complete, confirmed safety checklist is required for final approval. Zero open items does not mean that a checklist exists.","يلزم وجود قائمة تحقق سلامة مكتملة ومؤكدة للاعتماد النهائي."));
    }
    if (open.length) findings.push(finding("high","Mandatory checklist items remain open","عناصر إلزامية ما زالت مفتوحة","There are "+open.length+" unconfirmed mandatory checklist item(s) in the final record.","يوجد "+open.length+" عنصرًا إلزاميًا غير مؤكد في السجل النهائي."));
    if (residual>=10) findings.push(finding("medium","High residual risk remains at final review","ما زالت هناك مخاطر متبقية مرتفعة في المراجعة النهائية","The highest residual risk is "+risk(residual).label+". Confirm that the accepted controls and reviewer rationale are sufficient before deciding.","أعلى خطر متبقي هو "+risk(residual).label+". تأكد من كفاية إجراءات التحكم ومبررات المراجعين قبل القرار."));
    if (String(permit.status||"") !== "Pending Admin Approval") findings.push(finding("medium","Permit status is outside the expected final-review state","حالة التصريح خارج مرحلة المراجعة النهائية المتوقعة","Current status: "+(permit.status||"—")+". Confirm that this permit belongs in the Admin final-review queue.","الحالة الحالية: "+(permit.status||"—")+". تأكد أن التصريح ينتمي إلى قائمة المراجعة النهائية."));
    if (!findings.length) findings.push(finding("good","Final-review record looks complete","سجل المراجعة النهائية يبدو مكتملًا","Both prior approvals are recorded, mandatory checks are complete, and no obvious audit gap was detected. Make the final decision using your own judgement.","تم تسجيل الموافقتين السابقتين واكتملت الفحوصات الإلزامية ولم تظهر فجوة واضحة في التدقيق. اتخذ القرار النهائي بحكمك البشري."));
    const approvals=(isApproved(permit,'supervisor')?1:0)+(isApproved(permit,'safety')?1:0);
    return {findings:findings, metrics:[
      [pick("Prior approvals","الموافقات السابقة"),approvals+" / 2"],
      [pick("Max residual risk","أعلى خطر متبقي"),risk(residual).label],
      [pick("Mandatory open","العناصر الإلزامية المفتوحة"),String(open.length)]
    ], critical:findings.some(f=>f.severity==="high")};
  }
  function analyze(role,permit) { return role==="supervisor"?analyzeSupervisor(permit):role==="safety"?analyzeSafety(permit):analyzeAdmin(permit); }

  function render(instance, report) {
    const c=copy[instance.role], el=instance.el, p=instance.permit||{};
    const ctx=contextValues(p);
    const hasReport=!!report;
    const status=report ? (report.critical?"critical":report.findings.some(f=>f.severity==="medium")?"attention":"ready") : "";
    const statusText=status==="critical"?pick("Action required","إجراء مطلوب"):status==="attention"?pick("Review attention","تحتاج مراجعة"):pick("No obvious blocking gap","لا توجد فجوة مانعة واضحة");
    const summary=status==="critical"?pick("The assistant found one or more issues that should be resolved or explicitly reviewed before a decision.","وجد المساعد مشكلة أو أكثر يجب معالجتها أو مراجعتها بوضوح قبل اتخاذ القرار."):status==="attention"?pick("The record is reviewable, but there are points worth confirming before you decide.","يمكن مراجعة السجل، لكن توجد نقاط تستحق التأكد منها قبل القرار."):pick("The record is internally coherent based on the available data. Human review is still required.","السجل متماسك داخليًا حسب البيانات المتاحة، لكن المراجعة البشرية ما زالت مطلوبة.");
    el.setAttribute("data-role",instance.role);
    el.innerHTML = '<div class="sp-ai-role__head"><div class="sp-ai-role__identity"><div class="sp-ai-role__icon">'+esc(c.icon)+'</div><div><span class="sp-ai-role__eyebrow">'+esc(pick(c.eyebrow[0],c.eyebrow[1]))+'</span><h2>'+esc(pick(c.title[0],c.title[1]))+'</h2><p>'+esc(pick(c.desc[0],c.desc[1]))+'</p></div></div><span class="sp-ai-role__badge">AI · '+esc(pick("Advisory","استشاري"))+'</span></div>'+
      '<div class="sp-ai-role__guard"><i>✓</i><div><strong>'+esc(pick("Human decision required","القرار البشري مطلوب"))+'</strong><span>'+esc(pick(c.guard[0],c.guard[1]))+'</span></div></div>'+
      '<div class="sp-ai-role__context">'+ctx.map(function(x){return '<div><span>'+esc(x.label)+'</span><strong>'+esc(x.value)+'</strong></div>';}).join('')+'</div>'+
      '<div class="sp-ai-role__run"><div><strong>'+esc(pick(c.runTitle[0],c.runTitle[1]))+'</strong><p>'+esc(pick(c.runDesc[0],c.runDesc[1]))+'</p></div><button class="sp-btn sp-btn--secondary sp-ai-role__button" type="button"><span aria-hidden="true">✦</span> '+esc(pick(c.run[0],c.run[1]))+'</button></div>'+
      (hasReport?'<div class="sp-ai-role__results"><div class="sp-ai-role__summary" data-status="'+status+'"><div class="sp-ai-role__summary-icon">'+(status==="ready"?'✓':'!')+'</div><div><span class="sp-ai-role__status">'+esc(statusText)+'</span><h3>'+esc(pick("AI review result","نتيجة مراجعة الذكاء الاصطناعي"))+'</h3><p>'+esc(summary)+'</p></div></div><div class="sp-ai-role__metrics">'+report.metrics.map(function(m){return '<div class="sp-ai-role__metric"><span>'+esc(m[0])+'</span><strong>'+esc(m[1])+'</strong></div>';}).join('')+'</div><div class="sp-ai-role__section-title">'+esc(pick("Findings & review prompts","الملاحظات ونقاط المراجعة"))+'</div><div class="sp-ai-role__findings">'+report.findings.map(function(f){return '<article class="sp-ai-role__finding" data-severity="'+esc(f.severity)+'"><div class="sp-ai-role__finding-icon">'+(f.severity==='good'?'✓':'!')+'</div><div><strong>'+esc(f.title)+'</strong><p>'+esc(f.detail)+'</p></div></article>';}).join('')+'</div><div class="sp-ai-role__section-title">'+esc(pick("Questions to confirm yourself","أسئلة للتأكد منها بنفسك"))+'</div><div class="sp-ai-role__question-list">'+c.questions.map(function(q){return '<span class="sp-ai-role__question">'+esc(pick(q[0],q[1]))+'</span>';}).join('')+'</div><div class="sp-ai-role__note"><span>AI</span><span>'+esc(pick("Decision support only. This output does not change permit status, approvals, risk data, or mandatory workflow rules.","دعم للقرار فقط. هذه النتيجة لا تغيّر حالة التصريح أو الموافقات أو بيانات المخاطر أو قواعد سير العمل الإلزامية."))+'</span></div></div>':'');
    const btn=el.querySelector('.sp-ai-role__button');
    if(btn) btn.addEventListener('click',function(){
      btn.disabled=true; const original=btn.innerHTML; btn.textContent=pick('Reviewing permit…','جارٍ مراجعة التصريح…');
      const finish=function(){ instance.report=analyze(instance.role,instance.permit); render(instance,instance.report); };
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish(); else window.setTimeout(finish,520);
    });
  }

  function mount(options) {
    const el=document.getElementById(options.containerId||'aiRoleAssistant');
    if(!el || !copy[options.role]) return null;
    const instance={el:el,role:options.role,permit:options.permit||{},report:null};
    instances.set(el,instance); render(instance,null); return instance;
  }
  function refreshLanguage() { instances.forEach(function(instance){ render(instance,instance.report?analyze(instance.role,instance.permit):null); }); }
  document.addEventListener('safepermit:languagechange',refreshLanguage);
  window.SafePermitRoleAI={mount:mount,analyze:analyze};
})();
