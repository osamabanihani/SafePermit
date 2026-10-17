const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'shared/js/data-adapter.js'),'utf8');
function environment(store=new Map(),locks){
 const ctx={console,Date,Math:Object.create(Math),JSON,Promise,Map,Set,navigator:{locks},CustomEvent:class{},dispatchEvent(){},localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);return{ctx,store,repo:ctx.SafePermitData.repository};
}
const fresh=(id)=>({...(id?{id}:{}),status:'Pending Supervisor Review',basicInfo:require('./qa-evidence-fixtures.cjs').basicInfo({workTitle:'New unrelated scope'}),supervisorDecision:null,safetyDecision:null,adminDecision:null,safetyChecklist:{confirmed:true,answers:[]}});
for(const key of ['safePermitSubmittedPermits','safePermitSubmittedPermit','safePermitPermits'])for(const status of ['Stopped','Active','Approved','Expired','Closed'])test('F01 create-only rejects '+key+' '+status+' without modifying any bytes',async()=>{
 const e=environment(),old={id:'PTW-8896',status,basicInfo:{workTitle:'Original'},supervisorDecision:{reviewer:'Original'},auditTrail:[{type:'STOP'}],requiresLOTO:true};
 e.store.set(key,JSON.stringify(key==='safePermitSubmittedPermit'?old:[old]));e.store.set('safepermit:safety-suite:v1:stopworks',JSON.stringify([{id:'STOP-1',permitId:old.id,status:'Stopped'}]));const before=[...e.store];
 await assert.rejects(()=>e.repo.createPermit(fresh(old.id)),/exists|collision|duplicate/i);assert.deepEqual([...e.store],before);
});
test('F01 normal creation, repeated IDs, rapid allocation and fixture namespace',async()=>{
 const e=environment();e.ctx.Math.random=()=>0;
 const a=await e.repo.createPermit(fresh());assert.match(a.id,/^PTW-/);assert.equal(a.supervisorDecision,null);assert.equal(a.safetyChecklist.permitId,a.id);
 await assert.rejects(()=>e.repo.createPermit(fresh(a.id)),/exists|collision|duplicate/i);
 const records=await Promise.all(Array.from({length:12},()=>e.repo.createPermit(fresh())));assert.equal(new Set([a.id,...records.map(r=>r.id)]).size,13);
 await assert.rejects(()=>e.repo.createPermit(fresh('PTW-1038')),/reserved|exists|fixture/i);
});
test('F01 orphan safety and lifecycle references reserve identity without inheriting blockers',async()=>{
 for(const [key,value]of [['safePermitAdminLifecycle',{'PTW-8896':'Active'}],['safepermit:safety-suite:v1:conflicts',[{permitId:'PTW-8896',otherPermitId:'PTW-8897'}]]]){const e=environment();e.store.set(key,JSON.stringify(value));const before=[...e.store];await assert.rejects(()=>e.repo.createPermit(fresh('PTW-8896')),/exists|reserved|collision/i);assert.deepEqual([...e.store],before);}
});
test('F01 corrupt imported stores fail closed; imported/recovered draft identity cannot overwrite',async()=>{
 for(const [key,value]of [['safePermitSubmittedPermits','{broken'],['safePermitPermits','{}'],['safePermitSubmittedPermit','[]'],['safepermit:safety-suite:v1:gates','{broken']]){const e=environment();e.store.set(key,value);const before=[...e.store];await assert.rejects(()=>e.repo.createPermit(fresh()),/storage|unverifiable|invalid/i);assert.deepEqual([...e.store],before);}
});
test('F01 second-write storage failure rolls back and never reports successful creation',async()=>{
 const e=environment();e.store.set('safePermitSubmittedPermits',JSON.stringify([{id:'PTW-8800',status:'Stopped'}]));const before=[...e.store];const write=e.ctx.localStorage.setItem;let failed=false;e.ctx.localStorage.setItem=(k,v)=>{if(k==='safePermitSubmittedPermit'&&!failed){failed=true;throw Error('Quota');}write(k,v);};
 await assert.rejects(()=>e.repo.createPermit(fresh('PTW-8896')),/Quota/);assert.deepEqual([...e.store],before);
});
test('F01 new creation refuses inherited approval/activation/audit; intended updates remain compatible',async()=>{
 const e=environment();for(const extra of [{status:'Active'},{supervisorDecision:{reviewer:'Other'}},{auditTrail:[{type:'Other'}]},{previousStatusBeforeStop:'Active'}])await assert.rejects(()=>e.repo.createPermit({...fresh('PTW-8896'),...extra}),/new permit|evidence|initial/i);
 const p=await e.repo.createPermit(fresh('PTW-8896'));await e.repo.savePermit({...p,status:'Returned for Correction'});assert.equal((await e.repo.getPermit(p.id)).status,'Returned for Correction');
});
test('F01 two contexts sharing storage and Web Lock reject the same explicit ID',async()=>{
 let tail=Promise.resolve(),requests=0;const locks={request(name,fn){assert.equal(name,'safepermit:permit-writes');requests++;const next=tail.then(fn);tail=next.catch(()=>{});return next;}};const store=new Map(),a=environment(store,locks),b=environment(store,locks);
 const result=await Promise.allSettled([a.repo.createPermit(fresh('PTW-8896')),b.repo.createPermit(fresh('PTW-8896'))]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(result.filter(r=>r.status==='rejected').length,1);assert.equal(JSON.parse(store.get('safePermitSubmittedPermits')).length,1);assert.equal(requests,2);
});
test('F01 exhausted namespace fails without timestamp fallback or data loss',async()=>{
 const e=environment();e.ctx.Math.random=()=>0;e.store.set('safePermitPermits',JSON.stringify(Array.from({length:8799},(_,i)=>({id:'PTW-'+(1201+i),status:'Stopped'}))));const before=[...e.store];await assert.rejects(()=>e.repo.createPermit(fresh()),/No unused/);assert.deepEqual([...e.store],before);
});
test('F01 correction rechecks live Returned state inside write boundary',async()=>{
 const e=environment();await e.repo.savePermit({id:'PTW-8896',status:'Stopped',auditTrail:[{type:'STOP'}]});const before=[...e.store];await assert.rejects(()=>e.repo.resubmitPermit({...fresh('PTW-8896'),revision:2}),/no longer/);assert.deepEqual([...e.store],before);
});
