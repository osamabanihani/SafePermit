// v12.9.8 QA regression tests. Each test reproduces a defect confirmed on v12.9.7.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {decision,safety}=require('./qa-evidence-fixtures.cjs');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
function environment(){
 const store=new Map();
 const ctx={console,Map,Set,Promise,Date,JSON,CustomEvent:class{constructor(n,o){this.type=n;this.detail=o?.detail}},dispatchEvent(){},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}};
 ctx.window=ctx;ctx.document={documentElement:{lang:'en'}};vm.createContext(ctx);
 for(const f of ['shared/js/data-adapter.js','shared/js/safety-suite-store.js','shared/js/safety-workflow.js','shared/js/incident-workflow.js'])vm.runInContext(read(f),ctx);
 return {ctx,store,data:ctx.SafePermitData,safety:ctx.SafePermitSafety,workflow:ctx.SafePermitWorkflow,incidents:ctx.SafePermitIncidents};
}
const full=(id,status='Approved',extra={})=>({id,status,...safety(id),
 supervisorDecision:decision(id,'supervisor'),safetyDecision:decision(id,'safety'),adminDecision:decision(id,'admin'),
 basicInfo:{...require('./qa-evidence-fixtures.cjs').basicInfo(),site:'plant-a',area:'unit-3',startDate:'2099-10-15',startTime:'08:00',endDate:'2099-10-15',endTime:'17:00',workTitle:'QA'},...extra});
async function stoppedWithPendingResume(e,id,previous='Active'){
 e.data.savePermit(full(id,previous));
 const stop=await e.workflow.recordStopWork({permitId:id,title:'Gas alarm'});
 await e.safety.upsert('stopworks',{...stop,status:'Closed'});
 await e.workflow.requestResume(id,'Gas test clear, controls re-verified');
 return stop;
}

// QA-001: Controlled Resume approval was impossible (pending request blocked its own decision).
test('controlled resume: HSE approval of the pending request succeeds and re-enters review',async()=>{
 const e=environment();await stoppedWithPendingResume(e,'PTW-8001');
 const updated=await e.workflow.decideResume('PTW-8001','approve','HSE Lead','Atmosphere re-tested, isolation verified');
 assert.equal(updated.status,'Pending Safety Review');
 assert.equal(updated.resumeRequest.status,'Approved');
 assert.equal(updated.auditTrail.at(-1).type,'RESUME_REVIEW');
});
test('controlled resume: other blockers still refuse approval',async()=>{
 const e=environment();await stoppedWithPendingResume(e,'PTW-8002');
 await e.safety.upsert('gates',{title:'Gas test',permitId:'PTW-8002',status:'Open'});
 await assert.rejects(e.workflow.decideResume('PTW-8002','approve','HSE Lead','checked'),/Unverified safety gates/);
 assert.equal(e.data.getPermit('PTW-8002').status,'Stopped');
});
test('controlled resume: a closed stop-work alone never resumes the permit',async()=>{
 const e=environment();e.data.savePermit(full('PTW-8003','Active'));
 const stop=await e.workflow.recordStopWork({permitId:'PTW-8003',title:'x'});
 await e.safety.upsert('stopworks',{...stop,status:'Closed'});
 assert.equal(e.data.getPermit('PTW-8003').status,'Stopped');
 await assert.rejects(e.workflow.decideResume('PTW-8003','approve','HSE','x'),/No pending HSE resume request/);
});

