const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {launch,executable}=require('./helpers/browser.cjs');
const {decision,safety}=require('./qa-evidence-fixtures.cjs');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/qa/phase4/source-inventory.json'),'utf8'));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
function ratio(a,b){const light=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);const [lo,hi]=[light(a),light(b)].sort((a,b)=>a-b);return (hi+.05)/(lo+.05);}
function rgb(s){if(s.startsWith('#'))return s.slice(1).match(/../g).map(v=>parseInt(v,16));return s.match(/[\d.]+/g).slice(0,3).map(Number);}

test('Phase 4: all 50 active documents load their scoped refinement after existing styles',()=>{
 assert.equal(manifest.length,50);
 for(const {file} of manifest){const source=read(file);const target=file==='index.html'?'landing/home-refinement.css':'shared/css/refinement.css';
  const links=[...source.split('</head>')[0].matchAll(/<link\b[^>]*href=["']([^"']+\.css[^"']*)["'][^>]*>/g)];
  assert.ok(links.at(-1)[1].includes(path.basename(target)),file);
  assert.equal(links.filter(m=>m[1].includes(path.basename(target))).length,1,file);
  if(file!=='index.html')assert.match(source,/<body[^>]*class="[^"]*sp-refined/,file);
 }
 const css=read('shared/css/refinement.css')+read('landing/home-refinement.css');
 assert.doesNotMatch(css,/@keyframes|requestAnimationFrame|animation-delay|transition:\s*all/,'no animation loops, delayed entry, or layout-wide transitions');
 assert.match(css,/prefers-reduced-motion: reduce/);
 assert.doesNotMatch(read('shared/css/refinement.css'),/display:\s*none/,'operational refinement never hides controls or safety information');
});

test('Phase 4: browser design, focus, motion and populated-component checks',{timeout:120000},async t=>{
 if(typeof WebSocket==='undefined'||!executable()){t.skip('Requires Node 22+ and installed Chrome/Edge.');return;}
 const b=await launch(root);
 try{
  await b.goto('/auth/login/');
  const p={id:'PTW-8804',status:'Approved',basicInfo:{...require('./qa-evidence-fixtures.cjs').basicInfo(),workTitle:'Verified panel inspection',site:'Plant QA',area:'Unit QA',endDate:'2099-10-20',endTime:'12:00'},...safety('PTW-8804'),supervisorDecision:decision('PTW-8804','supervisor'),safetyDecision:decision('PTW-8804','safety'),adminDecision:decision('PTW-8804','admin')};
  async function prefs(lang,theme,width){await b.eval(({lang,theme,p})=>{localStorage.clear();localStorage.setItem('safePermitLanguage',lang);localStorage.setItem('safePermitTheme',theme);localStorage.setItem('safePermitSubmittedPermits',JSON.stringify([p]));},{lang,theme,p});await b.command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});}
  await t.test('brand fills stay intact and new semantic/focus foregrounds meet 4.5:1 across themes',async()=>{
   for(const theme of ['light','dark']){await prefs('en',theme,1440);await b.goto('/worker/dashboard/');
    const tokens=await b.eval(()=>{const s=getComputedStyle(document.documentElement);const get=k=>s.getPropertyValue('--'+k).trim();return {ink:get('color-ink'),accent:get('color-accent'),shape:[get('radius-control'),get('radius-card')],pairs:['success','warning','danger','info'].map(kind=>[get('color-'+kind+'-text'),get('color-'+kind+'-bg')]),focus:[get('color-focus'),get('color-surface')]};});
    assert.equal(tokens.ink.toLowerCase(),'#101d26');assert.equal(tokens.accent.toLowerCase(),'#ff9b51');assert.deepEqual(tokens.shape,['2px','4px']);
    // Resolve any token indirection through a real element's computed style.
    const pairs=await b.eval(()=>['success','warning','danger','info','focus'].map(kind=>{const el=document.createElement('span');el.style.color='var(--color-'+kind+(kind==='focus'?'':'-text')+')';el.style.backgroundColor=kind==='focus'?'var(--color-surface)':'var(--color-'+kind+'-bg)';document.body.append(el);const s=getComputedStyle(el);const pair=[s.color,s.backgroundColor];el.remove();return pair;}));
    for(const pair of pairs)assert.ok(ratio(...pair.map(rgb))>=4.5,JSON.stringify({theme,pair}));
    await b.goto('/supervisor/review-queue/');
    const risks=await b.eval(()=>[...document.querySelectorAll('.queue-table .queue-risk')].filter(e=>e.getClientRects().length).map(e=>{const s=getComputedStyle(e);return [s.color,s.backgroundColor];}));
    assert.ok(risks.length);for(const pair of risks)assert.ok(ratio(...pair.map(rgb))>=4.5,JSON.stringify({theme,pair}));
   }
  });
  await t.test('all four populated dashboards retain 44px tools, readable captions and visible keyboard focus',async()=>{
   for(const role of ['worker','supervisor','safety','admin'])for(const [lang,theme,width] of [['en','light',1440],['ar','dark',320]]){
    await prefs(lang,theme,width);await b.goto('/'+role+'/dashboard/');await b.delay(100);
    const result=await b.eval(()=>{
     const tools=[...document.querySelectorAll('.spc-tool,.spc-seg__btn,.spc-panel__close')].filter(e=>e.getBoundingClientRect().height);
     return {tools:tools.map(e=>e.getBoundingClientRect().height),label:parseFloat(getComputedStyle(document.querySelector('.spc-focus__kicker')).fontSize),overflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)};
    });
    assert.ok(result.tools.length);assert.ok(result.tools.every(h=>h>=44));assert.ok(result.label>=13);assert.equal(result.overflow,0);
    await b.eval(()=>{window.focusTarget=document.querySelector('.spc-tool');window.focusTarget.focus();});
    await b.key('Tab');await b.key('Tab',true);
    assert.equal(await b.eval(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');assert.deepEqual(b.errors,[]);
   }
  });
  await t.test('motion feedback is short; reduced motion removes animation and keeps critical feedback visible',async()=>{
   await prefs('en','light',1440);await b.goto('/admin/active-permits/?q=8804');await b.delay(150);
   await b.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
   const duration=await b.eval(()=>getComputedStyle(document.querySelector('[data-action=activate]')).transitionDuration);
   assert.ok(duration.split(',').every(v=>parseFloat(v)<=.2));
   await b.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
   const state=await b.eval(()=>{const button=document.querySelector('[data-action=activate]'),panel=document.querySelector('[data-readiness]');return {duration:getComputedStyle(button).transitionDuration,readiness:panel.dataset.state,visible:panel.getBoundingClientRect().height>0,loops:document.getAnimations().filter(a=>a.playState==='running').length};});
   assert.equal(state.duration,'0s');assert.equal(state.readiness,'ready');assert.equal(state.visible,true);assert.equal(state.loops,0);
  });
  await t.test('Command Center editor and contextual QR keep their controls and scroll within the mobile viewport',async()=>{
   await prefs('ar','dark',320);await b.goto('/safety/risk-command-center/#risks');
   await b.eval(()=>document.getElementById('suite-new').click());
   const modal=await b.eval(()=>{const e=document.querySelector('#suite-editor [role=dialog]'),r=e.getBoundingClientRect();return {width:r.width,left:r.left,right:r.right,focus:e.contains(document.activeElement)};});
   assert.ok(modal.left>=0&&modal.right<=320);assert.equal(modal.focus,true);await b.key('Escape');
   await b.eval(()=>localStorage.setItem('safepermit:safety-suite:v1:gates',JSON.stringify([{id:'G-QA',permitId:'PTW-8804',title:'Unverified gas test',status:'Open'}])));
   await b.goto('/safety/risk-command-center/#gates');
   const badge=await b.eval(()=>{const el=document.querySelector('.record .pill'),s=getComputedStyle(el);return {text:el.textContent,color:s.color,bg:s.backgroundColor,successBg:getComputedStyle(document.documentElement).getPropertyValue('--color-success-bg').trim()};});
   assert.ok(badge.text==='Open'||/[\u0600-\u06ff]/.test(badge.text));assert.ok(ratio(rgb(badge.color),rgb(badge.bg))>=4.5);
   assert.notDeepEqual(rgb(badge.bg),rgb(badge.successBg),'an Open generic record cannot inherit success presentation');
   await b.goto('/admin/active-permits/?q=8804');for(let i=0;i<50&&!await b.eval(()=>!!window.SafePermitPermitQR);i++)await b.delay(30);
   await b.eval(()=>SafePermitPermitQR.show('PTW-8804',document.querySelector('[data-action=activate]')));
   assert.equal(await b.eval(()=>document.querySelector('#sp-qr-dialog [role=dialog]').contains(document.activeElement)),true);
   assert.equal(await b.eval(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)),0);await b.key('Escape');
  });
  await t.test('landing copy, paper-section contrast, controls and live journey remain readable at three widths',async()=>{
   for(const width of [1440,1024,768,390]){await prefs('en','light',width);await b.goto('/');
    const state=await b.eval(()=>{const intro=getComputedStyle(document.querySelector('.sc-hero-description')),accent=getComputedStyle(document.querySelector('.sx-intel .sc-accent'));return {intro:parseFloat(intro.fontSize),accent:accent.color,bg:getComputedStyle(document.querySelector('.sx-intel')).backgroundColor,overflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),range:document.querySelector('.sx-range').getBoundingClientRect().height};});
    assert.ok(state.intro>=16);assert.ok(ratio(rgb(state.accent),rgb(state.bg))>=4.5);assert.equal(state.overflow,0);assert.ok(state.range>=44);
    assert.equal(await b.eval(()=>[...document.querySelectorAll('[data-sx-status-name]')].filter(e=>e.getBoundingClientRect().height>0).length),6,'every status name remains visible on mobile');
    await b.eval(()=>document.querySelector('[data-sx-role="1"]').click());
    assert.equal(await b.eval(()=>document.querySelector('[data-sx-role="1"]').getAttribute('aria-selected')),'true');
    assert.match(await b.eval(()=>document.getElementById('sxRolePanel').textContent),/Supervisor/);
   }
  });
  await t.test('QR reference uses the shared bilingual theme and still warns against work authorization',async()=>{
   for(const [lang,theme]of [['en','light'],['ar','dark']]){await prefs(lang,theme,390);await b.goto('/permit-verify/?id=PTW-8804');
    assert.equal(await b.eval(()=>document.documentElement.dataset.theme),theme);
    assert.equal(await b.eval(()=>document.documentElement.lang),lang);
    const text=await b.eval(()=>document.querySelector('.warn').textContent);assert.ok(text.length>80);
    if(lang==='en')assert.match(text,/DEMO|UNVERIFIED/);
    assert.deepEqual(b.errors,[]);
   }
  });
 }finally{await b.close();}
});
