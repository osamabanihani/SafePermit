// v13.6 Operational Cockpit: every figure must come from stored records; nothing invented.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const plain=v=>JSON.parse(JSON.stringify(v));
const H=3600000, NOW=Date.parse('2026-10-14T12:00:00.000Z');
const iso=ms=>new Date(NOW-ms).toISOString();

function environment(){
 const store=new Map();
 const ctx={console,Map,Set,Promise,Date,JSON,URL,Math,Number,String,Array,Object,Boolean,Infinity,NaN,isFinite,parseInt,
  CustomEvent:class{constructor(n,o){this.type=n;this.detail=o?.detail}},dispatchEvent(){},addEventListener(){},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}};
 ctx.window=ctx;vm.createContext(ctx);
 for(const f of ['shared/js/data-adapter.js','shared/js/safety-suite-store.js','shared/js/safety-workflow.js','shared/js/permit-status.js','shared/js/risk-engine.js','shared/js/role-dashboard.js','shared/js/cockpit/cockpit-data.js'])vm.runInContext(read(f),ctx);
 // Visualizations need only a few cockpit helpers to compute figures; DOM helpers are inert stubs here.
 const registry={};
 const node=()=>({append(){},setAttribute(){},style:{setProperty(){}},dataset:{},classList:{add(){},toggle(){}}});
 ctx.SafePermitCockpit={register:(r,v)=>{registry[r]=v;},el:node,data:node,num:node,svg:node,mark:node,tr:s=>s,tv:s=>s,roving(){},locale:()=>'en-US',GLYPH:{}};
 for(const f of ['viz-journey','viz-review-flow','viz-risk-landscape','viz-operational-pulse'])vm.runInContext(read('shared/js/cockpit/'+f+'.js'),ctx);
 return {ctx,store,data:ctx.SafePermitData,D:ctx.SafePermitCockpitData,dash:ctx.SafePermitDashboard,registry};
}
const hz=(h,il,is,rl,rs)=>({hazard:h,initialLikelihood:il,initialSeverity:is,initialScore:il*is,controls:'c',residualLikelihood:rl,residualSeverity:rs,residualScore:rl*rs});
const dec=(id,role,decision,ms)=>({permitId:id,role:{supervisor:'Supervisor',safety:'Safety Officer',admin:'Admin'}[role],decision,reviewer:'QA',reviewedAt:iso(ms)});
function seed(e){
 const P=[
  {id:'T-1',status:'Pending Supervisor Review',submittedAt:iso(2*H),basicInfo:{site:'A',permitType:'electrical',workTitle:'One',startDate:'2026-10-14'},riskAssessment:{hazards:[hz('Shock',3,5,1,5)]}},
  {id:'T-2',status:'Pending Supervisor Review',submittedAt:iso(30*H),basicInfo:{site:'A',permitType:'general'},riskAssessment:{hazards:[hz('Pinch',3,3,2,2)]}},
  {id:'T-3',status:'Pending Supervisor Review',basicInfo:{site:'B'},riskAssessment:{hazards:[{hazard:'Legacy',initialScore:12,residualScore:6}]}},
  {id:'T-4',status:'Pending Safety Review',submittedAt:iso(40*H),supervisorDecision:dec('T-4','supervisor','approve',26*H),basicInfo:{site:'B'},riskAssessment:{hazards:[hz('Fire',4,4,2,5)]}},
  {id:'T-5',status:'Returned for Correction',submittedAt:iso(70*H),supervisorDecision:dec('T-5','supervisor','return',22*H),basicInfo:{site:'B'}},
  {id:'T-6',status:'Active',basicInfo:{site:'A'}},
  {id:'T-7',status:'Draft',basicInfo:{site:'A'}},
  {id:'T-8',status:'Stopped',previousStatusBeforeStop:'Active',basicInfo:{site:'A'}}
 ];
 e.store.set('safePermitSubmittedPermits',JSON.stringify(P));
 e.store.set('safePermitSupervisorDecisionHistory',JSON.stringify([dec('T-5','supervisor','return',22*H)]));
 e.store.set('safepermit:safety-suite:v1:stopworks',JSON.stringify([{id:'S-1',permitId:'T-8',status:'Stopped',createdAt:iso(10*H)}]));
 return P;
}
async function context(e,role){
 const src=await e.dash.collect();
 const model=e.dash.build(role,src.permits,src.reviews,{history:src.history,stops:src.stops});
 const byId={};
 model.action.forEach(i=>{(byId[i.id]=byId[i.id]||{}).action=i;});
 model.blocked.forEach(i=>{(byId[i.id]=byId[i.id]||{}).blocked=i;});
 model.waiting.forEach(i=>{(byId[i.id]=byId[i.id]||{}).waiting=i;});
 return {role,model,src,now:NOW,D:e.D,all:src.permits,permits:src.permits,reviews:src.reviews,stops:src.stops,history:src.history,
  info:id=>byId[id]||{},href:(id)=>'#'+id,url:r=>r,translate(){},el:()=>({append(){}}),reduced:true};
}

