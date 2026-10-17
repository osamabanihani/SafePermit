// Authentication experience. v13.8 introduced the shared auth design system and the explicit login/reset states;
// v13.9 (owner request) replaced "The Living Permit" and "The SafePermit Seal" with one shared WebGL worksite.
// The behaviour contracts below (validation, single navigation, booleans-only scene, honest copy) are unchanged.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const en=JSON.parse(read('shared/locales/en.json')),ar=JSON.parse(read('shared/locales/ar.json'));
const authCss=read('auth/auth.css'),siteCss=read('auth/worksite/worksite.css'),loginCss=read('auth/login/login.css'),resetCss=read('auth/reset-password/reset-password.css');

test('both pages share the auth styles and the worksite, local scripts only, after the site styles',()=>{
 for(const p of ['auth/login/index.html','auth/reset-password/index.html']){
  const h=read(p);const a=h.indexOf('shared/css/shared.css'),b=h.indexOf('../auth.css'),w=h.indexOf('../worksite/worksite.css'),c=h.search(/(login|reset-password)\.css/);
  assert.ok(a>0&&a<b&&b<w&&w<c,p+' loads shared.css, auth.css, worksite.css, then its own stylesheet');
  const t=h.indexOf('assets/vendor/three/three-0.186.1.min.js'),s=h.indexOf('../worksite/worksite-scene.js'),d=h.search(/(login|reset)-scene\.js/);
  assert.ok(t>0&&t<s&&s<d,p+' loads the bundled Three.js, the shared scene, then the page adapter');
  assert.match(h,/<div class="spw-scene" data-spw-scene>\s*<img class="spw-fallback" src="\.\.\/\.\.\/assets\/images\/auth\/worksite-static\.webp" alt="" aria-hidden="true"/,p+' has the static fallback');
  assert.ok(!/https?:\/\//.test(h.replace(/<meta[^>]*>/g,'')),p+' has no remote dependencies');
  assert.ok(!/<script>(?!<\/script>)/.test(h),p+' has no inline scripts');
  assert.ok(!/auth-helmet|reset-seal|spg-arming|spg-stub|spg-tear|worksite-preview/.test(h),p+' carries nothing from the replaced concepts or the prototype');
 }
 assert.ok(fs.existsSync(path.join(root,'assets/images/auth/worksite-static.webp')));
 for(const gone of ['auth/auth-helmet.js','auth/reset-password/reset-seal.js','auth/worksite-preview'])assert.ok(!fs.existsSync(path.join(root,gone)),gone+' removed');
 for(const t of ['--spg-studio:','--spg-studio-2:','--spg-paper:','--spg-paper-2:','--spg-ink:','--spg-text:','--spg-muted:','--spg-accent:'])assert.ok(authCss.includes(t),t);
 assert.match(authCss,/html\[data-theme="dark"\] \.spg \{/,'dark overrides preserved');
});

test('identity: existing fonts and tokens only — no new fonts, imports, serif, metallic gold or purple neon',()=>{
 for(const [name,css] of [['auth.css',authCss],['worksite.css',siteCss],['login.css',loginCss],['reset-password.css',resetCss]]){
  assert.ok(!/@font-face|@import|fonts\.googleapis/.test(css),name+' adds no fonts');
  const families=[...css.matchAll(/font-family:\s*([^;]+);/g)].map(m=>m[1].trim());
  assert.ok(families.every(f=>/^var\(--font-(display|arabic)\)$/.test(f)),name+' uses only the existing font tokens: '+families.join(', '));
  assert.ok(!/serif|Georgia|Times/i.test(css.replace(/sans-serif/g,'')),name+' no serif');
  assert.ok(!/#(c9a227|d4af37|b8860b|daa520|caa45d|bf953f|8a2be2|9d4edd|b026ff)/i.test(css),name+' no metallic gold or purple neon');
 }
 assert.ok(!/#ff9b51/i.test(siteCss+loginCss+resetCss),'the accent is referenced through --spg-accent, not duplicated');
 const w=read('auth/worksite/worksite-scene.js');
 assert.match(w,/tokenFrom\(host, "--spg-accent"/,'the scene takes its accent from the page token');
 assert.match(w,/token\("--color-success"/);assert.match(w,/token\("--color-danger"/);
});

test('entrance: about 1.0–1.3 s, the form is never hidden or delayed',()=>{
 const w=read('auth/worksite/worksite-scene.js');
 const ent=w.slice(w.indexOf('function entrance('),w.indexOf('function moveRoute('));
 const ends=[...ent.matchAll(/tween\((\d+), k => [^\n]*?\}\)?(?:, (\d+)(?: \+ i \* (\d+))?)?(?:, \(\) => \{[^}]*\})?\)\)?;/g)].map(m=>+m[1]+(+m[2]||0)+(m[3]?4*m[3]:0));
 const total=Math.max(...ends);
 assert.ok(total>=1000&&total<=1300,'entrance '+total+'ms');
 assert.match(ent,/if \(reduced\) \{ settle\(\); return; \}/,'reduced motion: final state at once');
 assert.ok(!/\.spw-card[^{]*\{[^}]*(opacity: 0|visibility: hidden)/.test(siteCss),'the form card is never hidden');
});

test('success: gate, route and camera within 650–900 ms, one callback, instant with reduced motion',()=>{
 const w=read('auth/worksite/worksite-scene.js');
 const c=w.slice(w.indexOf('complete(done) {'),w.indexOf('// Back to the resting site'));
 const tw=[...c.matchAll(/tween\((\d+), k => [^\n]*?\}?\)?, ?(\d+)?(?:, finish)?\);/g)].map(m=>+m[1]+(+m[2]||0));
 const rt=[...c.matchAll(/moveRoute\(1\.02, (\d+), (\d+)\)/g)].map(m=>+m[1]+ +m[2]);
 const total=Math.max(...tw,...rt);
 assert.ok(total>=650&&total<=900,'success '+total+'ms');
 assert.match(c,/if \(called\) return; called = true;/,'done runs once');
 assert.match(c,/if \(reduced\) \{[^\n]*finish\(\); return; \}/,'reduced motion: no delay');
 assert.match(c,/gateAngle = 1\.35/,'the gate opens');
 assert.match(c,/const end = successPose\(\);/,'the camera move is framed so tank T-01 stays in view');
 assert.match(w,/function successPose\(\)[\s\S]*overflow\(pose\) <= \.985/);
});

test('login.js: explicit states and a single navigation guard',()=>{
 const s=read('auth/login/login.js');
 for(const st of ['"idle"','"editing"','"invalid"','"submitting"','"success"'])assert.ok(s.includes(st),st);
 assert.match(s,/if \(navigated\) return;\s*navigated = true;/);
 assert.match(s,/const locked = \(\) => state === "submitting" \|\| state === "success";/);
 assert.ok(!/setTimeout|setInterval/.test(s));
});

// The reset page in a small DOM: just what reset-password.js touches.
function loadReset(search){
 class El{constructor(id){this.id=id;this.attrs={};this.cls=new Set();this.listeners={};this.textContent='';this.value='';this.disabled=false;this.type='password';this.parent=null;this.children=[];const self=this;
  this.classList={add:c=>self.cls.add(c),remove:c=>self.cls.delete(c),contains:c=>self.cls.has(c),toggle:(c,f)=>{const on=f===undefined?!self.cls.has(c):!!f;on?self.cls.add(c):self.cls.delete(c);return on;}};}
  set className(v){this.cls=new Set(String(v).split(/\s+/).filter(Boolean));}get className(){return [...this.cls].join(' ');}
  add(c){c.parent=this;this.children.push(c);return c;}setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return k in this.attrs?this.attrs[k]:null;}removeAttribute(k){delete this.attrs[k];}
  addEventListener(t,fn){(this.listeners[t]=this.listeners[t]||[]).push(fn);}fire(t){const ev={type:t,target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};(this.listeners[t]||[]).forEach(fn=>fn(ev));return ev;}
  matches(sel){if(sel.startsWith('.'))return this.cls.has(sel.slice(1));if(sel==='[type="submit"]')return this.attrs.type==='submit';if(sel==='[data-spr-toggle]')return 'data-spr-toggle' in this.attrs;return false;}
  closest(sel){let n=this;while(n){if(n.matches(sel))return n;n=n.parent;}return null;}all(){return this.children.flatMap(c=>[c,...c.all()]);}
  querySelector(sel){return this.all().find(n=>n.matches(sel))||null;}querySelectorAll(sel){return this.all().filter(n=>n.matches(sel));}focus(){doc.activeElement=this;}}
 const doc={activeElement:null};
 const form=new El('resetForm');const byId={resetForm:form};
 for(const id of ['newPassword','confirmPassword']){const f=form.add(new El('f-'+id));f.classList.add('auth-field');byId[id]=f.add(new El(id));}
 for(const id of ['ruleLength','ruleUpper','ruleNumber','ruleMatch']){const li=form.add(new El(id));const s=li.add(new El(id+'-state'));s.classList.add('spr-rule__state');s.textContent='Requirement not met';byId[id]=li;}
 const submit=form.add(new El('submit'));submit.attrs.type='submit';
 for(const id of ['resetRoleLabel','resetTitle','resetDescription','resetMessage','resetRulesLive'])byId[id]=new El(id);
 Object.assign(doc,{getElementById:id=>byId[id]||null});
 // Closures, not `this`: reset-password.js merges the scene into its own defaults with Object.assign.
 const nav=[];const updates=[],completes=[],typing=[],flagged=[];
 const scene={updates,completes,typing,get flags(){return flagged.length;},update(f){updates.push(JSON.parse(JSON.stringify(f)));},complete(done){completes.push(done);},flag(){flagged.push(1);},setTyping(on){typing.push(on);},reset(){}};
 const store=new Map();const win={};
 const ctx={document:doc,console,Array,Object,String,JSON,URLSearchParams,
  location:{search:search||'?role=worker',set href(u){nav.push(u);}},
  localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))},
  SafePermitResetScene:scene,addEventListener:(t,fn)=>{(win[t]=win[t]||[]).push(fn);}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(read('auth/reset-password/reset-password.js'),ctx);
 const type=(id,v)=>{byId[id].value=v;byId[id].fire('input');};
 return {byId,form,submit,scene,nav,store,type};
}