// QA-002 / QA-003: audit records could be deleted to bypass closure and resume rules.
test('stop-work records cannot be deleted; resume still requires closure',async()=>{
 const e=environment();e.data.savePermit(full('PTW-8010','Active'));
 const stop=await e.workflow.recordStopWork({permitId:'PTW-8010',title:'x'});
 await assert.rejects(e.safety.remove('stopworks',stop.id),/retained for audit/);
 assert.equal((await e.safety.list('stopworks')).length,1);
 await assert.rejects(e.workflow.requestResume('PTW-8010','fixed'),/must be closed/);
});
test('stop-work transactional rollback still removes a record whose permit write failed',async()=>{
 const e=environment();e.data.savePermit(full('PTW-8011','Active'));
 // Simulate a storage failure on the permit write only.
 const failing=Object.freeze({...e.ctx.SafePermitData.repository,savePermit:()=>Promise.reject(new Error('quota'))});
 e.ctx.SafePermitData={...e.ctx.SafePermitData,repository:failing};
 await assert.rejects(e.workflow.recordStopWork({permitId:'PTW-8011',title:'x'}),/quota/);
 assert.equal((await e.safety.list('stopworks')).length,0);
});
test('incident cannot be closed by deleting an unverified mandatory corrective action',async()=>{
 const e=environment();
 const inc=await e.safety.upsert('incidents',{title:'Near miss',status:'Open'});
 const a1=await e.incidents.addAction(inc.id,{title:'Guard',owner:'A',due:'2026-11-01'});
 const a2=await e.incidents.addAction(inc.id,{title:'Retrain',owner:'B',due:'2026-11-01'});
 await e.incidents.verifyAction(a1.id,{reviewer:'HSE',evidence:'Photo'});
 await assert.rejects(e.safety.remove('actions',a2.id),/retained for audit/);
 await assert.rejects(e.incidents.closeIncident(inc.id,{reviewer:'HSE',evidence:'done'}),/must be verified/);
});
test('unlinked compliance findings remain deletable (no unrelated behavior change)',async()=>{
 const e=environment();const a=await e.safety.upsert('actions',{title:'Audit finding',status:'Open'});
 assert.equal(await e.safety.remove('actions',a.id),true);
});

// QA-004: stop-work/gate/risk links ignored case and whitespace differences.
for(const [label,permitId] of [['trailing space','PTW-8020 '],['lower case','ptw-8020'],['leading space',' PTW-8020']]){
 test('stop-work linked with '+label+' still blocks approval',async()=>{
  const e=environment();e.data.savePermit(full('PTW-8020'));
  await e.safety.upsert('stopworks',{title:'x',permitId,status:'In Review'});
  const review=await e.workflow.getReview('PTW-8020');
  assert.equal(review.eligibleForDemoApproval,false);
  assert.ok(review.blockers.includes('Active stop-work case'));
 });
}
test('blank permit links never match a permit',async()=>{
 const e=environment();e.data.savePermit(full('PTW-8021'));
 await e.safety.upsert('gates',{title:'x',permitId:'  ',status:'Open'});
 assert.deepEqual((await e.workflow.getReview('PTW-8021')).blockers,[]);
});

// QA-005: automatic SIMOPS detection ignored submitted permits (fields live in basicInfo).
test('auto SIMOPS detects overlapping submitted permits in the same site/area',async()=>{
 const e=environment();e.data.savePermit(full('PTW-8030'));e.data.savePermit(full('PTW-8031','Pending Supervisor Review'));
 const review=await e.workflow.getReview('PTW-8030');
 assert.ok(review.blockers.includes('SIMOPS conflict review required'));
 assert.equal(review.conflicts[0].overlap,'confirmed-time-overlap');
});
test('auto SIMOPS ignores a different area and non-overlapping schedules',async()=>{
 const e=environment();e.data.savePermit(full('PTW-8032'));
 const other=full('PTW-8033','Pending Supervisor Review');other.basicInfo={...other.basicInfo,area:'unit-9'};e.data.savePermit(other);
 const later=full('PTW-8034','Pending Supervisor Review');later.basicInfo={...later.basicInfo,startDate:'2099-10-16',endDate:'2099-10-16'};e.data.savePermit(later);
 assert.deepEqual((await e.workflow.getReview('PTW-8032')).blockers,[]);
});
test('auto SIMOPS conflict cleared only by a resolved HSE review',async()=>{
 const e=environment();e.data.savePermit(full('PTW-8035'));e.data.savePermit(full('PTW-8036','Pending Supervisor Review'));
 await e.safety.upsert('conflicts',{id:'SIM-PTW-8035-PTW-8036',title:'Reviewed',status:'Resolved'});
 assert.deepEqual((await e.workflow.getReview('PTW-8035')).blockers,[]);
});