test('stage, entry time and age come only from recorded timestamps (unknown stays unknown)',()=>{
 const {D}=environment();
 assert.equal(D.stageOf({status:'Pending Admin Approval'}),'admin');
 assert.equal(D.stageOf({status:'Something else'}),'other');
 assert.equal(D.enteredStage({status:'Pending Supervisor Review',submittedAt:iso(5*H),resubmittedAt:iso(2*H)},NOW).source,'resubmittedAt');
 assert.equal(D.enteredStage({status:'Active'},NOW).at,null,'no activation time is recorded, so none is invented');
 assert.equal(D.enteredStage({status:'Pending Supervisor Review'},NOW).at,null);
 assert.equal(D.enteredStage({status:'Pending Supervisor Review',submittedAt:new Date(NOW+86400000).toISOString()},NOW).at,null,'future time rejected');
 assert.equal(D.enteredStage({status:'Pending Safety Review',supervisorDecision:{decision:'return',reviewedAt:iso(H)}},NOW).at,null,'only an approval moves a permit to Safety');
 assert.deepEqual([D.ageBucket(H),D.ageBucket(5*H),D.ageBucket(30*H),D.ageBucket(NaN)],['lt4h','h4to24','gt24h','unknown']);
});

test('hazards are placed on the matrix only with recorded likelihood and severity',()=>{
 const {D}=environment();
 const rows=D.hazardRows([{id:'X',status:'Pending Safety Review',riskAssessment:{hazards:[hz('A',4,5,2,5),{hazard:'Score only',initialScore:12,residualScore:6},hz('B',2,2,1,2)]}}]);
 assert.equal(rows.length,3);
 const m=D.matrix(rows,'residual');
 assert.deepEqual(Object.keys(m.cells).sort(),['1-2','2-5']);
 assert.equal(m.unplaced.length,1);
 assert.equal(m.unplaced[0].hazard,'Score only');
 assert.equal(rows[0].residual.band,'high');
 assert.equal(rows[0].blocksApproval,true,'residual 10 is not below High');
 assert.equal(rows[2].blocksApproval,false);
 assert.deepEqual(plain(D.riskOf({riskAssessment:{hazards:[hz('A',4,5,1,3)]}})),{key:'low',source:'assessment'});
 assert.deepEqual(plain(D.riskOf({riskLevel:'High'})),{key:'high',source:'recorded'});
 assert.deepEqual(plain(D.riskOf({})),{key:'',source:'none'});
});

test('recorded transitions count each stored event once (permit fields + history + stop-work)',()=>{
 const {D}=environment();
 const p={id:'Q',status:'Returned for Correction',submittedAt:iso(9*H),supervisorDecision:dec('Q','supervisor','return',4*H)};
 const edges=D.transitions([p],[dec('Q','supervisor','return',4*H),dec('Q','supervisor','approve',8*H)],[{permitId:'Z',createdAt:iso(H)}]);
 assert.equal(edges['draft>supervisor'].count,1);
 assert.equal(edges['supervisor>returned'].count,1,'the same decision in a permit and in history counts once');
 assert.equal(edges['supervisor>safety'].count,1);
 assert.equal(edges['active>stopped'].count,1);
});