test('password setup: the worksite follows only validation booleans; sections return when a rule fails again',()=>{
 const R=loadReset();
 R.type('newPassword','abcdefgh');
 assert.deepEqual(R.scene.updates.at(-1),{length:true,upper:false,number:false,match:false});
 assert.ok(R.byId.ruleLength.classList.contains('is-valid'));
 assert.equal(R.byId.ruleLength.children[0].textContent,'Requirement met');
 R.type('newPassword','Abcdefg1');R.type('confirmPassword','Abcdefg1');
 assert.deepEqual(R.scene.updates.at(-1),{length:true,upper:true,number:true,match:true});
 assert.equal(R.byId.resetRulesLive.textContent,'Passwords match.');
 R.type('newPassword','abcdefg1');
 assert.deepEqual(R.scene.updates.at(-1),{length:true,upper:false,number:true,match:false},'the plate lifts out and the route disconnects');
 assert.equal(R.byId.ruleUpper.children[0].textContent,'Requirement not met');
 assert.equal(R.byId.resetRulesLive.textContent,'','nothing stale is left to announce');
 // Every update is a flat object of booleans: nothing derived from the password reaches the scene.
 for(const u of R.scene.updates)assert.ok(Object.values(u).every(v=>typeof v==='boolean')&&Object.keys(u).sort().join()==='length,match,number,upper');
 for(const f of ['auth/reset-password/reset-scene.js','auth/worksite/worksite-scene.js'])
  assert.ok(!/\.value\b|localStorage|sessionStorage|newPassword|confirmPassword/.test(read(f).replace(/\bu[A-Z]\w*\.value\b/g,'')),f+' never reads or stores the password (shader uniforms aside)');
 R.byId.newPassword.fire('focus');R.byId.newPassword.fire('blur');
 assert.deepEqual(R.scene.typing,[true,false],'the camera ignores the pointer while typing');
});

