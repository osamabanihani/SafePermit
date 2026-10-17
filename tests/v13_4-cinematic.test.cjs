// v13.4 cinematic experiences: THE FOUR DECISIONS (CSS 3D permit) and THE GUARDIAN (Three.js studio helmet).
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html');
const journeyJs=read('landing/home-journey.js'), journeyCss=read('landing/home-journey.css');
const guardianJs=read('landing/home-guardian.js'), guardianCss=read('landing/home-guardian.css');
const sceneJs=read('landing/home-helmet-scene.js'), modelJs=read('landing/home-helmet-model.js');

function experienceCopy(){
 const page={querySelector:()=>null,querySelectorAll:()=>[]};
 const ctx={window:{},document:{querySelector:s=>s==='.sc-page'?page:null,addEventListener(){},hidden:false},Array,Object,String,Number,Math,JSON};
 ctx.window.matchMedia=()=>({matches:false,addEventListener(){}});
 Object.assign(ctx,{matchMedia:ctx.window.matchMedia});
 ctx.document.documentElement={lang:'en',dir:'ltr'};
 vm.createContext(ctx);
 vm.runInContext(read('landing/home-experience.js').replace('(function () {','(function () { const window = globalThis.window;'),ctx);
 return ctx.window.SafePermitHomeExperience.copy;
}
function guardianCopy(){
 const m=guardianJs.match(/const copy = (\{[\s\S]*?\n  \});/);
 return vm.runInNewContext('('+m[1]+')');
}

test('new landing assets are loaded once, versioned 13.4.0, and the old scroll story is gone',()=>{
 for(const f of ['landing/home-journey.css','landing/home-guardian.css','landing/home-journey.js','landing/home-guardian.js','landing/home-helmet-scene.js','landing/home-helmet-model.js']){
  assert.equal((html.match(new RegExp(f.replace(/[.]/g,'\\.')+'\\?v=13\\.4\\.0','g'))||[]).length,1,f);
 }
 assert.ok(!html.includes('?v=13.3.0'),'every landing asset is cache-busted');
 assert.ok(!fs.existsSync(path.join(root,'landing/home-helmet-story.css')));
 // Order: copy before the journey, safety copy before the Guardian.
 const at=s=>html.indexOf(s);
 assert.ok(at('home-experience.js')<at('home-journey.js')&&at('home-safety-sections.js')<at('home-guardian.js')&&at('home-helmet-scene.js')<at('home-guardian.js'));
});