test('filters, CSV and activity never fabricate values',()=>{
 const {D}=environment();
 const P=[{id:'A',submittedAt:iso(2*86400000),basicInfo:{site:'S1'}},{id:'B',basicInfo:{site:'S2'}},{id:'C',submittedAt:iso(40*86400000),basicInfo:{site:'S1'}}];
 assert.deepEqual(D.applyFilters(P,{range:'7'},NOW).map(p=>p.id),['A'],'no submission time means excluded from a date range');
 assert.deepEqual(D.applyFilters(P,{site:'S1'},NOW).map(p=>p.id),['A','C']);
 assert.deepEqual(D.applyFilters(P,{q:'b'},NOW).map(p=>p.id),['B']);
 const csv=D.toCsv([{label:'Id',key:'id'},{label:'Note',key:'n'}],[{id:'=1+1',n:'a,"b"'}]);
 assert.equal(csv,'Id,Note\r\n\'=1+1,"a,""b"""','formula cells neutralised, quotes escaped');
 const days=D.activityByDay([{time:NOW-1000},{time:NOW-3*86400000}],NOW,14);
 assert.equal(days.length,14);
 assert.equal(days.reduce((n,d)=>n+d.count,0),2);
 assert.equal(days.filter(d=>d.count===0).length,12,'days without records stay empty');
 assert.deepEqual([D.greetingKey(8),D.greetingKey(14),D.greetingKey(21),D.greetingKey(3)],['morning','afternoon','evening','evening']);
});

test('Worker journey counts equal stored statuses; the Draft action is "Complete and submit"',async()=>{
 const e=environment();seed(e);
 const ctx=await context(e,'worker');
 const W=e.registry.worker;
 for(const [key,expected] of [['supervisor',['T-1','T-2','T-3']],['safety',['T-4']],['returned',['T-5']],['active',['T-6']],['draft',['T-7']],['stopped',['T-8']]])
  assert.deepEqual(plain(W.resolve(key,ctx).permits.map(p=>p.id)),expected,key);
 const draft=ctx.model.action.find(i=>i.id==='T-7');
 assert.equal(draft.next,'Complete and submit');
 assert.equal(ctx.model.action.find(i=>i.id==='T-5').next,'Correct and resubmit');
 assert.equal(W.table(ctx).rows.length,8);
});

test('Supervisor flow: lanes, ages and planned starts match the records',async()=>{
 const e=environment();seed(e);
 const ctx=await context(e,'supervisor');
 const S=e.registry.supervisor;
 const pending=ctx.model.action.filter(i=>i.status==='Pending Supervisor Review');
 const ready=plain(S.resolve('ready',ctx).permits.map(p=>p.id)), blocked=plain(S.resolve('blocked',ctx).permits.map(p=>p.id));
 assert.deepEqual([...ready,...blocked].sort(),['T-1','T-2','T-3']);
 assert.deepEqual(ready.sort(),plain(pending.filter(i=>i.ready).map(i=>i.id)).sort());
 assert.deepEqual(plain(S.resolve('age:lt4h',ctx).permits.map(p=>p.id)),['T-1']);
 assert.deepEqual(plain(S.resolve('age:gt24h',ctx).permits.map(p=>p.id)),['T-2']);
 assert.deepEqual(plain(S.resolve('age:unknown',ctx).permits.map(p=>p.id)),['T-3'],'no submission time: age unknown, not estimated');
 assert.deepEqual(plain(S.resolve('returned',ctx).permits.map(p=>p.id)),['T-5']);
 assert.deepEqual(plain(S.resolve('forwarded',ctx).permits.map(p=>p.id)),['T-4']);
 assert.deepEqual(plain(S.resolve('start:none',ctx).permits.map(p=>p.id)),['T-2','T-3']);
 const facts=S.motion(ctx);
 assert.equal(facts[0].value,3);
 assert.equal(facts[1].value,'30 h');
});

