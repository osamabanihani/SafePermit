// v13.3 Home redesign: 7-section interactive product experience.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html');

function experienceCopy(){
 // Run the module against a minimal page: every section lookup returns nothing, only the copy is exposed.
 const page={querySelector:()=>null,querySelectorAll:()=>[]};
 const ctx={window:{},document:{querySelector:s=>s==='.sc-page'?page:null,addEventListener(){},hidden:false},
  Array,Object,String,Number,Math,JSON};
 ctx.window.matchMedia=()=>({matches:false,addEventListener(){}});
 ctx.window.SafePermitHomeExperience=undefined;
 Object.assign(ctx,{matchMedia:ctx.window.matchMedia});
 ctx.document.documentElement={lang:'en',dir:'ltr'};
 vm.createContext(ctx);
 vm.runInContext(read('landing/home-experience.js').replace('(function () {','(function () { const window = globalThis.window;'),ctx);
 return ctx.window.SafePermitHomeExperience.copy;
}

test('Home has the approved 7 sections in order, with the footer host',()=>{
 const ids=[...html.matchAll(/<section class="([^"]+)"[^>]*\sid="([^"]+)"/g)].map(m=>m[2]).filter(id=>id!=='spHelmetOverview');
 assert.deepEqual(ids,['hero','purpose','workflow','spProtection','ai-support','permit-record','spIndustrialFilm']);
 assert.ok(!/class="sc-final|class="sc-workflow"|class="sc-workspaces|id="controls" aria-labelledby/.test(html),'old repetitive sections removed');
 assert.equal((html.match(/id="shared-footer"/g)||[]).length,1);
});

test('every anchor used by the navbar and old links still exists exactly once',()=>{
 for(const id of ['hero','purpose','workflow','roles','workspaces','features','controls','spProtection','ai-support','permit-record','spIndustrialFilm'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 for(const href of ['#workflow','#purpose']) assert.ok(html.includes('href="'+href+'"'),href);
});

test('real destinations are preserved: dashboards, resources, sign in, verification, about',()=>{
 for(const route of ['auth/login/','about/','resources/approval-tracking/','resources/safety-review/','permit-verify/?id=PTW-1024','worker/dashboard/','supervisor/dashboard/','safety/dashboard/','admin/dashboard/','resources/risk-assessment/']){
  const inHtml=html.includes('href="'+route+'"');
  const inJs=['landing/home-experience.js','landing/home-safety-sections.js','landing/home-journey.js','landing/home-guardian.js'].some(f=>read(f).includes('"'+route+'"'));
  assert.ok(inHtml||inJs,route);
  const file=route.split('?')[0]+'index.html';
  assert.ok(fs.existsSync(path.join(root,file)),file);
 }
});

test('the scroll-locked journey is gone; the journey is interactive and accessible',()=>{
 const cine=read('landing/home-cinematic.js');
 assert.ok(!/renderStage|workflowSticky|chooseStage|data-sc-step/.test(cine),'home-cinematic.js no longer drives the journey by scroll');
 assert.ok(!/390vh/.test(read('landing/home-experience.css')));
 assert.equal((html.match(/role="tab" id="sxRole\d"/g)||[]).length,4);
 assert.ok(html.includes('role="tablist" aria-label="Permit review stages"')&&html.includes('id="sxRolePanel" role="tabpanel"'));
 assert.ok(html.includes('data-sx-swipe')&&html.includes('data-sx-play'),'swipe and play controls');
 const js=read('landing/home-experience.js');
 assert.ok(/ArrowRight[\s\S]*ArrowLeft[\s\S]*Home[\s\S]*End/.test(js),'keyboard navigation');
 assert.ok(js.includes('rtl()'),'arrow keys follow reading direction');
});

test('safety experience focuses on PPE, hazards and isolation with resource links',()=>{
 const mods=[...html.matchAll(/data-sp-safety-module="(\w+)"/g)].map(m=>m[1]);
 assert.deepEqual(mods,['ppe','hazards','isolation']);
 // v13.4: the helmet checkpoints live in home-guardian.js.
 const js=read('landing/home-guardian.js');
 assert.ok(!/% 6|\* 6\)|Math\.min\(5,/.test(js),'no hard-coded six checkpoints');
 assert.ok(js.includes('resources/risk-assessment/')&&js.includes('detailLinkRisk'));
 for(const lf of ['shared/locales/en.json','shared/locales/ar.json'])assert.ok(JSON.parse(read(lf)).strings['home.safety_sections.detailLinkRisk'],lf);
});

test('AI section is clearly a simulation and never touches data',()=>{
 const js=read('landing/home-experience.js');
 assert.ok(html.includes('No live AI analysis runs here')&&html.includes('SIMULATED'));
 assert.ok(!/localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|SafePermitData|SafePermitSafety|SafePermitWorkflow/.test(js),'presentation only');
 const copy=experienceCopy();
 for(const lang of ['en','ar']){
  assert.equal(copy[lang].scenarios.length,3,lang);
  for(const s of copy[lang].scenarios)assert.equal(s.findings.length,5,lang+' '+s.name);
  assert.match(copy[lang].simBadge,lang==='en'?/Simulation.*No live AI/:/محاكاة/);
  assert.ok(copy[lang].summaryNote&&copy[lang].decisionNote);
 }
});

test('English and Arabic copy have the same structure',()=>{
 const {en,ar}=experienceCopy();
 const shape=v=>Array.isArray(v)?v.map(shape):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,shape(v[k])])):typeof v;
 assert.deepEqual(shape(ar),shape(en));
 for(const k of Object.keys(en))if(typeof en[k]==='string'&&!/^\{|SafePermit$/.test(en[k]))assert.notEqual(ar[k],en[k],'untranslated: '+k);
 // Scenario finding kinds line up between languages.
 en.scenarios.forEach((s,i)=>assert.deepEqual(ar.scenarios[i].findings.map(f=>f[0]),s.findings.map(f=>f[0])));
});

