const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {launch}=require('./helpers/browser.cjs'),{decision,safety}=require('./qa-evidence-fixtures.cjs');
const values={permitType:'electrical',workTitle:'QA panel',description:'Inspect isolated panel',site:'factory-a',area:'electrical-room',startDate:'2099-10-20',startTime:'08:00',endDate:'2099-10-20',endTime:'12:00',supervisor:'sup-001',workerCount:'51'};
test('Phase 6 browser mutation boundaries and localized save feedback',{timeout:180000},async t=>{
 const b=await launch(path.resolve(__dirname,'..'));
 b.on('Page.javascriptDialogOpening',()=>{b.command('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});});
 async function seed(data={}) {await b.goto('/auth/login/');await b.eval(data=>{localStorage.clear();for(const[k,v]of Object.entries(data))localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));},data);}
 try {
  await b.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  for(const recovered of [false,true])await t.test((recovered?'recovered':'direct')+' invalid draft cannot submit',async()=>{
   const s=safety('PTW-X');await seed({safePermitDraftBasicInfo:values,safePermitDraftRiskAssessment:s.riskAssessment,safePermitDraftSafetyChecklist:s.safetyChecklist});
   if(recovered){await b.goto('/worker/create-permit/basic-info/');await b.eval(()=>document.getElementById('recoverDraft').click());assert.equal(await b.eval(()=>document.getElementById('workerCount').value),'51');await b.eval(()=>document.getElementById('saveDraftButton').click());}
   await b.goto('/worker/create-permit/review-submit/');await b.eval(()=>{document.getElementById('submitConfirmation').checked=true;document.getElementById('submitPermitButton').click();});
   assert.equal(await b.eval(()=>localStorage.getItem('safePermitSubmittedPermits')),null);
   assert.equal(await b.eval(()=>document.activeElement.id),'reviewMessage');
   assert.equal(await b.eval(()=>document.querySelector('#reviewMessage a').getAttribute('href')),'../basic-info/#workerCount');
  });
  await t.test('Admin readiness and activation reject invalid current metadata',async()=>{
   const id='PTW-8806',p={id,status:'Approved',basicInfo:values,...safety(id),supervisorDecision:decision(id,'supervisor'),safetyDecision:decision(id,'safety'),adminDecision:decision(id,'admin')};
   await seed({safePermitSubmittedPermits:[p]});await b.command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
   await b.goto('/admin/active-permits/?q='+id);await b.delay(300);
   assert.equal(await b.eval(()=>document.querySelector('[data-readiness]').dataset.state),'blocked');
   const before=await b.eval(()=>localStorage.getItem('safePermitSubmittedPermits'));
   await b.eval(()=>document.querySelector('[data-action=activate]').click());await b.delay(200);
   assert.equal(await b.eval(()=>localStorage.getItem('safePermitSubmittedPermits')),before);
   assert.match(await b.eval(()=>document.getElementById('activationFeedback').textContent),/Basic Info/);
  });
  for(const page of ['risk-assessment','safety-checklist'])for(const lang of ['en','ar'])for(const theme of ['light','dark'])for(const width of [375,1440])await t.test(`${page} ${lang} ${theme} ${width}: keyboard save and localized live failure`,async()=>{
   await seed({safePermitLanguage:lang,safePermitTheme:theme});await b.command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});
   await b.goto('/worker/create-permit/'+page+'/');
   await b.eval(page=>{const key=page==='risk-assessment'?'safePermitDraftRiskAssessment':'safePermitDraftSafetyChecklist';const write=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error('Quota');return write.call(this,k,v);};document.getElementById(page==='risk-assessment'?'saveRiskDraft':'saveChecklistDraft').focus();},page);
   await b.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await b.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
   const result=await b.eval(()=>({state:document.getElementById('formMessage').dataset.saveState,text:document.getElementById('formMessage').textContent,role:document.getElementById('formMessage').getAttribute('role'),live:document.getElementById('formMessage').getAttribute('aria-live'),dir:document.documentElement.dir,overflow:document.documentElement.scrollWidth>innerWidth}));
   assert.equal(result.state,'failed');assert.equal(result.role,'alert');assert.equal(result.live,'assertive');assert.match(result.text,lang==='ar'?/أعد محاولة/:/retry/);assert.equal(result.dir,lang==='ar'?'rtl':'ltr');assert.equal(result.overflow,false);assert.deepEqual(b.errors,[]);
  });
 }finally{await b.close();}
});
