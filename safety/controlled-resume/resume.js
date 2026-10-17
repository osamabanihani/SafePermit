(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const pick = (en, ar) => document.documentElement.lang === 'ar' ? ar : en;
  const tr = value => window.SafePermitI18n?.translateValue ? window.SafePermitI18n.translateValue(String(value)) : String(value);
  let current = null, snapshot = null, stops = [], busy = false, generation = 0;
  let lastFeedback = null;
  const query = new URLSearchParams(location.search).get('id');
  if (query) $('permit').value = query;
  function node(tag, text) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; return el; }
  function feedback(en, ar, error = false) {
    lastFeedback = [en, ar];
    $('result').dataset.state = error ? 'error' : 'success';
    $('result').textContent = pick(en, ar);
  }
  const labels = {
    type:['Event','الحدث'], action:['Decision','القرار'], reviewer:['Reviewer','المراجع'],
    notes:['Evidence / rationale','الأدلة / المبرر'], from:['From stage','من المرحلة'], to:['To stage','إلى المرحلة'],
    at:['Recorded at','وقت التسجيل'], reviewedAt:['Reviewed at','وقت المراجعة'], comment:['Rationale','المبرر'],
    previousStatus:['Previous stage','المرحلة السابقة'], newStatus:['Resulting stage','المرحلة الناتجة'],
    decision:['Decision','القرار'], permitId:['Permit ID','رقم التصريح'], role:['Role','الدور'],
    status:['Recorded state','الحالة المسجلة'], reason:['Mitigation evidence','أدلة المعالجة'],
    gates:['Unverified gates','بوابات غير متحقق منها'], stopworks:['Open stop-work cases','حالات إيقاف عمل مفتوحة'],
    risks:['Linked risk records','سجلات مخاطر مرتبطة'], highRisks:['High residual risks','مخاطر متبقية عالية'],
    isolations:['Unverified isolations','عزل غير متحقق منه'], missingIsolation:['Missing isolation','عزل مفقود'],
    passportsLinked:['Linked safety passports','جوازات سلامة مرتبطة'], competencyIssues:['Competency issues','مشكلات الكفاءة'],
    missingPassport:['Missing passport','جواز سلامة مفقود'], simops:['SIMOPS conflicts','تعارضات العمليات المتزامنة'],
    incidents:['Linked incidents','حوادث مرتبطة'], actions:['Linked actions','إجراءات مرتبطة'], passports:['All passport records','جميع سجلات جوازات السلامة'],
    createdAt:['Created at','وقت الإنشاء'], id:['Record ID','رقم السجل']
  };
  function valueText(value) {
    if (value === null || value === undefined || value === '') return pick('Not recorded','غير مسجل');
    if (value === 'RESUME_REVIEW') return pick('HSE resumption review','مراجعة استئناف العمل من السلامة');
    if (value === 'approve') return pick('Approve','موافقة');
    if (value === 'reject') return pick('Reject','رفض');
    return tr(value);
  }
  // Preserve all stored fields, including unfamiliar audit fields, as semantic key/value evidence.
  function record(value) {
    if (!value || typeof value !== 'object') return node('span', valueText(value));
    if (Array.isArray(value)) {
      const list = node('ol'); value.forEach(item => { const li = node('li'); li.append(record(item)); list.append(li); }); return list;
    }
    const dl = node('dl');
    for (const [key, item] of Object.entries(value)) {
      dl.append(node('dt', labels[key] ? pick(...labels[key]) : key.replace(/([A-Z])/g,' $1')));
      const dd = node('dd'); dd.append(record(item)); dl.append(dd);
    }
    return dl;
  }
  function section(parent, title, content) { parent.append(node('h3',title),content); }
  function details(title, content) {
    const disclosure = node('details'); disclosure.append(node('summary',title),content); return disclosure;
  }
  function controls() {
    const same = current && String(current.id) === $('permit').value.trim();
    $('request').disabled = busy || !same;
    $('submit').disabled = busy || !same;
    $('inspect').disabled = busy;
    for (const id of ['permit','reason','reviewer','notes','decision']) $(id).disabled = busy;
    $('result').setAttribute('aria-busy',String(busy));
  }
  function render() {
    $('resumeEvidenceTitle').textContent = pick('Permit state and safety evidence','حالة التصريح وأدلة السلامة');
    $('timelineTitle').textContent = pick('Recorded audit timeline','التسلسل الزمني المسجل للتدقيق');
    $('inspect').textContent = pick('Refresh permit status','تحديث حالة التصريح');
    $('decision').options[0].textContent = pick('Choose a decision','اختر قرارًا');
    $('decisionHelp').textContent = pick('Choose explicitly. Approval returns the permit to its previous review stage. Previously Active permits return to Pending Safety Review. This screen does not authorize site work.', 'اختر صراحةً. تعيد الموافقة التصريح إلى مرحلة المراجعة السابقة. التصاريح النشطة سابقًا تعود إلى انتظار مراجعة السلامة. هذه الشاشة لا تجيز العمل في الموقع.');
    if (lastFeedback) $('result').textContent = pick(...lastFeedback);
    const evidence = $('resumeEvidence'), timeline = $('resumeTimeline');
    evidence.replaceChildren(); timeline.replaceChildren();
    if (!current) { controls(); return; }
    evidence.append(node('h3',String(current.id)+' · '+(current.basicInfo?.workTitle || current.workTitle || pick('Untitled permit','تصريح بلا عنوان'))));
    const state = node('p',pick('Current recorded state: ','الحالة المسجلة الحالية: ')+tr(current.status));
    state.className = 'resume-current-state'; state.dataset.status = current.status; evidence.append(state);
    evidence.append(node('p',pick('Stage before stop: ','المرحلة قبل الإيقاف: ')+valueText(current.previousStatusBeforeStop)));
    evidence.append(node('p',pick('Stopping remains effective until the existing HSE workflow records a permitted transition. Closed reports or visual readiness do not authorize resumption.', 'يبقى الإيقاف نافذًا حتى يسجل مسار السلامة المعتمد انتقالًا مسموحًا. إغلاق البلاغات أو الجاهزية المرئية لا يجيز الاستئناف.')));
    const list = node('ul');
    for (const blocker of snapshot?.blockers || []) list.append(node('li',tr(blocker)));
    if (!snapshot) list.append(node('li',pick('Safety checks unavailable. Refresh and investigate before deciding.','فحوص السلامة غير متاحة. أعد التحديث والتحقيق قبل القرار.')));
    else if (!snapshot.blockers.length) list.append(node('li',pick('No blockers returned by this prototype snapshot. This is not work authorization.','لم تُرجع لقطة النموذج موانع. هذا ليس إذنًا بالعمل.')));
    section(evidence,pick('Current safety blockers','موانع السلامة الحالية'),list);
    if (snapshot?.counts) evidence.append(details(pick('Inspect linked safety evidence counts','فحص أعداد أدلة السلامة المرتبطة'),record(snapshot.counts)));
    const link = node('a',pick('Open linked safety controls','فتح ضوابط السلامة المرتبطة'));
    link.className = 'sp-btn sp-btn--secondary';
    link.href = '../risk-command-center/?id='+encodeURIComponent(current.id)+'#stopworks'; evidence.append(link);
    const stopList = node('ul');
    if (stops?.length) stops.forEach(item => {
      const li = node('li',String(item.id)+' · '+valueText(item.title)+' · '+valueText(item.status));
      li.append(details(pick('Inspect stop-work evidence','فحص أدلة إيقاف العمل'),record(item))); stopList.append(li);
    });
    section(evidence,pick('Linked stop-work records','سجلات إيقاف العمل المرتبطة'),
      stops === null ? node('p',pick('Stop-work records unavailable. Refresh before deciding.','سجلات إيقاف العمل غير متاحة. أعد التحديث قبل القرار.')) :
      stops.length ? stopList : node('p',pick('No linked stop-work records returned.','لم يتم إرجاع سجلات إيقاف عمل مرتبطة.')));
    const approvals = node('ol');
    for (const [role,en,ar] of [['supervisor','Supervisor','المشرف'],['safety','Safety','السلامة'],['admin','Admin','الإدارة']]) {
      const li = node('li');
      li.append(node('h4',pick(en,ar)),node('p',window.SafePermitData.hasApprovalEvidence(current,role)
        ? pick('Documented approval shape present; sequence and current-cycle validity remain subject to existing checks.','شكل الموافقة الموثقة موجود؛ يظل التسلسل وصلاحية الدورة الحالية خاضعين للفحوص المعتمدة.')
        : pick('No valid documented approval for this stage.','لا توجد موافقة موثقة صالحة لهذه المرحلة.')),
        node('p',valueText(current[role+'Decision']?.reviewer)+' · '+valueText(current[role+'Decision']?.reviewedAt)),
        details(pick('Inspect recorded approval evidence','فحص أدلة الموافقة المسجلة'),record(current[role+'Decision']))); approvals.append(li);
    }
    section(evidence,pick('Previous recorded approval stages','مراحل الموافقة المسجلة السابقة'),approvals);
    if (current.resumeRequest) section(evidence,pick('Current resume request','طلب الاستئناف الحالي'),record(current.resumeRequest));
    if (current.resumeReview) evidence.append(details(pick('Latest HSE decision snapshot','لقطة قرار السلامة الأخير'),record(current.resumeReview)));
    const audit = Array.isArray(current.auditTrail) ? current.auditTrail : [];
    audit.forEach((event,index) => {
      const li = node('li'); li.dataset.auditIndex = index;
      li.append(node('h3',valueText(event?.type || pick('Recorded event','حدث مسجل'))),record(event)); timeline.append(li);
    });
    if (!audit.length) timeline.append(node('li',pick('No audit events recorded. Approval snapshots above are not invented audit events.','لم تُسجل أحداث تدقيق. لقطات الموافقات أعلاه ليست أحداث تدقيق مستحدثة.')));
    controls();
  }
  async function inspect() {
    const token = ++generation, id = $('permit').value.trim();
    $('decision').value = '';
    current = null; snapshot = null; stops = []; render();
    feedback('Loading permit and safety evidence…','جارٍ تحميل التصريح وأدلة السلامة…');
    const p = await SafePermitData.repository.getPermit(id);
    if (token !== generation || id !== $('permit').value.trim()) return;
    if (!p) { feedback('Permit not found in submitted demo repository.','لم يُعثر على التصريح في مستودع النموذج.',true); return; }
    const [review, records] = await Promise.allSettled([SafePermitWorkflow.getReview(id),SafePermitSafety.list('stopworks')]);
    if (token !== generation || id !== $('permit').value.trim()) return;
    current = p;
    snapshot = review.status === 'fulfilled' && Array.isArray(review.value?.blockers) ? review.value : null;
    stops = records.status === 'fulfilled' ? records.value.filter(item => String(item.permitId) === id) : null;
    render();
    if (!snapshot || records.status === 'rejected') feedback('Evidence could not be fully loaded. Refresh before deciding.','تعذر تحميل الأدلة بالكامل. أعد التحديث قبل القرار.',true);
    else feedback('Permit and safety evidence loaded. Review before recording a decision.','تم تحميل التصريح وأدلة السلامة. راجعها قبل تسجيل القرار.');
  }
  async function run(action) {
    if (busy) return;
    busy = true; controls();
    try { await action(); }
    catch (error) { feedback('Action rejected: '+tr(error.message),'تم رفض الإجراء: '+tr(error.message),true); $('result').focus({preventScroll:true}); }
    finally { busy = false; controls(); }
  }
  async function refreshAfterSave(en, ar) {
    try { await inspect(); feedback(en, ar); }
    catch (_) {
      current = null; snapshot = null; render();
      feedback(en+' Evidence refresh failed; reload before another action.', ar+' فشل تحديث الأدلة؛ أعد التحميل قبل إجراء آخر.',true);
    }
    $('result').focus({preventScroll:true});
  }
  function required(ids) {
    ids.forEach(id => $(id).setAttribute('aria-invalid',String(!$(id).value.trim())));
    const invalid = ids.find(id => !$(id).value.trim());
    if (!invalid) return true;
    feedback('Complete the required fields and explicitly choose a decision where requested.','أكمل الحقول المطلوبة واختر القرار صراحةً عند طلبه.',true);
    for (const id of ids) $(id).setAttribute('aria-describedby', id === 'decision' ? 'decisionHelp result' : 'result');
    $(invalid).focus(); return false;
  }
  $('request').onclick = () => {
    if (!required(['permit','reason'])) return;
    run(async () => {
      await SafePermitWorkflow.requestResume($('permit').value,$('reason').value);
      $('decision').value = '';
      await refreshAfterSave('Resume request saved locally. The permit remains Stopped pending HSE review.','تم حفظ طلب الاستئناف محليًا. يظل التصريح موقوفًا بانتظار مراجعة السلامة.');
    });
  };
  $('submit').onclick = () => {
    if (!required(['permit','reviewer','notes','decision'])) return;
    run(async () => {
      const updated = await SafePermitWorkflow.decideResume($('permit').value,$('decision').value,$('reviewer').value,$('notes').value);
      $('decision').value = '';
      await refreshAfterSave('HSE decision saved locally. Resulting stage: '+tr(updated.status)+'. Check the existing workflow before any work.', 'تم حفظ قرار السلامة محليًا. المرحلة الناتجة: '+tr(updated.status)+'. تحقق من المسار المعتمد قبل أي عمل.');
    });
  };
  $('inspect').onclick = () => run(inspect);
  $('permit').addEventListener('input',() => { ++generation; current = null; snapshot = null; $('decision').value = ''; render(); });
  $('permit').addEventListener('change',() => run(inspect));
  document.addEventListener('safepermit:languagechange',render);
  document.addEventListener('safepermit:i18nready',render);
  render();
  if (query) run(inspect); else feedback('Enter a permit ID and refresh its evidence.','أدخل رقم التصريح وحدّث أدلته.');
})();