// QA-006: contradictory approval evidence (future-dated, out of order, previous cycle) was accepted.
test('future-dated approval decisions are not evidence',()=>{
 const {data}=environment();const p=full('PTW-8040');p.adminDecision.reviewedAt='2099-01-01T00:00:00.000Z';
 assert.equal(data.hasApprovalEvidence(p,'admin'),false);
});
test('approval trail must follow Supervisor, Safety, Admin order',()=>{
 const {data}=environment();const p=full('PTW-8041');
 assert.equal(data.hasCoherentApprovalTrail(p,['supervisor','safety','admin']),true);
 p.supervisorDecision.reviewedAt='2026-10-13T10:00:00.000Z';
 assert.equal(data.hasCoherentApprovalTrail(p,['supervisor','safety','admin']),false);
});
test('approvals that predate the latest resubmission are rejected',()=>{
 const {data}=environment();const p=full('PTW-8042','Pending Supervisor Review');p.resubmittedAt='2026-10-13T09:30:00.000Z';
 assert.equal(data.hasCoherentApprovalTrail(p,['supervisor']),false);
 p.resubmittedAt='not-a-date';assert.equal(data.hasCoherentApprovalTrail(p,['supervisor']),false);
});
test('repository refuses an Admin approval whose prior decisions are out of order',async()=>{
 const e=environment();const p=full('PTW-8043','Pending Admin Approval');delete p.adminDecision;
 p.safetyDecision.reviewedAt='2026-10-13T08:00:00.000Z';e.data.savePermit(p);
 await assert.rejects(e.data.repository.applyDecision(decision('PTW-8043','admin'),'admin'),/out of order/);
 assert.equal(e.data.getPermit('PTW-8043').status,'Pending Admin Approval');
});
test('activation evidence check refuses an out-of-order approval trail',()=>{
 const e=environment();const src=read('admin/active-permits/active-permits.js');
 vm.runInContext(src.slice(src.indexOf('  function activationMessage('),src.indexOf('  async function activationSafetyCheck(')),e.ctx);
 const p=full('PTW-8044');assert.equal(e.ctx.activationEvidenceCheck(p).valid,true);
 p.safetyDecision.reviewedAt='2026-10-13T08:00:00.000Z';
 assert.equal(e.ctx.activationEvidenceCheck(p).valid,false);
});
test('resubmission clears prior-cycle decisions from the active record',()=>{
 const {data}=environment();const p=full('PTW-8045','Returned for Correction');data.savePermit(p);
 const src=read('worker/create-permit/review-submit/review-submit.js');
 assert.match(src,/supervisorDecision: null,\s*safetyDecision: null,\s*adminDecision: null/);
 data.savePermit({id:'PTW-8045',status:'Pending Supervisor Review',supervisorDecision:null,safetyDecision:null,adminDecision:null,workflowHistory:[{revision:1,supervisorDecision:p.supervisorDecision}]});
 const after=data.getPermit('PTW-8045');
 assert.equal(['supervisor','safety','admin'].some(r=>data.hasApprovalEvidence(after,r)),false);
 assert.equal(after.workflowHistory[0].supervisorDecision.decision,'approve');
});
test('resubmission re-checks the live permit status before saving',()=>{
 const src=read('worker/create-permit/review-submit/review-submit.js');
 assert.match(src,/live\.status !== "Returned for Correction"/);
});

// QA-007: risk bands disagreed between modules for scores 15-16; missing score shown as Low.
test('Risk Command Center bands match the shared risk engine for every score',()=>{
 const e=environment();vm.runInContext(read('shared/js/risk-engine.js'),e.ctx);
 const src=read('shared/js/safety-suite-ui.js');const line=src.split('\n').find(l=>l.startsWith('function riskLevel('));
 const riskLevel=vm.runInNewContext(line+';riskLevel;');
 for(let s=1;s<=25;s++)assert.equal(riskLevel(s),e.ctx.SafePermitRiskEngine.classify(s).level,'score '+s);
});
test('Safety Review shows a missing residual score as Not Assessed, not Low',()=>{
 const src=read('safety/review-permit/review-permit.js');
 const start=src.indexOf('  function getRisk(');const getRisk=vm.runInNewContext(src.slice(start,src.indexOf('  function getHighestScore(',start))+';getRisk;');
 assert.equal(getRisk(0).label,'Not Assessed');assert.equal(getRisk(undefined).label,'Not Assessed');
 assert.equal(getRisk(4).label,'Low');assert.equal(getRisk(17).label,'Critical');
});

// QA-008: Arabic parity for safety/blocker messages.
test('every safety blocker and guard message has an Arabic translation',()=>{
 const en=JSON.parse(read('shared/locales/en.json')).runtime,ar=JSON.parse(read('shared/locales/ar.json')).runtime;
 assert.deepEqual(Object.keys(en).filter(k=>!(k in ar)),[]);
 const sources=['shared/js/safety-workflow.js','shared/js/data-adapter.js','shared/js/safety-suite-store.js'].map(read).join('\n');
 const messages=['Active stop-work case','Pending resumption authorization','Unverified safety gates','LOTO isolation verification required',
  'Safety Passport competency verification required','High residual risk requires HSE review','SIMOPS conflict review required',
  'Documented Supervisor approval is required','Approval decisions are out of order or predate the current submission',
  'Stop-work records are retained for audit and cannot be deleted.'];
 for(const m of messages){assert.ok(sources.includes(m),'source has '+m);assert.ok(ar[m]&&ar[m]!==m,'AR for '+m);}
});

