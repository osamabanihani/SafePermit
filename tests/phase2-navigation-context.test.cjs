const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {launch,executable}=require('./helpers/browser.cjs');

test('Phase 2 return paths reject external, cross-role and invented tool destinations at a deployment subpath',()=>{
  for(const role of ['worker','supervisor','safety','admin']) {
    const base=new URL('https://example.test/safepermit/');
    const ctx={URL,URLSearchParams,Set,Object,Array,document:{readyState:'loading',addEventListener(){}},
      location:{pathname:base.pathname+role+'/dashboard/'},SafePermitPaths:{projectRoot:base}};
    ctx.window=ctx;vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/js/permit-context.js'),'utf8'),ctx);
    const safe=ctx.SafePermitContext.safeReturn;
    for(const bad of ['https://evil.test/','//evil.test/','javascript:alert(1)','../outside/',
      'https://example.test/safepermit/'+role+'/made-up/','https://user:pass@example.test/safepermit/'+role+'/dashboard/'])assert.equal(safe(bad),'',role+' '+bad);
    assert.equal(safe(role+'/dashboard/?q=work&unexpected=ignored'),base.href+role+'/dashboard/?q=work');
    assert.equal(safe(role+'/dashboard/?returnTo='+encodeURIComponent('https://evil.test/')),base.href+role+'/dashboard/');
    for(const other of ['worker','supervisor','safety','admin'].filter(r=>r!==role))assert.equal(safe(other+'/dashboard/'),'');
    if(role!=='safety')assert.equal(safe(role+'/controlled-resume/'),'');
  }
});

