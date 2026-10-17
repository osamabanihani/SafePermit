(function () {
  'use strict';
  const listEl = document.getElementById('activePermitList');
  const search = document.getElementById('permitSearch');
  const filter = document.getElementById('statusFilter');
  const demo = [
    {id:'PTW-1042',worker:'Omar Khalid',type:'Electrical Maintenance',site:'Plant A · Unit 3',status:'Approved',end:'2026-10-10T17:00:00'},
    {id:'PTW-1039',worker:'Lina Odeh',type:'Hot Work',site:'Factory B · Welding Bay',status:'Active',end:'2026-10-10T12:30:00'},
    {id:'PTW-1031',worker:'Yazan Ali',type:'Working at Height',site:'Plant A · Roof Zone',status:'Active',end:'2026-10-10T15:00:00'},
    {id:'PTW-1028',worker:'Maya Saleh',type:'Confined Space',site:'Utility Area · Tank 2',status:'Closed',end:'2026-10-09T11:00:00'}
  ];
  const visibleStatuses = new Set(['Approved','Active','Closed','Stopped']);
  let entries = [];
  let operationPending = false;
  let readinessRun = 0;
  function readJson(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key)); return value === null ? fallback : value; }
    catch (_) { return fallback; }
  }
  function normalize(p) {
    const b = p.basicInfo || {};
    return {id:String(p.id),worker:b.workerName||p.workerName||b.requestedBy||p.worker||'Worker',
      type:b.workTitle||p.workTitle||b.workType||b.permitType||p.permitType||p.type||'General Work',
      site:[b.site,b.area].filter(Boolean).join(' · ')||p.site||p.area||p.location||'Site',
      status:p.status||'Approved',end:(b.endDate||b.endTime ? (b.endDate&&b.endTime ? b.endDate+'T'+b.endTime : '') : (p.end||p.endDateTime||'')),
      previousStatusBeforeStop:p.previousStatusBeforeStop||'',stopWorkCaseId:p.stopWorkCaseId||''};
  }
  function escapeText(value) {
    return String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function lifecycleMap() { const map=readJson('safePermitAdminLifecycle',{}); return map && typeof map==='object'&&!Array.isArray(map)?map:{}; }
  async function loadEntries() {
    const map = new Map(demo.map(item=>[item.id,normalize(item)]));
    // Canonical submitted records override fixture and archived records.
    const repo = window.SafePermitData && window.SafePermitData.repository;
    let known = [];
    if (repo && typeof repo.listKnownPermits === 'function') known = await repo.listKnownPermits();
    else known = readJson('safePermitSubmittedPermits',[]);
    if (!Array.isArray(known)) known = [];
    known.forEach(p=>{if(p&&p.id)map.set(String(p.id),normalize(p));});
    const canonicalIds=new Set(repo && typeof repo.listPermits==='function' ?
      (await repo.listPermits()).filter(p=>p&&p.id).map(p=>String(p.id)) : []);
    const states=lifecycleMap();
    return [...map.values()].map(p => {
      const override=states[p.id];
      // Never override a canonical stopped permit with an older lifecycle cache.
      if(!canonicalIds.has(p.id) && p.status!=='Stopped' && override && override.status && p.status!=='Rejected') return {...p,status:override.status};
      return p;
    }).filter(p=>visibleStatuses.has(p.status));
  }
  // Fail closed on absent, malformed, or date-only expiration values for activation.
  function expirationCheck(value, now = Date.now()) {
    if (typeof value !== 'string' || !value.trim()) return {valid:false,reason:'Permit end date and time are missing.'};
    const text = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(text)) {
      return {valid:false,reason:'A complete permit end date and time are required.'};
    }
    const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(text);
    const [year,month,day,hour,minute,second]=[+parts[1],+parts[2],+parts[3],+parts[4],+parts[5],+(parts[6]||0)];
    const calendar = new Date(Date.UTC(year,month-1,day));
    if (calendar.getUTCFullYear()!==year || calendar.getUTCMonth()!==month-1 ||
        calendar.getUTCDate()!==day || hour>23 || minute>59 || second>59) {
      return {valid:false,reason:'Invalid permit expiration date or time.'};
    }
    const expiresAt = new Date(text).getTime();
    if (!Number.isFinite(expiresAt)) return {valid:false,reason:'Permit expiration is invalid.'};
    if (expiresAt <= now) return {valid:false,reason:'Permit expired on '+new Date(expiresAt).toLocaleString()+'. Activation is blocked.'};
    return {valid:true,expiresAt};
  }
  // Frontend demo defense-in-depth: never activate without documented safety evidence.
  function activationMessage(en, ar) {
    return (document.documentElement.lang || '').toLowerCase().startsWith('ar') ? ar : en;
  }
  function activationEvidenceCheck(permit) {
    if (!permit || permit.status !== 'Approved') return {valid:false,reason:activationMessage('Permit is not Approved.','التصريح غير معتمد.')};
    const data=window.SafePermitData;
    if (!data || typeof data.hasApprovalEvidence !== 'function' ||
        !['supervisor','safety','admin'].every(role=>data.hasApprovalEvidence(permit,role)) ||
        typeof data.hasCoherentApprovalTrail !== 'function' ||
        !data.hasCoherentApprovalTrail(permit,['supervisor','safety','admin'])) {
      return {valid:false,reason:activationMessage('Documented Supervisor, Safety and Admin approvals are required.','يلزم توثيق موافقات المشرف ومسؤول السلامة والإدارة.')};
    }
    if (typeof data.hasCompleteChecklist !== 'function' || !data.hasCompleteChecklist(permit)) {
      return {valid:false,reason:activationMessage('A complete, confirmed safety checklist linked to this permit is required.','يلزم وجود قائمة تحقق سلامة مكتملة ومؤكدة ومرتبطة بهذا التصريح.')};
    }
    if (typeof data.hasAcceptableRisk !== 'function' || !data.hasAcceptableRisk(permit)) {
      return {valid:false,reason:activationMessage('Risk assessment is missing, invalid, or has unacceptable residual risk.','تقييم المخاطر مفقود أو غير صالح أو يحتوي على خطر متبقٍ غير مقبول.')};
    }
    if (typeof data.validateBasicInfo !== 'function' || Object.keys(data.validateBasicInfo(permit.basicInfo)).length) {
      return {valid:false,reason:activationMessage('Basic Info is invalid. Review required fields, schedule and worker count (1–50) through correction before activation.','المعلومات الأساسية غير صالحة. راجع الحقول المطلوبة والجدول وعدد العمال (١–٥٠) عبر مسار التصحيح قبل التفعيل.')};
    }
    return {valid:true};
  }
  async function activationSafetyCheck(id, permit) {
    const evidence = activationEvidenceCheck(permit);
    if (!evidence.valid) throw new Error(evidence.reason);
    if (!window.SafePermitWorkflow || typeof window.SafePermitWorkflow.getReview !== 'function') {
      throw new Error(activationMessage('Integrated safety review is unavailable. Activation blocked.','مراجعة السلامة المتكاملة غير متاحة. تم منع التفعيل.'));
    }
    const review = await window.SafePermitWorkflow.getReview(id);
    if (!review || !Array.isArray(review.blockers)) {
      throw new Error(activationMessage('Integrated safety review could not confirm clearance.','تعذّر تأكيد اجتياز مراجعة السلامة المتكاملة.'));
    }
    // English source text; the alert is localized (prefix and each blocker) via SafePermitI18n.
    if (review.blockers.length) throw new Error('Safety blockers: '+review.blockers.join('; '));
    if (review.eligibleForDemoApproval !== true) throw new Error(activationMessage('Integrated safety review has not cleared activation.','لم تسمح مراجعة السلامة المتكاملة بالتفعيل.'));
  }
  function isExpiring(p) {
    if(p.status!=='Active'||!p.end)return false;
    const duration=new Date(p.end)-new Date();
    return Number.isFinite(duration)&&duration>0&&duration<=14400000;
  }
  function render() {
    const query=search.value.trim().toLowerCase(),state=filter.value;
    const filtered=entries.filter(p=>(!query||[p.id,p.worker,p.site,p.type].join(' ').toLowerCase().includes(query))&&(!state||p.status===state));
    for(const [id,status] of [['approvedCount','Approved'],['activeCount','Active'],['closedCount','Closed'],['stoppedCount','Stopped']]) {
      const el=document.getElementById(id);if(el)el.textContent=entries.filter(p=>p.status===status).length;
    }
    document.getElementById('expiringCount').textContent=entries.filter(isExpiring).length;
    if(!filtered.length){listEl.innerHTML='<div class="active-empty">No permits match the current filters.</div>';return;}
    listEl.innerHTML=filtered.map(p=>{
      const validity=expirationCheck(p.end);
      const expiredActive=p.status==='Active' && !validity.valid;
      const note=p.status==='Stopped' ? '<p class="active-stop-note">On hold — previous status: '+escapeText(p.previousStatusBeforeStop||'Unknown')+'. Resumption requires authorized review.</p>' : '';
      return '<article class="active-card"><div><h3>'+escapeText(p.id)+'</h3><p>'+escapeText(p.type)+' · '+escapeText(p.worker)+'</p>'+note+'</div>'+
      '<div class="active-meta"><span>Site / Area</span><strong>'+escapeText(p.site)+'</strong></div>'+
      '<div class="active-meta"><span>Status</span><strong><span class="active-status" data-status="'+escapeText(p.status)+'">'+escapeText(p.status)+'</span></strong></div>'+
      '<div class="active-meta"><span>End / validity</span><strong>'+escapeText(p.end&&Number.isFinite(new Date(p.end).getTime())?new Date(p.end).toLocaleString():'—')+'</strong>'+(expiredActive?'<small>Expired or unverified validity — do not rely on this Active status for work.</small>':'')+'</div>'+ 
      '<div class="active-actions"><a class="sp-btn sp-btn--secondary" href="../review-permit/?id='+encodeURIComponent(p.id)+'">View</a>'+
      (p.status==='Approved'?'<button class="sp-btn sp-btn--primary" data-action="activate" data-id="'+escapeText(p.id)+'"'+(!validity.valid?' disabled title="'+escapeText(validity.reason)+'"':'')+'>Activate</button>':'')+
      (p.status==='Active'?'<button class="sp-btn sp-btn--primary" data-action="close" data-id="'+escapeText(p.id)+'">Close Permit</button>':'')+'</div>'+ (p.status==='Approved'?'<section class="activation-readiness" data-readiness="'+escapeText(p.id)+'" aria-label="Activation checks" data-i18n-ignore><p role="status">'+activationMessage('Pending activation checks…','فحوص التفعيل قيد الانتظار…')+'</p></section>':'')+'</article>';
    }).join('');
    updateReadiness();
  }
  async function updateReadiness() {
    const run = ++readinessRun;
    if (!listEl.querySelectorAll) return;
    const boxes = [...listEl.querySelectorAll('[data-readiness]')];
    await Promise.all(boxes.map(async box => {
      const id = box.dataset.readiness;
      const restoreFocus = box.contains(document.activeElement);
      box.dataset.state = 'pending'; box.setAttribute('aria-busy','true');
      const progress = box.querySelector('[role=status]');
      if (progress) progress.textContent = activationMessage('Pending activation checks…','فحوص التفعيل قيد الانتظار…');
      const retry = box.querySelector('[data-action=recheck]'); if (retry) retry.disabled = true;
      const checks = [];
      let failed = false;
      try {
        const p = await window.SafePermitData?.repository?.getPermit(id);
        if (!p) throw Error(activationMessage('Canonical permit record unavailable.','سجل التصريح الأساسي غير متاح.'));
        checks.push([p.status === 'Approved', activationMessage('Approved lifecycle recorded; approval alone does not activate work.','حالة الاعتماد مسجلة؛ الاعتماد وحده لا يفعّل العمل.')]);
        const validity = expirationCheck(normalize(p).end);
        checks.push([validity.valid, validity.valid ? activationMessage('End date and time are current.','تاريخ ووقت الانتهاء صالحان حاليًا.') : validity.reason]);
        for (const role of ['supervisor','safety','admin']) checks.push([
          window.SafePermitData.hasApprovalEvidence(p,role),
          activationMessage('Documented approval: ','الموافقة الموثقة: ') + activationMessage(role, {supervisor:'المشرف',safety:'السلامة',admin:'الإدارة'}[role])
        ]);
        checks.push([window.SafePermitData.hasCoherentApprovalTrail(p,['supervisor','safety','admin']),activationMessage('Approval sequence and evidence chronology.','تسلسل الموافقات والترتيب الزمني للأدلة.')]);
        checks.push([window.SafePermitData.hasCompleteChecklist(p),activationMessage('Complete confirmed safety checklist.','قائمة تحقق سلامة مكتملة ومؤكدة.')]);
        checks.push([window.SafePermitData.hasAcceptableRisk(p),activationMessage('Acceptable residual risk assessment.','تقييم المخاطر المتبقية مقبول.')]);
        checks.push([Object.keys(window.SafePermitData.validateBasicInfo(p.basicInfo)).length === 0,
          activationMessage('Valid Basic Info, schedule and worker count (1–50).','المعلومات الأساسية والجدول وعدد العمال (١–٥٠) صالحة.')]);
        const review = await window.SafePermitWorkflow?.getReview(id);
        if (!review || !Array.isArray(review.blockers)) throw Error(activationMessage('Integrated safety checks unavailable.','فحوص السلامة المتكاملة غير متاحة.'));
        checks.push([review.eligibleForDemoApproval === true && !review.blockers.length,
          review.blockers.length ? review.blockers.join('; ') : activationMessage('Integrated safety checks cleared.','تم اجتياز فحوص السلامة المتكاملة.')]);
      } catch (e) { failed = true; checks.push([false,String(e.message || e)]); }
      if (run !== readinessRun || !box.isConnected) return;
      const ready = !failed && checks.every(([ok]) => ok);
      box.dataset.state = failed ? 'error' : ready ? 'ready' : 'blocked';
      box.setAttribute('aria-busy','false');
      const tr = text => window.SafePermitI18n?.translateValue ? window.SafePermitI18n.translateValue(text) : text;
      box.setAttribute('aria-label', activationMessage('Activation checks','فحوص التفعيل'));
      box.innerHTML = '<h4>'+activationMessage('Activation checks','فحوص التفعيل')+'</h4><p role="status">'+
        activationMessage(failed?'Checks failed. Retry before attempting activation.':ready?'Checks passed for this snapshot. Activate rechecks immediately before saving.':'Activation blocked. Review the failed conditions below.',
          failed?'فشلت الفحوص. أعد المحاولة قبل التفعيل.':ready?'اجتازت هذه اللقطة الفحوص. يعاد التحقق فورًا قبل حفظ التفعيل.':'التفعيل محظور. راجع الشروط غير المستوفاة أدناه.')+'</p><ul>'+checks.map(([ok,text])=>'<li data-check="'+(ok?'passed':'blocked')+'">'+escapeText(activationMessage(ok?'Passed: ':'Blocked: ',ok?'مستوفى: ':'غير مستوفى: ')+tr(text))+'</li>').join('')+'</ul>'+
        '<p>'+activationMessage('Prototype checks do not authorize site work. Correct evidence through its existing review workflow.','فحوص النموذج لا تجيز العمل في الموقع. صحح الأدلة عبر مسار المراجعة المعتمد.')+'</p>'+
        '<a class="sp-btn sp-btn--secondary" href="../review-permit/?id='+encodeURIComponent(id)+'">'+activationMessage('Review permit and evidence','مراجعة التصريح والأدلة')+'</a> '+
        '<button type="button" class="sp-btn sp-btn--secondary" data-action="recheck">'+activationMessage('Recheck readiness','إعادة فحص الجاهزية')+'</button>';
      if (restoreFocus) box.querySelector('[data-action=recheck]').focus({preventScroll:true});
    }));
  }
  function operationFeedback(text, error) {
    const node = document.getElementById('activationFeedback');
    if (!node) return;
    node.dataset.state = error ? 'error' : 'success';
    node.textContent = window.SafePermitI18n?.translateValue ? window.SafePermitI18n.translateValue(text) : text;
  }
  async function refresh() {
    listEl.dataset.listState='loading';
    try {entries=await loadEntries();render();listEl.dataset.listState='ready';}
    catch(e){listEl.dataset.listState='error';listEl.textContent='Unable to load permits. '+String(e.message||e);}
  }
  async function saveStatus(id,status) {
    const record=entries.find(p=>p.id===id);
    if(!record || !((status==='Active'&&record.status==='Approved')||(status==='Closed'&&record.status==='Active')))return;
    if(status==='Active'&&!expirationCheck(record.end).valid) throw new Error(expirationCheck(record.end).reason);
    // Legacy demo lifecycle operations. Never activate a stopped permit from this view.
    const repository=window.SafePermitData?.repository;
    const existing=repository&&await repository.getPermit(id);
    if (status==='Active') {
      // Re-read canonical permit and expiration immediately before attempting the write.
      const latest=existing?normalize(existing):record;
      const validity=expirationCheck(latest.end);
      if (!validity.valid) throw new Error(validity.reason);
      if (!existing) throw new Error(activationMessage('Canonical permit record is unavailable. Activation blocked.','سجل التصريح الأساسي غير متاح. تم منع التفعيل.'));
      if (existing.status!=='Approved') throw new Error('Permit is no longer Approved. Reload before activation.');
      await activationSafetyCheck(id, existing);
    }
    if(existing){
      if (existing.status !== record.status) throw new Error('Permit state changed; reload before updating.');
      await repository.savePermit({...existing,status,updatedAt:new Date().toISOString()});
    }
    else {
      const states=lifecycleMap();states[id]={status,updatedAt:new Date().toISOString()};
      localStorage.setItem('safePermitAdminLifecycle',JSON.stringify(states));
    }
    await refresh();
  }
  listEl.addEventListener('click',async e=>{
    const button=e.target.closest('[data-action]');if(!button || operationPending)return;
    if(button.dataset.action==='recheck') { await updateReadiness(); return; }
    operationPending=true; button.disabled=true;
    listEl.setAttribute('aria-busy','true');
    operationFeedback(activationMessage('Checking and saving permit update…','جارٍ التحقق وحفظ تحديث التصريح…'),false);
    try {
      await saveStatus(button.dataset.id,button.dataset.action==='activate'?'Active':'Closed');
      operationFeedback(activationMessage('Permit update saved locally. Verify current validity and safety controls before work.','تم حفظ تحديث التصريح محليًا. تحقق من الصلاحية الحالية وضوابط السلامة قبل العمل.'),false);
      document.getElementById('activationFeedback')?.focus({preventScroll:true});
    } catch(error) {
      operationFeedback(activationMessage('Unable to update permit: ','تعذر تحديث التصريح: ')+error.message,true);
      button.disabled=false;
      document.getElementById('activationFeedback')?.focus({preventScroll:true});
    } finally { operationPending=false; listEl.setAttribute('aria-busy','false'); }
  });
  document.addEventListener?.('safepermit:languagechange',updateReadiness);
  search.addEventListener('input',render);
  filter.addEventListener('change',render);
  document.getElementById('resetFilters').addEventListener('click',()=>{search.value='';filter.value='';render();});
  const sidebar=document.getElementById('adminSidebar'),overlay=document.getElementById('adminOverlay');
  document.getElementById('sidebarOpen')?.addEventListener('click',()=>{sidebar.classList.add('is-open');overlay.classList.add('is-open');});
  document.getElementById('sidebarClose')?.addEventListener('click',()=>{sidebar.classList.remove('is-open');overlay.classList.remove('is-open');});
  overlay?.addEventListener('click',()=>{sidebar.classList.remove('is-open');overlay.classList.remove('is-open');});
  window.addEventListener('safepermit:permits-updated',refresh);
  window.addEventListener('storage',refresh);
  let requestedStatus='';
  try{requestedStatus=(new URLSearchParams(location.search).get('status')||'').toLowerCase();}catch(_){/* no URL context: show all */}
  const option=requestedStatus&&filter.options?Array.from(filter.options).find(o=>o.value&&o.value.toLowerCase()===requestedStatus):null;
  if(option)filter.value=option.value;
  refresh();
})();
