const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const map=new Map(),root={localStorage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},dispatchEvent(){},CustomEvent:class{constructor(t,o){this.type=t;this.detail=o.detail}},console};root.window=root;root.globalThis=root;vm.createContext(root);
for(const f of ['data-adapter.js','safety-suite-store.js','safety-workflow.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/js',f),'utf8'),root);
(async()=>{
 const repo=root.SafePermitData.repository,s=root.SafePermitSafety,w=root.SafePermitWorkflow;
 await repo.savePermit({id:'LOTO-7',status:'Pending Supervisor Review',requiresLOTO:true,requiresCompetencyCheck:true});
 let r=await w.getReview('LOTO-7');assert.equal(r.eligibleForDemoApproval,false);assert.equal(r.counts.missingIsolation,1);assert.equal(r.counts.missingPassport,1);
 await s.upsert('isolations',{title:'Electrical isolation',permitId:'LOTO-7',status:'Open',controls:'Lockout required'});
 r=await w.getReview('LOTO-7');assert.equal(r.counts.isolations,1);
 await assert.rejects(s.upsert('isolations',{title:'No evidence',permitId:'LOTO-7',status:'Verified'}),/evidence/);
 let iso=(await s.list('isolations'))[0];await s.upsert('isolations',{...iso,status:'Verified'});
 await s.upsert('passports',{title:'Worker A',permitId:'LOTO-7',status:'Verified',due:'2020-01-01',controls:'Training'});
 r=await w.getReview('LOTO-7');assert.equal(r.counts.competencyIssues,1);
 let pass=(await s.list('passports'))[0];await s.upsert('passports',{...pass,due:'2099-12-31'});
 r=await w.getReview('LOTO-7');assert.equal(r.eligibleForDemoApproval,true);
 await s.upsert('passports',{...pass,status:'Open',due:'2099-12-31'});r=await w.getReview('LOTO-7');assert.equal(r.eligibleForDemoApproval,false);
 console.log('v12.7 LOTO and Passport tests PASSED (8 assertions)');
})().catch(e=>{console.error(e);process.exitCode=1});
