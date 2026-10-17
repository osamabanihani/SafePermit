const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../admin/active-permits/active-permits.js'),'utf8');
const html = fs.readFileSync(path.join(__dirname,'../admin/active-permits/index.html'),'utf8');
const start = source.indexOf('  function activationMessage(');
const end = source.indexOf('  function isExpiring(',start);
assert.ok(start>=0 && end>start);
const storage=new Map();
const context={document:{documentElement:{lang:'en'}},window:{},localStorage:{
  getItem:key=>storage.has(key)?storage.get(key):null,
  setItem:(key,value)=>storage.set(key,String(value)),
  removeItem:key=>storage.delete(key)},Promise,Map,Set};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/js/data-adapter.js'),'utf8'),context);
context.SafePermitWorkflow={getReview:async()=>({eligibleForDemoApproval:true,blockers:[]})};
vm.runInContext(source.slice(start,end),context);
const approved=(role,permitId='PTW-QA')=>({permitId,role:role==='safety'?'Safety Officer':role==='admin'?'Admin':'Supervisor',
 decision:'approve',reviewer:'Demo reviewer',comment:'Safety evidence reviewed',reviewedAt:'2026-10-13T09:00:00.000Z',
 previousStatus:role==='supervisor'?'Pending Supervisor Review':role==='safety'?'Pending Safety Review':'Pending Admin Approval',
 newStatus:role==='supervisor'?'Pending Safety Review':role==='safety'?'Pending Admin Approval':'Approved'});
const valid=()=>({basicInfo:require('./qa-evidence-fixtures.cjs').basicInfo(),id:'PTW-QA',status:'Approved',supervisorDecision:approved('supervisor'),
 safetyDecision:approved('safety'),adminDecision:approved('admin'),
 safetyChecklist:{permitId:'PTW-QA',confirmed:true,answers:[{item:'Required PPE',required:true,answer:'yes'}]},
 riskAssessment:{hazards:[{hazard:'Electric shock',controls:'LOTO verified',initialScore:12,residualScore:4}]}});
test('activation denies undocumented approval',()=>{const p=valid();delete p.supervisorDecision;assert.equal(context.activationEvidenceCheck(p).valid,false)});
test('activation denies absent checklist',()=>{const p=valid();delete p.safetyChecklist;assert.equal(context.activationEvidenceCheck(p).valid,false)});
test('activation denies unconfirmed mandatory control',()=>{const p=valid();p.safetyChecklist.answers[0].answer='no';assert.equal(context.activationEvidenceCheck(p).valid,false)});
test('activation denies absent canonical record before persist',()=>{const fn=source.slice(source.indexOf('  async function saveStatus('),source.indexOf('  listEl.addEventListener(',source.indexOf('  async function saveStatus(')));assert.ok(fn.includes("if (!existing) throw"));assert.ok(fn.indexOf('await activationSafetyCheck')<fn.indexOf('repository.savePermit('))});
test('activation review blocks on safety blockers',async()=>{context.SafePermitWorkflow.getReview=async()=>vm.runInContext("({eligibleForDemoApproval:false,blockers:['Stop-work']})",context);await assert.rejects(context.activationSafetyCheck('P',valid()),/Safety blockers/)});
test('activation fails closed without safety service',async()=>{delete context.SafePermitWorkflow;await assert.rejects(context.activationSafetyCheck('P',valid()),/unavailable/)});
test('activation uses full date and time and loads safety review',()=>{assert.match(source,/b\.endDate\+'T'\+b\.endTime/);assert.match(html,/safety-suite-store\.js/);assert.match(html,/safety-workflow\.js/)});
