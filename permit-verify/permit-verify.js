(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const id = String(params.get('id') || '').trim().toUpperCase();
  const idEl = document.getElementById('id');
  const details = document.getElementById('demo-details');
  idEl.textContent = /^PTW-[A-Z0-9-]{1,24}$/.test(id) ? id : 'Invalid permit ID';
  if (!/^PTW-[A-Z0-9-]{1,24}$/.test(id)) return;
  function parse(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key)); return value == null ? fallback : value; }
    catch (_) { return fallback; }
  }
  // Reuse the canonical demo adapter so archived PTW-1038 records receive
  // the same metadata hydration as Admin Review. Never invent unknown permits.
  const records = window.SafePermitData && typeof window.SafePermitData.readKnownPermits === 'function'
    ? window.SafePermitData.readKnownPermits() : [];
  const record = records.find(p => p && String(p.id).toUpperCase() === id);
  const states = parse('safePermitAdminLifecycle', {});
  const override = states && typeof states === 'object' && !Array.isArray(states) ? states[id] : null;
  const fixture = {
    'PTW-1042': {type:'Electrical Maintenance',worker:'Omar Khalid',site:'Plant A · Unit 3',status:'Approved'},
    'PTW-1039': {type:'Hot Work',worker:'Lina Odeh',site:'Factory B · Welding Bay',status:'Active'},
    'PTW-1031': {type:'Working at Height',worker:'Yazan Ali',site:'Plant A · Roof Zone',status:'Active'},
    'PTW-1028': {type:'Confined Space',worker:'Maya Saleh',site:'Utility Area · Tank 2',status:'Closed'}
  }[id];
  if (!record && !fixture) {
    details.textContent = 'No permit record is available in this browser demo. A QR reference alone does not establish permit existence or validity.';
    return;
  }
  const info = record?.basicInfo || {};
  const canonical = window.SafePermitData?.getPermit(id);
  const status = canonical?.status || (record?.status === 'Stopped' ? 'Stopped' : (override?.status || record?.status || fixture?.status || 'Unknown'));
  // Never conflate a lifecycle field with an authorization decision.
  const fixtureExpiry = {'PTW-1042':'2026-10-10T17:00:00','PTW-1039':'2026-10-10T12:30:00',
    'PTW-1031':'2026-10-10T15:00:00','PTW-1028':'2026-10-09T11:00:00'};
  const end = info.endDate && info.endTime ? info.endDate+'T'+info.endTime :
    (info.endDate || info.endTime ? '' : (record?.end || record?.endDateTime || fixtureExpiry[id] || ''));
  const validFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(end);
  const parts = validFormat ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(end) : null;
  const [year,month,day,hour,minute,second] = parts ?
    [+parts[1],+parts[2],+parts[3],+parts[4],+parts[5],+(parts[6]||0)] : [0,0,0,0,0,0];
  const calendar = new Date(Date.UTC(year,month-1,day));
  const validCalendar = !!parts && calendar.getUTCFullYear()===year &&
    calendar.getUTCMonth()===month-1 && calendar.getUTCDate()===day &&
    hour<24 && minute<60 && second<60;
  const expiry = validCalendar ? Date.parse(end) : NaN;
  const hasFutureExpiry = Number.isFinite(expiry) && expiry>Date.now();
  const effective = status !== 'Active' ? 'NOT AUTHORIZED — permit is '+status :
    !hasFutureExpiry ? 'NOT AUTHORIZED — expired or unverifiable expiration' :
    'UNVERIFIED — Active is only a locally stored demo status';
  const rows = [
    ['Stored demo lifecycle status', status],
    ['Effective demo validity', effective],
    ['Recorded end', end || 'Missing / unverifiable'],
    ['Work', info.workTitle || record?.workTitle || record?.permitType || fixture?.type || 'Not recorded'],
    ['Worker', info.workerName || record?.workerName || record?.worker || fixture?.worker || 'Not recorded'],
    ['Location', [info.site,info.area].filter(Boolean).join(' · ') || record?.location || record?.site || fixture?.site || 'Not recorded'],
    ['Source', record ? 'Browser-stored demo permit' : 'Bundled demo fixture']
  ];
  const heading=document.createElement('h2');heading.textContent='Local demo snapshot (UNVERIFIED)';details.append(heading);
  for(const [key,value] of rows){const line=document.createElement('p');const label=document.createElement('b');label.textContent=key+': ';line.append(label,document.createTextNode(String(value)));details.append(line);}
  const caveat=document.createElement('p');caveat.textContent='This is a browser-local snapshot, not a live authorization check. Another device may show different or no demo data. NEVER use this page to authorize work.';details.append(caveat);
})();
