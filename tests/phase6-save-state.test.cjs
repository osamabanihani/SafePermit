const test = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path');
const {launch} = require('./helpers/browser.cjs');
test('Phase 6 Risk and Checklist truthful persistence states', {timeout:120000}, async t => {
  const b = await launch(path.resolve(__dirname, '..'));
  let allowNavigation = true, unloads = 0;
  b.on('Page.javascriptDialogOpening',event => {if(event.params.type==='beforeunload')unloads++;b.command('Page.handleJavaScriptDialog',{accept:allowNavigation}).catch(()=>{});});
  try {
    await b.goto('/auth/login/');
    for (const [page, key, button, selector] of [
      ['risk-assessment','safePermitDraftRiskAssessment','saveRiskDraft','.control-measures'],
      ['safety-checklist','safePermitDraftSafetyChecklist','saveChecklistDraft','textarea']
    ]) await t.test(page + ': success, dirty, quota failure, retained input and retry', async () => {
      await b.goto('/auth/login/'); await b.eval(() => localStorage.clear());
      await b.goto('/worker/create-permit/' + page + '/');
      if (page === 'risk-assessment') await b.eval(() => document.getElementById('addHazardButton').click());
      await b.eval(button => document.getElementById(button).click(), button);
      const before = await b.eval(key => localStorage.getItem(key), key);
      assert.ok(before);
      await b.eval(selector => {const e=document.querySelector(selector);e.value='Changed unsaved controls';e.dispatchEvent(new Event('input',{bubbles:true}));}, selector);
      await b.eval(([key,button]) => {
        window.originalWrite = Storage.prototype.setItem;
        Storage.prototype.setItem = function(k,v) {if(k===key){window.stateAtWrite=document.getElementById('formMessage').dataset.saveState;throw new DOMException('Quota','QuotaExceededError');}return originalWrite.call(this,k,v);};
        document.getElementById(button).click();
      }, [key,button]);
      const state = await b.eval(([key,selector]) => ({raw:localStorage.getItem(key),text:document.getElementById('formMessage').textContent,
        success:document.getElementById('formMessage').classList.contains('is-success'),state:document.getElementById('formMessage').dataset.saveState,
        role:document.getElementById('formMessage').getAttribute('role'),value:document.querySelector(selector).value}), [key,selector]);
      assert.equal(state.success,false,'failed save must replace stale green success');
      assert.equal(await b.eval(()=>window.stateAtWrite),'saving');
      assert.equal(state.state,'failed'); assert.match(state.text,/retry/i); assert.equal(state.role,'alert');
      assert.equal(state.raw,before); assert.equal(state.value,'Changed unsaved controls'); assert.deepEqual(b.errors,[]);
      await b.eval(button => {Storage.prototype.setItem=originalWrite;document.getElementById(button).click();},button);
      assert.equal(await b.eval(()=>document.getElementById('formMessage').dataset.saveState),'saved');
      // Populate a valid Continue path, then fail its required persistence.
      await b.eval(page => {
        if(page==='risk-assessment') {
          const fields={'.hazard-name':'Unsafe energy','.control-measures':'Verified isolation','.initial-likelihood':'3','.initial-severity':'4','.residual-likelihood':'1','.residual-severity':'4'};
          for(const [selector,value]of Object.entries(fields)){const e=document.querySelector(selector);e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));}
        } else {document.querySelectorAll('input[type=radio][value=yes]').forEach(e=>e.click());document.getElementById('workerConfirmation').checked=true;}
      },page);
      const savedBytes=await b.eval(key=>localStorage.getItem(key),key);
      await b.eval(key => {Storage.prototype.setItem=function(k,v){if(k===key)throw Error('Quota');return originalWrite.call(this,k,v);};document.querySelector('main form').requestSubmit();},key);
      await b.delay(850);
      assert.equal(await b.eval(()=>document.getElementById('formMessage').dataset.saveState),'failed');
      assert.ok((await b.eval(()=>location.pathname)).includes(page));
      assert.equal(await b.eval(key=>localStorage.getItem(key),key),savedBytes);
      await b.eval(()=>{Storage.prototype.setItem=originalWrite;});
      // A trusted edit makes the native beforeunload guard observable.
      if(page==='safety-checklist') await b.eval(()=>document.querySelector('input[type=radio][value=no]').click());
      await b.eval(selector=>document.querySelector(selector).focus(),selector);
      await b.command('Input.insertText',{text:' still unsaved'});
      assert.equal(await b.eval(()=>document.getElementById('formMessage').dataset.saveState),'unsaved');
      allowNavigation=false;const oldUnloads=unloads;
      const target=await b.eval(()=>new URL('/worker/dashboard/',location.href).href);
      await b.command('Page.navigate',{url:target});await b.delay(250);
      assert.equal(unloads,oldUnloads+1);assert.ok((await b.eval(()=>location.pathname)).includes(page));
      assert.equal(await b.eval(key=>localStorage.getItem(key),key),savedBytes);
      allowNavigation=true;
      await b.eval(button=>document.getElementById(button).click(),button);
      assert.notEqual(await b.eval(key=>localStorage.getItem(key),key),before);
      await b.eval(button=>document.getElementById(button).click(),button);
      assert.equal(await b.eval(()=>document.getElementById('formMessage').dataset.saveState),'saved');
      // Editing during Continue cancels its delayed navigation.
      await b.eval(page=>{
        if(page==='safety-checklist'){document.querySelectorAll('input[type=radio][value=yes]').forEach(e=>e.click());document.getElementById('workerConfirmation').checked=true;}
        document.querySelector('main form').requestSubmit();
        const e=document.querySelector(page==='risk-assessment'?'.control-measures':'input[type=radio][value=no]');
        if(page==='risk-assessment'){e.value='New edits after saving';e.dispatchEvent(new Event('input',{bubbles:true}));}else e.click();
      },page);
      await b.delay(900);
      assert.ok((await b.eval(()=>location.pathname)).includes(page));
      assert.equal(await b.eval(()=>document.getElementById('formMessage').dataset.saveState),'unsaved');
    });
    for(const page of ['risk-assessment','safety-checklist'])await t.test(page+': read exceptions are visible and contained',async()=>{
      await b.goto('/auth/login/');
      const {identifier}=await b.command('Page.addScriptToEvaluateOnNewDocument',{source:`const originalGet=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k==='${page==='risk-assessment'?'safePermitDraftRiskAssessment':'safePermitDraftSafetyChecklist'}')throw Error('Unavailable storage');return originalGet.call(this,k);};`});
      try {await b.goto('/worker/create-permit/'+page+'/');assert.equal(await b.eval(()=>document.getElementById('formMessage').dataset.saveState),'failed');assert.deepEqual(b.errors,[]);}
      finally {await b.command('Page.removeScriptToEvaluateOnNewDocument',{identifier});}
    });
  } finally {await b.close();}
});
