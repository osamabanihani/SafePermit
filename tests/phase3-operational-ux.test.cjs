const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {launch,executable} = require('./helpers/browser.cjs');
const {decision,safety} = require('./qa-evidence-fixtures.cjs');
const root = path.resolve(__dirname,'..');
const basic = '/worker/create-permit/basic-info/';
const draftKey = 'safePermitDraftBasicInfo';
const recoveryKey = draftKey+':recovery:v1';
const values = {permitType:'electrical',workTitle:'Isolated panel inspection',description:'Inspect panel with verified controls',site:'factory-a',area:'electrical-room',startDate:'2099-10-20',startTime:'08:00',endDate:'2099-10-20',endTime:'12:00',supervisor:'sup-001',workerCount:'2'};
function permit(id='PTW-8801',status='Approved') {
  return {id,status,...safety(id),supervisorDecision:decision(id,'supervisor'),safetyDecision:decision(id,'safety'),adminDecision:decision(id,'admin'),
    basicInfo:{...values,site:'QA site',area:'QA zone'}};
}

test('Phase 3 operational UX in a real browser', {timeout:180000}, async t => {
  if (!executable() || typeof WebSocket === 'undefined') { t.skip('Requires Node 22+ and installed Chrome/Edge.'); return; }
  const b = await launch(root);
  const evidence = [];
  let acceptDialogs = true;
  const dialogs = [];
  b.on('Page.javascriptDialogOpening',event => { dialogs.push(event.params); b.command('Page.handleJavaScriptDialog',{accept:acceptDialogs}).catch(()=>{}); });
  async function seed(data={}) {
    await b.goto('/auth/login/');
    await b.eval(data => { localStorage.clear(); for (const [key,value] of Object.entries(data)) localStorage.setItem(key,typeof value === 'string'?value:JSON.stringify(value)); },data);
  }
  async function edit(data=values) {
    await b.eval(data => {
      for (const [id,value] of Object.entries(data)) { const field=document.getElementById(id);field.value=value;field.dispatchEvent(new Event('change',{bubbles:true})); }
    },data);
  }
  async function until(fn) {
    for(let i=0;i<60;i++){if(await b.eval(fn))return;await b.delay(40);} assert.fail('State did not settle: '+fn);
  }
  async function admin(p=permit(),extra={}) { await seed({safePermitSubmittedPermits:[p],...extra});await b.goto('/admin/active-permits/?q='+p.id);await until(()=>!!document.querySelector('[data-readiness][data-state]')); }
  async function stopped(extra={},store={}) {
    const p={...permit('PTW-8801','Stopped'),previousStatusBeforeStop:'Active',...extra};
    await seed({safePermitSubmittedPermits:[p],...store});
    await b.goto('/safety/controlled-resume/?id='+p.id);
    await until(()=>!document.getElementById('inspect').disabled);
    return p;
  }
  try {
    await b.command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await t.test('interrupted edits save to recovery, require explicit restore, and retain every Basic Info field',async()=>{
      await seed();await b.goto(basic);await edit();
      assert.equal(await b.eval(()=>document.getElementById('draftState').dataset.state),'unsaved');
      await b.delay(850);
      assert.equal(await b.eval(()=>document.getElementById('draftState').dataset.state),'saved');
      assert.equal(await b.eval(key=>localStorage.getItem(key),draftKey),null,'recovery does not bypass wizard validation');
      await b.goto(basic);
      assert.equal(await b.eval(()=>document.getElementById('basicInfoForm').inert),true);
      assert.equal(await b.eval(()=>document.getElementById('workTitle').value),'');
      await b.eval(()=>document.getElementById('recoverDraft').focus());
      await b.key('Tab');assert.equal(await b.eval(()=>document.activeElement.id),'newDraft');
      await b.key('Tab',true);assert.equal(await b.eval(()=>document.activeElement.id),'recoverDraft');
      await b.eval(()=>document.getElementById('recoverDraft').click());
      assert.deepEqual(await b.eval(ids=>Object.fromEntries(ids.map(id=>[id,document.getElementById(id).value])),Object.keys(values)),values);
      assert.equal(await b.eval(()=>document.getElementById('draftState').dataset.state),'recovered');
      assert.equal(await b.eval(()=>document.activeElement.id),'permitType');
      await b.eval(()=>document.getElementById('saveDraftButton').click());
      assert.equal(await b.eval(key=>JSON.parse(localStorage.getItem(key)).workTitle,draftKey),values.workTitle);
      assert.equal(await b.eval(key=>JSON.parse(localStorage.getItem(key))._draftMeta.version,draftKey),1);
    });
    await t.test('quota failure never reports Saved or advances; retry succeeds without losing entries',async()=>{
      await seed();await b.goto(basic);await edit();
      await b.eval(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('safePermitDraftBasicInfo'))throw new DOMException('Quota exceeded','QuotaExceededError');return window.originalSet.call(this,key,value);};document.getElementById('basicInfoForm').requestSubmit();});
      assert.equal(await b.eval(()=>document.getElementById('draftState').dataset.state),'failed');
      await b.delay(850);assert.match(await b.eval(()=>location.pathname),/basic-info/);
      assert.equal(await b.eval(()=>document.getElementById('workTitle').value),values.workTitle);
      assert.equal(await b.eval(key=>localStorage.getItem(key),draftKey),null);
      assert.equal(await b.eval(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;}),true);
      await b.eval(()=>{Storage.prototype.setItem=window.originalSet;document.getElementById('saveDraftButton').click();});
      assert.equal(await b.eval(()=>document.getElementById('draftState').dataset.state),'saved');
    });
    await t.test('unavailable storage reads remain recoverable after access returns',async()=>{
      await seed();
      const {identifier}=await b.command('Page.addScriptToEvaluateOnNewDocument',{source:"window.originalGet=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k.startsWith('safePermitDraftBasicInfo'))throw Error('Unavailable');return window.originalGet.call(this,k);};"});
      await b.goto(basic);await b.command('Page.removeScriptToEvaluateOnNewDocument',{identifier});
      assert.equal(await b.eval(()=>document.getElementById('draftState').dataset.state),'failed');
      assert.equal(await b.eval(()=>document.getElementById('recoverDraft').hidden),true);
      await b.eval(()=>{Storage.prototype.getItem=window.originalGet;document.getElementById('newDraft').click();});
      await edit();await b.eval(()=>document.getElementById('saveDraftButton').click());
      assert.equal(await b.eval(()=>document.getElementById('draftState').dataset.state),'saved');
    });
    for(const [label,data,allowed,kind] of [
      ['malformed','{broken',false,'invalid'],['array',[],false,'invalid'],
      ['incompatible',{...values,_draftMeta:{version:99,context:'new',savedAt:new Date().toISOString()}},false,'invalid'],
      ['wrong workflow',{...values,_draftMeta:{version:1,context:'correction:PTW-OTHER',savedAt:new Date().toISOString()}},false,'invalid'],
      ['invalid option',{...values,site:'nonexistent'},false,'invalid'],
      ['invalid calendar',{...values,startDate:'2099-02-30'},false,'invalid'],
      ['invalid number',{...values,workerCount:'not-a-number'},false,'invalid'],
      ['legacy',values,true,'legacy'],
      ['stale',{...values,_draftMeta:{version:1,context:'new',savedAt:'2020-01-01T00:00:00.000Z'}},true,'stale']
    ]) await t.test(label+' draft never silently populates or overwrites storage',async()=>{
      await seed({[draftKey]:data});await b.goto(basic);
      assert.equal(await b.eval(()=>document.getElementById('workTitle').value),'');
      assert.equal(await b.eval(()=>document.getElementById('recoverDraft').hidden),!allowed);
      assert.equal(await b.eval(()=>document.getElementById('draftRecovery').dataset.recoveryKind),kind);
      const before=await b.eval(key=>localStorage.getItem(key),draftKey);
      await b.eval(()=>document.getElementById('newDraft').click());
      assert.equal(await b.eval(key=>localStorage.getItem(key),draftKey),before);
      if(kind==='stale') { await b.goto(basic);await b.eval(()=>document.getElementById('recoverDraft').click());assert.equal(await b.eval(()=>document.getElementById('workTitle').value),values.workTitle); }
    });
    await t.test('a mismatched correction context cannot be overwritten by a new draft',async()=>{
      const context={id:'PTW-RETURNED',originalPermit:{id:'PTW-RETURNED',status:'Returned for Correction'}};
      await seed({[draftKey]:values,safePermitCorrectionContext:context});await b.goto(basic);
      assert.equal(await b.eval(()=>document.getElementById('basicInfoForm').inert),true);
      assert.equal(await b.eval(()=>document.getElementById('newDraft').hidden),true);
      assert.match(await b.eval(()=>document.getElementById('draftContextLink').href),/mode=correction&id=PTW-RETURNED/);
      await b.goto(basic+'?mode=correction&id=PTW-RETURNED');
      await b.eval(()=>document.getElementById('recoverDraft').click());await edit({workTitle:'Corrected panel scope'});
      await b.eval(()=>document.getElementById('saveDraftButton').click());
      assert.equal(await b.eval(key=>JSON.parse(localStorage.getItem(key))._draftMeta.context,draftKey),'correction:PTW-RETURNED');
      assert.deepEqual(await b.eval(()=>JSON.parse(localStorage.getItem('safePermitCorrectionContext'))),context);
    });
    await t.test('a real browser navigation can be cancelled while edits are unsaved',async()=>{
      await seed();await b.goto(basic);
      await b.eval(()=>document.getElementById('workTitle').scrollIntoView());
      const point=await b.eval(()=>{const r=document.getElementById('workTitle').getBoundingClientRect();return{x:r.x+10,y:r.y+10};});
      await b.command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
      await b.command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
      await b.command('Input.insertText',{text:'Do not lose this scope'});
      const before=dialogs.length;acceptDialogs=false;
      await b.command('Page.navigate',{url:b.origin+'/worker/permits/'});
      for(let i=0;i<20 && dialogs.length===before;i++)await b.delay(25);
      assert.equal(dialogs.length,before+1);assert.equal(dialogs.at(-1).type,'beforeunload');
      assert.match(await b.eval(()=>location.pathname),/basic-info/);
      assert.equal(await b.eval(()=>document.getElementById('workTitle').value),'Do not lose this scope');
      acceptDialogs=true;await b.eval(()=>document.getElementById('saveDraftButton').click());
    });
    await t.test('edits during continuation cannot advance using an earlier validation result',async()=>{
      await seed();await b.goto(basic);await edit();
      await b.eval(()=>{document.getElementById('basicInfoForm').requestSubmit();document.getElementById('workerCount').value='51';document.getElementById('workerCount').dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('saveDraftButton').click();});
      await b.delay(600);assert.match(await b.eval(()=>location.pathname),/basic-info/);
      assert.match(await b.eval(()=>document.getElementById('formMessage').textContent),/revalidate/);
      await b.eval(()=>document.getElementById('basicInfoForm').requestSubmit());
      assert.equal(await b.eval(()=>document.activeElement.id),'workerCount');
    });
    await t.test('unsaved navigation protection and cross-tab conflict preserve existing bytes',async()=>{
      await seed();await b.goto(basic);await edit({workTitle:'Unsaved operational edit'});
      assert.equal(await b.eval(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;}),true);
      await b.eval(key=>{localStorage.setItem(key,'{"workTitle":"Other tab"}');window.dispatchEvent(new StorageEvent('storage',{key}));document.getElementById('saveDraftButton').click();},draftKey);
      assert.equal(await b.eval(()=>document.getElementById('draftState').dataset.state),'failed');
      assert.equal(await b.eval(key=>JSON.parse(localStorage.getItem(key)).workTitle,draftKey),'Other tab');
      assert.equal(await b.eval(()=>document.getElementById('workTitle').value),'Unsaved operational edit');
    });
    await t.test('attachments explicitly stay on the page, with no persisted contents or metadata',async()=>{
      await seed();await b.goto(basic);await edit();
      await b.eval(()=>{const dt=new DataTransfer();dt.items.add(new File(['test-only'],'test-evidence.pdf',{type:'application/pdf'}));document.getElementById('attachment').files=dt.files;document.getElementById('attachment').dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('saveDraftButton').click();});
      assert.match(await b.eval(()=>document.getElementById('attachmentRetention').textContent),/not saved or uploaded/);
      assert.equal(await b.eval(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;}),true);
      assert.doesNotMatch(await b.eval(keys=>keys.map(k=>localStorage.getItem(k)).join(' '),[draftKey,recoveryKey]),/test-evidence|test-only/);
      await b.goto(basic);await b.eval(()=>document.getElementById('recoverDraft').click());
      assert.equal(await b.eval(()=>document.getElementById('attachment').files.length),0);
      assert.match(await b.eval(()=>document.getElementById('attachmentRetention').textContent),/Reselect/);
    });
    await t.test('activation shows every evidence category and visible expiration blocker without a tooltip',async()=>{
      const p=permit();p.basicInfo.endDate='2020-01-01';delete p.safetyDecision;
      await admin(p);
      assert.equal(await b.eval(()=>document.querySelector('[data-action=activate]').disabled),true);
      const text=await b.eval(()=>document.querySelector('[data-readiness]').textContent);
      for(const pattern of [/Activation blocked/,/expired/,/safety/,/chronology/,/checklist/,/risk/,/Integrated/])assert.match(text,pattern);
      assert.equal(await b.eval(()=>document.querySelector('[data-readiness]').dataset.state),'blocked');
    });
    await t.test('ready snapshot cannot bypass a new safety blocker, expiry, missing approval or failed persistence',async()=>{
      for(const fault of ['blocker','expiry','approval','chronology','storage']) {
        await admin();
        assert.equal(await b.eval(()=>document.querySelector('[data-readiness]').dataset.state),'ready');
        await b.eval(async fault=>{
          window.alert=()=>{throw Error('Unexpected alert');};
          if(fault==='blocker')await SafePermitSafety.upsert('gates',{title:'Unverified test',permitId:'PTW-8801',status:'Open'});
          if(fault==='expiry'||fault==='approval'||fault==='chronology') {
            const p=await SafePermitData.repository.getPermit('PTW-8801');
            if(fault==='expiry')p.basicInfo.endDate='2020-01-01';else if(fault==='chronology')p.adminDecision.reviewedAt='2020-01-01T00:00:00.000Z';else delete p.safetyDecision;
            // Test a concurrent canonical change without asking the UI to refresh its previous ready snapshot.
            localStorage.setItem('safePermitSubmittedPermits',JSON.stringify([p]));
          }
          if(fault==='storage') {window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='safePermitSubmittedPermits')throw Error('Storage write failed');return window.originalSet.call(this,k,v);};}
          document.querySelector('[data-action=activate]').click();
        },fault);
        await until(()=>document.getElementById('activationFeedback').dataset.state==='error');
        assert.equal(await b.eval(()=>JSON.parse(localStorage.getItem('safePermitSubmittedPermits'))[0].status),'Approved');
        assert.match(await b.eval(()=>document.getElementById('activationFeedback').textContent),/Unable to update/);
        assert.equal(await b.eval(()=>document.activeElement.id),'activationFeedback');
        if(fault==='storage')await b.eval(()=>Storage.prototype.setItem=window.originalSet);
      }
    });
    await t.test('activation pending/error/recheck and successful local update have distinct feedback',async()=>{
      await admin();
      await b.eval(()=>{window.originalReview=SafePermitWorkflow;window.SafePermitWorkflow={...SafePermitWorkflow,getReview:async()=>{throw Error('Review unavailable');}};document.querySelector('[data-action=recheck]').click();});
      await until(()=>document.querySelector('[data-readiness]').dataset.state==='error');
      assert.match(await b.eval(()=>document.querySelector('[data-readiness]').textContent),/Retry/);
      await b.eval(()=>{window.SafePermitWorkflow=window.originalReview;document.querySelector('[data-action=recheck]').click();});
      await until(()=>document.querySelector('[data-readiness]').dataset.state==='ready');
      await b.eval(()=>document.querySelector('[data-action=activate]').click());
      await until(()=>JSON.parse(localStorage.getItem('safePermitSubmittedPermits'))[0].status==='Active');
      assert.match(await b.eval(()=>document.getElementById('activationFeedback').textContent),/saved locally/);
    });
    await t.test('Controlled Resume presents evidence first and requires an explicit consequential decision',async()=>{
      const p=await stopped({resumeRequest:{status:'Pending HSE Review',reason:'Gas test verified',createdAt:'2026-10-15T09:00:00.000Z'}});
      assert.equal(await b.eval(()=>document.getElementById('decision').value),'');
      assert.match(await b.eval(()=>document.getElementById('resumeEvidence').textContent),/Stopped|Active|Gas test verified|Supervisor|Safety|Admin/);
      assert.equal(await b.eval(()=>!!(document.getElementById('resumeEvidence').compareDocumentPosition(document.getElementById('decision'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);
      await edit({reviewer:'HSE QA reviewer',notes:'Verified controls'});
      await b.eval(()=>document.getElementById('submit').click());
      assert.equal(await b.eval(()=>document.activeElement.id),'decision');
      assert.equal(await b.eval(()=>document.getElementById('decision').getAttribute('aria-invalid')),'true');
      assert.deepEqual(await b.eval(()=>JSON.parse(localStorage.getItem('safePermitSubmittedPermits'))[0]),p);
      await edit({decision:'reject'});await b.eval(()=>document.getElementById('submit').click());
      await until(()=>document.getElementById('result').textContent.includes('HSE decision saved'));
      assert.equal(await b.eval(()=>JSON.parse(localStorage.getItem('safePermitSubmittedPermits'))[0].status),'Stopped');
      assert.equal(await b.eval(()=>document.getElementById('decision').value),'');
      assert.match(await b.eval(()=>document.getElementById('resumeTimeline').textContent),/HSE resumption review|Reject|HSE QA reviewer|Verified controls/);
      assert.equal(await b.eval(()=>document.querySelectorAll('#resumeTimeline > li[data-audit-index]').length),1);
    });
    await t.test('request stays Stopped; HSE approval returns formerly Active work to Safety review',async()=>{
      await stopped();await edit({reason:'Verified mitigation'});await b.eval(()=>document.getElementById('request').click());
      await until(()=>document.getElementById('result').textContent.includes('Resume request saved'));
      assert.equal(await b.eval(()=>JSON.parse(localStorage.getItem('safePermitSubmittedPermits'))[0].status),'Stopped');
      await edit({reviewer:'HSE Lead',notes:'Controls verified',decision:'approve'});
      await b.eval(()=>document.getElementById('submit').click());
      await until(()=>document.getElementById('result').textContent.includes('HSE decision saved'));
      assert.equal(await b.eval(()=>JSON.parse(localStorage.getItem('safePermitSubmittedPermits'))[0].status),'Pending Safety Review');
      assert.match(await b.eval(()=>document.getElementById('resumeTimeline').textContent),/Pending Safety Review/);
    });
    await t.test('open Stop-Work and other evidence blockers remain authoritative and failures retain input',async()=>{
      await stopped({}, {'safepermit:safety-suite:v1:stopworks':[{id:'S-QA',permitId:'PTW-8801',title:'Open gas alarm',status:'Stopped'}]});
      await edit({reason:'Unverified test'});await b.eval(()=>document.getElementById('request').click());
      await until(()=>document.getElementById('result').dataset.state==='error');
      assert.match(await b.eval(()=>document.getElementById('result').textContent),/must be closed/);
      assert.equal(await b.eval(()=>document.getElementById('reason').value),'Unverified test');
      await stopped({resumeRequest:{status:'Pending HSE Review',reason:'Controls'}},{'safepermit:safety-suite:v1:gates':[{id:'G-QA',permitId:'PTW-8801',title:'Gas test',status:'Open'}]});
      await edit({reviewer:'HSE',notes:'Evidence text',decision:'approve'});await b.eval(()=>document.getElementById('submit').click());
      await until(()=>document.getElementById('result').dataset.state==='error');
      assert.match(await b.eval(()=>document.getElementById('result').textContent),/Cannot resume/);
      assert.equal(await b.eval(()=>JSON.parse(localStorage.getItem('safePermitSubmittedPermits'))[0].status),'Stopped');
      assert.equal(await b.eval(()=>document.getElementById('notes').value),'Evidence text');
    });
    await t.test('audit timeline maps exact stored event order and safely renders unfamiliar evidence fields',async()=>{
      const audit=[{type:'STOP_RECORDED',at:'2026-10-14T09:00:00Z',notes:'<img src=x onerror=alert(1)>',evidence:{reference:'GAS-17'}},{type:'RESUME_REVIEW',action:'reject',from:'Stopped',to:'Stopped',reviewer:'HSE Lead',notes:'Test not verified',at:'2026-10-15T09:00:00Z'}];
      await stopped({auditTrail:audit});
      const items=await b.eval(()=>[...document.querySelectorAll('#resumeTimeline > li')].map(li=>li.textContent));
      assert.equal(items.length,2);assert.match(items[0],/GAS-17/);assert.match(items[0],/<img src=x/);assert.match(items[1],/HSE Lead/);
      assert.equal(await b.eval(()=>document.querySelectorAll('#resumeTimeline img').length),0);
      assert.deepEqual(await b.eval(()=>JSON.parse(localStorage.getItem('safePermitSubmittedPermits'))[0].auditTrail),audit);
    });
    await t.test('failed resume writes keep Stop-Work, request evidence, notes and audit unchanged',async()=>{
      for(const action of ['request','decision']) {
        const p=await stopped(action==='decision'?{resumeRequest:{status:'Pending HSE Review',reason:'Verified controls'}}:{});
        await edit({reason:'Mitigation text',reviewer:'HSE Lead',notes:'Review text',decision:'approve'});
        await b.eval(action=>{
          window.originalSet=Storage.prototype.setItem;
          Storage.prototype.setItem=function(k,v){if(k==='safePermitSubmittedPermits')throw Error('Write blocked');return window.originalSet.call(this,k,v);};
          document.getElementById(action==='request'?'request':'submit').click();
        },action);
        await until(()=>document.getElementById('result').dataset.state==='error');
        assert.deepEqual(await b.eval(()=>JSON.parse(localStorage.getItem('safePermitSubmittedPermits'))[0]),p);
        assert.equal(await b.eval(()=>document.getElementById('notes').value),'Review text');
        assert.match(await b.eval(()=>document.getElementById('result').textContent),/Action rejected/);
        await b.eval(()=>Storage.prototype.setItem=window.originalSet);
      }
    });
    await t.test('resume actions cannot duplicate a pending write; successful save and refresh failure stay distinct',async()=>{
      await stopped();await edit({reason:'Verified mitigation'});
      await b.eval(()=>{
        const original=SafePermitWorkflow;window.requestCalls=0;
        window.SafePermitWorkflow={...original,requestResume:async(...args)=>{
          window.requestCalls++;await new Promise(resolve=>window.finishRequest=resolve);
          const result=await original.requestResume(...args);
          window.SafePermitData={...SafePermitData,repository:{...SafePermitData.repository,getPermit:async()=>{throw Error('Read failure after save');}}};return result;
        }};
        document.getElementById('request').click();document.getElementById('request').onclick();
      });
      assert.equal(await b.eval(()=>window.requestCalls),1);
      assert.equal(await b.eval(()=>document.getElementById('request').disabled),true);
      await b.eval(()=>window.finishRequest());
      await until(()=>document.getElementById('result').textContent.includes('refresh failed'));
      assert.match(await b.eval(()=>document.getElementById('result').textContent),/saved locally/);
      assert.equal(await b.eval(()=>JSON.parse(localStorage.getItem('safePermitSubmittedPermits'))[0].resumeRequest.status),'Pending HSE Review');
      assert.equal(await b.eval(()=>JSON.parse(localStorage.getItem('safePermitSubmittedPermits'))[0].status),'Stopped');
    });
    await t.test('affected screens support mobile, keyboard, EN/AR, themes, reduced motion and Phase 2 context/QR',async()=>{
      for(const lang of ['en','ar'])for(const theme of ['light','dark'])for(const width of [320,390,768,1440]) {
        await b.command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});
        await b.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
        await seed({safePermitLanguage:lang,safePermitTheme:theme,safePermitSubmittedPermits:[{...permit('PTW-8801','Stopped'),previousStatusBeforeStop:'Active'}]});
        for(const route of [basic,'/admin/active-permits/?q=8801','/safety/controlled-resume/?id=PTW-8801&returnTo='+encodeURIComponent('/safety/review-queue/?q=8801')]) {
          await b.eval(route=>{const records=JSON.parse(localStorage.getItem('safePermitSubmittedPermits'));records[0].status=route.startsWith('/admin/')?'Approved':'Stopped';localStorage.setItem('safePermitSubmittedPermits',JSON.stringify(records));},route);
          await b.goto(route);await b.delay(100);
          if(route.startsWith('/admin/')) {
            await until(()=>document.querySelector('[data-readiness]')?.dataset.state==='ready');
            assert.equal(await b.eval(()=>/[\u0600-\u06ff]/.test(document.querySelector('[data-readiness] h4').textContent)),lang==='ar');
          }
          const result=await b.eval(()=>({overflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),lang:document.documentElement.lang,dir:document.documentElement.dir,theme:document.documentElement.dataset.theme}));
          assert.equal(result.overflow,0,JSON.stringify({route,width,lang,theme,result}));assert.equal(result.lang,lang);assert.equal(result.dir,lang==='ar'?'rtl':'ltr');assert.equal(result.theme,theme);assert.deepEqual(b.errors,[]);
          if(route===basic)assert.equal(await b.eval(()=>/[\u0600-\u06ff]/.test(document.getElementById('attachmentRetention').textContent)),lang==='ar');
          if(route.startsWith('/safety/controlled')) {
            assert.equal(await b.eval(()=>document.getElementById('decision').value),'');
            assert.equal(await b.eval(()=>/[\u0600-\u06ff]/.test(document.getElementById('resumeEvidenceTitle').textContent)),lang==='ar');
            const target=new URL(await b.eval(()=>document.querySelector('#resumeEvidence a').href));
            assert.equal(target.searchParams.get('id'),'PTW-8801');assert.equal(target.hash,'#stopworks');
            assert.match(target.searchParams.get('returnTo'),/safety\/review-queue\/\?q=8801/);
          }
          evidence.push({route,width,...result,exceptions:[...b.errors]});
        }
      }
    });
    if(process.env.PHASE3_EVIDENCE)fs.writeFileSync(process.env.PHASE3_EVIDENCE,JSON.stringify(evidence,null,2)+'\n');
  } finally { await b.close(); }
});
