(function(root){"use strict";
const api=root.SafePermitSafety;
const active=s=>!["Verified","Closed"].includes(String(s||"Open"));
const clone=x=>JSON.parse(JSON.stringify(x));
async function actionsFor(incidentId){return (await api.list("actions")).filter(x=>x.incidentId===incidentId);}
async function addAction(incidentId,details){
 const incident=await api.get("incidents",incidentId);
 if(!incident)throw Error("Incident record not found");
 if(incident.status==="Closed")throw Error("Reopen the incident before adding corrective actions");
 if(!String(details.title||"").trim()||!String(details.owner||"").trim()||!String(details.due||"").trim())throw Error("Action, owner and due date are required");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(details.due)||Number.isNaN(Date.parse(details.due+"T00:00:00Z")))throw Error("A valid due date is required");
 return api.upsert("actions",{title:String(details.title).trim(),owner:String(details.owner).trim(),due:details.due,controls:String(details.controls||"").trim(),incidentId,permitId:incident.permitId||"",area:incident.area||"",status:"Open",priority:details.priority||"Medium",mandatory:true,verificationEvidence:"",verifiedBy:""});
}
async function verifyAction(actionId,details){
 const action=await api.get("actions",actionId);
 if(!action||!action.incidentId)throw Error("Linked corrective action not found");
 const incident=await api.get("incidents",action.incidentId);
 if(!incident||incident.status==="Closed")throw Error("Cannot modify a closed or missing incident");
 if(!String(details.evidence||"").trim()||!String(details.reviewer||"").trim())throw Error("Verification evidence and reviewer are required");
 return api.verifyIncidentAction(actionId,{evidence:String(details.evidence).trim(),reviewer:String(details.reviewer).trim()});
}
async function closeIncident(incidentId,review){
 const incident=await api.get("incidents",incidentId);if(!incident)throw Error("Incident not found");
 const actions=await actionsFor(incidentId);
 if(!actions.length)throw Error("At least one verified corrective action is required before closure");
 if(actions.some(a=>a.mandatory!==false&&active(a.status)))throw Error("All mandatory corrective actions must be verified before closure");
 if(!String(review.reviewer||"").trim()||!String(review.evidence||"").trim())throw Error("HSE reviewer and closure evidence are required");
 return api.upsert("incidents",{...incident,status:"Closed",closedAt:new Date().toISOString(),closureReviewer:String(review.reviewer).trim(),closureEvidence:String(review.evidence).trim()});
}
root.SafePermitIncidents=Object.freeze({actionsFor,addAction,verifyAction,closeIncident});
})(typeof window!=="undefined"?window:globalThis);