test('inspector encodes the real approval rule and keeps QR honest',()=>{
 const {en}=experienceCopy();
 assert.match(en.verdictBlocked,/below High/);
 assert.match(en.qrBody,/does not authorize work/);
 const js=read('landing/home-experience.js');
 assert.ok(/const high = risk >= 2/.test(js),'High and Critical residual risk block approval (data-adapter hasAcceptableRisk: residual < 10)');
 assert.ok(fs.existsSync(path.join(root,'shared/qr/permit-codes/PTW-1024.svg')));
});

test('new styles are scoped, responsive and respect reduced motion; scroll space reduced',()=>{
 const css=read('landing/home-experience.css');
 assert.ok(!/^\s*\.sc-page @/m.test(css),'no broken prefixed at-rules');
 const unscoped=css.split('\n').filter(l=>/^\s*(\.sx-|html\[[^\]]+\] \.sx-)/.test(l));
 assert.deepEqual(unscoped,[],'every rule is scoped under .sc-page');
 assert.ok(css.includes('@media (max-width: 1100px)')&&css.includes('@media (max-width: 760px)')&&css.includes('@media (prefers-reduced-motion: reduce)'));
 // Sticky scroll space reduced: film 230vh -> 130vh (the 390vh journey is gone). v13.4 replaced the 180vh helmet story with the one-viewport Guardian.
 assert.ok(!fs.existsSync(path.join(root,'landing/home-helmet-story.css'))&&!/sp-helmet-story/.test(html));
 assert.ok(/sp-safety-film \{ position: relative; height: 130vh/.test(read('landing/home-safety-sections.css')));
 assert.ok(html.includes('landing/home-experience.css')&&html.includes('landing/home-experience.js'));
 assert.ok(!/cdn|googleapis|unpkg|jsdelivr/i.test(css+read('landing/home-experience.js')),'no external requests');
});