test('Safety landscape: matrix cells, unplaced hazards and the approval-rule flag match the hazards',async()=>{
 const e=environment();seed(e);
 const ctx=await context(e,'safety');
 const R=e.registry.safety;
 assert.deepEqual(plain(R.resolve('cell:residual:1-5',ctx).hazards.map(h=>h.permitId)),['T-1']);
 assert.deepEqual(plain(R.resolve('cell:residual:2-5',ctx).hazards.map(h=>h.permitId)),['T-4']);
 assert.deepEqual(plain(R.resolve('cell:initial:4-4',ctx).hazards.map(h=>h.hazard)),['Fire']);
 assert.deepEqual(plain(R.resolve('unplaced:residual',ctx).hazards.map(h=>h.hazard)),['Legacy']);
 assert.deepEqual(plain(R.resolve('blocking',ctx).hazards.map(h=>h.permitId)),['T-4']);
 assert.equal(R.table(ctx).rows.length,4);
 // LOTO / SIMOPS / stop-work come only from the integrated review of each permit.
 const stop=R.resolve('ctl:stop',ctx).permits.map(p=>p.id);
 assert.deepEqual(plain(stop),['T-8']);
});

test('Admin pulse: columns are current statuses; ribbons are recorded transitions only',async()=>{
 const e=environment();seed(e);
 const ctx=await context(e,'admin');
 const A=e.registry.admin;
 assert.deepEqual(plain(A.resolve('stage:supervisor',ctx).permits.map(p=>p.id)),['T-1','T-2','T-3']);
 assert.deepEqual(plain(A.resolve('stage:stopped',ctx).permits.map(p=>p.id)),['T-8']);
 const rows=A.table(ctx).rows;
 const sup=rows.find(r=>r.stage==='Supervisor review');
 assert.deepEqual([sup.count,sup.over24,sup.unknownAge],[3,1,1]);
 assert.equal(rows.find(r=>r.stage==='Active').unknownAge,1,'no activation time recorded');
 assert.deepEqual(plain(A.resolve('edge:supervisor>returned',ctx).permits.map(p=>p.id)),['T-5']);
 assert.deepEqual(plain(A.resolve('ex:stopped',ctx).permits.map(p=>p.id)),['T-8']);
});

