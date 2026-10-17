const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const map=new Map();const root={localStorage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)},dispatchEvent(){},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},console};root.window=root;root.globalThis=root;vm.createContext(root);const load=f=>vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/js',f),'utf8'),root);load('data-adapter.js');load('safety-suite-store.js');load('safety-workflow.js');
(async()=>{
const a=root.SafePermitData.repository,s=root.SafePermitSafety,w=root.SafePermitWorkflow;const {decision,safety}=require('./qa-evidence-fixtures.cjs');
await a.savePermit({id:'PTW-1038',status:'Pending Admin Approval',basicInfo:require('./qa-evidence-fixtures.cjs').basicInfo(),...safety('PTW-1038'),supervisorDecision:decision('PTW-1038','supervisor'),safetyDecision:decision('PTW-1038','safety'),area:'Plant B'});
await a.savePermit({id:'PTW-1044',status:'Pending Admin Approval',area:'Tank Farm'});
const entry=await s.upsert('conflicts',{title:'Hot Work and Maintenance Activity Overlap',permitId:'PTW-1038',otherPermitId:'PTW-1044',area:'Plant B',status:'Open'});
for(const id of ['PTW-1038','PTW-1044']){const r=await w.getReview(id);assert.equal(r.counts.simops,1);assert.equal(r.eligibleForDemoApproval,false);assert.match(r.blockers.join(' '),/SIMOPS/);}
await assert.rejects(a.applyDecision(decision('PTW-1038','admin'),'admin'),/SIMOPS/);
await s.upsert('conflicts',{...entry,status:'Resolved'});
assert.equal((await w.getReview('PTW-1038')).counts.simops,0);
assert.equal((await w.getReview('PTW-1044')).counts.simops,0);
await s.upsert('conflicts',{...entry,status:'In Review'});
assert.equal((await w.getReview('PTW-1038')).counts.simops,1);
console.log('v12.3 manual SIMOPS integration tests PASSED');
})().catch(e=>{console.error(e);process.exitCode=1});
