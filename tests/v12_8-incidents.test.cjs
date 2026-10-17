const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');const storage=new Map();const context={console,Date,Math,JSON,Promise,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},dispatchEvent:()=>{},crypto:{randomUUID:()=>`id-${Math.random()}`}};context.window=context;context.globalThis=context;vm.createContext(context);
for(const name of ['safety-suite-store.js','incident-workflow.js'])vm.runInContext(fs.readFileSync(path.join(root,'shared/js',name),'utf8'),context);
(async()=>{
 const store=context.SafePermitSafety, workflow=context.SafePermitIncidents;
 const incident=await store.upsert('incidents',{title:'QA Near Miss',permitId:'PTW-1038',status:'Open'});
 await assert.rejects(()=>workflow.closeIncident(incident.id,{reviewer:'HSE',evidence:'reviewed'}),/At least one/);
 const action=await workflow.addAction(incident.id,{title:'Check area',owner:'HSE QA',due:'2026-10-15',priority:'High'});
 await assert.rejects(()=>workflow.closeIncident(incident.id,{reviewer:'HSE',evidence:'reviewed'}),/mandatory/);
 await assert.rejects(()=>workflow.verifyAction(action.id,{reviewer:'HSE'}),/evidence/);
 await workflow.verifyAction(action.id,{reviewer:'HSE QA',evidence:'QA evidence only'});
 const closed=await workflow.closeIncident(incident.id,{reviewer:'HSE QA',evidence:'All mandatory demo actions reviewed'});
 assert.equal(closed.status,'Closed');assert.equal((await workflow.actionsFor(incident.id)).length,1);
 await assert.rejects(()=>workflow.addAction(incident.id,{title:'more',owner:'HSE',due:'2026-10-15'}),/Reopen/);
 console.log('v12.8 incident workflow: 7 assertions passed');
})().catch(e=>{console.error(e);process.exitCode=1});
