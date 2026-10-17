const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {launch, executable} = require('./helpers/browser.cjs');

function luminance(rgb) {
  const linear=rgb.map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;});
  return linear.reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
}
function contrast(a,b) {const [dark,light]=[luminance(a),luminance(b)].sort((a,b)=>a-b);return (light+.05)/(dark+.05);}

test('Phase 1: real-browser accessibility and safety-preservation regressions', {timeout:180000}, async t=>{
  if(typeof WebSocket==='undefined'||!executable()) {t.skip('Requires Node 22+ and installed Chrome/Edge (or CHROME_PATH).');return;}
  const b=await launch(path.resolve(__dirname,'..'));
  try {
    await b.goto('/auth/login/');
    async function preferences(lang='en',theme='light',width=1440) {
      await b.eval(([lang,theme])=>{localStorage.setItem('safePermitLanguage',lang);localStorage.setItem('safePermitTheme',theme);},[lang,theme]);
      await b.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
    }
    async function openModule(hash='risks',lang='en',theme='light',width=1440) {
      await preferences(lang,theme,width);
      await b.goto('/safety/risk-command-center/#'+hash);
      assert.equal(await b.eval(()=>location.hash),'#'+hash,'test opened the requested module');
      await b.eval(()=>{document.getElementById('suite-new').focus();document.getElementById('suite-new').click();});
    }
    async function editorState() {
      return b.eval(()=>({open:!document.getElementById('suite-editor').hidden,
        focus:document.activeElement.id||document.activeElement.name,
        inside:document.querySelector('#suite-editor [role=dialog]').contains(document.activeElement),
        background:document.querySelector('main').inert}));
    }

    await t.test('primary buttons meet 4.5:1 contrast in all four roles, themes and languages',async()=>{
      for(const role of ['worker','supervisor','safety','admin']) for(const lang of ['en','ar']) for(const theme of ['light','dark']) {
        await preferences(lang,theme,lang==='ar'?390:1440);
        await b.goto('/'+role+'/dashboard/');
        const styles=await b.eval(()=>{
          const button=document.querySelector('.sp-btn--primary');
          const style=getComputedStyle(button);
          return {color:style.color,background:style.backgroundImage,lang:document.documentElement.lang,dir:document.documentElement.dir};
        });
        const foreground=styles.color.match(/\d+(?:\.\d+)?/g).slice(0,3).map(Number);
        const stops=[...styles.background.matchAll(/rgb\((\d+), (\d+), (\d+)\)/g)].map(m=>m.slice(1).map(Number));
        assert.ok(stops.length>=2,'brand gradient retained');
        for(const stop of stops)assert.ok(contrast(foreground,stop)>=4.5,JSON.stringify({role,lang,theme,styles}));
        assert.equal(styles.lang,lang);assert.equal(styles.dir,lang==='ar'?'rtl':'ltr');
        assert.deepEqual(b.errors,[]);
      }
      await preferences();await b.goto('/worker/dashboard/');
      await b.eval(()=>document.querySelector('.sp-btn--primary').scrollIntoView());
      const rect=await b.eval(()=>{const r=document.querySelector('.sp-btn--primary').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
      await b.command('Input.dispatchMouseEvent',{type:'mouseMoved',...rect});await b.delay(250);
      const hover=await b.eval(()=>{const s=getComputedStyle(document.querySelector('.sp-btn--primary'));return[s.color,s.backgroundColor];});
      assert.ok(contrast(...hover.map(v=>v.match(/\d+/g).slice(0,3).map(Number)))>=4.5,'hover contrast');
    });

    for(const module of ['risks','zones','gates','conflicts','indicators','isolations','passports','incidents','actions','stopworks']) {
      await t.test(module+': initial focus, forward/backward containment, Escape, restoration',async()=>{
        await openModule(module);
        assert.deepEqual(await editorState(),{open:true,focus:'title',inside:true,background:true});
        await b.key('Tab',true);assert.equal((await editorState()).focus,'suite-close');
        await b.key('Tab',true);
        assert.equal(await b.eval(()=>document.activeElement.matches('#suite-editor [type=submit]')),true);
        await b.key('Tab');assert.equal((await editorState()).focus,'suite-close');
        await b.key('Escape');
        assert.deepEqual(await editorState(),{open:false,focus:'suite-new',inside:false,background:false});
        assert.deepEqual(b.errors,[]);
      });
    }

    await t.test('dirty editor: Keep editing, Escape cancellation, navigation guard and discard without saving',async()=>{
      await openModule();
      const before=await b.eval(()=>localStorage.getItem('safepermit:safety-suite:v1:risks'));
      await b.eval(()=>{const field=document.querySelector('#suite-form [name=title]');field.value='Unsaved keyboard test';field.dispatchEvent(new Event('input',{bubbles:true}));});
      await b.key('Escape');
      assert.equal(await b.eval(()=>document.activeElement.textContent),'Keep editing');
      assert.equal(await b.eval(()=>document.getElementById('suite-form').inert),true);
      await b.key('Escape');
      assert.equal((await editorState()).open,true);
      assert.equal(await b.eval(()=>document.querySelector('#suite-form [name=title]').value),'Unsaved keyboard test');
      assert.equal(await b.eval(()=>document.getElementById('suite-form').inert),false);
      const unload=await b.eval(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;});
      assert.equal(unload,true);
      await b.eval(()=>{location.hash='zones';});await b.delay(100);
      assert.equal(await b.eval(()=>location.hash),'#risks');
      await b.eval(()=>document.querySelector('.sp-editor-discard button').click());
      assert.equal((await editorState()).open,true);
      await b.eval(()=>document.getElementById('suite-close').click());
      await b.eval(()=>document.querySelector('.sp-editor-discard button:last-child').click());
      assert.equal((await editorState()).open,false);
      assert.equal(await b.eval(()=>localStorage.getItem('safepermit:safety-suite:v1:risks')),before);
      await b.eval(()=>{document.getElementById('suite-new').focus();document.getElementById('suite-new').click();document.querySelector('#suite-form [name=title]').value='Discard before navigation';location.hash='zones';});
      await b.delay(100);
      await b.eval(()=>document.querySelector('.sp-editor-discard button:last-child').click());
      await b.delay(100);
      assert.equal(await b.eval(()=>location.hash),'#zones');
      assert.equal((await editorState()).open,false);
    });

    await t.test('successful saves close safely; failed saves retain input and restore enabled controls',async()=>{
      await openModule();
      await b.eval(()=>{
        document.querySelector('#suite-form [name=title]').value='Phase 1 save test';
        window.originalStorageWrite=Storage.prototype.setItem;
        Storage.prototype.setItem=function(key,value){if(key.startsWith('safepermit:safety-suite:'))throw Error('Regression: storage unavailable');return originalStorageWrite.call(this,key,value);};
        document.getElementById('suite-form').requestSubmit();
      });await b.delay(80);
      assert.equal((await editorState()).open,true);
      assert.match(await b.eval(()=>document.querySelector('.sp-editor-error').textContent),/storage unavailable/);
      assert.equal(await b.eval(()=>document.querySelector('#suite-form [name=title]').value),'Phase 1 save test');
      assert.equal(await b.eval(()=>document.querySelector('#suite-editor [type=submit]').disabled),false);
      assert.equal((await editorState()).inside,true);
      const busy=await b.eval(()=>{
        Storage.prototype.setItem=window.originalStorageWrite;
        document.getElementById('suite-form').requestSubmit();
        document.getElementById('suite-form').requestSubmit();
        document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
        return {open:!document.getElementById('suite-editor').hidden,busy:document.querySelector('#suite-editor [role=dialog]').getAttribute('aria-busy')};
      });
      assert.deepEqual(busy,{open:true,busy:'true'});await b.delay(120);
      assert.equal((await editorState()).open,false);
      assert.equal((await editorState()).focus,'suite-new');
      const record=await b.eval(async()=>(await SafePermitSafety.list('risks')).find(x=>x.title==='Phase 1 save test'));
      assert.ok(record);assert.notEqual(record.status,'Verified');
      assert.equal(await b.eval(async()=>(await SafePermitSafety.list('risks')).filter(x=>x.title==='Phase 1 save test').length),1);
      assert.deepEqual(b.errors,[]);
    });

    await t.test('a refresh failure after saving remains visible after the editor closes',async()=>{
      await openModule('risks');
      await b.eval(()=>{
        document.querySelector('#suite-form [name=title]').value='Saved before refresh failure';
        window.SafePermitData={repository:{listKnownPermits:()=>Promise.reject(Error('Regression: refresh unavailable'))}};
        document.getElementById('suite-form').requestSubmit();
      });await b.delay(120);
      assert.equal((await editorState()).open,false);
      assert.equal(await b.eval(()=>document.getElementById('suite-error').hidden),false);
      assert.match(await b.eval(()=>document.getElementById('suite-error').textContent),/refresh unavailable/);
      assert.equal(await b.eval(async()=>(await SafePermitSafety.list('risks')).filter(x=>x.title==='Saved before refresh failure').length),1);
    });

    await t.test('modal integration still blocks high residual risk and incident closure',async()=>{
      await openModule('risks');
      await b.eval(()=>{
        for(const [name,value] of Object.entries({title:'Blocked risk',severity:'5',likelihood:'5',residualLikelihood:'4',status:'Controlled'}))
          document.querySelector('#suite-form [name='+name+']').value=value;
        document.getElementById('suite-form').requestSubmit();
      });
      assert.equal((await editorState()).open,true);
      assert.match(await b.eval(()=>document.querySelector('.sp-editor-error').textContent),/High\/Critical residual risk/);
      assert.equal(await b.eval(async()=>(await SafePermitSafety.list('risks')).some(x=>x.title==='Blocked risk')),false);
      await b.key('Escape');await b.eval(()=>document.querySelector('.sp-editor-discard button:last-child').click());
      await openModule('incidents');
      await b.eval(()=>{document.querySelector('#suite-form [name=title]').value='Blocked closure';document.querySelector('#suite-form [name=status]').value='Closed';document.getElementById('suite-form').requestSubmit();});
      assert.equal((await editorState()).open,true);
      assert.match(await b.eval(()=>document.querySelector('.sp-editor-error').textContent),/verifying corrective actions/);
      assert.equal(await b.eval(async()=>(await SafePermitSafety.list('incidents')).some(x=>x.title==='Blocked closure')),false);
      await b.key('Escape');await b.eval(()=>document.querySelector('.sp-editor-discard button:last-child').click());
    });

    await t.test('compliance verification modal preserves evidence guard and modal-local errors',async()=>{
      await preferences();await b.goto('/safety/risk-command-center/#actions');
      await b.eval(async()=>{await SafePermitSafety.upsert('actions',{id:'PHASE1-ACTION',title:'Phase 1 finding',owner:'QA',controls:'Documented corrective action',status:'Open'});});
      await b.delay(100);
      await b.eval(()=>{const button=[...document.querySelectorAll('.record button')].find(x=>x.textContent==='HSE Verification');button.focus();button.click();});
      assert.equal((await editorState()).focus,'reviewer');
      await b.eval(()=>{document.querySelector('[name=reviewer]').value='QA reviewer';document.querySelector('[name=evidence]').value='short';document.getElementById('suite-form').requestSubmit();});await b.delay(100);
      assert.equal((await editorState()).open,true);
      assert.match(await b.eval(()=>document.querySelector('.sp-editor-error').textContent),/20\+/);
      assert.equal(await b.eval(async()=>(await SafePermitSafety.get('actions','PHASE1-ACTION')).status),'Open');
      await b.key('Escape');
      await b.eval(()=>document.querySelector('.sp-editor-discard button:last-child').click());
      assert.equal((await editorState()).open,false);
    });

    await t.test('mobile Arabic/dark: modal prompt remains RTL, localized and keyboard contained',async()=>{
      await openModule('risks','ar','dark',390);
      await b.eval(()=>{document.querySelector('#suite-form [name=title]').value='تعديل غير محفوظ';});
      await b.key('Escape');
      const result=await b.eval(()=>({dir:document.documentElement.dir,text:document.activeElement.textContent,
        overflow:document.documentElement.scrollWidth-innerWidth}));
      assert.equal(result.dir,'rtl');assert.equal(result.text,'متابعة التحرير');assert.equal(result.overflow,0);
      await b.eval(()=>document.getElementById('suite-close').focus());await b.key('Tab',true);
      assert.equal(await b.eval(()=>document.activeElement.textContent),'تجاهل التعديلات');
      await b.eval(()=>document.activeElement.click());assert.equal((await editorState()).open,false);
    });

    await t.test('Basic Info: associated errors, linked summary, clearing, language changes and reduced motion',async()=>{
      await preferences();await b.goto('/worker/create-permit/basic-info/');
      await b.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
      await b.eval(()=>{window.scrollCalls=[];Element.prototype.scrollIntoView=function(options){window.scrollCalls.push(options);};document.getElementById('basicInfoForm').requestSubmit();});
      let result=await b.eval(()=>({focus:document.activeElement.id,links:document.querySelectorAll('#validationSummaryList a').length,
        hidden:document.getElementById('validationSummary').hidden,
        errors:[...document.querySelectorAll('[aria-invalid=true]')].map(input=>({id:input.id,error:document.getElementById(input.id+'Error').textContent,refs:input.getAttribute('aria-describedby')})),
        scroll:window.scrollCalls.at(-1)}));
      assert.equal(result.focus,'permitType');assert.equal(result.hidden,false);assert.equal(result.links,10);
      for(const error of result.errors){assert.ok(error.error);assert.ok(error.refs.split(' ').includes(error.id+'Error'));}
      assert.equal(result.scroll.behavior,'auto');
      await b.eval(()=>document.querySelector('#validationSummary a[href="#workTitle"]').click());
      assert.equal(await b.eval(()=>document.activeElement.id),'workTitle');
      await b.eval(()=>{document.getElementById('workTitle').value='Valid title';document.getElementById('workTitle').dispatchEvent(new Event('change'));});
      assert.equal(await b.eval(()=>document.getElementById('workTitle').getAttribute('aria-invalid')),'false');
      assert.equal(await b.eval(()=>document.querySelector('#validationSummary a[href="#workTitle"]')),null);
      await b.eval(()=>SafePermitI18n.setLanguage('ar'));await b.delay(150);
      assert.match(await b.eval(()=>document.getElementById('validationSummaryTitle').textContent),/[\u0600-\u06ff]/);
      assert.match(await b.eval(()=>document.querySelector('#validationSummaryList a').textContent),/[\u0600-\u06ff]/);
      await b.eval(()=>SafePermitI18n.setLanguage('en'));await b.delay(150);
      assert.match(await b.eval(()=>document.querySelector('#validationSummaryList a').textContent),/required/);
      await b.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
      await b.eval(()=>document.querySelector('#validationSummaryList a').click());
      assert.equal(await b.eval(()=>window.scrollCalls.at(-1).behavior),'smooth');
      assert.equal(await b.eval(()=>localStorage.getItem('safePermitDraftBasicInfo')),null,'invalid submit never advances/saves');
      assert.deepEqual(b.errors,[]);
    });

    await t.test('Basic Info: chronology and worker-count blockers retained, valid data still continues',async()=>{
      await preferences();await b.goto('/worker/create-permit/basic-info/');
      await b.eval(()=>{
        const values={permitType:'electrical',workTitle:'QA panel inspection',description:'Inspect isolated panel',site:'factory-a',
          startDate:'2026-10-20',startTime:'08:00',endDate:'2026-10-20',endTime:'07:00',supervisor:'sup-001',workerCount:'51'};
        for(const [id,value] of Object.entries(values)){document.getElementById(id).value=value;document.getElementById(id).dispatchEvent(new Event('change'));}
        document.getElementById('area').value='electrical-room';document.getElementById('basicInfoForm').requestSubmit();
      });
      assert.equal(await b.eval(()=>document.activeElement.id),'endDate');
      for(const id of ['endDate','endTime','workerCount']) assert.equal(await b.eval(id=>document.getElementById(id).getAttribute('aria-invalid'),id),'true');
      assert.equal(await b.eval(()=>localStorage.getItem('safePermitDraftBasicInfo')),null);
      await b.eval(()=>{document.getElementById('endTime').value='12:00';document.getElementById('workerCount').value='1';document.getElementById('basicInfoForm').requestSubmit();});
      assert.equal(await b.eval(()=>document.getElementById('validationSummary').hidden),true);
      assert.equal(await b.eval(()=>JSON.parse(localStorage.getItem('safePermitDraftBasicInfo')).workTitle),'QA panel inspection');
      await b.delay(650);assert.match(await b.eval(()=>location.pathname),/\/risk-assessment\/$/);
      assert.deepEqual(b.errors,[]);
    });
  } finally {await b.close();}
});