test('dashboards load the cockpit, label demo data, and keep the AI entry and the role engine',()=>{
 for(const [role,viz] of [['worker','viz-journey'],['supervisor','viz-review-flow'],['safety','viz-risk-landscape'],['admin','viz-operational-pulse']]){
  const html=read(role+'/dashboard/index.html');
  for(const s of ['cockpit.css?v=13.7.0','cockpit/cockpit-data.js?v=13.6.0','cockpit/cockpit-core.js?v=13.7.0','cockpit/'+viz+'.js?v=13.6.0','role-dashboard.js?v=13.6.0','risk-engine.js'])assert.ok(html.includes(s),role+' '+s);
  assert.ok(html.indexOf('cockpit-core.js')<html.indexOf('role-dashboard.js'));
  assert.ok(html.includes('id="ai-assistant-entry"'));
 }
 const core=read('shared/js/cockpit/cockpit-core.js');
 assert.ok(core.includes('Local demo data')&&core.includes('Not scoped to a signed-in user'));
 const all=fs.readdirSync(path.join(root,'shared/js/cockpit')).map(f=>read('shared/js/cockpit/'+f)).join('\n');
 assert.ok(!/Math\.random|setInterval|localStorage\.setItem\("safePermit(Submitted|Permits)|savePermit|applyDecision/.test(all),'no random data, polling or record writes');
});

test('retired sample analytics are gone and nothing references them',()=>{
 for(const f of ['shared/js/dashboard-analytics.js','shared/css/dashboard-analytics.css','shared/js/dashboard-data.js'])assert.ok(!fs.existsSync(path.join(root,f)),f);
 const walk=d=>fs.readdirSync(path.join(root,d),{withFileTypes:true}).flatMap(x=>x.isDirectory()?(['archive','node_modules','tests','docs'].includes(x.name)?[]:walk(path.join(d,x.name))):[path.join(d,x.name)]);
 const refs=walk('.').filter(f=>/\.(html|js|css)$/.test(f)).filter(f=>/dashboard-analytics|dashboard-data\.js|SafePermitDashboardAnalytics/.test(read(f)));
 assert.deepEqual(refs,[]);
});

test('every cockpit phrase has English and Arabic runtime entries; greetings follow the time of day',()=>{
 const en=JSON.parse(read('shared/locales/en.json')),ar=JSON.parse(read('shared/locales/ar.json'));
 const phrases=new Set();
 for(const f of fs.readdirSync(path.join(root,'shared/js/cockpit'))){
  const s=read('shared/js/cockpit/'+f);
  for(const re of [/\btr\("([^"]+)"\)/g,/C\.tv\("([^"]+)"\)/g,/label: "([^"]+)"/g,/setAttribute\("(?:aria-label|data-spc-tip)", "([^"]+)"\)/g])for(const m of s.matchAll(re))phrases.add(m[1]);
 }
 assert.ok(phrases.size>150,'extracted '+phrases.size);
 const missing=[...phrases].filter(p=>/[A-Za-z]{2}/.test(p)&&(!(p in en.runtime)||!(p in ar.runtime)||ar.runtime[p]===p&&/[a-z]{3}/.test(p)));
 assert.deepEqual(missing,[]);
 // v13.7: greetings carry no personal name (the demo has no real signed-in user).
 for(const part of ['welcome','morning','afternoon','evening']){const k='cockpit.greeting_'+part;assert.ok(en.strings[k]&&ar.strings[k]&&en.strings[k]!==ar.strings[k],k);assert.ok(!/,/.test(en.strings[k]),k);}
});

test('navigation: distinct group icons, permit lookup labelled as not access control, unpin fix, no artificial delay',()=>{
 const ctx={window:{},document:{documentElement:{lang:'en'}}};ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(read('shared/js/nav-config.js'),ctx);
 const N=ctx.SafePermitNav;
 const icons=Object.values(N.groupIcons);
 assert.equal(new Set(icons).size,icons.length,'each group has its own icon');
 const e=environment();
 for(const role of ['worker','supervisor','safety','admin'])for(const status of ['Pending Supervisor Review','Pending Safety Review','Pending Admin Approval','Approved','Stopped','Active'])
  assert.equal(N.permitRoute(role,'P 1',status),e.dash.DETAIL_ROUTE[role](encodeURIComponent('P 1'),status),role+' '+status);
 const side=read('shared/js/session-sidebar.js');
 assert.ok(side.includes('this list is not access control'));
 assert.ok(side.includes(':focus-visible'),'mouse unpin collapses; keyboard focus keeps the rail open');
 assert.ok(side.includes('safePermitFavorites:')&&side.includes('safePermitRecent:'));
 assert.ok(!/localStorage\.setItem\([^)]*search/i.test(side),'search queries are never stored');
 const motion=read('shared/js/motion.js');
 assert.ok(/if \(roleFromPath\(\)\) \{\s*return;\s*\}/.test(motion),'role pages navigate natively');
 assert.ok(!/roleFromPath\(\) \? 190/.test(motion),'no 190 ms leave delay');
 const css=read('shared/css/session-sidebar.css')+read('shared/css/cockpit.css');
 assert.ok(/backdrop-filter: none/.test(read('shared/css/session-sidebar.css')));
 assert.ok((css.match(/prefers-reduced-motion: reduce/g)||[]).length>=2);
});

test('the public landing page, navbar and footer components are untouched by the cockpit',()=>{
 const html=read('index.html');
 assert.ok(!/cockpit|session-sidebar|13\.6\.0/.test(html));
 for(const f of ['shared/components/public-footer.html','shared/components/navbar.html'])assert.ok(!/cockpit/.test(read(f)),f);
});
