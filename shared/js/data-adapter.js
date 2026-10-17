/* SafePermit demo repository. Never use localStorage to authorize real work. */
(function (root) {
  "use strict";
  const LIST = "safePermitSubmittedPermits";
  const LATEST = "safePermitSubmittedPermit";
  const LEGACY = "safePermitPermits";
  const clone = (x) => JSON.parse(JSON.stringify(x));
  // Same required fields, 1..50 range and schedule order as Basic Info Continue.
  // Drafts deliberately do not call this gate. A server must repeat it in production.
  function validateWorkerCount(value) {
    if (value == null || String(value).trim() === '') return 'Number of workers is required.';
    return ['string','number'].includes(typeof value) && Number.isFinite(Number(value)) && Number(value) >= 1 && Number(value) <= 50
      ? '' : 'Number of workers must be between 1 and 50.';
  }
  function validateBasicInfo(info) {
    const value = info && typeof info === 'object' && !Array.isArray(info) ? info : {};
    const errors = {};
    for (const [key, label] of Object.entries({permitType:'Permit type',workTitle:'Work title',
      description:'Job description',site:'Site',area:'Area',startDate:'Start date',startTime:'Start time',
      endDate:'End date',endTime:'End time',supervisor:'Supervisor'})) {
      if (typeof value[key] !== 'string' || !value[key].trim()) errors[key] = label + ' is required.';
    }
    const countError = validateWorkerCount(value.workerCount);
    if (countError) errors.workerCount = countError;
    if (!['startDate','startTime','endDate','endTime'].some(key => errors[key])) {
      const validDate = text => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
        const date = new Date(text + 'T00:00:00Z');
        return Number.isFinite(+date) && date.toISOString().slice(0,10) === text;
      };
      for (const key of ['startDate','endDate']) if (!validDate(value[key])) errors[key] = 'Enter a valid date.';
      for (const key of ['startTime','endTime']) if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value[key])) errors[key] = 'Enter a valid time.';
      if (!Object.keys(errors).some(key => ['startDate','startTime','endDate','endTime'].includes(key)) &&
          new Date(value.endDate+'T'+value.endTime) <= new Date(value.startDate+'T'+value.startTime)) {
        errors.endDate = errors.endTime = 'End date and time must be after the start.';
      }
    }
    return errors;
  }
  function requireBasicInfo(info) {
    const errors = validateBasicInfo(info);
    if (Object.keys(errors).length) {
      const translate = message => root.SafePermitI18n?.translateValue(message) || message;
      const prefix = root.document?.documentElement?.lang === 'ar' ? 'المعلومات الأساسية: ' : 'Basic Info: ';
      const error = Error(prefix + Object.values(errors).map(translate).join(' '));
      error.validationErrors = errors;
      throw error;
    }
  }
  function parse(value, fallback) {
    try { return value == null ? fallback : JSON.parse(value); } catch (_) { return fallback; }
  }
  // Explicitly scoped to the archived PTW-1038 demo fixture. Never invent
  // metadata for real permits. Backend records must be complete and authoritative.
  const DEMO_FIXTURES = Object.freeze({
    "PTW-1038": Object.freeze({
      workTitle:"Hot Work - Pipe Repair", workerName:"Yazan Saleh",
      location:"Plant B - Utility Area", permitType:"hot-work",
      basicInfo:{workTitle:"Hot Work - Pipe Repair",workerName:"Yazan Saleh",
        site:"Plant B",area:"Utility Area",permitType:"hot-work",
        startDate:"2026-10-08",startTime:"08:30",endDate:"2026-10-08",endTime:"13:30",workerCount:4,description:"Controlled hot-work pipe repair in the Plant B utility area."},
      riskAssessment:{hazards:[{hazard:"Fire and ignition",initialScore:12,controls:"Remove combustibles, provide extinguisher, maintain fire watch, and barricade area.",residualScore:8}]}
    })
  });
  const missing = v => v == null || String(v).trim() === "" ||
    ["Worker","General Work","Site","Area"].includes(String(v).trim());
  function hydrateDemoPermit(record) {
    if (!record || !Object.prototype.hasOwnProperty.call(DEMO_FIXTURES, String(record.id))) return record;
    const fixture = DEMO_FIXTURES[String(record.id)];
    const merged = clone(record), basic = {...(merged.basicInfo || {})};
    // Archived skeletal records have no trustworthy details. Preserve all
    // meaningful user-supplied fields and only backfill missing demo metadata.
    for (const [key,value] of Object.entries(fixture)) {
      if (key === "basicInfo") continue;
      if (missing(merged[key])) merged[key] = value;
    }
    for (const [key,value] of Object.entries(fixture.basicInfo)) {
      if (missing(basic[key])) basic[key] = value;
    }
    merged.basicInfo = basic;
    // Restore an archived demo assessment only if none exists. Never overwrite
    // submitted assessments or treat a missing score as a valid low risk.
    if (!Array.isArray(merged.riskAssessment?.hazards) || !merged.riskAssessment.hazards.length) {
      merged.riskAssessment = clone(fixture.riskAssessment);
    }
    return merged;
  }
  function readPermits() {
    const saved = parse(root.localStorage.getItem(LIST), []);
    // Keep only one record per permit ID; the submitted collection is canonical.
    const ids = new Set();
    const list = Array.isArray(saved) ? saved.filter(x => {
      if (!x || x.id == null || String(x.id).trim() === "") return false;
      const id = String(x.id);
      if (ids.has(id)) return false;
      ids.add(id);
      return true;
    }) : [];
    const latest = parse(root.localStorage.getItem(LATEST), null);
    if (latest && latest.id != null && String(latest.id).trim() && !ids.has(String(latest.id))) list.unshift(latest);
    return list.map(hydrateDemoPermit).map(clone);
  }
  function getPermit(id) {
    return readPermits().find(x => String(x.id) === String(id)) || null;
  }
  function persist(list, latest) {
    // The previous value is retained if the second write fails.
    const previousList = root.localStorage.getItem(LIST);
    const previousLatest = root.localStorage.getItem(LATEST);
    try {
      root.localStorage.setItem(LIST, JSON.stringify(list));
      if (latest) root.localStorage.setItem(LATEST, JSON.stringify(latest));
    } catch (error) {
      try {
        if (previousList === null) root.localStorage.removeItem(LIST);
        else root.localStorage.setItem(LIST, previousList);
        if (previousLatest === null) root.localStorage.removeItem(LATEST);
        else root.localStorage.setItem(LATEST, previousLatest);
      } catch (_) { /* Storage can become unavailable. */ }
      throw error;
    }
    root.dispatchEvent && root.dispatchEvent(new CustomEvent("safepermit:permits-updated", { detail: { permitId: latest && latest.id } }));
  }
  function savePermit(permit) {
    if (!permit || typeof permit !== "object" || permit.id == null || !String(permit.id).trim()) throw new TypeError("Permit id is required");
    const list = readPermits().filter(x => String(x.id) !== String(permit.id));
    const existing = getPermit(permit.id);
    if (existing && permit.status === 'Active' && existing.status !== 'Active') {
      requireBasicInfo(existing.basicInfo);
      requireBasicInfo({...existing.basicInfo, ...permit.basicInfo});
    }
    const saved = clone(hydrateDemoPermit(existing ? {
      ...existing, ...permit,
      basicInfo:{...(existing.basicInfo||{}),...(permit.basicInfo||{})},
      riskAssessment:permit.riskAssessment == null ? existing.riskAssessment : permit.riskAssessment
    } : permit));
    list.unshift(saved);
    persist(list, saved);
    return clone(saved);
  }
  // Creation is deliberately not an upsert. These readers fail closed instead of
  // treating damaged/imported storage as an empty namespace.
  function creationSnapshot() {
    const keys = [LIST, LATEST, LEGACY, 'safePermitAdminLifecycle',
      ...['gates','stopworks','risks','isolations','passports','incidents','actions','conflicts']
        .map(type => 'safepermit:safety-suite:v1:' + type)];
    const raw = new Map(keys.map(key => [key, root.localStorage.getItem(key)]));
    const values = new Map();
    for (const [key, value] of raw) {
      if (value === null) { values.set(key, key === LATEST ? null : key === 'safePermitAdminLifecycle' ? {} : []); continue; }
      let parsed;
      try { parsed = JSON.parse(value); } catch (_) { throw Error('Unverifiable permit storage: ' + key); }
      const object = parsed && typeof parsed === 'object' && !Array.isArray(parsed);
      if (key === LATEST ? parsed !== null && !object : key === 'safePermitAdminLifecycle' ? !object : !Array.isArray(parsed))
        throw Error('Invalid permit storage: ' + key);
      values.set(key, parsed);
    }
    const ids = new Set();
    const identity = value => String(value).trim().toUpperCase();
    // This range belongs to bundled offline/demo references, not new work.
    for (let n = 1000; n <= 1200; n++) ids.add('PTW-' + n);
    for (const record of [...values.get(LIST), ...values.get(LEGACY), values.get(LATEST)].filter(x => x !== null)) {
      if (!record || typeof record !== 'object' || Array.isArray(record) || record.id == null || !String(record.id).trim())
        throw Error('Invalid permit storage record');
      ids.add(identity(record.id));
    }
    Object.keys(values.get('safePermitAdminLifecycle')).forEach(id => ids.add(identity(id)));
    for (const key of keys.slice(4)) for (const record of values.get(key)) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) throw Error('Invalid safety storage record');
      for (const field of ['permitId','otherPermitId']) if (record[field]) ids.add(identity(record[field]));
    }
    const list = values.get(LIST).slice(), seen = new Set();
    for (const record of list) {
      const id = identity(record.id);
      if (seen.has(id)) throw Error('Unverifiable duplicate permit storage');
      seen.add(id);
    }
    const latest = values.get(LATEST);
    if (latest && !seen.has(identity(latest.id))) list.unshift(latest);
    return {raw, ids, list};
  }
  function createPermit(input) {
    if (!input || input.status !== 'Pending Supervisor Review' ||
        ['supervisorDecision','safetyDecision','adminDecision','previousStatusBeforeStop','resumeRequest','resumeReview','stopWorkCaseId'].some(key => input[key] != null) ||
        ['auditTrail','workflowHistory'].some(key => input[key] != null && (!Array.isArray(input[key]) || input[key].length)) ||
        (input.revision != null && input.revision !== 1)) throw Error('New permit requires initial state without inherited evidence');
    requireBasicInfo(input.basicInfo);
    const snapshot = creationSnapshot();
    let id = input.id == null ? '' : String(input.id).trim().toUpperCase();
    if (id && !/^PTW-[A-Z0-9-]{1,24}$/.test(id)) throw Error('Invalid new permit ID');
    if (id && snapshot.ids.has(id)) throw Error('Permit ID already exists or is reserved: ' + id);
    if (!id) {
      for (let attempt = 0; attempt < 32; attempt++) {
        const candidate = 'PTW-' + Math.floor(1000 + Math.random() * 9000);
        if (!snapshot.ids.has(candidate)) { id = candidate; break; }
      }
      // Bounded, verified fallback even if randomness repeats a fixture/collision.
      for (let n = 1201; !id && n <= 9999; n++) if (!snapshot.ids.has('PTW-' + n)) id = 'PTW-' + n;
      if (!id) throw Error('No unused permit ID available; creation not saved');
    }
    const saved = clone({...input, id});
    if (saved.safetyChecklist) saved.safetyChecklist.permitId = id;
    // Best-effort stale snapshot check; localStorage has no compare-and-swap.
    for (const [key, raw] of snapshot.raw) if (root.localStorage.getItem(key) !== raw)
      throw Error('Permit storage changed; retry creation after reviewing current records');
    persist([saved, ...snapshot.list], saved);
    return clone(saved);
  }
  function writeOperation(action) {
    // Cooperative same-origin tabs use one lock for repository writes. Legacy
    // synchronous compatibility callers cannot provide an atomic cross-tab guarantee.
    return root.navigator?.locks?.request
      ? root.navigator.locks.request('safepermit:permit-writes', action)
      : Promise.resolve().then(action);
  }
  const actions = Object.freeze({
    supervisor: Object.freeze({approve:"Pending Safety Review", return:"Returned for Correction", reject:"Rejected"}),
    safety: Object.freeze({approve:"Pending Admin Approval", return:"Returned for Correction", reject:"Rejected"}),
    admin: Object.freeze({approve:"Approved", return:"Returned for Correction", reject:"Rejected"})
  });
  const prerequisites = Object.freeze({ supervisor:"Pending Supervisor Review", safety:"Pending Safety Review", admin:"Pending Admin Approval" });
  const fields = Object.freeze({ supervisor:"supervisorDecision", safety:"safetyDecision", admin:"adminDecision" });
  function validateTransition(status, role, action) {
    if (!actions[role] || !Object.prototype.hasOwnProperty.call(actions[role], action)) throw new Error("Unsupported workflow action");
    if (status !== prerequisites[role]) throw new Error("Invalid workflow transition: " + status + " for " + role);
    return actions[role][action];
  }
  // Documented DEMO evidence only; a server must authenticate the reviewer.
  function hasApprovalEvidence(permit, role) {
    const stage = {supervisor:['Supervisor','Pending Supervisor Review','Pending Safety Review'],
      safety:['Safety Officer','Pending Safety Review','Pending Admin Approval'],
      admin:['Admin','Pending Admin Approval','Approved']}[role];
    if (!stage || !permit || !permit.id) return false;
    const record = permit[role+'Decision'];
    return !!(record && record.decision === 'approve' && record.permitId === permit.id &&
      record.role === stage[0] && record.previousStatus === stage[1] && record.newStatus === stage[2] &&
      typeof record.reviewer === 'string' && record.reviewer.trim() &&
      typeof record.comment === 'string' && record.comment.trim() &&
      typeof record.reviewedAt === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(record.reviewedAt) &&
      Number.isFinite(Date.parse(record.reviewedAt)) &&
      // A decision recorded in the future is contradictory evidence (5-minute clock-skew allowance).
      Date.parse(record.reviewedAt) <= Date.now() + 300000 &&
      // Round-trip check rejects impossible dates; pad milliseconds so real timestamps (e.g. .123Z) match.
      new Date(record.reviewedAt).toISOString() ===
        (/\.\d{1,3}Z$/.test(record.reviewedAt)
          ? record.reviewedAt.replace(/\.(\d{1,3})Z$/, (_, ms) => '.' + ms.padEnd(3, '0') + 'Z')
          : record.reviewedAt.replace(/Z$/, '.000Z')));
  }
  // Decisions must follow the workflow order and belong to the current submission cycle.
  function hasCoherentApprovalTrail(permit, roles) {
    if (!permit) return false;
    const order = ['supervisor','safety','admin'].filter(role => roles.includes(role));
    let floor = permit.resubmittedAt == null ? -Infinity : Date.parse(permit.resubmittedAt);
    if (!Number.isFinite(floor) && floor !== -Infinity) return false;
    for (const role of order) {
      if (!hasApprovalEvidence(permit, role)) return false;
      const at = Date.parse(permit[role+'Decision'].reviewedAt);
      if (at < floor) return false;
      floor = at;
    }
    return true;
  }
  function hasCompleteChecklist(permit) {
    const checklist = permit && permit.safetyChecklist;
    return !!(checklist && checklist.permitId === permit.id && checklist.confirmed === true &&
      Array.isArray(checklist.answers) && checklist.answers.length &&
      checklist.answers.every(item => item && typeof item.item === 'string' && item.item.trim() &&
        typeof item.required === 'boolean' &&
        ['yes','no','na'].includes(String(item.answer || '').trim().toLowerCase()) &&
        (!item.required || ['yes','na'].includes(String(item.answer).trim().toLowerCase())) &&
        (String(item.answer).trim().toLowerCase()!=='no' || String(item.comment||'').trim())));
  }
  function hasAcceptableRisk(permit) {
    const hazards=permit?.riskAssessment?.hazards;
    return !!(Array.isArray(hazards) && hazards.length && hazards.every(h=>
      h && typeof h.hazard==='string' && h.hazard.trim() &&
      typeof h.controls==='string' && h.controls.trim() &&
      Number.isInteger(Number(h.initialScore)) && Number(h.initialScore)>=1 && Number(h.initialScore)<=25 &&
      Number.isInteger(Number(h.residualScore)) && Number(h.residualScore)>=1 &&
      Number(h.residualScore)<10 && Number(h.residualScore)<Number(h.initialScore)));
  }
  function applyDecision(record, role) {
    if (!record || record.permitId == null || !String(record.permitId).trim()) throw new TypeError("Decision permitId is required");
    const current = getPermit(record.permitId);
    if (!current) throw new Error("Permit not found in demo repository");
    if (record.decision === 'approve') requireBasicInfo(current.basicInfo);
    const next = validateTransition(current.status, role, record.decision);
    if (record.newStatus && record.newStatus !== next) throw new Error("Decision status does not match workflow");
    const decision = Object.assign({}, record, {previousStatus:current.status, newStatus:next});
    const updated = Object.assign({}, current, {status:next, [fields[role]]:decision});
    savePermit(updated);
    // Backward-compatibility with existing demo readers.
    const legacy = parse(root.localStorage.getItem(LEGACY), null);
    if (Array.isArray(legacy)) {
      const entries = legacy.map(x => x && String(x.id) === String(updated.id) ? updated : x);
      // Legacy sync is best-effort. Canonical workflow updates must not appear to
      // fail after they have been successfully saved.
      try { root.localStorage.setItem(LEGACY, JSON.stringify(entries)); }
      catch (error) { root.console && root.console.warn("Legacy demo cache could not be synchronized", error); }
    }
    return clone(updated);
  }

  // Merge archived demo records with current submitted records. The submitted
  // collection wins whenever an ID exists in more than one legacy key.
  function readKnownPermits() {
    const current = readPermits();
    const archived = parse(root.localStorage.getItem(LEGACY), []);
    const byId = new Map();
    if (Array.isArray(archived)) archived.forEach(item => {
      if (item && item.id != null && String(item.id).trim()) byId.set(String(item.id), hydrateDemoPermit(item));
    });
    current.forEach(item => byId.set(String(item.id), hydrateDemoPermit(item)));
    return Array.from(byId.values()).map(clone);
  }
  function listForReview(role) {
    const required = prerequisites[role];
    if (!required) return Promise.reject(new Error("Unknown review role"));
    return repository.listKnownPermits().then(items => items.filter(item => item.status === required));
  }
  const repository = Object.freeze({
    listPermits: () => Promise.resolve().then(() => clone(readPermits())),
    listKnownPermits: () => Promise.resolve().then(readKnownPermits),
    listForReview: role => listForReview(role),
    getPermit: id => Promise.resolve().then(() => { const item=getPermit(id); return item ? clone(item) : null; }),
    createPermit: item => writeOperation(() => createPermit(item)),
    resubmitPermit: item => writeOperation(() => {
      const live = getPermit(item.id);
      if (!live || live.status !== 'Returned for Correction') throw Error('Permit no longer awaits correction');
      requireBasicInfo(item.basicInfo);
      return savePermit(item);
    }),
    savePermit: item => writeOperation(() => savePermit(item)),
    applyDecision: (record, role) => writeOperation(async () => {
      if (record?.decision === "approve") {
        const permit=getPermit(record.permitId);
        if (!permit) throw new Error('Canonical permit record is unavailable');
        // The canonical state and the proposed record must agree before a decision is saved.
        const next=validateTransition(permit.status,role,record.decision);
        if (record.previousStatus!==permit.status || record.newStatus!==next ||
            !hasApprovalEvidence({...permit,[fields[role]]:record},role)) {
          throw new Error('Documented, permit-linked reviewer decision evidence is required');
        }
        if (role!=='supervisor' && !hasApprovalEvidence(permit,'supervisor'))
          throw new Error('Documented Supervisor approval is required');
        if (role==='admin' && !hasApprovalEvidence(permit,'safety'))
          throw new Error('Documented Safety approval is required');
        const chain = {supervisor:['supervisor'],safety:['supervisor','safety'],admin:['supervisor','safety','admin']}[role];
        if (!hasCoherentApprovalTrail({...permit,[fields[role]]:record}, chain))
          throw new Error('Approval decisions are out of order or predate the current submission');
        if (!hasCompleteChecklist(permit)) throw new Error('Complete permit-linked checklist is required');
        if (!hasAcceptableRisk(permit)) throw new Error('Complete, acceptable risk assessment is required');
        requireBasicInfo(permit.basicInfo);
        if (!root.SafePermitWorkflow || typeof root.SafePermitWorkflow.getReview !== 'function')
          throw new Error('Integrated safety review unavailable; approval blocked');
        const review = await root.SafePermitWorkflow.getReview(record.permitId);
        if (!review || !Array.isArray(review.blockers) || review.blockers.length || review.eligibleForDemoApproval!==true)
          throw new Error('Safety review blocked: ' + (review?.blockers?.join('; ')||'Unverifiable clearance'));
      }
      return applyDecision(record, role);
    })
  });
  root.SafePermitData = Object.freeze({ mode:"demo", validateWorkerCount, validateBasicInfo, readPermits, readKnownPermits, getPermit, savePermit, applyDecision:repository.applyDecision, validateTransition, hasApprovalEvidence, hasCoherentApprovalTrail, hasCompleteChecklist, hasAcceptableRisk, repository });
})(typeof window !== "undefined" ? window : globalThis);