test('Phase 2: contextual QR, role navigation, filters and safety-preserving deep links',{timeout:180000},async t=>{
  if(typeof WebSocket==='undefined'||!executable()){t.skip('Requires Node 22+ and Chrome/Edge or CHROME_PATH.');return;}
  const b=await launch(path.resolve(__dirname,'..'));
  async function ready(){for(let i=0;i<60;i++){if(await b.eval(()=>!!window.SafePermitContext&&!!window.SafePermitPermitQR)) {await b.delay(80);return;}await b.delay(30);}throw Error('Workspace utilities unavailable');}
  async function goto(route){await b.goto(route);await ready();assert.deepEqual(b.errors,[]);}
  async function setControl(id,value){await b.eval(([id,value])=>{const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));},[id,value]);await b.delay(100);}
  const permit={id:'PTW-1876',status:'Pending Supervisor Review',submittedAt:'2026-10-16T08:00:00Z',
    basicInfo:{permitType:'electrical',workTitle:'Context QA panel',description:'Inspect an isolated panel',workerName:'Context QA Worker',site:'factory-a',area:'electrical-room',supervisor:'sup-001',workerCount:2,startDate:'2026-10-20',startTime:'08:00',endDate:'2026-10-20',endTime:'16:00'},
    riskAssessment:{hazards:[{hazard:'Electric shock',initialScore:12,controls:'Isolate and verify',residualScore:4}]},
    safetyChecklist:{permitId:'PTW-1876',confirmed:true,answers:[{item:'Required PPE',required:true,answer:'yes'}]}};
  try{
    await b.command('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    await b.goto('/auth/login/');
    await b.eval(p=>{localStorage.setItem('safePermitLanguage','en');localStorage.setItem('safePermitTheme','light');localStorage.setItem('safePermitSubmittedPermits',JSON.stringify([p]));},permit);

    await t.test('record rows supply exact QR IDs with no default/prompt and no state changes',async()=>{
      await goto('/worker/permits/?q=1876');
      const association=await b.eval(()=>[...document.querySelectorAll('#permitTableBody tr')].filter(r=>!r.classList.contains('is-hidden')).map(r=>({id:new URL(r.querySelector('.permit-open').href).searchParams.get('id'),qr:r.querySelector('.sp-qr-entry')?.dataset.permitId})));
      assert.deepEqual(association,[{id:permit.id,qr:permit.id}]);
      const before=await b.eval(()=>localStorage.getItem('safePermitSubmittedPermits'));
      await b.eval(()=>{window.prompt=()=>{throw Error('Unexpected prompt')};const button=document.querySelector('#permitTableBody tr:not(.is-hidden) .sp-qr-entry');button.focus();button.click();});
      assert.equal(await b.eval(()=>document.querySelector('.sp-qr-panel bdi').textContent),permit.id);
      assert.match(await b.eval(()=>document.querySelector('.sp-qr-warning').textContent),/UNVERIFIED.*does not authorize work/);
      assert.equal(await b.eval(()=>document.querySelector('.sp-qr-panel img')),null,'no invented QR image outside bundled range');
      assert.equal(await b.eval(()=>new URL(document.querySelector('.sp-qr-panel a').href).searchParams.get('id')),permit.id);
      await b.key('Tab');assert.equal(await b.eval(()=>document.activeElement.matches('.sp-qr-panel a')),true);
      await b.key('Tab',true);assert.equal(await b.eval(()=>document.activeElement.matches('.sp-qr-panel button')),true);
      await b.key('Escape');
      assert.equal(await b.eval(()=>document.activeElement.dataset.permitId),permit.id);
      assert.equal(await b.eval(()=>document.querySelector('main').inert),false);
      assert.equal(await b.eval(()=>localStorage.getItem('safePermitSubmittedPermits')),before);
      assert.equal(await b.eval(()=>SafePermitPermitQR.show('')),false);
      assert.equal(await b.eval(()=>SafePermitPermitQR.show('<script>')),false);
    });

    await t.test('filters survive review round trips; tracking and contextual Back use the selected permit',async()=>{
      await goto('/worker/permits/');await setControl('permitSearch','1876');await setControl('riskFilter','low');
      let url=await b.eval(()=>location.href);assert.equal(new URL(url).searchParams.get('q'),'1876');assert.equal(new URL(url).searchParams.get('risk'),'low');
      const detail=await b.eval(()=>document.querySelector('#permitTableBody tr:not(.is-hidden) .permit-open').href);
      const returned=new URL(detail).searchParams.get('returnTo');assert.match(returned,/q=1876/);assert.match(returned,/risk=low/);
      const track=await b.eval(()=>document.querySelector('#permitTableBody tr:not(.is-hidden) .sp-context-track').href);
      assert.equal(new URL(track).searchParams.get('id'),permit.id);
      await goto(new URL(detail).pathname+new URL(detail).search);
      assert.equal(await b.eval(()=>document.querySelector('.sp-qr-detail-action').dataset.permitId),permit.id);
      const back=await b.eval(()=>document.querySelector('[data-sp-context-back]').href);
      assert.match(new URL(back).searchParams.get('q'),/1876/);
      await b.eval(()=>history.back());
      for(let i=0;i<50;i++){if(await b.eval(()=>location.pathname.endsWith('/worker/permits/')))break;await b.delay(40);}
      await ready();
      assert.equal(await b.eval(()=>document.querySelector('#permitSearch').value),'1876');assert.equal(await b.eval(()=>document.querySelector('#riskFilter').value),'low');
      await b.eval(()=>document.querySelector('.sp-list-feedback button').click());await b.delay(100);
      assert.equal(await b.eval(()=>document.querySelector('#permitSearch').value),'');assert.equal(await b.eval(()=>document.querySelector('#riskFilter').value),'all');
      assert.equal(await b.eval(()=>new URLSearchParams(location.search).has('q')),false);
      assert.equal(await b.eval(()=>new URLSearchParams(location.search).has('risk')),false);
    });

    await t.test('QR retains identity through a language change and restores focus after a record refresh',async()=>{
      await goto('/worker/permits/?q=1876');
      await b.eval(()=>{const button=document.querySelector('#permitTableBody tr:not(.is-hidden) .sp-qr-entry');button.focus();button.click();window.dispatchEvent(new CustomEvent('safepermit:permits-updated'));});await b.delay(120);
      await b.eval(()=>SafePermitI18n.setLanguage('ar'));await b.delay(120);
      assert.equal(await b.eval(()=>document.querySelector('.sp-qr-panel bdi').textContent),permit.id);
      assert.match(await b.eval(()=>document.querySelector('.sp-qr-warning').textContent),/غير موثّق/);
      await b.key('Escape');assert.equal(await b.eval(()=>document.activeElement.dataset.permitId),permit.id);
      await b.eval(()=>SafePermitI18n.setLanguage('en'));await b.delay(100);
    });

    await t.test('all four roles expose only their own authorized navigation, with urgent tools promoted',async()=>{
      for(const [role,priority] of [['worker','drafts'],['supervisor','reviewed'],['safety','stopworks'],['admin','approved']]){
        await goto('/'+role+'/dashboard/');await b.delay(120);
        assert.equal(await b.eval(id=>!!document.querySelector('.sp-session-priority [data-sp-nav-id="'+id+'"]'),priority),true,role);
        const restricted=await b.eval(()=>[...document.querySelectorAll('.sp-session-sidebar a')].filter(a=>/risk-command-center|controlled-resume/.test(a.href)).map(a=>a.href));
        if(role!=='safety')assert.deepEqual(restricted,[]);else assert.ok(restricted.length>0);
        if(role==='safety')assert.equal(await b.eval(()=>!!document.querySelector('.sp-session-priority [data-sp-nav-id=resume]')),true);
      }
      assert.match(await b.eval(()=>document.querySelector('[data-sp-nav-id=approved]').textContent),/activation checks/);
    });

    await t.test('Supervisor queue preserves search/sort/risk and includes QR in desktop and mobile records',async()=>{
      await goto('/supervisor/review-queue/?q=1876&risk=low&sort=oldest');
      assert.equal(await b.eval(()=>document.querySelector('#queueSearch').value),'1876');
      assert.equal(await b.eval(()=>document.querySelector('#riskFilter').value),'low');
      const values=await b.eval(()=>[...document.querySelectorAll('#queueTableBody tr:not(.is-hidden) .sp-qr-entry,#queueMobileList .sp-qr-entry')].map(x=>x.dataset.permitId));
      assert.ok(values.length>=2);assert.ok(values.every(x=>x===permit.id));
      const target=await b.eval(()=>document.querySelector('#queueTableBody tr:not(.is-hidden) a').href);
      assert.match(new URL(target).searchParams.get('returnTo'),/q=1876/);
    });

    await t.test('remaining lists restore search/filter state and keep navigation orientation',async()=>{
      for(const [route,search] of [['safety/review-queue/','queueSearch'],['admin/pending-permits/','permitSearch'],
        ['supervisor/history/','historySearch'],['safety/history/','historySearch'],['supervisor/active-supervision/','activeSearch'],['safety/risk-overview/','riskSearch']]){
        await goto('/'+route+'?q=phase-two-no-match&risk=high');
        assert.equal(await b.eval(id=>document.getElementById(id).value,search),'phase-two-no-match',route);
        if(await b.eval(()=>!!document.getElementById('riskFilter')))assert.equal(await b.eval(()=>document.getElementById('riskFilter').value),'high');
        assert.equal(await b.eval(()=>document.querySelector('.sp-list-feedback').dataset.state),'filtered',route);
        await b.eval(()=>document.querySelector('.sp-list-feedback button').click());await b.delay(70);
        assert.equal(await b.eval(id=>document.getElementById(id).value,search),'',route);
      }
      await goto('/supervisor/history/?status=returned&q=QA');
      assert.equal(await b.eval(()=>document.getElementById('decisionFilter').value),'return');
      await goto('/worker/permits/?status=draft&q=1022');
      assert.equal(await b.eval(()=>document.querySelector('.sp-session-link[aria-current=page]').dataset.spNavId),'drafts');
      await b.eval(()=>document.querySelector('.sp-list-feedback button').click());await b.delay(70);
      assert.equal(await b.eval(()=>document.querySelector('.sp-session-link[aria-current=page]').dataset.spNavId),'permits');
      assert.match(await b.eval(()=>SafePermitNav.permitRoute('admin','PTW-1876','Approved')),/status=approved&q=PTW-1876/);
    });

    await t.test('missing/invalid/unavailable references never select unrelated IDs or expose detail QR',async()=>{
      for(const value of ['', 'PTW-99999', '<bad>']){
        await goto('/worker/permit-details/'+(value?'?id='+encodeURIComponent(value):''));
        assert.equal(await b.eval(()=>!!document.querySelector('.sp-permit-state--missing')),true);
        assert.equal(await b.eval(()=>document.querySelector('.sp-qr-detail-action')),null);
      }
      await goto('/worker/permit-details/?id=PTW-99999&returnTo='+encodeURIComponent('https://evil.test/'));
      assert.equal(await b.eval(()=>document.querySelector('[data-sp-context-back]')),null);
      await goto('/worker/permit-details/?id=PTW-99999&returnTo='+encodeURIComponent('admin/active-permits/'));
      assert.equal(await b.eval(()=>document.querySelector('[data-sp-context-back]')),null);
      await goto('/worker/approval-tracking/');
      assert.match(await b.eval(()=>document.querySelector('main h1').textContent),/Choose a permit to track/);
      assert.equal(await b.eval(()=>document.querySelector('.sp-qr-detail-action')),null);
    });

    await t.test('Safety blocker links carry context into known-record tools and preserve the route guard',async()=>{
      await b.eval(p=>localStorage.setItem('safePermitSubmittedPermits',JSON.stringify([{...p,status:'Stopped',previousStatusBeforeStop:'Pending Safety Review'}])),permit);
      await goto('/safety/permit-details/?id='+permit.id+'&returnTo='+encodeURIComponent('safety/review-queue/?q=1876'));
      const resolver=await b.eval(id=>SafePermitStatus.resolverHref({section:'gates'},id),permit.id);
      assert.equal(new URL(resolver).searchParams.get('id'),permit.id);
      await goto('/safety/review-permit/?id='+permit.id+'&returnTo='+encodeURIComponent('safety/review-queue/?q=1876'));
      const toolUrl=new URL(await b.eval(()=>document.querySelector('.sp-context-tool[href*="risk-command-center"]').href));
      const tool=toolUrl.pathname+toolUrl.search+toolUrl.hash;
      await goto(tool);
      assert.equal(await b.eval(()=>document.querySelector('.sp-session-link[aria-current=page]').dataset.spNavId),'gates');
      assert.equal(await b.eval(()=>document.querySelector('#workflow-permit').value),permit.id);
      await b.eval(()=>{document.querySelector('#suite-new').focus();document.querySelector('#suite-new').click();});
      assert.equal(await b.eval(()=>document.querySelector('#suite-form [name=permitId]').value),permit.id);
      await b.key('Escape');
      assert.equal(await b.eval(()=>document.querySelector('#suite-editor').hidden),true,'prefilled identity is clean, not an unsaved edit');
      const back=await b.eval(()=>document.querySelector('[data-sp-context-back]').href);
      assert.equal(new URL(back).searchParams.get('id'),permit.id);
      assert.match(new URL(back).searchParams.get('returnTo'),/q=1876/);
      assert.equal(await b.eval(()=>JSON.parse(localStorage.getItem('safePermitSubmittedPermits'))[0].status),'Stopped');
      await goto('/safety/risk-command-center/?id=PTW-UNKNOWN#gates');
      await b.eval(()=>document.querySelector('#suite-new').click());
      assert.equal(await b.eval(()=>document.querySelector('#suite-form [name=permitId]').value),'');
      await b.key('Escape');
    });

    await t.test('no-match, empty data, unavailable storage and Retry remain distinct',async()=>{
      await goto('/worker/permits/?q=does-not-match-any-record');
      assert.equal(await b.eval(()=>document.querySelector('.sp-list-feedback').dataset.state),'filtered');
      await b.eval(()=>localStorage.setItem('safePermitSubmittedPermits','{broken'));
      await b.eval(()=>window.dispatchEvent(new Event('storage')));await b.delay(120);
      assert.equal(await b.eval(()=>document.querySelector('.sp-list-feedback').dataset.state),'error');
      assert.equal(await b.eval(()=>!!document.querySelector('#permitTableBody').closest('table').hasAttribute('data-sp-unavailable')),true);
      await b.eval(p=>localStorage.setItem('safePermitSubmittedPermits',JSON.stringify([p])),permit);
      await b.eval(()=>document.querySelector('.sp-list-feedback button:last-child').click());await b.delay(120);
      assert.equal(await b.eval(()=>document.querySelector('.sp-list-feedback').dataset.state),'filtered');
      await b.eval(()=>document.querySelector('.sp-list-feedback button').click());await b.delay(80);
      assert.equal(await b.eval(()=>document.querySelector('.sp-list-feedback').dataset.state),'ready');
      await b.eval(()=>{document.querySelector('#permitTableBody').replaceChildren();document.querySelector('#permitCards').replaceChildren();});await b.delay(80);
      assert.equal(await b.eval(()=>document.querySelector('.sp-list-feedback').dataset.state),'empty');
    });

    await t.test('Admin approval filter restores case-insensitively without activating or weakening blockers',async()=>{
      await goto('/admin/active-permits/?status=approved&q=1042');
      assert.equal(await b.eval(()=>document.querySelector('#statusFilter').value),'Approved');
      assert.equal(await b.eval(()=>document.querySelector('#permitSearch').getAttribute('aria-label')),'Search permits');
      const activate=await b.eval(()=>{const button=document.querySelector('[data-action=activate]');return button&&{disabled:button.disabled,id:button.dataset.id};});
      assert.deepEqual(activate,{disabled:true,id:'PTW-1042'},'expired demo activation is still blocked');
      await b.eval(()=>document.querySelector('.sp-list-feedback button').click());await b.delay(80);
      assert.equal(await b.eval(()=>document.querySelector('#statusFilter').value),'');
    });

    await t.test('queue failure hides stale rows and can be retried without changing approvals',async()=>{
      await goto('/supervisor/review-queue/');
      await b.eval(()=>{window.originalData=SafePermitData;window.SafePermitData={...SafePermitData,repository:{...SafePermitData.repository,listForReview:()=>new Promise(resolve=>{window.finishQueueLoad=resolve;})}};window.dispatchEvent(new CustomEvent('safepermit:permits-updated'));});await b.delay(80);
      assert.equal(await b.eval(()=>document.querySelector('.sp-list-feedback').dataset.state),'loading');
      await b.eval(async()=>{const permits=await originalData.repository.listForReview('supervisor');finishQueueLoad(permits);window.SafePermitData=originalData;});await b.delay(80);
      assert.equal(await b.eval(()=>document.querySelector('.sp-list-feedback').dataset.state),'ready');
      await b.eval(()=>{window.originalData=SafePermitData;window.SafePermitData={...SafePermitData,repository:{...SafePermitData.repository,listForReview:()=>Promise.reject(Error('Unavailable QA repository'))}};window.dispatchEvent(new CustomEvent('safepermit:permits-updated'));});await b.delay(120);
      assert.equal(await b.eval(()=>document.querySelector('.sp-list-feedback').dataset.state),'error');
      await b.eval(()=>{window.SafePermitData=window.originalData;document.querySelector('.sp-list-feedback button:last-child').click();});await b.delay(120);
      assert.equal(await b.eval(()=>document.querySelector('.sp-list-feedback').dataset.state),'ready');
    });

    await t.test('reference verification stays explicitly unverified, including expired and unknown records',async()=>{
      await b.goto('/permit-verify/?id=PTW-1042');
      assert.match(await b.eval(()=>document.body.innerText),/DEMO.*UNVERIFIED/s);
      assert.match(await b.eval(()=>document.body.innerText),/NOT AUTHORIZED/);
      await b.goto('/permit-verify/?id=PTW-NOT-RECORDED');
      assert.match(await b.eval(()=>document.body.innerText),/No permit record is available/);
    });

    await t.test('a missing bundled image reports failure without inventing a code or authorization',async()=>{
      await goto('/worker/permits/');
      await b.eval(()=>SafePermitPermitQR.show('PTW-1024'));
      await b.eval(()=>{document.querySelector('.sp-qr-panel img').src='/missing-qa-reference.svg';});await b.delay(100);
      assert.equal(await b.eval(()=>document.querySelector('.sp-qr-panel img')),null);
      assert.match(await b.eval(()=>document.querySelector('.sp-qr-panel').textContent),/QR image unavailable/);
      assert.match(await b.eval(()=>document.querySelector('.sp-qr-warning').textContent),/UNVERIFIED/);
      await b.key('Escape');
    });

    await t.test('mobile QR and filters work in EN/AR, light/dark, RTL/LTR and reduced motion',async()=>{
      for(const lang of ['en','ar'])for(const theme of ['light','dark'])for(const width of [320,390,768]){
        await b.eval(([lang,theme])=>{localStorage.setItem('safePermitLanguage',lang);localStorage.setItem('safePermitTheme',theme);},[lang,theme]);
        await b.command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
        await b.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
        await goto('/worker/permits/?q=1024');
        const row=width<821?'#permitCards .permit-item:not(.is-hidden)':'#permitTableBody tr:not(.is-hidden)';
        await b.eval(selector=>{const button=document.querySelector(selector+' .sp-qr-entry');button.focus();button.click();},row);
        const state=await b.eval(()=>({id:document.querySelector('.sp-qr-panel bdi').textContent,dir:document.documentElement.dir,
          overflow:document.documentElement.scrollWidth-innerWidth,animation:getComputedStyle(document.querySelector('.sp-qr-panel')).animationName,text:document.querySelector('.sp-qr-warning').textContent,
          background:getComputedStyle(document.querySelector('.sp-qr-panel')).backgroundColor,initial:document.activeElement.id}));
        assert.equal(state.id,'PTW-1024');assert.equal(state.dir,lang==='ar'?'rtl':'ltr');assert.equal(state.overflow,0,JSON.stringify({width,lang,theme}));assert.equal(state.animation,'none');
        assert.match(state.text,lang==='ar'?/غير موثّق/:/UNVERIFIED/);
        assert.equal(state.initial,'sp-qr-title');assert.equal(state.background,theme==='dark'?'rgb(21, 37, 47)':'rgb(255, 255, 255)');
        await b.key('Escape');assert.equal(await b.eval(()=>document.activeElement.dataset.permitId),'PTW-1024');
        assert.deepEqual(b.errors,[]);
      }
    });

    await t.test('mobile drawers retain keyboard opening, dismissal and focus restoration in all roles',async()=>{
      await b.eval(()=>{localStorage.setItem('safePermitLanguage','en');localStorage.setItem('safePermitTheme','light');});
      await b.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
      for(const role of ['worker','supervisor','safety','admin']){
        await goto('/'+role+'/dashboard/');
        await b.eval(()=>{document.getElementById('sidebarOpen').focus();document.getElementById('sidebarOpen').click();});await b.delay(80);
        assert.equal(await b.eval(()=>document.querySelector('.sp-session-sidebar').inert),false,role);
        assert.equal(await b.eval(()=>document.querySelector('.sp-session-sidebar').contains(document.activeElement)),true,role);
        await b.key('Escape');await b.delay(80);
        assert.equal(await b.eval(()=>document.activeElement.id),'sidebarOpen',role);
        assert.equal(await b.eval(()=>document.querySelector('.sp-session-sidebar').inert),true,role);
      }
    });
  }finally{await b.close();}
});
