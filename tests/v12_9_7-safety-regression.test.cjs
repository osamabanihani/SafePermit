const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {decision,safety}=require('./qa-evidence-fixtures.cjs');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const activeSource=read('admin/active-permits/active-permits.js');
const qrSource=read('permit-verify/permit-verify.js');
function environment(withSafety=true){
 const store=new Map(),events=[];
 const ctx={console,Map,Set,Promise,Date,URLSearchParams,CustomEvent:class{constructor(name,options){this.type=name;this.detail=options?.detail}},
  dispatchEvent:event=>events.push(event),localStorage:{
   getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),
   removeItem:key=>store.delete(key)}};
 ctx.window=ctx;ctx.document={documentElement:{lang:'en'}};
 vm.createContext(ctx);vm.runInContext(read('shared/js/data-adapter.js'),ctx);
 if(withSafety){vm.runInContext(read('shared/js/safety-suite-store.js'),ctx);vm.runInContext(read('shared/js/safety-workflow.js'),ctx);}
 return {ctx,store,events,data:ctx.SafePermitData};
}
const record=(id='PTW-QA',status='Approved')=>({id,status,...safety(id),
 supervisorDecision:decision(id,'supervisor'),safetyDecision:decision(id,'safety'),adminDecision:decision(id,'admin'),
 basicInfo:{...require('./qa-evidence-fixtures.cjs').basicInfo(),endDate:'2099-10-15',endTime:'10:00',workTitle:'Electrical maintenance',site:'Plant A',area:'U1'}});
function activation(e){const begin=activeSource.indexOf('  function expirationCheck(');
 const end=activeSource.indexOf('  function isExpiring(',begin);
 vm.runInContext(activeSource.slice(begin,end),e.ctx);
 return {evidence:p=>e.ctx.activationEvidenceCheck(p),safety:(id,p)=>e.ctx.activationSafetyCheck(id,p),expires:(v,now)=>e.ctx.expirationCheck(v,now)};
}
function qrView(query,records=[],legacy={}){
 const e=environment(false);
 e.store.set('safePermitSubmittedPermits',JSON.stringify(records));
 e.store.set('safePermitAdminLifecycle',JSON.stringify(legacy));
 const node=(tag='span')=>({tag,children:[],textContent:'',append(...nodes){this.children.push(...nodes)}});
 const idEl=node(),details=node('section');
 e.ctx.location={search:query};
 e.ctx.document={getElementById:key=>key==='id'?idEl:details,
  createElement:node,createTextNode:text=>({textContent:String(text)})};
 vm.runInContext(qrSource,e.ctx);
 const flatten=(n)=>String(n.textContent||'')+(n.children||[]).map(flatten).join(' ');
 return {id:idEl.textContent,text:flatten(details)};
}
const normalizeFn=vm.runInNewContext(activeSource.slice(activeSource.indexOf('  function normalize('),activeSource.indexOf('  function escapeText('))+';normalize;');

