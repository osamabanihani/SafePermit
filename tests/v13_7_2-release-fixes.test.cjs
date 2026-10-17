// v13.7.2: Arabic coverage gaps, error/verify pages, stage messages and the risk-step approval rule.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const en=JSON.parse(read('shared/locales/en.json')),ar=JSON.parse(read('shared/locales/ar.json'));

// Runs the real shared/js/i18n.js against a minimal DOM and returns its public API in Arabic mode.
async function loadI18n(){
 const listeners=[];
 const documentElement={lang:'ar',dir:'rtl',classList:{add(){}},setAttribute(){},getAttribute(){return null;}};
 const document={documentElement,readyState:'complete',body:null,currentScript:null,
  addEventListener:(type)=>listeners.push(type),dispatchEvent(){},querySelector:()=>({src:'http://demo/shared/js/i18n.js'}),querySelectorAll:()=>[]};
 class Element{} class CustomEvent{constructor(t){this.type=t;}}
 const files={'en.json':en,'ar.json':ar};
 const window={setTimeout:()=>0,addEventListener(){}};
 const ctx={window,document,Element,CustomEvent,Node:{TEXT_NODE:3,ELEMENT_NODE:1},NodeFilter:{},URL,localStorage:{getItem:()=>'ar',setItem(){}},
  console,fetch:async url=>({ok:true,json:async()=>files[url.split('/').pop()]})};
 vm.createContext(ctx);vm.runInContext(read('shared/js/i18n.js'),ctx);
 await ctx.window.SafePermitI18n.ready();
 return {api:ctx.window.SafePermitI18n,listeners};
}

test('search typing re-applies translations, so live counts and empty states switch to Arabic',async()=>{
 const {listeners}=await loadI18n();
 for(const type of ['click','change','submit','input'])assert.ok(listeners.includes(type),type);
});

test('composite labels: hazard names, counters, user actions and verification status are translated',async()=>{
 const t=(await loadI18n()).api.translateValue;
 assert.equal(t('Hazard 1 · Unexpected energization'),'الخطر 1 · '+ar.runtime['Unexpected energization']);
 assert.equal(t('3 active / 3 areas'),'3 نشطة / 3 مناطق');
 assert.equal(t('7 approvals · 2 exceptions'),'7 موافقات · 2 استثناءات');
 assert.equal(t('17 events'),'17 أحداث');
 const name=n=>ar.runtime[n]||n;
 assert.equal(t('Deactivate Layla Hassan?'),'إلغاء تفعيل '+name('Layla Hassan')+'؟');
 assert.equal(t('Unblock Yazan Saleh?'),'إلغاء حظر '+name('Yazan Saleh')+'؟');
 assert.match(t('Detected 2 potential conflict(s); 1 new review record(s). Manual HSE assessment required.'),/^تم رصد 2 تعارض محتمل؛ 1 سجل مراجعة جديد/);
 assert.equal(t('NOT AUTHORIZED — permit is Approved'),'غير مصرّح — حالة التصريح: '+ar.runtime['Approved']);
 assert.equal(t('Permit QR · PTW-1045'),ar.runtime['Permit QR']+' · PTW-1045');
 assert.equal(t('Plant A · Unit 3'),'المصنع A · الوحدة 3');
 assert.equal(t('0 permits shown'),ar.runtime['0 permits shown']);
});

test('every string found in English on Arabic pages now has a real Arabic entry',()=>{
 const phrases=['Workers cannot approve their own permits.','SafePermit User','• At least 8 characters','Passwords do not match.','Password saved for this frontend demo.',
  'Use at least 8 characters with an uppercase letter and a number.','Your name','How can we help?','Invalid permit ID','SafePermit / QR reference',
  'Local demo snapshot (UNVERIFIED)','UNVERIFIED — Active is only a locally stored demo status','Open demo verification page','▦ Permit QR','Stopped / On Hold',
  'Search permit, worker, site','Permit ready for final approval','Supervisor — Not documented','Standard Approval Flow','+ Add Area','Unblock','Work title is required.',
  'Residual risk must be lower than the initial risk and below 10 before this permit can be approved.',
  'This permit has not reached Admin Approval yet. Open it again after the Supervisor and Safety reviews are complete.',
  'This permit has not reached Safety Review yet. Open it again after the Supervisor review is complete.'];
 for(const p of phrases){assert.equal(en.runtime[p],p,'en '+p);assert.ok(ar.runtime[p]&&ar.runtime[p]!==p&&/[؀-ۿ]/.test(ar.runtime[p]),'ar '+p);}
});

test('unused named greetings were removed from both locales',()=>{
 for(const g of ['Good morning, Omar.','Good evening, Ahmad.','Good evening, Sarah.','Good morning, Rana.'])
  for(const l of [en,ar])assert.ok(!(g in l.runtime)&&!(g in l.strings),g);
});

