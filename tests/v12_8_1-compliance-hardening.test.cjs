const fs=require('fs'),vm=require('vm'),assert=require('assert');
const storage=new Map();const context={console,Date,Math,JSON,Promise,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},dispatchEvent:()=>{},CustomEvent:class{constructor(n,a){this.type=n;this.detail=a.detail}},crypto:{randomUUID:()=>"QA-ID"}};
context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname+'/../shared/js/safety-suite-store.js','utf8'),context);
const api=context.SafePermitSafety;
(async()=>{
 const base={id:'finding-qa',title:'Noncompliance',owner:'QA owner',controls:'Outstanding corrective action',status:'Open'};
 await api.upsert('actions',base);
 await assert.rejects(api.upsert('actions',{...base,status:'Verified'}),/separate HSE review/);
 await assert.rejects(api.upsert('actions',{...base,status:'Closed'}),/separate HSE review/);
 await assert.rejects(api.verifyCompliance(base.id,{reviewer:'',evidence:'Confirmed through photos and inspection'}),/reviewer/);
 await assert.rejects(api.verifyCompliance(base.id,{reviewer:'QA officer',evidence:'short'}),/20\+/);
 assert.equal((await api.get('actions',base.id)).status,'Open');
 await api.verifyCompliance(base.id,{reviewer:'QA officer',evidence:'QA only: evidence reviewed in simulated verification, not site certified.'});
 const item=await api.get('actions',base.id);assert.equal(item.status,'Verified');assert.equal(item.verificationHistory.length,1);
 await assert.rejects(api.verifyCompliance(base.id,{reviewer:'QA officer',evidence:'Another record of QA simulated verification'}),/already verified/);
 await api.upsert('actions',{id:'incident-action',title:'Incident action',incidentId:'incident-1',owner:'QA',controls:'QA evidence',status:'Verified'}).then(()=>{throw Error('Expected block')},e=>assert.match(e.message,/separate HSE review/));
 console.log('Compliance hardening: 8 assertions passed');
})().catch(e=>{console.error(e);process.exitCode=1});