test('password setup: same policy and messages; success completes once, navigates once, never stores the password',()=>{
 const R=loadReset();
 R.type('newPassword','short');R.form.fire('submit');
 assert.equal(R.byId.resetMessage.textContent,'Use at least 8 characters with an uppercase letter and a number.');
 assert.equal(R.form.getAttribute('data-state'),'invalid');
 assert.equal(R.byId.newPassword.getAttribute('aria-invalid'),'true');
 assert.equal(R.scene.flags,1,'invalid: a subtle indicator change, the gate stays closed');
 R.type('newPassword','Abcdefg1');R.type('confirmPassword','Abcdefg2');R.form.fire('submit');
 assert.equal(R.byId.resetMessage.textContent,'Passwords do not match.');
 assert.equal(R.byId.confirmPassword.getAttribute('aria-invalid'),'true');
 assert.equal(R.scene.completes.length,0,'nothing completes before a successful save');
 R.type('confirmPassword','Abcdefg1');
 R.form.fire('submit');R.form.fire('submit');
 assert.equal(R.scene.completes.length,1,'one completion however often the form is submitted');
 assert.equal(R.byId.resetMessage.textContent,'Password saved for this frontend demo.');
 assert.deepEqual(R.nav,[],'navigation waits for the scene');
 R.scene.completes[0]();R.scene.completes[0]();
 assert.deepEqual(R.nav,['../../worker/dashboard/']);
 assert.equal(R.store.get('safePermitPasswordReady:worker'),'true');
 assert.ok(![...R.store.values()].some(v=>/Abcdefg/.test(v)),'the password is never stored');
 const F=loadReset('?mode=forgot');
 assert.equal(F.byId.resetTitle.textContent,'Reset your password');
 F.type('newPassword','Abcdefg1');F.type('confirmPassword','Abcdefg1');F.form.fire('submit');F.scene.completes[0]();
 assert.deepEqual(F.nav,['../login/'],'without a role the demo returns to sign-in');
 const s=read('auth/reset-password/reset-password.js');
 assert.ok(!/setTimeout|setInterval/.test(s),'navigation follows the scene, not a timer');
});

