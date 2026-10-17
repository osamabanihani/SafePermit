const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {decision,safety}=require('./qa-evidence-fixtures.cjs');
const basic={permitType:'electrical',workTitle:'Isolated inspection',description:'Inspect with verified controls',site:'factory-a',area:'electrical-room',
  startDate:'2099-10-20',startTime:'08:00',endDate:'2099-10-20',endTime:'12:00',supervisor:'sup-001',workerCount:'50'};
function env() {
  const store=new Map(),ctx={console,Date,Promise,Map,Set,JSON,CustomEvent:class{},dispatchEvent(){},document:{documentElement:{lang:'en'}},
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/js/data-adapter.js'),'utf8'),ctx);
  ctx.SafePermitWorkflow={getReview:async()=>({eligibleForDemoApproval:true,blockers:[]})};
  return {store,ctx,data:ctx.SafePermitData,repo:ctx.SafePermitData.repository};
}
const fresh=(extra={})=>({id:'PTW-8806',status:'Pending Supervisor Review',revision:1,basicInfo:{...basic},...safety('PTW-8806'),...extra});
for(const count of ['1','50',1,50])test('shared valid worker boundary '+JSON.stringify(count),async()=>{
  const e=env(),p=fresh();p.basicInfo.workerCount=count;
  assert.equal(e.data.validateWorkerCount(count),'');assert.equal((await e.repo.createPermit(p)).basicInfo.workerCount,count);
});
for(const count of ['51','0','-1','','NaN','Infinity',null,undefined])test('direct creation rejects invalid worker count '+JSON.stringify(count)+' without writes',async()=>{
  const e=env(),p=fresh();p.basicInfo.workerCount=count;const before=[...e.store];
  await assert.rejects(e.repo.createPermit(p),/workers/);assert.deepEqual([...e.store],before);
});
for(const change of [{description:''},{supervisor:''},{endTime:'07:59'},{startDate:'2099-02-30'}])test('shared required/schedule gate '+JSON.stringify(change),async()=>{
  const e=env();await assert.rejects(e.repo.createPermit(fresh({basicInfo:{...basic,...change}})),/required|after|valid/);assert.equal(e.store.size,0);
});
test('invalid correction retains previous decisions, audit, history and raw draft bytes; valid correction resets evidence',async()=>{
  const e=env(),old=fresh({status:'Returned for Correction',supervisorDecision:decision('PTW-8806','supervisor'),auditTrail:[{type:'STOP'}],workflowHistory:[{revision:0}]});
  e.data.savePermit(old);e.store.set('safePermitDraftBasicInfo',JSON.stringify({...basic,workerCount:'51'}));const before=[...e.store];
  await assert.rejects(e.repo.resubmitPermit({...fresh(),revision:2,basicInfo:{...basic,workerCount:'51'}}),/workers/);assert.deepEqual([...e.store],before);
  const corrected=await e.repo.resubmitPermit({...fresh(),revision:2,supervisorDecision:null,safetyDecision:null,adminDecision:null,workflowHistory:[...old.workflowHistory,{revision:1,supervisorDecision:old.supervisorDecision}]});
  assert.equal(corrected.supervisorDecision,null);assert.equal(corrected.workflowHistory.at(-1).supervisorDecision.reviewer,'QA Reviewer');assert.deepEqual(corrected.auditTrail,old.auditTrail);
});
test('approval and activation reject invalid current data without mutating records',async()=>{
  const e=env();e.data.savePermit(fresh({basicInfo:{...basic,workerCount:'51'}}));let before=[...e.store];
  await assert.rejects(e.repo.applyDecision(decision('PTW-8806','supervisor'),'supervisor'),/workers/);assert.deepEqual([...e.store],before);
  e.data.savePermit({...fresh(),status:'Approved',basicInfo:{...basic,workerCount:'51'}});before=[...e.store];
  await assert.rejects(e.repo.savePermit({...e.data.getPermit('PTW-8806'),status:'Active'}),/workers/);assert.deepEqual([...e.store],before);
});
test('current record revalidated after asynchronous safety review',async()=>{
  const e=env();e.data.savePermit(fresh());e.ctx.SafePermitWorkflow.getReview=async()=>{e.data.savePermit({...e.data.getPermit('PTW-8806'),basicInfo:{workerCount:'51'}});return {eligibleForDemoApproval:true,blockers:[]};};
  await assert.rejects(e.repo.applyDecision(decision('PTW-8806','supervisor'),'supervisor'),/workers/);
  const p=e.data.getPermit('PTW-8806');assert.equal(p.status,'Pending Supervisor Review');assert.equal(p.supervisorDecision,undefined);
});
test('second-write quota rollback still preserves all bytes for a valid boundary permit',async()=>{
  const e=env();e.data.savePermit({id:'PTW-8807',status:'Stopped',auditTrail:[{type:'STOP'}]});const before=[...e.store];
  const write=e.ctx.localStorage.setItem;let failed=false;e.ctx.localStorage.setItem=(k,v)=>{if(k==='safePermitSubmittedPermit'&&!failed){failed=true;throw Error('Quota');}return write(k,v);};
  await assert.rejects(e.repo.createPermit(fresh()),/Quota/);assert.deepEqual([...e.store],before);
});