// QA-009: review pages told reviewers the approval rationale was optional though evidence requires it.
test('review pages require a rationale for every decision',()=>{
 for(const page of ['supervisor','safety','admin']){
  const src=read(page+'/review-permit/review-permit.js');
  assert.ok(!/"\(optional for approval\)"/.test(src),page+' still labels approval rationale optional');
  assert.ok(/needs documented rationale/.test(src),page+' validates rationale for all decisions');
 }
});

// QA-010: real reviewer timestamps (non-zero milliseconds) were rejected, blocking almost every UI approval.
test('approval evidence accepts genuine timestamps for every millisecond value',()=>{
 const {data}=environment();const p=full('PTW-8050');
 for(let ms=0;ms<1000;ms++){p.supervisorDecision.reviewedAt='2026-10-13T09:00:00.'+String(ms).padStart(3,'0')+'Z';
  assert.equal(data.hasApprovalEvidence(p,'supervisor'),true,'ms '+ms);}
 p.supervisorDecision.reviewedAt=new Date(Date.now()-1000).toISOString();assert.equal(data.hasApprovalEvidence(p,'supervisor'),true);
});
test('approval evidence still rejects impossible or non-UTC timestamps',()=>{
 const {data}=environment();const p=full('PTW-8051');
 for(const bad of ['2026-02-30T09:00:00.123Z','2026-10-13T24:00:00.000Z','2026-10-13T09:00:00.12345Z','2026-10-13T09:00:00+03:00','2026-10-13'])
  {p.supervisorDecision.reviewedAt=bad;assert.equal(data.hasApprovalEvidence(p,'supervisor'),false,bad);}
});

// QA-011: stored XSS (worker-controlled fields rendered as HTML for Admin/Supervisor/Safety reviewers).
function renderWith(source,startMarker,endMarker,setup){
 // Executes one render function against a minimal DOM that records innerHTML assignments.
 const nodes={};const node=()=>({innerHTML:'',textContent:'',className:'',children:[],appendChild(c){this.children.push(c)},querySelector:()=>null});
 const ctx={document:{getElementById:id=>nodes[id]||(nodes[id]=node()),createElement:node},Number,String,Array,Math,JSON,Date};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf(startMarker),source.indexOf(endMarker)),ctx);
 setup(ctx);return Object.values(nodes).flatMap(n=>[n.innerHTML,...n.children.map(c=>c.innerHTML)]).join('\n');
}
const payload='<img src=x onerror=alert(1)>';
test('Admin Review escapes hazard, controls and checklist item text',()=>{
 const src=read('admin/review-permit/review-permit.js');
 const html=renderWith(src,'  function getRisk(','  function renderPermit(',ctx=>{
  ctx.renderHazards({riskAssessment:{hazards:[{hazard:payload,controls:payload,initialScore:12,residualScore:4}]}});
  ctx.renderChecklist({safetyChecklist:{answers:[{item:payload,required:true,answer:'yes'}]}});
 });
 assert.ok(!html.includes('<img'),html);assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});
test('history class helpers cannot break out of the class attribute',()=>{
 for(const file of ['supervisor/history/history.js','safety/history/history.js']){
  const src=read(file);const ctx={};vm.createContext(ctx);
  vm.runInContext(src.slice(src.indexOf('  function escapeHTML('),src.indexOf('}',src.indexOf('  function escapeHTML('))+1)+
   src.slice(src.indexOf('  function decisionClass('),src.indexOf('  function riskClass('))+
   src.slice(src.indexOf('  function riskClass('),src.indexOf('}',src.indexOf('  function riskClass('))+1),ctx);
  for(const fn of ['decisionClass','riskClass'])assert.ok(!/["<>]/.test(ctx[fn]('x" onmouseover="alert(1)')),file+' '+fn);
 }
});
test('Supervisor History mobile cards escape re-read cell text and dataset values',()=>{
 const src=read('supervisor/history/history.js');const body=src.slice(src.indexOf('function buildMobileCards('),src.indexOf('function buildMobileCards(')+2200);
 for(const expr of ['escapeHTML(permitId)','escapeHTML(permitType)','escapeHTML(worker)','escapeHTML(row.dataset.comment','escapeHTML(display.date)'])
  assert.ok(body.includes(expr),'missing '+expr);
});
