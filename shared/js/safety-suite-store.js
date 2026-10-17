/* SafePermit safety suite: mock data only, not safety authorization. */
(function(root){"use strict";
const PREFIX="safepermit:safety-suite:v1:";
const TYPES=Object.freeze(["risks","zones","gates","conflicts","indicators","isolations","passports","incidents","actions","stopworks"]);
const clone=x=>JSON.parse(JSON.stringify(x));
const normStatus=x=>String(x||"").trim().toLowerCase();
function typeOK(type){if(!TYPES.includes(type))throw new Error("Unknown collection: "+type);}
function read(type){typeOK(type);let result;try{result=JSON.parse(root.localStorage.getItem(PREFIX+type)||"[]");}catch(_){result=[];}return Array.isArray(result)?clone(result):[];}
function write(type,items){typeOK(type);root.localStorage.setItem(PREFIX+type,JSON.stringify(items));root.dispatchEvent(new CustomEvent("safepermit:safety-updated",{detail:{type}}));}
function validateRisk(record){
 for(const field of ["severity","likelihood","residualLikelihood"]){
  if(record[field]===undefined||record[field]===null||record[field]==="")continue;
  const value=Number(record[field]);
  if(!Number.isInteger(value)||value<1||value>5)throw new Error(field+" must be an integer from 1 to 5");
 }
 const severity=Number(record.severity), initialLikelihood=Number(record.likelihood), residualLikelihood=Number(record.residualLikelihood);
 if(severity>=1&&initialLikelihood>=1&&residualLikelihood>=1){
  const initial=severity*initialLikelihood, residual=severity*residualLikelihood;
  if(residual>initial&&["Controlled","Verified","Resolved","Closed"].includes(record.status))throw new Error("Residual risk exceeds initial risk. Select In Review/Open and reassess the controls before marking this risk controlled.");
  if(residual>=10&&["Controlled","Verified","Resolved","Closed"].includes(record.status))throw new Error("High or critical residual risk requires review before a controlled/closed status can be assigned in this demo.");
 }
}
function assertComplianceTransition(type, old, item){
 if(type!=="actions")return;
 const protectedStates=["verified","closed","resolved"];
 if(protectedStates.includes(normStatus(item.status))&&!protectedStates.includes(normStatus(old?.status)))
  throw new Error("Compliance verification requires separate HSE review with documented evidence.");
 if(old?.incidentId&&normStatus(old.status)==="verified"&&normStatus(item.status)!=="verified")
  throw new Error("Linked incident corrective action cannot be reopened through Compliance Edit.");
 if(old?.incidentId&&["verified","closed","resolved"].includes(normStatus(item.status))&&JSON.stringify(item)!==JSON.stringify(old)){
  // Changes to incident-linked evidence/status must follow the incident workflow.
  const keys=["status","verifiedBy","verificationEvidence","incidentId"];
  if(keys.some(k=>item[k]!==old[k]))throw new Error("Incident-linked verification is managed in Incident Investigation.");
 }
}
const adapter=Object.freeze({
 list(type){return Promise.resolve().then(()=>read(type));},
 get(type,id){return Promise.resolve().then(()=>read(type).find(x=>x.id===id)||null);},
 upsert(type,payload){return Promise.resolve().then(()=>{if(!payload||typeof payload!=="object")throw new TypeError("Invalid record");const items=read(type);const id=String(payload.id||((root.crypto&&root.crypto.randomUUID)?root.crypto.randomUUID():"SP-"+Date.now()+"-"+Math.random().toString(36).slice(2)));const now=new Date().toISOString();const old=items.find(x=>x.id===id);const item={...old,...clone(payload),id,updatedAt:now,createdAt:old?.createdAt||now};if(!item.title||!String(item.title).trim())throw new Error("Title is required");if(type==="risks")validateRisk(item);assertComplianceTransition(type,old,item);
if(type==="passports"&&item.permitId){if(item.due&&!/^\d{4}-\d{2}-\d{2}$/.test(item.due))throw new Error("Competency expiry must be a date YYYY-MM-DD");}
if(type==="incidents"&&item.status==="Closed"&&old?.status!=="Closed"){const linked=read("actions").filter(a=>a.incidentId===id);if(!linked.length||linked.some(a=>a.mandatory!==false&&normStatus(a.status)!=="verified")||!String(item.closureReviewer||"").trim()||!String(item.closureEvidence||"").trim())throw new Error("Verified corrective actions and HSE closure evidence are required");}if(type==="isolations"&&item.permitId&&normStatus(item.status)==="verified"&&!String(item.controls||"").trim())throw new Error("Isolation verification evidence is required");const index=items.findIndex(x=>x.id===id);if(index>=0)items[index]=item;else items.unshift(item);write(type,items);return clone(item);});},
 verifyIncidentAction(id,details){return Promise.resolve().then(()=>{
 const reviewer=String(details?.reviewer||"").trim(),evidence=String(details?.evidence||"").trim();
 if(!reviewer||!evidence)throw Error("Verification evidence and reviewer are required");
 const items=read("actions"),index=items.findIndex(x=>x.id===id);
 if(index<0||!items[index].incidentId)throw Error("Linked corrective action not found");
 const old=items[index],incident=read("incidents").find(x=>x.id===old.incidentId);
 if(!incident||incident.status==="Closed")throw Error("Cannot modify a closed or missing incident");
 if(normStatus(old.status)==="verified")throw Error("Action already verified");
 const now=new Date().toISOString();
 const item={...old,status:"Verified",verificationEvidence:evidence,verifiedBy:reviewer,verifiedAt:now,updatedAt:now};
 items[index]=item;write("actions",items);return clone(item);
 });},
 verifyCompliance(id,details){return Promise.resolve().then(()=>{
 const reviewer=String(details?.reviewer||"").trim();const evidence=String(details?.evidence||"").trim();
 if(!reviewer||evidence.length<20)throw new Error("HSE reviewer and specific verification evidence (20+ characters) are required.");
 const items=read("actions"),index=items.findIndex(x=>x.id===id);
 if(index<0)throw new Error("Compliance finding not found");
 const old=items[index];
 if(old.incidentId)throw new Error("Incident-linked actions must be verified from Incident Investigation.");
 if(["verified","closed","resolved"].includes(normStatus(old.status)))throw new Error("Finding already verified; duplicate verification not allowed.");
 if(!String(old.controls||"").trim()||!String(old.owner||"").trim())throw new Error("Finding needs owner and corrective action details before review.");
 const timestamp=new Date().toISOString();
 const item={...old,status:"Verified",verifiedBy:reviewer,verificationEvidence:evidence,verifiedAt:timestamp,updatedAt:timestamp,
  verificationHistory:[...(Array.isArray(old.verificationHistory)?old.verificationHistory:[]),{reviewer,evidence,decision:"Verified",at:timestamp}]};
 items[index]=item;write("actions",items);return clone(item);
 });},
 remove(type,id,options){return Promise.resolve().then(()=>{const items=read(type);
 // Safety audit records are never erased: deleting them would bypass closure/resume evidence rules.
 const target=items.find(x=>x.id===id);
 // options.rollback is only for undoing a record created moments earlier in the same failed transaction.
 if(target&&type==="stopworks"&&!(options&&options.rollback===true))throw new Error("Stop-work records are retained for audit and cannot be deleted.");
 if(target&&type==="actions"&&target.incidentId)throw new Error("Incident-linked corrective actions are retained for audit and cannot be deleted.");const updated=items.filter(x=>x.id!==id);if(items.length===updated.length)return false;write(type,updated);return true;});},
 permits(){return root.SafePermitData?.repository?.listKnownPermits?.()||Promise.resolve([]);},
 async summary(){const entries=await Promise.all(TYPES.map(t=>adapter.list(t)));return Object.fromEntries(TYPES.map((t,i)=>[t,entries[i].length]));}
});
root.SafePermitSafety=adapter;
})(typeof window!=="undefined"?window:globalThis);
