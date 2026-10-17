// v13.1 shared four-layer permit status and role dashboards.
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
 const ctx={console,Map,Set,Promise,Date,JSON,URL,CustomEvent:class{constructor(n,o){this.type=n;this.detail=o?.detail}},dispatchEvent(){},addEventListener(){},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}};
 ctx.window=ctx;vm.createContext(ctx);
 for(const f of ['shared/js/data-adapter.js','shared/js/safety-suite-store.js','shared/js/safety-workflow.js','shared/js/permit-status.js','shared/js/role-dashboard.js'])vm.runInContext(read(f),ctx);
 return {ctx,store,data:ctx.SafePermitData,safety:ctx.SafePermitSafety,workflow:ctx.SafePermitWorkflow,S:ctx.SafePermitStatus,D:ctx.SafePermitDashboard};
}
const future={startDate:'2099-10-15',startTime:'08:00',endDate:'2099-10-15',endTime:'17:00'};
const full=(id,status='Approved',extra={})=>({id,status,...safety(id),
 supervisorDecision:decision(id,'supervisor'),safetyDecision:decision(id,'safety'),adminDecision:decision(id,'admin'),
 basicInfo:{site:'plant-'+id,area:'unit',workTitle:'QA '+id,...future},...extra});
const plain=v=>JSON.parse(JSON.stringify(v));
async function model(e,id,now){return e.S.evaluate(e.data.getPermit(id),{review:await e.workflow.getReview(id),now});}

test('a status alone is never shown as approved: every claimed approval reads "missing"',async()=>{
 const e=environment();e.data.savePermit({id:'PTW-7001',status:'Approved',basicInfo:{workTitle:'Status only'}});
 const m=await model(e,'PTW-7001');
 assert.equal(m.lifecycle.status,'Approved');
 assert.equal(m.lifecycle.tone,'neutral');
 assert.deepEqual(plain(m.approvals.steps.map(s=>s.state)),['missing','missing','missing']);
 assert.equal(m.approvals.documented,0);
 assert.equal(m.approvals.complete,false);
 assert.equal(m.validity.state,'missing');
 const codes=e.S.problems(m).map(p=>p.code);
 assert.deepEqual(codes.filter(c=>c==='evidence').length,3);
 assert.ok(codes.includes('expiry'));
});

test('documented, coherent, in-date permit with no blockers: all four layers clear',async()=>{
 const e=environment();e.data.savePermit(full('PTW-7002'));
 const m=await model(e,'PTW-7002');
 assert.equal(m.approvals.complete,true);
 assert.deepEqual(plain(m.approvals.steps.map(s=>[s.state,s.reviewer])),[['documented','QA Reviewer'],['documented','QA Reviewer'],['documented','QA Reviewer']]);
 assert.equal(m.validity.state,'valid');
 assert.equal(m.blockers.state,'clear');
 assert.deepEqual(plain(e.S.problems(m)),[]);
});

test('validity is checked against now and fails closed on missing or impossible dates',()=>{
 const e=environment();const at=Date.parse('2026-10-14T12:00:00Z');
 const check=b=>e.S.checkValidity({id:'X',basicInfo:b},at).state;
 assert.equal(check({endDate:'2026-10-14',endTime:'11:00'}),'expired');
 assert.equal(check({endDate:'2099-01-01',endTime:'11:00'}),'valid');
 assert.equal(check({endDate:'2099-01-01'}),'missing');
 assert.equal(check({}),'missing');
 assert.equal(check({endDate:'2099-02-30',endTime:'10:00'}),'invalid');
 assert.equal(check({endDate:'2099-01-01',endTime:'25:00'}),'invalid');
 assert.equal(e.S.checkValidity({id:'X',end:'2026-10-10T17:00:00'},at).state,'expired');
 // The lifecycle layer is never changed by validity.
 const m=e.S.evaluate({id:'X',status:'Active',basicInfo:{endDate:'2026-10-14',endTime:'11:00'}},{review:{blockers:[],eligibleForDemoApproval:true},now:at,data:e.data});
 assert.equal(m.lifecycle.status,'Active');
 assert.equal(m.validity.state,'expired');
 assert.ok(e.S.problems(m).some(p=>p.code==='expired'));
});

