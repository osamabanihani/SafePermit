const fs=require('fs'),vm=require('vm'),assert=require('assert');
const store=new Map(),events=[];
const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const context={localStorage,console,CustomEvent:class{constructor(type,opt){this.type=type;this.detail=opt.detail}},dispatchEvent:e=>events.push(e.type),Promise,Map,Set};context.window=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(process.argv[2]||require('path').join(__dirname,'../shared/js/data-adapter.js'),'utf8'),context);
const d=context.SafePermitData;const {decision,safety}=require('./qa-evidence-fixtures.cjs');context.SafePermitWorkflow={getReview:async()=>({eligibleForDemoApproval:true,blockers:[]})};let checks=0;
const eq=(a,b)=>{assert.strictEqual(a,b);checks++};
(async()=>{
 eq(d.mode,'demo');eq(d.readPermits().length,0);
 const permit={id:'QA-1',status:'Pending Supervisor Review',revision:1,basicInfo:require('./qa-evidence-fixtures.cjs').basicInfo(),...safety('QA-1')};
 d.savePermit(permit);eq(d.getPermit('QA-1').status,'Pending Supervisor Review');
 eq((await d.repository.listForReview('supervisor')).length,1);
 permit.status='TAMPERED';eq(d.getPermit('QA-1').status,'Pending Supervisor Review');
 const expected=[['supervisor','Pending Safety Review'],['safety','Pending Admin Approval'],['admin','Approved']];
 for(const [role,status] of expected){
  await d.repository.applyDecision(decision('QA-1',role),role);
  eq(d.getPermit('QA-1').status,status);
 }
 let rejected=false;try{await d.repository.applyDecision({permitId:'QA-1',decision:'approve'},'admin')}catch(e){rejected=true}eq(rejected,true);
 d.savePermit({id:'QA-2',status:'Pending Supervisor Review'});
 await d.repository.applyDecision({permitId:'QA-2',decision:'return'},'supervisor');eq(d.getPermit('QA-2').status,'Returned for Correction');
 d.savePermit({id:'QA-2',status:'Pending Supervisor Review',revision:2});
 await d.repository.applyDecision({permitId:'QA-2',decision:'reject'},'supervisor');eq(d.getPermit('QA-2').status,'Rejected');
 eq(d.readPermits().filter(x=>x.id==='QA-2').length,1);
 let invalid=false;try{d.savePermit({id:' '})}catch(e){invalid=true}eq(invalid,true);
 store.set('safePermitPermits',JSON.stringify([{id:'QA-1',status:'STALE'},{id:'ARCHIVE',status:'Pending Supervisor Review'}]));
 eq(d.readKnownPermits().find(x=>x.id==='QA-1').status,'Approved');
 eq((await d.repository.listForReview('supervisor')).length,1);
 console.log(JSON.stringify({status:'passed',assertions:checks,events:events.length,scenarios:['create','read','clone isolation','supervisor approval','safety approval','admin approval','invalid transitions','return','resubmission','reject','deduplication','invalid ID','legacy precedence','review filtering']}));
})().catch(e=>{console.error(e);process.exit(1)});
