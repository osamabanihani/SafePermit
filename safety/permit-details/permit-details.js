(function () {
  const sidebar = document.getElementById("safetySidebar");
  const overlay = document.getElementById("safetyOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const permitData = {
    "PTW-1028": { type:"Work at Height", title:"Roof Inspection & Maintenance", description:"Inspection and minor maintenance activities on the warehouse roof using controlled access and fall-protection equipment.", worker:"Nour Ali", site:"Warehouse 2", area:"Roof Access", start:"Today · 22:00", end:"02:00", schedule:"Today · 22:00 → 02:00", workers:"3", status:"Active", risk:"High", riskClass:"high", initialScore:15, residualScore:10, hazard:"Fall from height", controls:"Full-body harness, approved anchor points, controlled roof access, competent personnel, and exclusion zone below.", timeText:"1h 40m" },
    "PTW-1019": { type:"Hot Work - Pipe Repair", title:"Hot Work - Pipe Repair", description:"Pipe repair work using controlled hot-work activities in the Plant B utility area.", worker:"Yazan Saleh", site:"Plant B", area:"Utility Area", start:"Today · 18:00", end:"23:45", schedule:"Today · 18:00 → 23:45", workers:"4", status:"Active", risk:"Medium", riskClass:"medium", initialScore:12, residualScore:6, hazard:"Fire and ignition", controls:"Remove combustibles, provide fire watch, extinguishers, and gas testing.", timeText:"2h 15m" },
    "PTW-1031": { type:"General Maintenance", title:"Production Line Maintenance", description:"Routine mechanical maintenance on production line equipment under controlled conditions.", worker:"Rami Nasser", site:"Factory A", area:"Line 2", start:"Today · 20:00", end:"01:30", schedule:"Today · 20:00 → 01:30", workers:"2", status:"Active", risk:"Low", riskClass:"low", initialScore:6, residualScore:3, hazard:"Moving equipment", controls:"Coordinate with operations, isolate the work zone, and keep access controlled.", timeText:"3h 05m" },
    "PTW-1036": { type:"Electrical Maintenance", title:"Electrical Panel Maintenance", description:"Inspection and maintenance of electrical distribution equipment under an approved isolation plan.", worker:"Layla Hassan", site:"Factory A", area:"Electrical Room", start:"Today · 19:00", end:"04:30", schedule:"Today · 19:00 → 04:30", workers:"3", status:"Active", risk:"High", riskClass:"high", initialScore:15, residualScore:6, hazard:"Unexpected energization", controls:"Apply LOTO, verify zero energy, use suitable PPE, and control access.", timeText:"6h 10m" },
    "PTW-1040": { type:"Mechanical Maintenance", title:"Pump Area Maintenance", description:"Mechanical inspection and maintenance activities on pump equipment before return to service.", worker:"Omar Worker", site:"Tank Farm", area:"Pump Area", start:"Today · 21:30", end:"00:30", schedule:"Today · 21:30 → 00:30", workers:"2", status:"Starting Soon", risk:"Medium", riskClass:"medium", initialScore:9, residualScore:5, hazard:"Stored mechanical energy", controls:"Isolate equipment, verify zero energy, and maintain controlled access.", timeText:"Starts in 45m" },
    "PTW-1041": { type:"General Maintenance", title:"Loading Bay Maintenance", description:"Minor maintenance activity in the loading bay under normal operational controls.", worker:"Sami Odeh", site:"Warehouse 1", area:"Loading Bay", start:"Today · 22:15", end:"01:00", schedule:"Today · 22:15 → 01:00", workers:"2", status:"Starting Soon", risk:"Low", riskClass:"low", initialScore:4, residualScore:2, hazard:"Vehicle movement", controls:"Barricade the work area and coordinate with loading-bay operations.", timeText:"Starts in 1h 30m" },
    "PTW-1025": { type:"Equipment Inspection", title:"Compressor Equipment Inspection", description:"Planned equipment inspection in the compressor area while operating controls remain in place.", worker:"Mahmoud Zaid", site:"Plant B", area:"Compressor Area", start:"Today · 17:00", end:"03:10", schedule:"Today · 17:00 → 03:10", workers:"3", status:"Active", risk:"Medium", riskClass:"medium", initialScore:9, residualScore:5, hazard:"Noise and rotating equipment", controls:"Maintain safe distance, use hearing protection, and follow access controls.", timeText:"4h 50m" }
  };

  const typeLabels = { electrical:"Electrical Work", "hot-work":"Hot Work", height:"Work at Height", confined:"Confined Space Entry", excavation:"Excavation", general:"General Maintenance" };
  const siteLabels = { "factory-a":"Factory A", "plant-b":"Plant B", "warehouse-1":"Warehouse 1", "warehouse-2":"Warehouse 2", "tank-farm":"Tank Farm" };

  function openSidebar(){ sidebar.classList.add("is-open"); overlay.classList.add("is-open"); document.body.style.overflow="hidden"; }
  function closeSidebar(){ sidebar.classList.remove("is-open"); overlay.classList.remove("is-open"); document.body.style.overflow=""; }
  if(sidebarOpen) sidebarOpen.addEventListener("click",openSidebar);
  if(sidebarClose) sidebarClose.addEventListener("click",closeSidebar);
  if(overlay) overlay.addEventListener("click",closeSidebar);
  window.addEventListener("resize",function(){ if(window.innerWidth>820) closeSidebar(); });

  function titleCase(value){ if(!value) return "—"; return String(value).replaceAll("-"," ").replace(/\b\w/g,function(l){return l.toUpperCase();}); }
  function formatDateTime(date,time){ if(!date&&!time)return"—"; if(!date)return time; const d=new Date(date+"T00:00:00"); const dt=Number.isNaN(d.getTime())?date:d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); return time?dt+" · "+time:dt; }
  function escapeHTML(value){ return String(value==null?"":value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
  function riskLevel(score){ if(score<=4)return{label:"Low",className:"low"}; if(score<=9)return{label:"Medium",className:"medium"}; if(score<=16)return{label:"High",className:"high"}; return{label:"Critical",className:"critical"}; }

  function findSubmittedPermit(id){
    let list=[];
    try{ list=JSON.parse(localStorage.getItem("safePermitSubmittedPermits")||"[]"); if(!Array.isArray(list))list=[]; }catch(e){ list=[]; }
    let found=list.find(function(p){return p&&p.id===id;});
    if(found)return found;
    try{ const latest=JSON.parse(localStorage.getItem("safePermitSubmittedPermit")||"null"); if(latest&&latest.id===id)return latest; }catch(e){}
    return null;
  }

  function normalizeSubmitted(permit){
    const b=permit.basicInfo||{};
    const hazards=permit.riskAssessment&&Array.isArray(permit.riskAssessment.hazards)?permit.riskAssessment.hazards:[];
    let maxI=0,maxR=0; hazards.forEach(function(h){maxI=Math.max(maxI,Number(h.initialScore)||0);maxR=Math.max(maxR,Number(h.residualScore)||0);});
    const r=riskLevel(maxR||1);
    const checklist=permit.safetyChecklist&&Array.isArray(permit.safetyChecklist.answers)?permit.safetyChecklist.answers:[];
    return { type:typeLabels[b.permitType]||titleCase(b.permitType), title:b.workTitle||"Permit Details", description:b.description||"No work description available.", worker:b.workerName||"Omar Worker", site:siteLabels[b.site]||titleCase(b.site), area:titleCase(b.area), start:formatDateTime(b.startDate,b.startTime), end:formatDateTime(b.endDate,b.endTime), schedule:formatDateTime(b.startDate,b.startTime)+" → "+formatDateTime(b.endDate,b.endTime), workers:String(b.workerCount||"—"), status:permit.status||"Pending Supervisor Review", risk:r.label, riskClass:r.className, initialScore:maxI, residualScore:maxR, hazards:hazards, checklist:checklist, timeText:"See permit schedule" };
  }

  function renderHazards(data){
    const list=document.getElementById("hazardList");
    let hazards=data.hazards;
    if(!Array.isArray(hazards)||!hazards.length){ hazards=[{hazard:data.hazard,initialScore:data.initialScore,residualScore:data.residualScore,controls:data.controls}]; }
    list.innerHTML="";
    let maxI=0,maxR=0;
    hazards.forEach(function(h,index){
      const i=Number(h.initialScore)||0,r=Number(h.residualScore)||0; maxI=Math.max(maxI,i);maxR=Math.max(maxR,r);
      const il=riskLevel(i||1),rl=riskLevel(r||1);
      const card=document.createElement("article"); card.className="permit-hazard";
      card.innerHTML='<div class="permit-hazard__top"><strong>Hazard '+(index+1)+' · '+escapeHTML(h.hazard||"Operational hazard")+'</strong><div class="permit-hazard__chips"><span class="permit-risk permit-risk--'+il.className+'">Initial '+(i||"—")+' · '+il.label+'</span><span class="permit-risk permit-risk--'+rl.className+'">Residual '+(r||"—")+' · '+rl.label+'</span></div></div><div class="permit-hazard__control"><span>Control Measures</span><p>'+escapeHTML(h.controls||"Controls recorded in the permit.")+'</p></div>';
      list.appendChild(card);
    });
    const il=riskLevel(maxI||1),rl=riskLevel(maxR||1);
    document.getElementById("hazardCount").textContent=hazards.length===1?"1 hazard":hazards.length+" hazards";
    document.getElementById("initialRiskSummary").textContent=maxI?maxI+" · "+il.label:"—";
    document.getElementById("residualRiskSummary").textContent=maxR?maxR+" · "+rl.label:"—";
  }

  function renderChecklist(data){
    const answers=Array.isArray(data.checklist)?data.checklist:[];
    if(!answers.length)return;
    const list=document.getElementById("checklistList");
    const count=document.getElementById("checklistCount");
    list.innerHTML="";
    let answered=0;
    answers.forEach(function(item){
      const value=String(item.answer||"").toLowerCase();
      if(value)answered+=1;
      let cls="na",label="N/A";
      if(value==="yes"){cls="yes";label="YES";}
      else if(value==="no"){cls="no";label="NO";}
      const row=document.createElement("div");
      row.className="permit-checklist-item";
      row.innerHTML='<strong>'+escapeHTML(item.item||"Checklist item")+'</strong><span class="permit-answer permit-answer--'+cls+'">'+label+'</span>';
      list.appendChild(row);
    });
    count.textContent=answered+" / "+answers.length+" answered";
  }

  function renderFlow(status,record){
    const items=Array.from(document.querySelectorAll(".permit-flow__item"));
    const lines=Array.from(document.querySelectorAll(".permit-flow__line"));
    const notes=["Permit submitted","Waiting","Waiting","Waiting"];
    items.forEach(function(item,index){
      item.classList.remove("is-complete","is-current");
      const marker=item.querySelector(":scope > span");
      const note=item.querySelector("small");
      if(marker)marker.textContent=String(index+1);
      if(note)note.textContent=notes[index];
    });
    lines.forEach(function(line){line.classList.remove("is-complete");});
    function complete(index,noteText){
      const item=items[index]; if(!item)return; item.classList.add("is-complete");
      const marker=item.querySelector(":scope > span"); const note=item.querySelector("small");
      if(marker)marker.textContent="✓"; if(note)note.textContent=noteText||"Completed";
      if(index>0&&lines[index-1])lines[index-1].classList.add("is-complete");
    }
    function current(index,noteText){
      const item=items[index]; if(!item)return; item.classList.add("is-current");
      const note=item.querySelector("small"); if(note)note.textContent=noteText||"Current stage";
    }
    // Approval is shown only with a documented, permit-linked decision; bundled fixtures have none.
    function approvedStep(index,role,noteText){
      if(record&&window.SafePermitData&&typeof window.SafePermitData.hasApprovalEvidence==="function"&&window.SafePermitData.hasApprovalEvidence(record,role)){complete(index,noteText);return;}
      const note=items[index]&&items[index].querySelector("small"); if(note)note.textContent="Evidence missing";
    }
    complete(0,"Permit submitted");
    if(status==="Stopped"){current(3,"Stopped — authorized resume required");return;}
    if(status==="Pending Supervisor Review"){current(1,"Current stage");return;}
    approvedStep(1,"supervisor","Supervisor approved");
    if(status==="Pending Safety Review"){current(2,"Current stage");return;}
    approvedStep(2,"safety","Safety approved");
    if(status==="Pending Admin Approval"){current(3,"Current stage");return;}
    if(["Approved","Active","Completed","Closed","Starting Soon"].includes(status)){approvedStep(3,"admin",status==="Approved"?"Approved":"Admin approved");return;}
    current(3,"Current stage");
  }

  function applyPermit(){
    const params=new URLSearchParams(window.location.search); const requestedId=params.get("id")||"";
    const permitState=window.SafePermitPermitState;
    const submitted=requestedId?findSubmittedPermit(requestedId):null;
    const sample=!submitted&&requestedId&&permitState&&permitState.demoRequested()?permitData[requestedId]||null:null;
    if(!submitted&&!sample){ if(permitState)permitState.showNotFound({id:requestedId,backHref:"../risk-overview/",backLabel:"Back to Risk Overview"}); return; }
    if(sample&&permitState)permitState.showDemoBanner();
    const data=submitted?normalizeSubmitted(submitted):sample; const finalId=submitted?submitted.id:requestedId;
    document.getElementById("permitId").textContent=finalId; document.getElementById("permitType").textContent=data.type; document.getElementById("workTitle").textContent=data.title; document.getElementById("workDescription").textContent=data.description;
    document.getElementById("workerMeta").textContent="Worker: "+data.worker; document.getElementById("locationMeta").textContent=data.site+" · "+data.area; document.getElementById("scheduleMeta").textContent=data.schedule;
    document.getElementById("infoPermitType").textContent=data.type; document.getElementById("infoWorker").textContent=data.worker; document.getElementById("infoSite").textContent=data.site; document.getElementById("infoArea").textContent=data.area; document.getElementById("infoStart").textContent=data.start; document.getElementById("infoEnd").textContent=data.end; document.getElementById("infoWorkers").textContent=data.workers;
    document.getElementById("recordId").textContent=finalId; document.getElementById("recordWorker").textContent=data.worker; document.getElementById("recordStatus").textContent=data.status;
    const status=document.getElementById("permitStatus"); status.textContent=data.status; status.className="permit-status "+(data.status==="Active"?"permit-status--active":"");
    const risk=document.getElementById("permitRisk"); risk.textContent=data.risk; risk.className="permit-risk permit-risk--"+data.riskClass;
    document.getElementById("monitorStatus").textContent=data.status; document.getElementById("monitorLocation").textContent=data.site+" · "+data.area; document.getElementById("monitorTime").textContent=data.timeText||"See permit schedule";
    renderHazards(data); renderChecklist(data); renderFlow(data.status,submitted); document.title=finalId+" | SafePermit";
  }
  applyPermit();
})();