test('approvals follow the stage: documented, awaiting, not reached',async()=>{
 const e=environment();
 e.data.savePermit({...full('PTW-7003','Pending Safety Review'),safetyDecision:undefined,adminDecision:undefined});
 const m=await model(e,'PTW-7003');
 assert.deepEqual(plain(m.approvals.steps.map(s=>s.state)),['documented','awaiting','not-reached']);
 assert.equal(m.approvals.coherent,true);
});

test('decisions from before a resubmission are stale, not documented',async()=>{
 const e=environment();
 e.data.savePermit({...full('PTW-7004','Pending Supervisor Review'),resubmittedAt:'2026-10-13T10:00:00.000Z'});
 const m=await model(e,'PTW-7004');
 assert.deepEqual(plain(m.approvals.steps.map(s=>s.state)),['stale','stale','stale']);
 assert.equal(m.approvals.documented,0);
});

test('out-of-order approvals are flagged as an incoherent trail',async()=>{
 const e=environment();
 e.data.savePermit({...full('PTW-7005'),safetyDecision:{...decision('PTW-7005','safety'),reviewedAt:'2026-10-12T09:00:00.000Z'}});
 const m=await model(e,'PTW-7005');
 assert.equal(m.approvals.coherent,false);
 assert.equal(m.approvals.complete,false);
 assert.ok(e.S.problems(m).some(p=>p.code==='trail'));
});

test('returned and rejected decisions of the current cycle are reported as such',async()=>{
 const e=environment();
 e.data.savePermit({id:'PTW-7006',status:'Returned for Correction',...safety('PTW-7006'),
  supervisorDecision:{...decision('PTW-7006','supervisor'),decision:'return',newStatus:'Returned for Correction'}});
 const m=await model(e,'PTW-7006');
 assert.equal(m.approvals.steps[0].state,'returned');
 assert.equal(m.lifecycle.tone,'warning');
});

test('blockers map to the Command Center section that resolves them',async()=>{
 const e=environment();e.data.savePermit(full('PTW-7007','Pending Admin Approval',{adminDecision:undefined,requiresLOTO:true}));
 await e.safety.upsert('gates',{title:'Gas test',permitId:'PTW-7007',status:'Open'});
 await e.safety.upsert('stopworks',{title:'Alarm',permitId:'PTW-7007',status:'In Review'});
 const m=await model(e,'PTW-7007');
 assert.equal(m.blockers.state,'blocked');
 const bySection=Object.fromEntries(m.blockers.items.map(b=>[b.text,b.section]));
 assert.equal(bySection['Unverified safety gates'],'gates');
 assert.equal(bySection['Active stop-work case'],'stopworks');
 assert.equal(bySection['LOTO isolation verification required'],'isolations');
 e.ctx.SafePermitPaths={projectRoot:new URL('http://host/app/')};
 const gate=m.blockers.items.find(b=>b.section==='gates');
 assert.equal(e.S.resolverHref(gate,'PTW-7007'),'http://host/app/safety/risk-command-center/?id=PTW-7007#gates');
 assert.equal(e.S.resolverHref({page:'resume'},'PTW 1'),'http://host/app/safety/controlled-resume/?id=PTW%201');
 // Every section named by the map is a real Command Center section.
 const ui=read('shared/js/safety-suite-ui.js');
 for(const b of e.S.BLOCKER_SECTIONS)if(b.section)assert.ok(ui.includes('["'+b.section+'", "'),b.section);
});

test('an unavailable safety review fails closed',()=>{
 const e=environment();const p=full('PTW-7008');
 for(const opts of [{review:null},{reviewError:true,review:{blockers:[],eligibleForDemoApproval:true}},{review:{blockers:[],eligibleForDemoApproval:false}}]){
  const m=e.S.evaluate(p,{...opts,data:e.data});
  assert.notEqual(m.blockers.state,'clear',JSON.stringify(opts));
 }
});

test('a stopped permit keeps its previous status and its approval claims',async()=>{
 const e=environment();e.data.savePermit(full('PTW-7009','Active'));
 await e.workflow.recordStopWork({permitId:'PTW-7009',title:'Gas alarm'});
 const m=await model(e,'PTW-7009');
 assert.equal(m.lifecycle.status,'Stopped');
 assert.equal(m.lifecycle.tone,'danger');
 assert.equal(m.lifecycle.previousStatus,'Active');
 assert.equal(m.approvals.complete,true);
 const texts=m.blockers.items.map(b=>b.text);
 assert.ok(texts.includes('Active stop-work case'));
 assert.equal(m.blockers.items.find(b=>b.text.startsWith('Permit stopped')).page,'resume');
});