test('error pages and the QR reference page load translations; pages without shared.js declare the favicon',()=>{
 for(const f of ['errors/403/index.html','errors/404/index.html']){const h=read(f);assert.ok(h.includes('../../shared/js/i18n.js'),f);assert.ok(h.includes('rel="icon"'),f);}
 const v=read('permit-verify/index.html');
 assert.ok(v.includes('../shared/js/language-init.js')&&v.includes('../shared/js/i18n.js')&&v.includes('rel="icon"'));
 assert.ok(v.indexOf('permit-verify.js')<v.indexOf('i18n.js'),'translation runs after the page renders its details');
 for(const f of ['admin/resume-permit/index.html','home-preview.html'])assert.ok(read(f).includes('rel="icon"'),f);
});

test('risk step enforces the same residual rule the approval workflow applies',()=>{
 const js=read('worker/create-permit/risk-assessment/risk-assessment.js');
 assert.match(js,/residualValue < initialValue && residualValue < 10/);
 // The rule mirrors hasAcceptableRisk, which rejects residual >= 10 or residual >= initial.
 assert.match(read('shared/js/data-adapter.js'),/Number\(h\.residualScore\)<10 && Number\(h\.residualScore\)<Number\(h\.initialScore\)/);
});

test('review pages explain a permit that has not reached their stage instead of implying a decision',()=>{
 const admin=read('admin/review-permit/review-permit.js'),safety=read('safety/review-permit/review-permit.js');
 assert.match(admin,/\["Draft", "Pending Supervisor Review", "Pending Safety Review"\]\.includes\(currentPermit\.status\)/);
 assert.ok(admin.includes('This permit has not reached Admin Approval yet.'));
 assert.match(safety,/\["Draft", "Pending Supervisor Review"\]\.includes\(permit\.status\)/);
 assert.ok(safety.includes('This permit has not reached Safety Review yet.'));
});

// Missing permits: one "Permit not found" state everywhere; built-in samples only in the labelled demo mode.
const permitPages=[['supervisor/review-permit','review-permit.js'],['safety/review-permit','review-permit.js'],['admin/review-permit','review-permit.js'],
 ['worker/permit-details','permit-details.js'],['supervisor/permit-details','permit-details.js'],['safety/permit-details','permit-details.js'],['worker/approval-tracking','approval-tracking.js']];

test('every permit page loads the shared permit-state helper before its own script',()=>{
 for(const [dir,js] of permitPages){const h=read(dir+'/index.html');const a=h.indexOf('../../shared/js/permit-state.js'),b=h.indexOf('<script src="'+js);
  assert.ok(a>0&&a<b,dir);}
});

test('no permit page silently substitutes another permit or presents drafts as a submitted permit',()=>{
 for(const [dir,js] of permitPages){const s=read(dir+'/'+js);
  assert.ok(!/demoPermits\[id\] \|\| demoPermits\["PTW-/.test(s)&&!/return clone\(demoPermits\["PTW-/.test(s)&&!/params\.get\("id"\)\s*\|\|\s*"PTW-/.test(s),dir+' fixed fallback');
  assert.ok(!/permitData\[requestedId\]\|\|permitData\["PTW-/.test(s),dir+' details fallback');
  assert.ok(/SafePermitPermitState/.test(s)&&/showNotFound/.test(s),dir+' uses the shared not-found state');
  assert.ok(!/status: "Pending Supervisor Review",\s*submittedAt: new Date\(\)\.toISOString\(\)/.test(s),dir+' no draft-built permit');}
 // Samples are reachable only when demo mode was requested.
 for(const [dir,js] of permitPages){const s=read(dir+'/'+js);if(/demoPermits|permitData/.test(s))assert.ok(/demoRequested\(\)/.test(s),dir);}
});

test('the permit-state helper hides permit content, keeps navigation, and labels demo samples',async()=>{
 const src=read('shared/js/permit-state.js');
 assert.ok(src.includes('"Permit not found"')&&src.includes('No permit with this ID is stored in this browser demo.')&&src.includes('No permit was selected. Open a permit from your list.'));
 assert.match(src,/mobile-top'\], \[class\*='topbar'\], \.sp-breadcrumb/);
 assert.ok(src.includes('"Demo sample"')&&src.includes('decisions on it cannot be saved'));
 assert.match(src,/get\("demo"\) === "1"/);
 assert.match(src,/slice\(1\)\.forEach\(hide\)/,'the top bar keeps only its back link');
 assert.ok(read('shared/css/shared.css').includes('.sp-permit-missing .sp-qr-entry { display: none !important; }'),'QR button hidden for a missing permit');
 for(const p of ['Demo sample','No permit was selected. Open a permit from your list.','Back to My Permits','Back to Active Supervision','Back to Risk Overview',
  'This built-in sample permit is not stored in this browser. It is shown for demonstration only, and decisions on it cannot be saved.'])
  assert.ok(ar.runtime[p]&&/[؀-ۿ]/.test(ar.runtime[p])&&en.runtime[p]===p,p);
});

test('sample rows open in demo mode: links to unstored permits gain demo=1 at click time',()=>{
 const s=read('shared/js/shared.js');
 assert.match(s,/\(review-permit\|permit-details\|approval-tracking\)/);
 assert.match(s,/url\.searchParams\.set\("demo", "1"\)/);
 assert.match(s,/storedPermitIds\(\)\.has\(id\)/);
});