test('approval evidence: all 3 genuine decision shapes accepted in a demo',()=>{
 const {data}=environment();const p=record();for(const role of ['supervisor','safety','admin'])assert.equal(data.hasApprovalEvidence(p,role),true);
});
for(const [name,change] of [
 ['status string only',p=>p.supervisorDecision={decision:'approve'}],
 ['approval for another permit',p=>p.safetyDecision.permitId='PTW-WRONG'],
 ['missing reviewer',p=>p.adminDecision.reviewer=''],
 ['missing timestamp',p=>delete p.supervisorDecision.reviewedAt],
 ['invalid calendar timestamp',p=>p.supervisorDecision.reviewedAt='2026-02-30T09:00:00.000Z'],
 ['missing rationale',p=>p.safetyDecision.comment=''],
 ['wrong role',p=>p.adminDecision.role='Supervisor'],
 ['wrong next state',p=>p.safetyDecision.newStatus='Approved'],
 ['contradictory previous stage',p=>p.supervisorDecision.previousStatus='Rejected']]){
 test('approval evidence rejects '+name,()=>{const {data}=environment();const p=record();change(p);
  assert.equal(['supervisor','safety','admin'].every(role=>data.hasApprovalEvidence(p,role)),false);});
}
for(const [name,change] of [
 ['missing checklist',p=>delete p.safetyChecklist],
 ['empty checklist',p=>p.safetyChecklist.answers=[]],
 ['unconfirmed checklist',p=>p.safetyChecklist.confirmed=false],
 ['checklist on different permit',p=>p.safetyChecklist.permitId='PTW-DIFFERENT'],
 ['unanswered optional checklist',p=>p.safetyChecklist.answers.push({item:'Barrier',required:false,answer:''})],
 ['failed mandatory control',p=>p.safetyChecklist.answers[0].answer='no'],
 ['unknown mandatory flag',p=>delete p.safetyChecklist.answers[0].required],
 ['optional no without note',p=>p.safetyChecklist.answers.push({item:'Barrier',required:false,answer:'no'})]]){
 test('checklist evidence rejects '+name,()=>{const {data}=environment();const p=record();change(p);assert.equal(data.hasCompleteChecklist(p),false);});
}
for(const [name,change] of [
 ['no hazards',p=>p.riskAssessment.hazards=[]],
 ['missing initial score',p=>delete p.riskAssessment.hazards[0].initialScore],
 ['contradictory residual score',p=>p.riskAssessment.hazards[0].residualScore=13],
 ['noninteger residual score',p=>p.riskAssessment.hazards[0].residualScore=3.5],
 ['missing controls',p=>p.riskAssessment.hazards[0].controls=''],
 ['no reduction in residual risk',p=>p.riskAssessment.hazards[0].residualScore=12]]){
 test('risk assessment rejects '+name,()=>{const {data}=environment();const p=record();change(p);assert.equal(data.hasAcceptableRisk(p),false);});
}
for(const [value,expected] of [
 ['2026-10-13T12:00:00',false],['2026-10-13T12:00:01',true],
 ['2026-10-13T11:59:59',false],['',false],['2026-10-14',false],
 ['2026-02-30T10:00',false],['2027-02-29T10:00',false],
 ['2028-02-29T10:00',true],['2026-10-14T24:00',false],
 ['2026-10-14T12:65',false],['garbage',false]]){
 test('expiration boundary/format '+JSON.stringify(value),()=>{
  const e=environment(),check=activation(e).expires;
  assert.equal(check(value,Date.parse('2026-10-13T12:00:00')).valid,expected);
 });
}
test('separate date+time normalized; incomplete basicInfo cannot be overridden by alternate end',()=>{
 assert.equal(normalizeFn({id:'PTW-Z',basicInfo:{endDate:'2099-10-15',endTime:'10:30'},end:'2020-01-01T12:00'}).end,'2099-10-15T10:30');
 assert.equal(normalizeFn({id:'PTW-Z',basicInfo:{endDate:'2099-10-15'},end:'2099-10-15T10:30'}).end,'');
});
test('activation good data passes preflight',async()=>{
 const e=environment(),p=record();await e.data.repository.savePermit(p);
 const check=activation(e);assert.equal(check.evidence(p).valid,true);await check.safety(p.id,p);
});
test('activation denies missing approval, other permit and stale risk',async()=>{
 const e=environment(),p=record();const check=activation(e);
 p.adminDecision={decision:'approve'};assert.equal(check.evidence(p).valid,false);
 p.adminDecision=decision('PTW-OTHER','admin');assert.equal(check.evidence(p).valid,false);
 p.adminDecision=decision(p.id,'admin');p.riskAssessment.hazards[0].residualScore=14;
 assert.equal(check.evidence(p).valid,false);
});
test('repository refuses undocumented approval and leaves canonical state unchanged',async()=>{
 const e=environment(),p={id:'PTW-QA',status:'Pending Supervisor Review',basicInfo:require('./qa-evidence-fixtures.cjs').basicInfo(),...safety('PTW-QA')};
 await e.data.repository.savePermit(p);
 await assert.rejects(e.data.repository.applyDecision({permitId:p.id,decision:'approve'},'supervisor'),/documented|Documented/);
 assert.equal((await e.data.repository.getPermit(p.id)).status,'Pending Supervisor Review');
});
test('direct applyDecision export cannot bypass repository guard',async()=>{
 const e=environment(),p={id:'PTW-QA',status:'Pending Supervisor Review',basicInfo:require('./qa-evidence-fixtures.cjs').basicInfo(),...safety('PTW-QA')};await e.data.repository.savePermit(p);
 await assert.rejects(e.data.applyDecision({permitId:p.id,decision:'approve'},'supervisor'),/documented|Documented/);
});
test('repository refuses approval when integrated safety is unavailable',async()=>{
 const e=environment(false),id='PTW-QA';await e.data.repository.savePermit({id,status:'Pending Supervisor Review',basicInfo:require('./qa-evidence-fixtures.cjs').basicInfo(),...safety(id)});
 await assert.rejects(e.data.repository.applyDecision(decision(id,'supervisor'),'supervisor'),/unavailable/);
});
test('full canonical review chain succeeds with traceable records',async()=>{
 const e=environment(),id='PTW-QA';await e.data.repository.savePermit({id,status:'Pending Supervisor Review',basicInfo:require('./qa-evidence-fixtures.cjs').basicInfo(),...safety(id)});
 for(const [role,status] of [['supervisor','Pending Safety Review'],['safety','Pending Admin Approval'],['admin','Approved']]){
  await e.data.repository.applyDecision(decision(id,role),role);
  assert.equal((await e.data.repository.getPermit(id)).status,status);
  assert.equal(e.data.hasApprovalEvidence(await e.data.repository.getPermit(id),role),true);
 }
});
test('supervisor approval required before Safety role approval',async()=>{
 const e=environment(),id='PTW-QA';await e.data.repository.savePermit({id,status:'Pending Safety Review',basicInfo:require('./qa-evidence-fixtures.cjs').basicInfo(),...safety(id)});
 await assert.rejects(e.data.repository.applyDecision(decision(id,'safety'),'safety'),/Supervisor/);
});
test('approval stops on unresolved stop-work',async()=>{
 const e=environment(),id='PTW-QA';await e.data.repository.savePermit({id,status:'Pending Supervisor Review',basicInfo:require('./qa-evidence-fixtures.cjs').basicInfo(),...safety(id)});
 await e.ctx.SafePermitSafety.upsert('stopworks',{title:'Unsafe conditions',permitId:id,status:'Open'});
 await assert.rejects(e.data.repository.applyDecision(decision(id,'supervisor'),'supervisor'),/Stop-work|Safety review blocked|stop-work/i);
});
test('malformed safety storage blocks integrated approval',async()=>{
 const e=environment(),id='PTW-QA';await e.data.repository.savePermit({id,status:'Pending Supervisor Review',basicInfo:require('./qa-evidence-fixtures.cjs').basicInfo(),...safety(id)});
 e.store.set('safepermit:safety-suite:v1:gates','not JSON');
 const review=await e.ctx.SafePermitWorkflow.getReview(id);
 assert.equal(review.eligibleForDemoApproval,false);assert.match(review.blockers.join(' '),/Unverifiable safety records/);
 await assert.rejects(e.data.repository.applyDecision(decision(id,'supervisor'),'supervisor'),/Unverifiable safety records/);
});
test('safety review blocks unknown permits and invalid risk register fields',async()=>{
 const e=environment();assert.equal((await e.ctx.SafePermitWorkflow.getReview('PTW-MISSING')).eligibleForDemoApproval,false);
 await e.data.repository.savePermit(record());
 await e.ctx.SafePermitSafety.upsert('risks',{title:'Electric hazard',permitId:'PTW-QA',status:'Open'});
 assert.equal((await e.ctx.SafePermitWorkflow.getReview('PTW-QA')).eligibleForDemoApproval,false);
});
test('a pending resume request prevents integrated clearance',async()=>{
 const e=environment(),p=record();p.resumeRequest={status:'Pending HSE Review'};
 await e.data.repository.savePermit(p);
 assert.match((await e.ctx.SafePermitWorkflow.getReview(p.id)).blockers.join(' '),/resumption/i);
});
test('QR differentiates expired Active and stored status',()=>{
 const display=qrView('?id=PTW-1039');assert.match(display.text,/Active/);
 assert.match(display.text,/NOT AUTHORIZED — expired or unverifiable expiration/);
 assert.match(display.text,/UNVERIFIED/);
});
test('QR canonical Closed overrides a stale local lifecycle Active cache',()=>{
 const p=record('PTW-XYZ','Closed');const view=qrView('?id=PTW-XYZ',[p],{'PTW-XYZ':{status:'Active'}});
 assert.match(view.text,/NOT AUTHORIZED — permit is Closed/);
 assert.doesNotMatch(view.text,/UNVERIFIED — Active is only/);
});
test('QR active without full time is never effective authorization',()=>{
 const p=record('PTW-Z','Active');delete p.basicInfo.endTime;
 const view=qrView('?id=PTW-Z',[p]);
 assert.match(view.text,/NOT AUTHORIZED — expired or unverifiable expiration/);
});
test('QR active future date is explicitly unverified',()=>{
 const p=record('PTW-QA','Active');
 const view=qrView('?id=PTW-QA',[p]);
 assert.match(view.text,/UNVERIFIED — Active is only a locally stored demo status/);
});
test('QR refuses unknown and invalid input',()=>{
 assert.match(qrView('?id=PTW-DOESNOTEXIST').text,/No permit record/);
 assert.equal(qrView('?id=%3Csvg%20onload%3Dalert(1)%3E').id,'Invalid permit ID');
});
function lifecycle(e,displayRows){
 const begin=activeSource.indexOf('  function readJson(');
 const end=activeSource.indexOf('  function isExpiring(',begin);
 const save=activeSource.slice(activeSource.indexOf('  async function saveStatus('),
  activeSource.indexOf('  listEl.addEventListener(',activeSource.indexOf('  async function saveStatus(')));
 vm.runInContext('const demo=[];const visibleStatuses=new Set(["Approved","Active","Closed","Stopped"]);'+
  activeSource.slice(begin,end)+'\nlet entries= '+JSON.stringify(displayRows)+ ';async function refresh(){}\n'+save,e.ctx);
 return e.ctx;
}
test('canonical lifecycle status wins against stale legacy Active override',async()=>{
 const e=environment(),id='PTW-QA';
 await e.data.repository.savePermit(record(id,'Closed'));
 e.store.set('safePermitAdminLifecycle',JSON.stringify({[id]:{status:'Active'}}));
 const ctx=lifecycle(e,[]),entries=await ctx.loadEntries();
 assert.equal(entries.find(p=>p.id===id).status,'Closed');
});
test('activation persists Active only with canonical evidence, checklist, risk, and clearance',async()=>{
 const e=environment(),p=record();await e.data.repository.savePermit(p);
 const ctx=lifecycle(e,[{id:p.id,status:'Approved',end:'2099-10-15T10:00'}]);
 await ctx.saveStatus(p.id,'Active');
 assert.equal((await e.data.repository.getPermit(p.id)).status,'Active');
});
test('activation failure never writes state or lifecycle overrides',async()=>{
 const e=environment(),p=record();delete p.adminDecision;
 await e.data.repository.savePermit(p);
 const ctx=lifecycle(e,[{id:p.id,status:'Approved',end:'2099-10-15T10:00'}]);
 await assert.rejects(ctx.saveStatus(p.id,'Active'),/Documented/);
 assert.equal((await e.data.repository.getPermit(p.id)).status,'Approved');
 assert.equal(e.store.has('safePermitAdminLifecycle'),false);
});
test('click-time expiry checks canonical data instead of cached future date',async()=>{
 const e=environment(),p=record();p.basicInfo.endDate='2026-10-10';
 await e.data.repository.savePermit(p);
 const ctx=lifecycle(e,[{id:p.id,status:'Approved',end:'2099-10-15T10:00'}]);
 await assert.rejects(ctx.saveStatus(p.id,'Active'),/expired/i);
 assert.equal((await e.data.repository.getPermit(p.id)).status,'Approved');
});
test('stale close action cannot close an already Stopped canonical record',async()=>{
 const e=environment(),p=record();p.status='Stopped';
 await e.data.repository.savePermit(p);
 const ctx=lifecycle(e,[{id:p.id,status:'Active',end:'2099-10-15T10:00'}]);
 await assert.rejects(ctx.saveStatus(p.id,'Closed'),/changed/);
 assert.equal((await e.data.repository.getPermit(p.id)).status,'Stopped');
});