test('unknown permit: nothing is inferred',()=>{
 const e=environment();const m=e.S.evaluate(null,{permitId:'PTW-9999'});
 assert.equal(m.found,false);
 assert.equal(m.lifecycle,undefined);
 assert.deepEqual(plain(e.S.problems(m).map(p=>p.code)),['unavailable']);
});

async function dashboard(e,role){
 const permits=await e.data.repository.listKnownPermits();const reviews={};
 for(const p of permits)reviews[p.id]=await e.workflow.getReview(p.id);
 return e.D.build(role,permits,reviews,{history:e.D.readHistory(e.ctx.localStorage),stops:await e.safety.list('stopworks')});
}

test('dashboards show nothing when nothing is stored (no sample figures)',async()=>{
 const e=environment();
 for(const role of ['worker','supervisor','safety','admin']){
  const d=await dashboard(e,role);
  assert.equal(d.total,0);
  for(const k of ['action','blocked','waiting','recent'])assert.equal(d[k].length,0,role+' '+k);
  for(const t of d.tiles)assert.ok(t.count===null||t.count===0,role+' '+t.label);
 }
});

test('dashboards split work into my action, blocked and waiting from real records',async()=>{
 const e=environment();
 const sup=id=>({...full(id,'Pending Supervisor Review'),supervisorDecision:undefined,safetyDecision:undefined,adminDecision:undefined});
 e.data.savePermit(sup('PTW-7101'));
 e.data.savePermit({...sup('PTW-7102'),basicInfo:{site:'other',area:'x',...future}});
 await e.safety.upsert('gates',{title:'Gas test',permitId:'PTW-7102',status:'Open'});
 e.data.savePermit({...full('PTW-7103','Pending Safety Review'),safetyDecision:undefined,adminDecision:undefined});
 e.data.savePermit(full('PTW-7104','Approved'));
 e.data.savePermit({id:'PTW-7105',status:'Approved',basicInfo:{workTitle:'Status only'}});
 e.data.savePermit({id:'PTW-7106',status:'Returned for Correction',...safety('PTW-7106'),basicInfo:{site:'r',area:'r',...future}});

 const s=await dashboard(e,'supervisor');
 assert.deepEqual(plain(s.action.map(i=>[i.id,i.ready])),[['PTW-7101',true],['PTW-7102',false]]);
 assert.ok(s.action[1].reasons.some(r=>r.text==='Unverified safety gates'));
 assert.equal(s.tiles.find(t=>t.label==='Decide permits ready for review').count,1);
 assert.equal(s.tiles.find(t=>t.label==='Return or reject blocked permits').count,1);
 const waiting=Object.fromEntries(s.waiting.map(i=>[i.id,i.waitingOn]));
 assert.deepEqual(plain(waiting),{'PTW-7103':'Safety Officer','PTW-7104':'Admin','PTW-7105':'Admin','PTW-7106':'Worker'});
 const blocked=plain(s.blocked.map(i=>i.id)).sort();
 assert.deepEqual(blocked,['PTW-7102','PTW-7105']);

 const a=await dashboard(e,'admin');
 const act=Object.fromEntries(a.action.map(i=>[i.id,i.ready]));
 assert.deepEqual(plain(act),{'PTW-7104':true,'PTW-7105':false});
 assert.equal(a.tiles.find(t=>t.label==='Activate documented approved permits').count,1);

 const w=await dashboard(e,'worker');
 assert.deepEqual(plain(w.action.map(i=>i.id)),['PTW-7106']);
 assert.equal(w.tiles.find(t=>t.label==='Correct returned permits').count,1);
});

test('safety dashboard: a stopped permit needs Safety action; resume is ready only once the case is closed',async()=>{
 const e=environment();e.data.savePermit(full('PTW-7201','Active'));
 const stop=await e.workflow.recordStopWork({permitId:'PTW-7201',title:'Gas alarm'});
 let d=await dashboard(e,'safety');
 assert.deepEqual(plain(d.action.map(i=>[i.id,i.ready,i.next])),[['PTW-7201',false,'Close the stop-work case']]);
 await e.safety.upsert('stopworks',{...stop,status:'Closed'});
 await e.workflow.requestResume('PTW-7201','Controls re-verified');
 d=await dashboard(e,'safety');
 assert.deepEqual(plain(d.action.map(i=>[i.id,i.ready,i.next])),[['PTW-7201',true,'Decide resume request']]);
 assert.equal(d.tiles.find(t=>t.label==='Decide resume requests').count,1);
 const w=await dashboard(e,'worker');
 assert.equal(w.waiting[0].waitingOn,'Safety Officer');
});

