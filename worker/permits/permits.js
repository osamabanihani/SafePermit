(function () {
  const sidebar = document.getElementById("workerSidebar");
  const overlay = document.getElementById("workerOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");
  const searchInput = document.getElementById("permitSearch");
  const riskFilter = document.getElementById("riskFilter");
  const sortFilter = document.getElementById("sortFilter");
  const summaryButtons = document.querySelectorAll("[data-status-filter]");
  const emptyState = document.getElementById("permitsEmpty");
  const resultsCount = document.getElementById("resultsCount");
  const tableBody = document.getElementById("permitTableBody");
  const cardsContainer = document.getElementById("permitCards");
  let activeStatus = "all";

  const permitTypeLabels = { electrical:"Electrical Work", "hot-work":"Hot Work", height:"Work at Height", confined:"Confined Space Entry", excavation:"Excavation", general:"General Maintenance" };
  const siteLabels = { "factory-a":"Factory A", "plant-b":"Plant B", "warehouse-1":"Warehouse 1", "warehouse-2":"Warehouse 2", "tank-farm":"Tank Farm" };

  function escapeHTML(value){return String(value==null?"":value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
  function titleCase(value){if(!value)return"—";return String(value).replaceAll("-"," ").replace(/\b\w/g,function(l){return l.toUpperCase();});}
  function highestResidual(assessment){if(!assessment||!Array.isArray(assessment.hazards))return 0;return assessment.hazards.reduce(function(max,h){return Math.max(max,Number(h.residualScore)||0);},0);}
  function riskFromScore(score){if(score>=17)return"critical";if(score>=10)return"high";if(score>=5)return"medium";return"low";}
  function statusGroup(status){if(status==="Approved"||status==="Active"||status==="Completed"||status==="Closed")return"approved";if(status==="Stopped")return"stopped";if(status==="Returned for Correction")return"returned";if(status==="Draft")return"draft";return"pending";}
  function statusClass(group){return "status-badge--"+group;}
  function formatDate(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return{date:"—",time:"—",sort:"1970-01-01"};return{date:d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),time:d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),sort:d.toISOString().slice(0,10)};}

  function openSidebar(){sidebar.classList.add("is-open");overlay.classList.add("is-open");document.body.style.overflow="hidden";}
  function closeSidebar(){sidebar.classList.remove("is-open");overlay.classList.remove("is-open");document.body.style.overflow="";}
  if(sidebarOpen)sidebarOpen.addEventListener("click",openSidebar);
  if(sidebarClose)sidebarClose.addEventListener("click",closeSidebar);
  if(overlay)overlay.addEventListener("click",closeSidebar);
  window.addEventListener("resize",function(){if(window.innerWidth>820)closeSidebar();});

  function readSubmittedPermits(){
    const list=JSON.parse(localStorage.getItem("safePermitSubmittedPermits")||"[]");
    if(!Array.isArray(list))throw new Error("Stored permit list is unavailable.");
    const latest=JSON.parse(localStorage.getItem("safePermitSubmittedPermit")||"null");
    if(latest&&(typeof latest!=="object"||Array.isArray(latest)))throw new Error("Stored permit record is unavailable.");
    if(latest&&latest.id&&!list.some(function(p){return p&&p.id===latest.id;}))list.unshift(latest);
    return list;
  }

  function injectSubmittedPermits(){
    const existing=new Set(Array.from(tableBody.querySelectorAll(".permit-item small")).map(function(el){return el.textContent.trim();}));
    let added=0;
    const addedByGroup = { pending: 0, approved: 0, returned: 0, draft: 0, stopped: 0 };
    readSubmittedPermits().forEach(function(permit){
      if(!permit||!permit.id||existing.has(permit.id))return;
      const b=permit.basicInfo||{};const type=permitTypeLabels[b.permitType]||titleCase(b.permitType);const site=siteLabels[b.site]||titleCase(b.site);const area=titleCase(b.area);const risk=riskFromScore(highestResidual(permit.riskAssessment));const group=statusGroup(permit.status||"Pending Supervisor Review");const stamp=formatDate(permit.submittedAt||new Date().toISOString());
      const row=document.createElement("tr");row.className="permit-item";row.dataset.search=(permit.id+" "+type+" "+site+" "+area).toLowerCase();row.dataset.status=group;row.dataset.lifecycle=permit.status||"";row.dataset.risk=risk;row.dataset.date=stamp.sort;
      row.innerHTML='<td><div class="permit-cell-main"><span class="permit-type-icon">●</span><div><strong>'+escapeHTML(type)+'</strong><small>'+escapeHTML(permit.id)+'</small></div></div></td><td><strong class="permit-location">'+escapeHTML(site)+'</strong><small>'+escapeHTML(area)+'</small></td><td><span class="risk-badge risk-badge--'+risk+'">'+escapeHTML(titleCase(risk))+'</span></td><td><span class="status-badge '+statusClass(group)+'">'+escapeHTML(permit.status||"Pending Supervisor Review")+'</span></td><td><strong class="permit-date">'+escapeHTML(stamp.date)+'</strong><small>'+escapeHTML(stamp.time)+'</small></td><td><a class="permit-open" href="../permit-details/?id='+encodeURIComponent(permit.id)+'" aria-label="Open '+escapeHTML(permit.id)+'">→</a></td>';
      tableBody.prepend(row);
      row.dataset.dynamic="true";
      const card=document.createElement("article");card.className="permit-mobile-card permit-item";card.dataset.search=row.dataset.search;card.dataset.status=group;card.dataset.lifecycle=permit.status||"";card.dataset.risk=risk;card.dataset.date=stamp.sort;
      card.innerHTML='<div class="permit-mobile-card__top"><div class="permit-cell-main"><span class="permit-type-icon">●</span><div><strong>'+escapeHTML(type)+'</strong><small>'+escapeHTML(permit.id)+'</small></div></div><span class="risk-badge risk-badge--'+risk+'">'+escapeHTML(titleCase(risk))+'</span></div><div class="permit-mobile-card__details"><span><b>Location:</b> '+escapeHTML(site)+' · '+escapeHTML(area)+'</span><span><b>Updated:</b> '+escapeHTML(stamp.date)+'</span></div><div class="permit-mobile-card__bottom"><span class="status-badge '+statusClass(group)+'">'+escapeHTML(permit.status||"Pending Supervisor Review")+'</span><a class="permit-open" href="../permit-details/?id='+encodeURIComponent(permit.id)+'">→</a></div>';
      cardsContainer.prepend(card);existing.add(permit.id);added+=1;addedByGroup[group]+=1;
      card.dataset.dynamic="true";
    });
    if(added){
      Array.from(summaryButtons).forEach(function(button){
        const group = button.dataset.statusFilter;
        const strong = button.querySelector("strong");
        if (!strong) return;
        if (group === "all") {
          strong.textContent = Number(strong.textContent || 0) + added;
        } else if (addedByGroup[group]) {
          strong.textContent = Number(strong.textContent || 0) + addedByGroup[group];
        }
      });
    }
  }

  // "active" is a lifecycle state inside the approved group; other values are summary groups.
  function statusMatches(item){
    if(activeStatus==="all")return true;
    if(activeStatus==="active")return (item.dataset.lifecycle||"")==="Active";
    return item.dataset.status===activeStatus;
  }
  function applyStatusFromUrl(){
    const requested=(new URLSearchParams(window.location.search).get("status")||"").toLowerCase();
    if(!["pending","approved","returned","draft","active","stopped"].includes(requested))return;
    activeStatus=requested;
    summaryButtons.forEach(function(item){item.classList.toggle("is-active",item.dataset.statusFilter===requested);});
  }
  function applyFilters(){
    const searchValue=searchInput.value.trim().toLowerCase();const riskValue=riskFilter.value;const tableRows=Array.from(tableBody.querySelectorAll(".permit-item"));const mobileCards=Array.from(cardsContainer.querySelectorAll(".permit-item"));let visibleCount=0;
    tableRows.forEach(function(row){const visible=row.dataset.search.toLowerCase().includes(searchValue)&&statusMatches(row)&&(riskValue==="all"||row.dataset.risk===riskValue);row.classList.toggle("is-hidden",!visible);if(visible)visibleCount+=1;});
    mobileCards.forEach(function(card){const visible=card.dataset.search.toLowerCase().includes(searchValue)&&statusMatches(card)&&(riskValue==="all"||card.dataset.risk===riskValue);card.classList.toggle("is-hidden",!visible);});
    emptyState.hidden=visibleCount!==0;resultsCount.textContent=visibleCount===1?"1 permit shown":visibleCount+" permits shown";
  }

  function sortPermits(){
    const sortValue=sortFilter.value;const tableRows=Array.from(tableBody.querySelectorAll(".permit-item"));const mobileCards=Array.from(cardsContainer.querySelectorAll(".permit-item"));const riskOrder={low:1,medium:2,high:3,critical:4};
    function compare(a,b){if(sortValue==="oldest")return new Date(a.dataset.date)-new Date(b.dataset.date);if(sortValue==="risk-high")return riskOrder[b.dataset.risk]-riskOrder[a.dataset.risk];return new Date(b.dataset.date)-new Date(a.dataset.date);}
    tableRows.sort(compare).forEach(function(row){tableBody.appendChild(row);});mobileCards.sort(compare).forEach(function(card){cardsContainer.appendChild(card);});applyFilters();
  }

  summaryButtons.forEach(function(button){button.addEventListener("click",function(){summaryButtons.forEach(function(item){item.classList.remove("is-active");});button.classList.add("is-active");activeStatus=button.dataset.statusFilter;applyFilters();});});
  searchInput.addEventListener("input",applyFilters);riskFilter.addEventListener("change",applyFilters);sortFilter.addEventListener("change",sortPermits);
  // Static demo rows carry their lifecycle in the badge text.
  Array.from(document.querySelectorAll(".permit-item")).forEach(function(item){if(item.dataset.lifecycle==null){const badge=item.querySelector("[class*='status-badge']");item.dataset.lifecycle=badge?badge.textContent.trim():"";}});
  const initialCounts=Array.from(summaryButtons).map(button=>[button,button.querySelector("strong")?.textContent]);
  function refreshPermits(){
    tableBody.dataset.listState="loading";
    try{
      tableBody.querySelectorAll('[data-dynamic="true"]').forEach(row=>row.remove());
      cardsContainer.querySelectorAll('[data-dynamic="true"]').forEach(card=>card.remove());
      initialCounts.forEach(([button,count])=>{if(button.querySelector("strong"))button.querySelector("strong").textContent=count;});
      injectSubmittedPermits();sortPermits();tableBody.dataset.listState="ready";
    }catch(_){tableBody.dataset.listState="error";}
  }
  applyStatusFromUrl();refreshPermits();
  window.addEventListener("safepermit:permits-updated",refreshPermits);
  window.addEventListener("storage",refreshPermits);
})();