test('no new WebGL context: the permit artifact is CSS 3D, the helmet keeps its single canvas',()=>{
 assert.ok(!/getContext|SafePermitTHREE|WebGLRenderer/.test(journeyJs),'journey uses no WebGL');
 assert.ok(/transform-style: preserve-3d/.test(journeyCss)&&/perspective: 1400px/.test(journeyCss));
 assert.equal((sceneJs.match(/getContext\(/g)||[]).length,1);
 const creators=fs.readdirSync(path.join(root,'landing')).filter(f=>f.endsWith('.js')&&/getContext\("webgl/.test(read('landing/'+f)));
 assert.deepEqual(creators.sort(),['home-helmet-scene.js','home-three-scene.js']);
 assert.ok(!/cdn|googleapis|unpkg|jsdelivr|https?:\/\/(?!www\.w3\.org\/2000\/svg)/i.test(journeyJs+guardianJs+sceneJs+journeyCss+guardianCss),'no external requests');
});

test('THE FOUR DECISIONS: four checkpoints, a permit artifact, controls and an honest finale',()=>{
 assert.equal((html.match(/class="sxj-node" type="button" role="tab" id="sxRole\d"/g)||[]).length,4);
 for(const hook of ['data-sxj-artifact','sxj-glass--back','sxj-glass--front','sxj-sheen','sxj-shadow','sxj-seal','data-sx-play','data-sx-step="-1"','data-sx-step="1"','data-sx-swipe','id="scPermit"'])assert.ok(html.includes(hook),hook);
 assert.match(html,/class="sxj-stage"[^>]*tabindex="0"/,'the artifact is keyboard reachable');
 const {en,ar}=experienceCopy();
 assert.match(en.finaleNote,/Illustrative demo\. No real permit is approved\./);
 assert.ok(html.includes('data-sx="finaleNote"'),'the finale label is always in the page');
 assert.equal(JSON.stringify(en.roles.map(r=>r.decision)),JSON.stringify(['Submit','Release','Clear','Approve']));
 assert.equal(ar.roles.filter(r=>r.decision&&!/[A-Za-z]/.test(r.decision)).length,4);
 for(const k of ['draft','supervisor','safety','admin','approved','pending','inProgress','complete'])assert.ok(en.states[k]&&ar.states[k]&&en.states[k]!==ar.states[k],k);
 assert.ok(en.replay&&ar.replay&&en.finalStep&&ar.finalStep);
});

test('THE FOUR DECISIONS: interruptible, keyboard/touch/mouse driven, never locks scrolling',()=>{
 assert.ok(/ArrowRight[\s\S]*ArrowLeft[\s\S]*Home[\s\S]*End/.test(journeyJs)&&journeyJs.includes('rtl()'),'keys follow reading direction');
 assert.ok(/Escape/.test(journeyJs),'Escape pauses playback');
 assert.ok(/pointerdown", endIntro/.test(journeyJs)&&/focusin", endIntro/.test(journeyJs),'any interaction ends the opening sequence');
 assert.ok(/cancelPulse\(\)/.test(journeyJs)&&/stopPlay\(\)/.test(journeyJs),'a new choice cancels the pulse and stops playback');
 assert.ok(/IntersectionObserver[\s\S]*stopPlay/.test(journeyJs)&&/visibilitychange[\s\S]*stopPlay/.test(journeyJs),'pauses off-screen and in hidden tabs');
 assert.ok(!/wheel|touchmove|preventDefault\(\);\s*\}\s*,\s*\{ passive: false|overflow\s*=\s*["']hidden|position\s*=\s*["']fixed/.test(journeyJs),'no scroll lock');
 assert.ok(/touch-action: pan-y/.test(journeyCss),'vertical scrolling stays native on the artifact');
 assert.ok(/const TILT = 7;/.test(journeyJs),'pointer tilt limited to 7 degrees');
 assert.ok(/prefers-reduced-motion: reduce/.test(journeyCss)&&/if \(!motion\(\)\)/.test(journeyJs));
 assert.ok(!/localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|SafePermitData/.test(journeyJs),'presentation only');
});

test('THE GUARDIAN: PPE, hazards and isolation; LOTO is a separate work procedure',()=>{
 assert.deepEqual([...html.matchAll(/data-sp-safety-module="(\w+)"/g)].map(m=>m[1]),['ppe','hazards','isolation']);
 const g=html.slice(html.indexOf('<section class="sp-guardian"'),html.indexOf('<section class="sx-ai"'));
 assert.ok(g.includes('id="features"')&&g.includes('id="controls"'),'navbar anchors stay inside the Guardian');
 const loto=[...g.matchAll(/data-sp-guardian-text="loto(\w+)">/g)].map(m=>m[1]).filter(k=>!/Body|Label|Note/.test(k));
 assert.deepEqual(loto,['Isolate','Lock','Tag','Verify']);
 const en=guardianCopy().en;
 assert.match(en.lotoNote,/work procedure[\s\S]*not a function of the helmet/);
 assert.deepEqual([...g.matchAll(/data-sp-guardian-text="chain(Hazard|Risk|Controls|Residual)"/g)].map(m=>m[1]),['Hazard','Risk','Controls','Residual']);
 // The illustrative chain follows the real risk bands (High 10-16, Low 1-4) and the approval rule (residual < 10).
 const initial=Number(en.chainRiskValue.match(/\d+/)[0]), residual=Number(en.chainResidualValue.match(/\d+/)[0]);
 assert.ok(initial>=10&&initial<=16&&/High/.test(en.chainRiskValue));
 assert.ok(residual<10&&residual<initial&&/Low/.test(en.chainResidualValue));
 assert.match(en.chainNote,/below High/);
});

test('THE GUARDIAN copy is complete in English, Arabic and the shared locales',()=>{
 const {en,ar}=guardianCopy();
 assert.deepEqual(Object.keys(ar).sort(),Object.keys(en).sort());
 for(const k of Object.keys(en))assert.notEqual(ar[k],en[k],'untranslated: '+k);
 for(const [lf,lang] of [['shared/locales/en.json','en'],['shared/locales/ar.json','ar']]){
  const strings=JSON.parse(read(lf)).strings;
  for(const k of Object.keys(en))assert.equal(strings['home.safety_sections.'+k],(lang==='en'?en:ar)[k],lf+' '+k);
 }
 for(const k of new Set([...html.matchAll(/data-sp-guardian-(?:text|aria)="(\w+)"/g)].map(m=>m[1])))assert.ok(en[k],'markup key '+k);
});

test('THE GUARDIAN studio: callouts on real anchors, rotation limits, pausing and fallbacks',()=>{
 const model={};vm.runInNewContext(modelJs,{window:model});
 assert.ok(/userData\.anchors/.test(modelJs));
 const anchors=[...modelJs.matchAll(/^\s+(\w+):\{p:\[/gm)].map(m=>m[1]);
 for(const a of [...guardianJs.matchAll(/anchor: "(\w+)"/g)].map(m=>m[1]))assert.ok(anchors.includes(a),'anchor '+a);
 for(const u of ['uKey','uExposure','uRim','uSweep','uScan','uScanOn','uTech','uFocus','uFocusAmt','uField'])assert.ok(model.SafePermitHelmetModel.fragment.includes('uniform')&&model.SafePermitHelmetModel.fragment.includes(u),u);
 assert.ok(/YAW_LIMIT = 35 \* DEG, PITCH_LIMIT = 10 \* DEG/.test(sceneJs));
 assert.ok(/setActive[\s\S]*cancelAnimationFrame/.test(sceneJs)&&/if \(moving\) raf = window\.requestAnimationFrame\(tick\)/.test(sceneJs),'renders only while something moves and the section is active');
 assert.ok(/quality = Math\.max\(1, quality - \.25\)/.test(sceneJs)&&/lowPower = true/.test(sceneJs),'quality steps down on slow devices');
 assert.ok(/webglcontextlost/.test(sceneJs)&&/dispose/.test(sceneJs));
 assert.ok(/IntersectionObserver/.test(guardianJs)&&/visibilitychange", syncActive/.test(guardianJs)&&/navigationchange/.test(guardianJs),'pauses off-screen, hidden or behind the menu');
 assert.ok(/imageAnchors/.test(guardianJs)&&html.includes('assets/images/cinematic/safety-helmet.webp'),'image fallback keeps the callouts');
 assert.ok(/function finishReveal/.test(guardianJs)&&/focusin", function \(\) \{ if \(revealing\) finishReveal/.test(guardianJs),'the reveal is interruptible');
 assert.ok(!/localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|SafePermitData/.test(guardianJs+sceneJs),'presentation only');
});

test('THE GUARDIAN layout: dark studio in both themes, one viewport on desktop, adaptive on mobile',()=>{
 assert.ok(!/data-theme/.test(guardianCss),'no light-theme variant: the studio stays dark');
 assert.match(guardianCss,/\.sc-page \.sp-guardian \{[^}]*--spg-bg: #060b10/);
 assert.match(guardianCss,/min-height: 100svh/);
 assert.match(guardianCss,/@media \(max-width: 1100px\) \{\s*\.sc-page \.sp-guardian__layout \{ min-height: 0;/);
 assert.ok(guardianCss.includes('@media (prefers-reduced-motion: reduce)'));
 for(const css of [guardianCss,journeyCss]){
  assert.ok(!/^\s*\.sc-page @/m.test(css),'no broken prefixed at-rules');
  const unscoped=css.split('\n').filter(l=>/^\s*(\.sp-guardian|\.sxj|html\[[^\]]+\] \.(sp-guardian|sxj))/.test(l));
  assert.deepEqual(unscoped,[],'every rule is scoped under .sc-page');
 }
 assert.ok(!/class="[^"]*(__icon|-icon)[\s"]/.test(html.slice(html.indexOf('<section class="sx-journey sxj"'),html.indexOf('<section class="sx-ai"'))),'no accidental icon decoration hooks');
});

test('the industrial film still works the same way; the helmet left the safety script',()=>{
 const js=read('landing/home-safety-sections.js');
 assert.ok(!/SafePermitHelmetScene|setProgress|data-sp-helmet-chapter/.test(js));
 for(const v of ['--sp-film-scale-x','--sp-film-zoom','--sp-film-progress-width','ensureLoaded','attemptPlay'])assert.ok(js.includes(v),v);
 assert.ok(/goToAnchor/.test(js)&&/translations: copy/.test(js),'navbar anchors and shared copy are still exported');
 assert.match(read('landing/home-safety-sections.css'),/sp-safety-film \{ position: relative; height: 130vh/);
});