test('recent changes come from permits, decision history keys and stop-work records, newest first, deduplicated',async()=>{
 const e=environment();
 e.data.savePermit({...full('PTW-7301','Pending Safety Review'),safetyDecision:undefined,adminDecision:undefined,submittedAt:'2026-10-13T08:00:00.000Z'});
 const dup=decision('PTW-7301','supervisor');
 e.store.set('safePermitSupervisorDecisions',JSON.stringify([dup]));
 e.store.set('safePermitSafetyDecisionHistory',JSON.stringify([{...decision('PTW-7999','safety'),decision:'return',reviewedAt:'2026-10-13T11:00:00.000Z'}]));
 e.store.set('safePermitAdminDecisionHistory','not json');
 const d=await dashboard(e,'supervisor');
 assert.deepEqual(plain(d.recent.map(ev=>[ev.permitId,ev.actor,ev.what])),[
  ['PTW-7999','Safety Officer','Returned for Correction'],
  ['PTW-7301','Supervisor','Approved'],
  ['PTW-7301','Worker','Submitted']]);
});

test('dashboard pages carry no hard-coded figures and no sample analytics',()=>{
 for(const role of ['worker','supervisor','safety','admin']){
  const html=read(role+'/dashboard/index.html');
  assert.ok(html.includes('data-sp-role-dashboard'),role);
  assert.ok(!/dashboard-analytics|dashboard-data\.js/.test(html),role+' loads sample analytics');
  assert.ok(!/__value">\s*\d|<strong>\s*\d+\s*<\/strong>|_badge[^"]*"[^>]*>\s*\d+\s*</.test(html),role+' has a fixed number');
  assert.ok(!/PTW-\d{4}/.test(html),role+' hard-codes permit IDs');
  for(const s of ['safety-suite-store.js','safety-workflow.js','permit-status.js','role-dashboard.js'])assert.ok(html.includes(s),role+' '+s);
  assert.ok(html.includes('id="ai-assistant-entry"'),role+' keeps the AI entry anchor');
 }
});

test('the status component is on the four permit pages, after the safety review scripts',()=>{
 for(const [page,role] of [['worker/permit-details','worker'],['safety/permit-details','safety'],['supervisor/permit-details','supervisor'],['admin/review-permit','admin']]){
  const html=read(page+'/index.html');
  assert.ok(html.includes('data-sp-permit-status=""')&&html.includes('data-role="'+role+'"'),page);
  const i=s=>html.indexOf(s);
  assert.ok(i('safety-workflow.js')>0&&i('safety-workflow.js')<i('permit-status.js'),page+' script order');
  assert.ok(html.includes('permit-status.css'),page+' styles');
 }
});

test('every English phrase the new modules render has an Arabic runtime entry',()=>{
 const en=JSON.parse(read('shared/locales/en.json')).runtime,ar=JSON.parse(read('shared/locales/ar.json')).runtime;
 const src=read('shared/js/permit-status.js')+read('shared/js/role-dashboard.js');
 const phrases=new Set();
 for(const re of [/el\("[^"]*", "[^"]*", "([^"]+)"\)/g,/text: "([^"]+)"/g,/label: "([^"]+)"/g,/t\("([^"]+)"/g,/\["\w+", "([^"]+)", "([^"]+)"\]/g,/: \["([^"]+)", "\w+"\]/g,/\b\w+: "([A-Z][^"]+)"/g])
  for(const m of src.matchAll(re))for(const g of m.slice(1))if(g&&(/^[A-Z]/.test(g)||g==='documented')&&!/^(sp-|safety\/|worker\/|admin\/|supervisor\/)/.test(g))phrases.add(g);
 assert.ok(phrases.size>60,'extracted '+phrases.size);
 const missing=[...phrases].filter(p=>!(p in en)||!(p in ar)||ar[p]===p&&/[a-z]{3}/.test(p));
 assert.deepEqual(missing,[]);
});
