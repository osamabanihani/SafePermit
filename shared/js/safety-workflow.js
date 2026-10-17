/* Demo workflow integration: backend MUST independently enforce these rules. */
(function(root){"use strict";
const clone=x=>JSON.parse(JSON.stringify(x));
const norm=x=>String(x??"").trim().toLowerCase();
const terminal=new Set(["rejected","closed","cancelled","canceled","returned for correction","stopped"]);
const active=p=>p&&p.id&&!terminal.has(norm(p.status));
const idOf=p=>String(p.id);
// Submitted permits keep location/schedule in basicInfo; fall back to it so SIMOPS sees them.
const basicLoc=b=>b&&(b.site||b.area)?[b.site,b.area].filter(Boolean).join(" / "):"";
const basicAt=(d,t)=>d&&t?d+"T"+t:"";
const loc=p=>norm(p.area||p.location||p.site||p.workLocation||p.workArea||basicLoc(p.basicInfo));
const from=p=>Date.parse(p.startTime||p.startDateTime||p.startDate||p.scheduledStart||basicAt(p.basicInfo?.startDate,p.basicInfo?.startTime)||"");
const to=p=>Date.parse(p.endTime||p.endDateTime||p.endDate||p.scheduledEnd||basicAt(p.basicInfo?.endDate,p.basicInfo?.endTime)||"");
// Permit IDs are matched case/whitespace-insensitively so a mistyped link still blocks (fail closed).
const sameId=(a,b)=>String(a??"").trim().toUpperCase()===String(b??"").trim().toUpperCase()&&String(b??"").trim()!=="";
function timeOverlap(a,b){const af=from(a),bf=from(b),at=to(a),bt=to(b);if([af,bf,at,bt].every(Number.isFinite))return af<bt&&bf<at;return null;}
function workType(p){return norm(p.workType||p.type||p.permitType||p.category);}
function simopsCandidates(permits){const findings=[];for(let i=0;i<permits.length;i++)for(let j=i+1;j<permits.length;j++){
const a=permits[i],b=permits[j];if(!active(a)||!active(b)||idOf(a)===idOf(b)||!loc(a)||loc(a)!==loc(b))continue;
const overlap=timeOverlap(a,b);if(overlap===false)continue;
const ids=[idOf(a),idOf(b)].sort();findings.push({id:"SIM-"+ids.join("-"),title:"SIMOPS potential conflict — HSE review",permitId:ids[0],otherPermitId:ids[1],area:loc(a),overlap:overlap===true?"confirmed-time-overlap":"schedule-unverified",workTypes:[workType(a),workType(b)],status:"In Review",controls:"Potential shared-work-area conflict. Verify task compatibility, location boundaries, timing and controls with HSE; do not authorize automatically."});
}return findings;}
async function getReview(permitId){const [gates,stops,risks,isolations,passports,incidents,actions,conflicts,permits]=await Promise.all([
...['gates','stopworks','risks','isolations','passports','incidents','actions','conflicts'].map(t=>root.SafePermitSafety.list(t)),root.SafePermitSafety.permits()]);
const linked=(arr)=>arr.filter(x=>sameId(x.permitId,permitId));
const stop=linked(stops).filter(x=>!['resolved','closed','released'].includes(norm(x.status)));
const gate=linked(gates).filter(x=>norm(x.status)!=='verified');
const currentPermit=permits.find(p=>String(p.id)===String(permitId));
const linkedIsolations=linked(isolations);
const loto=linkedIsolations.filter(x=>norm(x.status)!=='verified');
const linkedPassports=linked(passports);
const today=new Date().toISOString().slice(0,10);
const validISODate=value=>{if(typeof value!=='string'||!/^(\d{4})-(\d{2})-(\d{2})$/.test(value))return false;
 const [year,month,day]=value.split('-').map(Number),date=new Date(Date.UTC(year,month-1,day));
 return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;};
const competencyIssues=linkedPassports.filter(x=>norm(x.status)!=='verified'||!validISODate(x.due)||x.due<today);
const passportMissing=Boolean(currentPermit?.requiresCompetencyCheck||currentPermit?.requiresSafetyPassport)&&!linkedPassports.length;
const isolationMissing=Boolean(currentPermit?.requiresLOTO)&&!linkedIsolations.length;
const linkedRisks=risks.filter(x=>sameId(x.permitId,permitId));
const high=linkedRisks.filter(x=>{
 const severity=Number(x.severity),likelihood=Number(x.residualLikelihood==null?x.likelihood:x.residualLikelihood);
 return !Number.isInteger(severity)||severity<1||severity>5||
   !Number.isInteger(likelihood)||likelihood<1||likelihood>5||severity*likelihood>=10;
});
const auto=simopsCandidates(permits).filter(x=>x.permitId===String(permitId)||x.otherPermitId===String(permitId));
const finishedConflict=new Set(['resolved','closed','verified','cancelled','canceled']);
const unresolvedAuto=auto.filter(x=>!conflicts.some(c=>c.id===x.id&&finishedConflict.has(norm(c.status))));
// Manually reported conflicts are first-class review blockers for either permit.
// An open report must be investigated even if a related permit is now closed:
// changing permit lifecycle state does not silently resolve a reported concern.
const manualOpen=conflicts.filter(c=>!finishedConflict.has(norm(c.status))&&
  [c.permitId,c.otherPermitId].some(id=>sameId(id,permitId)));
const unresolved=[...unresolvedAuto];
for(const conflict of manualOpen){if(!unresolved.some(x=>x.id===conflict.id||
 (x.permitId===conflict.permitId&&x.otherPermitId===conflict.otherPermitId)))unresolved.push(conflict);}
const corruptStores=[];
for (const type of ['gates','stopworks','risks','isolations','passports','incidents','actions','conflicts']) {
 const raw=root.localStorage?.getItem('safepermit:safety-suite:v1:'+type);
 if (raw===null || raw===undefined) continue;
 try {if(!Array.isArray(JSON.parse(raw)))corruptStores.push(type);} catch(_){corruptStores.push(type);}
}
const blocked=[];if(corruptStores.length)blocked.push('Unverifiable safety records: '+corruptStores.join(', '));
if(!currentPermit)blocked.push('Permit record unavailable for safety review');
if(currentPermit?.resumeRequest?.status==='Pending HSE Review')blocked.push('Pending resumption authorization');
if(norm(currentPermit?.status)==='stopped')blocked.push('Permit stopped — authorized resume required');if(stop.length)blocked.push('Active stop-work case');if(gate.length)blocked.push('Unverified safety gates');if(loto.length||isolationMissing)blocked.push('LOTO isolation verification required');if(competencyIssues.length||passportMissing)blocked.push('Safety Passport competency verification required');if(high.length)blocked.push('High residual risk requires HSE review');if(unresolved.length)blocked.push('SIMOPS conflict review required');
return clone({permitId:String(permitId),eligibleForDemoApproval:blocked.length===0,blockers:blocked,counts:{gates:gate.length,stopworks:stop.length,risks:linkedRisks.length,highRisks:high.length,isolations:loto.length,missingIsolation:isolationMissing?1:0,passportsLinked:linkedPassports.length,competencyIssues:competencyIssues.length,missingPassport:passportMissing?1:0,simops:unresolved.length,incidents:linked(incidents).length,actions:linked(actions).length,passports:passports.length},conflicts:unresolved});}
async function scanAndStore(){const findings=simopsCandidates(await root.SafePermitSafety.permits()),existing=await root.SafePermitSafety.list('conflicts');let added=0;for(const candidate of findings){if(existing.some(x=>x.id===candidate.id))continue;await root.SafePermitSafety.upsert('conflicts',candidate);added++;}return {detected:findings.length,added};}
// Known legacy review fixtures are deliberately enumerated for the *demo only*.
// They are NOT a substitute for server-side permit lookup or authorization.
const legacyReviewFixtures=Object.freeze({
 'PTW-1045':'Pending Admin Approval', 'PTW-1044':'Pending Admin Approval',
 'PTW-1041':'Pending Admin Approval', 'PTW-1038':'Pending Admin Approval',
 'PTW-1035':'Pending Admin Approval'
});
async function recordStopWork(input){
 if(!input?.permitId||!String(input.title||'').trim())throw Error('Stop-work needs a title and Permit ID');
 const permitId=String(input.permitId).trim();
 const repo=root.SafePermitData.repository;
 let permit=await repo.getPermit(permitId);
 if(!permit&&typeof repo.listKnownPermits==='function'){
  const known=await repo.listKnownPermits();permit=known.find(p=>String(p.id)===permitId)||null;
 }
 if(!permit&&root.SafePermitData.mode==='demo'&&Object.prototype.hasOwnProperty.call(legacyReviewFixtures,permitId)){
  permit={id:permitId,status:legacyReviewFixtures[permitId],demoFixture:true};
 }
 if(!permit)throw Error('Permit must exist in the submitted repository or recognized demo fixtures');
 if(['closed','rejected','cancelled','canceled','stopped'].includes(norm(permit.status)))throw Error('Permit cannot be stopped in its current state');
 // Preserve an already recorded stop and do not silently replace its evidence.
 const previous=await root.SafePermitSafety.list('stopworks');
 if(previous.some(x=>sameId(x.permitId,permitId)&&!['resolved','closed','released'].includes(norm(x.status))))
   throw Error('An active stop-work case already exists for this permit');
 // Canonical repository hydrates explicit archived demo fixtures.

 const saved=await root.SafePermitSafety.upsert('stopworks',{...input,permitId,status:'Stopped'});
 try{await repo.savePermit({...permit,status:'Stopped',previousStatusBeforeStop:permit.status,stopWorkCaseId:saved.id});}
 catch(e){await root.SafePermitSafety.remove('stopworks',saved.id,{rollback:true});throw e;}
 return saved;
}
async function requestResume(permitId,reason){
 const id=String(permitId||'').trim();if(!id||!String(reason||'').trim())throw Error('Permit ID and resumption rationale are required');
 const permit=await root.SafePermitData.repository.getPermit(id);
 if(!permit||norm(permit.status)!=='stopped')throw Error('Only a stopped permit can request resumption');
 const stops=await root.SafePermitSafety.list('stopworks');
 if(stops.some(s=>sameId(s.permitId,id)&&!['closed','resolved','released'].includes(norm(s.status))))throw Error('Stop-work case must be closed after controls are verified');
 if(permit.resumeRequest?.status==='Pending HSE Review')throw Error('A resume request is already pending');
 const request={id:'RES-'+Date.now(),permitId:id,reason:String(reason).trim(),status:'Pending HSE Review',createdAt:new Date().toISOString()};
 await root.SafePermitData.repository.savePermit({...permit,resumeRequest:request});return clone(request);
}
async function decideResume(permitId,decision,reviewer,notes){
 const id=String(permitId||'').trim(),action=norm(decision);
 if(!['approve','reject'].includes(action))throw Error('Invalid resume decision');
 if(!String(reviewer||'').trim()||!String(notes||'').trim())throw Error('Reviewer and review evidence are required');
 const repo=root.SafePermitData.repository,permit=await repo.getPermit(id);
 if(!permit||norm(permit.status)!=='stopped'||permit.resumeRequest?.status!=='Pending HSE Review')throw Error('No pending HSE resume request for a stopped permit');
 const stops=await root.SafePermitSafety.list('stopworks');
 if(stops.some(s=>sameId(s.permitId,id)&&!['closed','resolved','released'].includes(norm(s.status))))throw Error('Stop-work remains open');
 const review=await getReview(id);
 // The stopped status and this pending request are what is being decided; every other blocker still applies.
 const otherBlockers=review.blockers.filter(b=>b!=='Permit stopped — authorized resume required'&&b!=='Pending resumption authorization');
 if(action==='approve'&&otherBlockers.length)throw Error('Cannot resume: '+otherBlockers.join('; '));
 const previous=permit.previousStatusBeforeStop;
 const allowed=['Pending Supervisor Review','Pending Safety Review','Pending Admin Approval','Approved','Active'];
 if(action==='approve'&&!allowed.includes(previous))throw Error('Unsafe or unknown previous workflow state');
 // Previously active work MUST undergo reauthorization, never resume directly to Active.
 const target=action==='reject'?'Stopped':previous==='Active'?'Pending Safety Review':previous;
 const event={action,reviewer:String(reviewer).trim(),notes:String(notes).trim(),from:'Stopped',to:target,at:new Date().toISOString()};
 const updated={...permit,status:target,resumeRequest:{...permit.resumeRequest,status:action==='approve'?'Approved':'Rejected'},resumeReview:event,auditTrail:[...(permit.auditTrail||[]),{type:'RESUME_REVIEW',...event}]};
 await repo.savePermit(updated);return clone(updated);
}
root.SafePermitWorkflow=Object.freeze({simopsCandidates,scanAndStore,getReview,recordStopWork,requestResume,decideResume,timeOverlap});
})(typeof window!=='undefined'?window:globalThis);