test('password setup page: honest captions, preserved ids, reduced motion',()=>{
 const h=read('auth/reset-password/index.html');
 assert.match(h,/Setting a password does not grant a role or approve a work permit\./);
 assert.match(h,/The password is not sent anywhere or stored/);
 assert.ok(!/securely saved|verified|encrypted/i.test(h),'no false security claims');
 for(const id of ['resetForm','newPassword','confirmPassword','ruleLength','ruleUpper','ruleNumber','ruleMatch','resetMessage','resetRoleLabel','resetTitle','resetDescription','resetDemoNote'])assert.ok(h.includes('id="'+id+'"'),id);
 assert.match(h,/<form[^>]*aria-describedby="resetDemoNote"/);
 assert.match(authCss,/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.spg \*,[\s\S]*animation: none !important/,'reduced motion in CSS');
});

test('locales: every phrase on both pages has an Arabic translation',()=>{
 const runtime=['Password setup','Password Setup','Signing in as',
  'Each requirement you meet places one section of the walkway, and a matching confirmation connects the route to the platform. Setting a password does not grant a role or approve a work permit.',
  'Frontend demonstration. The password is not sent anywhere or stored; this browser only remembers that setup was completed.',
  'At least 8 characters','At least one uppercase letter','At least one number','Both passwords match','Requirement met','Requirement not met',
  'Passwords match.','All password requirements are met.','Passwords do not match.','Password saved for this frontend demo.','Create your password','Reset your password'];
 for(const p of runtime){assert.ok(!(p in en.runtime)||en.runtime[p]===p,'en '+p);assert.ok(ar.runtime[p]&&/[؀-ۿ]/.test(ar.runtime[p]),'ar '+p);}
 for(const k of ['enter_workspace','workspace_intro','safepermit_access','demo_notice','demo_badge'])assert.ok(en.strings['auth.login.'+k]&&/[؀-ۿ]/.test(ar.strings['auth.login.'+k]),k);
 for(const p of ['Simulate success','Replay entrance','Prototype preview controls — no sign-in is performed'])assert.ok(!(p in en.runtime),'prototype-only phrase removed: '+p);
});
