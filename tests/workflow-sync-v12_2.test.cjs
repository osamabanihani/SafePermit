const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');
const memory = new Map();
const localStorage = { getItem:k=>memory.has(k)?memory.get(k):null, setItem:(k,v)=>memory.set(k,String(v)), removeItem:k=>memory.delete(k) };
const ctx={localStorage, console, Promise, Map, Set, CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}}, dispatchEvent() {}};
ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/js/data-adapter.js'),'utf8'), ctx);
(async()=>{
  // Starting point of a demo-only permit promoted to a canonical record on Safety decision.
  const original={id:'PTW-1037', status:'Pending Safety Review', basicInfo:{permitType:'hot-work', site:'plant-b',area:'Utility Area',workerName:'Yazan Saleh'}};
  memory.set('safePermitPermits', JSON.stringify([{...original,status:'Pending Safety Review'}]));
  const record={permitId:original.id,decision:'approve',newStatus:'Pending Admin Approval'};
  const found=ctx.SafePermitData.readKnownPermits().find(p=>p.id===original.id);
  assert(found);assert.strictEqual(found.status,'Pending Safety Review');
  await ctx.SafePermitData.repository.savePermit({...found,status:record.newStatus,safetyDecision:record});
  const fromSafety=await ctx.SafePermitData.repository.listForReview('safety');
  const fromAdmin=await ctx.SafePermitData.repository.listForReview('admin');
  assert(!fromSafety.some(p=>p.id===original.id));
  assert(fromAdmin.some(p=>p.id===original.id));
  assert.strictEqual(ctx.SafePermitData.getPermit(original.id).status, 'Pending Admin Approval');
  console.log('v12.2 workflow synchronization repository regression PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
