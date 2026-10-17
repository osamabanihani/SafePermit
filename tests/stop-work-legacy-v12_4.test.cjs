const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const mem=new Map();const root={localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)},dispatchEvent(){},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},console};root.window=root;root.globalThis=root;vm.createContext(root);
for(const file of ['data-adapter.js','safety-suite-store.js','safety-workflow.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/js',file),'utf8'),root);
(async()=>{
 const workflow=root.SafePermitWorkflow,repo=root.SafePermitData.repository;
 assert.equal(await repo.getPermit('PTW-1038'),null);
 await assert.rejects(workflow.recordStopWork({title:'Unknown',permitId:'PTW-9999'}),/exist/);
 assert.equal((await root.SafePermitSafety.list('stopworks')).length,0);
 const saved=await workflow.recordStopWork({title:'Unsafe Hot Work Conditions',permitId:'PTW-1038',status:'Open'});
 assert.equal(saved.status,'Stopped');
 assert.equal((await repo.getPermit('PTW-1038')).status,'Stopped');
 assert.equal((await workflow.getReview('PTW-1038')).counts.stopworks,1);
 await assert.rejects(workflow.recordStopWork({title:'Duplicate',permitId:'PTW-1038'}),/current state|already exists/);
 await assert.rejects(repo.applyDecision({permitId:'PTW-1038',decision:'approve'},'admin'),/Invalid workflow transition|Safety review blocked/);
 assert.equal((await repo.getPermit('PTW-1038')).status,'Stopped');
 assert.equal((await root.SafePermitSafety.list('stopworks')).length,1);
 console.log('v12.4 stop-work legacy bridge tests PASSED');
})().catch(e=>{console.error(e);process.exitCode=1});
