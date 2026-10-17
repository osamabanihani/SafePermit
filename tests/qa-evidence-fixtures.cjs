// Test-only synthetic evidence. Never write this fixture to a user permit.
function decision(permitId, role) {
 const stages={supervisor:['Supervisor','Pending Supervisor Review','Pending Safety Review'],
  safety:['Safety Officer','Pending Safety Review','Pending Admin Approval'],
  admin:['Admin','Pending Admin Approval','Approved']};
 const [label,previousStatus,newStatus]=stages[role];
 return {permitId,role:label,decision:'approve',reviewer:'QA Reviewer',
  comment:'Reviewed controls and permit prerequisites',previousStatus,newStatus,
  reviewedAt:'2026-10-13T09:00:00.000Z'};
}
function safety(permitId){return {
 safetyChecklist:{permitId,confirmed:true,answers:[{item:'PPE available',required:true,answer:'yes'}]},
 riskAssessment:{hazards:[{hazard:'Unsafe energy',controls:'Verified isolation',initialScore:12,residualScore:4}]}
};}
function basicInfo(overrides={}) {return {
 permitType:'electrical',workTitle:'QA isolated inspection',description:'Inspect isolated equipment with verified controls',
 site:'factory-a',area:'electrical-room',supervisor:'sup-001',workerCount:'2',
 startDate:'2099-10-15',startTime:'08:00',endDate:'2099-10-15',endTime:'10:00',...overrides
};}
module.exports={decision,safety,basicInfo};
