// v13.7 Safety Gate login, updated for v13.8 "The Living Permit": the demo sign-in stays honest and isolated; the
// scene is presentation only. v13.8 change (owner request): after a successful result the scene plays a short release
// (~0.55 s) and navigation happens in its callback, exactly once; no timers in login.js or the scene.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const plain=v=>JSON.parse(JSON.stringify(v));
const tick=()=>new Promise(r=>setImmediate(r));

function storage(){const m=new Map();return{m,getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}

function loadAuth(){
 const ctx={localStorage:storage(),Promise,Object,String};ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(read('auth/login/demo-auth.js'),ctx);
 return ctx;
}

// A very small DOM: just what auth/login/login.js touches.
class El{
 constructor(id,attrs={}){this.id=id;this.attrs={...attrs};this.cls=new Set();this.listeners={};this.textContent='';this.value='';this.disabled=false;this.hidden=false;this.type=attrs.type||'';this.dataset={};this.parent=null;this.children=[];
  const self=this;this.classList={add:(...c)=>c.forEach(x=>self.cls.add(x)),remove:(...c)=>c.forEach(x=>self.cls.delete(x)),contains:c=>self.cls.has(c),toggle:(c,f)=>{const on=f===undefined?!self.cls.has(c):!!f;on?self.cls.add(c):self.cls.delete(c);return on;}};}
 set className(v){this.cls=new Set(String(v).split(/\s+/).filter(Boolean));}
 get className(){return [...this.cls].join(' ');}
 add(child){child.parent=this;this.children.push(child);return child;}
 setAttribute(k,v){this.attrs[k]=String(v);}
 getAttribute(k){return k in this.attrs?this.attrs[k]:null;}
 removeAttribute(k){delete this.attrs[k];}
 hasAttribute(k){return k in this.attrs;}
 addEventListener(t,fn){(this.listeners[t]=this.listeners[t]||[]).push(fn);}
 fire(t,extra={}){const ev={type:t,target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},getModifierState:()=>false,...extra};(this.listeners[t]||[]).forEach(fn=>fn(ev));return ev;}
 matches(sel){if(sel.startsWith('.'))return this.cls.has(sel.slice(1));if(sel==='[data-demo-role]')return 'demoRole' in this.dataset;return false;}
 closest(sel){let n=this;while(n){if(n.matches(sel))return n;n=n.parent;}return null;}
 all(){return this.children.flatMap(c=>[c,...c.all()]);}
 querySelector(sel){return this.all().find(n=>n.matches(sel))||null;}
 querySelectorAll(sel){return this.all().filter(n=>n.matches(sel));}
 focus(){this.doc.activeElement=this;this.fire('focus');}
}

function loadLogin(){
 const doc={activeElement:null};
 const body=new El('body');
 const form=body.add(new El('loginForm'));
 const fEmail=form.add(new El('fe',{'data-spg-field':'email'}));fEmail.classList.add('auth-field');
 const email=fEmail.add(new El('email',{type:'email'}));
 const emailError=fEmail.add(new El('emailError'));
 const fPass=form.add(new El('fp',{'data-spg-field':'password'}));fPass.classList.add('auth-field');
 const password=fPass.add(new El('password',{type:'password'}));password.type='password';
 const passwordError=fPass.add(new El('passwordError'));
 const passwordToggle=fPass.add(new El('passwordToggle'));
 const capsLockWarning=fPass.add(new El('capsLockWarning'));
 const submit=form.add(new El('submit'));submit.classList.add('auth-submit');
 const authMessage=form.add(new El('authMessage'));
 const forgot=body.add(new El('forgotPasswordButton'));
 const demo=['worker','supervisor','safety','admin'].map(r=>{const b=body.add(new El('demo-'+r));b.dataset.demoRole=r;return b;});
 for(const n of body.all())n.doc=doc;
 const byId={loginForm:form,email,emailError,password,passwordError,passwordToggle,capsLockWarning,authMessage,forgotPasswordButton:forgot};
 Object.assign(doc,{getElementById:id=>byId[id]||null,querySelectorAll:sel=>body.querySelectorAll(sel)});
 const calls=[];const nav=[];const win={};
 const scene={};for(const k of ['focusField','blurField','flagField','setProcessing','setState','reset'])scene[k]=(...a)=>calls.push([k,...a]);
 const releases=[];scene.release=done=>{calls.push(['release']);releases.push(done);};
 const ctx={document:doc,console,Promise,Object,String,Array,Date,
  localStorage:storage(),sessionStorage:storage(),
  location:{assign:u=>nav.push(['assign',u]),set href(u){nav.push(['href',u]);}},
  SafePermitLoginScene:scene,addEventListener:(t,fn)=>{(win[t]=win[t]||[]).push(fn);}};
 ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(read('auth/login/demo-auth.js'),ctx);
 vm.runInContext(read('auth/login/login.js'),ctx);
 return {ctx,doc,form,email,password,emailError,passwordError,passwordToggle,submit,authMessage,forgot,demo,calls,nav,win,releases};
}

test('demo adapter: isolated contract, same roles and routes as v13.6, never inspects the password',async()=>{
 const ctx=loadAuth(),A=ctx.SafePermitDemoAuth;
 assert.equal(A.isDemo,true);
 assert.ok(Object.isFrozen(A));
 assert.deepEqual(plain(A.routes),{worker:'../../worker/dashboard/',supervisor:'../../supervisor/dashboard/',safety:'../../safety/dashboard/',admin:'../../admin/dashboard/'});
 for(const [email,role] of [['worker@demo.com','worker'],['SUPERVISOR@site.org','supervisor'],['safety.lead@x.io','safety'],['admin@x.io','admin'],['safety-admin@x.io','safety'],['worker-admin@x.io','worker']]){
  const r=await A.signIn(email,'anything');
  assert.deepEqual(plain(r),{ok:true,role,route:A.routes[role]},email);
  assert.equal(ctx.localStorage.getItem('safePermitCurrentRole'),role);
 }
 ctx.localStorage.m.clear();
 assert.deepEqual(plain(await A.signIn('jordan@example.com','secret1')),{ok:false,reason:'no-demo-role'});
 assert.equal(ctx.localStorage.getItem('safePermitCurrentRole'),null,'a failed demo sign-in stores nothing');
 assert.deepEqual(plain(A.quickRole('safety')),{ok:true,role:'safety',route:'../../safety/dashboard/'});
 assert.deepEqual(plain(A.quickRole('root')),{ok:false,reason:'unknown-role'});
 await A.signIn('worker@demo.com','my-real-password');
 assert.deepEqual([...ctx.localStorage.m.values()].filter(v=>/password/.test(v)),[],'the password is never stored');
 const src=read('auth/login/demo-auth.js');
 assert.ok(!/setTimeout|setInterval|fetch\(|XMLHttpRequest/.test(src),'resolves immediately, no network, no delay');
 assert.match(src,/FRONTEND DEMONSTRATION ONLY/);
});

test('login: invalid input shows accessible errors, flags the field, never navigates',async()=>{
 const L=loadLogin();
 const ev=L.form.fire('submit');
 assert.ok(ev.defaultPrevented);
 assert.equal(L.emailError.textContent,'Email address is required.');
 assert.equal(L.passwordError.textContent,'Password is required.');
 assert.equal(L.email.getAttribute('aria-invalid'),'true');
 assert.equal(L.authMessage.textContent,'Please correct the fields above.');
 assert.ok(L.authMessage.classList.contains('is-error'));
 assert.equal(L.doc.activeElement,L.email,'focus moves to the first invalid field');
 assert.ok(L.calls.some(c=>c[0]==='flagField'&&c[1]==='email'));
 L.email.value='not-an-email';L.password.value='12345';L.form.fire('submit');
 assert.equal(L.emailError.textContent,'Enter a valid email address.');
 assert.equal(L.passwordError.textContent,'Password must be at least 6 characters.');
 L.email.value='worker@demo.com';L.email.fire('input');
 assert.equal(L.emailError.textContent,'');assert.equal(L.email.getAttribute('aria-invalid'),null);
 await tick();
 assert.deepEqual(L.nav,[]);
 assert.ok(!L.calls.some(c=>c[0]==='release'));
 assert.equal(L.form.getAttribute('data-state'),'invalid','the password is still flagged');
 L.password.value='abcdef';L.password.fire('input');
 assert.equal(L.form.getAttribute('data-state'),'editing','once no field is flagged, the state returns to editing');
});

test('login: an address without a role word gets an honest demo message and no gateway',async()=>{
 const L=loadLogin();
 L.email.value='jordan@example.com';L.password.value='abcdef';
 L.form.fire('submit');await tick();
 assert.match(L.authMessage.textContent,/^Demo mode: no account is checked\./);
 assert.ok(L.authMessage.classList.contains('is-info'));
 assert.equal(L.submit.disabled,false,'the form is usable again');
 assert.ok(L.demo.every(b=>!b.disabled));
 assert.deepEqual(L.nav,[]);
 assert.ok(!L.calls.some(c=>c[0]==='release'));
});

test('login: a demo role plays the release, then navigates once from its callback',async()=>{
 const L=loadLogin();
 L.email.value='  Supervisor@Demo.com ';L.password.value='abcdef';
 L.form.fire('submit');
 L.form.fire('submit');
 await tick();
 L.form.fire('submit');
 await tick();
 assert.equal(L.releases.length,1,'one release, however often the form is submitted');
 assert.equal(L.form.getAttribute('data-state'),'success');
 assert.deepEqual(L.nav,[],'navigation waits for the release to finish');
 L.releases[0]();L.releases[0]();
 assert.deepEqual(L.nav,[['assign','../../supervisor/dashboard/']],'navigates exactly once');
 assert.equal(L.authMessage.textContent,'Demo sign-in: opening your workspace…');
 assert.doesNotMatch(L.authMessage.textContent,/approv|validat|verif|authori|secure/i);
 assert.equal(L.ctx.localStorage.getItem('safePermitCurrentRole'),'supervisor');
 assert.ok(Number(L.ctx.sessionStorage.getItem('safePermitGateArrival'))>0,'one-time cue for the dashboard entrance');
 // Back from the dashboard restores a usable form.
 L.win.pageshow.forEach(fn=>fn({persisted:true}));
 assert.equal(L.submit.disabled,false);assert.ok(L.calls.some(c=>c[0]==='reset'));
});

test('login: quick role buttons use the same release; forgot password keeps its route',()=>{
 const L=loadLogin();
 L.demo[3].fire('click');
 L.demo[1].fire('click');
 assert.equal(L.releases.length,1,'a second role button is ignored once released');
 L.releases[0]();
 assert.deepEqual(L.nav,[['assign','../../admin/dashboard/']]);
 assert.ok(L.demo.every(b=>b.disabled));
 assert.equal(L.ctx.localStorage.getItem('safePermitCurrentRole'),'admin');
 const F=loadLogin();F.forgot.fire('click');
 assert.deepEqual(F.nav,[['href','../reset-password/?mode=forgot']]);
});

test('login: password toggle keeps an accessible, translatable label',()=>{
 const L=loadLogin();
 L.passwordToggle.fire('click');
 assert.equal(L.password.type,'text');
 assert.equal(L.passwordToggle.getAttribute('aria-pressed'),'true');
 assert.equal(L.passwordToggle.getAttribute('aria-label'),'Hide password');
 assert.equal(L.passwordToggle.getAttribute('data-i18n-aria-label'),'auth.login.hide_password');
 L.passwordToggle.fire('click');
 assert.equal(L.password.type,'password');
 assert.equal(L.passwordToggle.getAttribute('data-i18n-aria-label'),'auth.login.show_password');
});

test('login.js: decides nothing about identity and has no timers, role loop or shake',()=>{
 const s=read('auth/login/login.js');
 assert.ok(!/setTimeout|setInterval/.test(s),'no artificial delays');
 assert.ok(!/includes\("(worker|supervisor|safety|admin)"\)/.test(s),'role inference lives only in demo-auth.js');
 assert.ok(!/localStorage\.setItem\("safePermitCurrentRole"/.test(s));
 assert.match(s,/auth\.signIn\(/);assert.match(s,/auth\.quickRole\(/);
 assert.ok(!/is-auth-error-motion|is-auth-role-live|roleLoop/.test(s));
});

test('page: labelled as a demo, accessible form, autofill-friendly, scripts in contract order',()=>{
 const h=read('auth/login/index.html');
 assert.match(h,/id="demoNotice"/);
 assert.match(h,/<form[^>]*aria-describedby="demoNotice"/);
 assert.match(h,/No identity is verified and no password is checked/);
 assert.match(h,/never a real password/);
 // v13.9: the permit band (SP-ACCESS · DEMO) is gone with the Living Permit; the demo notice above stays.
 assert.match(h,/<input[^>]*autocomplete="email"[^>]*id="email"[^>]*required/);
 assert.match(h,/<input[^>]*autocomplete="current-password"[^>]*id="password"[^>]*minlength="6"/);
 assert.match(h,/id="authMessage" role="status"/);
 assert.match(h,/aria-describedby="emailError"/);assert.match(h,/aria-describedby="passwordError"/);
 const order=['demo-auth.js','login-scene.js','login.js?'].map(f=>h.indexOf(f));
 assert.ok(order.every(i=>i>0)&&order[0]<order[1]&&order[1]<order[2],'adapter, then scene, then page logic');
 assert.ok(!/<script>(?!<\/script>)/.test(h),'no inline scripts');
 assert.ok(!/approved|verified successfully|secure login|authenticated/i.test(h.replace(/No identity is verified/,'')),'no false security claims');
});

test('scene: presentation only, no timers, reduced motion and the static fallback respected',()=>{
 // v13.9 (owner request): login-scene.js adapts the shared WebGL worksite; the form never depends on it.
 const s=read('auth/login/login-scene.js'),w=read('auth/worksite/worksite-scene.js');
 for(const [n,src] of [['login-scene.js',s],['worksite-scene.js',w]]){
  assert.ok(!/SafePermitDemoAuth|localStorage|sessionStorage|location\./.test(src),n+' never signs anyone in, stores anything or navigates');
  assert.ok(!/setTimeout|setInterval/.test(src),n+' no timers');
 }
 assert.match(s,/SafePermitWorksite\.attach\(host, "login"\)/);
 assert.match(s,/is-fallback/,'no scene: the static image is shown');
 assert.match(w,/prefers-reduced-motion: reduce/);
 assert.match(w,/e\.persisted/,'a page kept in the back/forward cache keeps its scene');
});

test('styles: no shake, no idle loops, autofill hook, reduced motion, release never claims approval',()=>{
 // v13.8: the shared authentication styles moved to auth/auth.css; login.css keeps the page-specific rules.
 const c=[read('auth/auth.css'),read('auth/login/login.css')].join(String.fromCharCode(10));
 assert.ok(!/auth-error-shake|is-auth-role-live|auth-grid-drift|auth-role-sweep/.test(c));
 const infinite=[...c.matchAll(/[^\n]*infinite[^\n]*/g)].map(m=>m[0]);
 assert.deepEqual(infinite.map(l=>/is-processing/.test(l)),infinite.map(()=>true),'the only loop runs while a sign-in is pending');
 assert.match(c,/@keyframes spg-autofill/);
 assert.match(c,/@media \(prefers-reduced-motion: reduce\)/);
 assert.match(c,/body\.sp-motion-ready main\.spg \{ animation: none; \}/);
 assert.ok(!/@view-transition/.test(c));
 assert.ok(!/#2f7d5a|var\(--sp-success\)|✓\s*Approved/i.test(c),'no green success state on the gate');
});

test('dashboard entrance: one-time cue, role dashboards only, no lingering clip, off for reduced motion',()=>{
 const run=(pathname,stamp)=>{
  const ss=storage();if(stamp!==undefined)ss.setItem('safePermitGateArrival',String(stamp));
  const cls=new Set();
  const ctx={localStorage:storage(),sessionStorage:ss,Date,Number,JSON,URL,
   document:{documentElement:{setAttribute(){},classList:{add:c=>cls.add(c),remove:c=>cls.delete(c)}},currentScript:null,querySelectorAll:()=>[]},
   location:{pathname}};
  ctx.window=ctx;ctx.window.location=ctx.location;ctx.window.setTimeout=()=>0;vm.createContext(ctx);
  vm.runInContext(read('shared/js/theme-init.js'),ctx);
  return {arrival:cls.has('sp-gate-arrival'),left:ss.getItem('safePermitGateArrival')};
 };
 assert.deepEqual(run('/SafePermit-Cinematic-Preview/worker/dashboard/',Date.now()),{arrival:true,left:null});
 assert.deepEqual(run('/SafePermit-Cinematic-Preview/admin/dashboard/index.html',Date.now()),{arrival:true,left:null});
 assert.deepEqual(run('/SafePermit-Cinematic-Preview/worker/my-permits/',Date.now()),{arrival:false,left:null},'consumed, not shown elsewhere');
 assert.deepEqual(run('/SafePermit-Cinematic-Preview/worker/dashboard/',Date.now()-60000),{arrival:false,left:null},'stale cue ignored');
 assert.deepEqual(run('/SafePermit-Cinematic-Preview/worker/dashboard/'),{arrival:false,left:null});
 const css=read('shared/css/cockpit.css');
 const block=css.slice(css.indexOf('v13.7 Safety Gate arrival'));
 assert.match(block,/@media \(prefers-reduced-motion: no-preference\)/);
 assert.match(block,/html\.sp-gate-arrival body \{ animation: spc-gate-open 300ms [^;]*backwards; \}/);
 assert.ok(!/@view-transition/.test(css));
 for(const r of ['worker','supervisor','safety','admin']){
  const h=read(r+'/dashboard/index.html');
  assert.ok(h.includes('theme-init.js?v=13.7.0')&&h.includes('cockpit.css?v=13.7.0'),r);
 }
});

test('dashboards greet without inventing a user name',()=>{
 const core=read('shared/js/cockpit/cockpit-core.js');
 assert.ok(!/Omar|Ahmad|Sarah|Rana|GREETING_NAME/.test(core));
 assert.match(core,/"cockpit\.greeting_" \+ part/);
 for(const r of ['worker','supervisor','safety','admin']){
  const h=read(r+'/dashboard/index.html');
  assert.match(h,/<h1 data-i18n-text="cockpit\.greeting_welcome">Welcome\.<\/h1>/,r);
 }
 const en=JSON.parse(read('shared/locales/en.json')),ar=JSON.parse(read('shared/locales/ar.json'));
 assert.deepEqual(Object.keys(en.strings).filter(k=>/greeting_.*_(omar|ahmad|sarah|rana)$|good_(morning|evening)_(omar|ahmad|sarah|rana)$/.test(k)),[]);
 for(const p of ['welcome','morning','afternoon','evening'])assert.ok(ar.strings['cockpit.greeting_'+p],p);
});

test('locales: every new login phrase has English and Arabic, and the Arabic grammar fix holds',()=>{
 const en=JSON.parse(read('shared/locales/en.json')),ar=JSON.parse(read('shared/locales/ar.json'));
 for(const k of ['permit_band','permit_no','drawing_title','demo_badge','demo_notice','demo_email_placeholder','demo_password_placeholder','checking','hide_password','show_password']){
  const key='auth.login.'+k;assert.ok(en.strings[key]&&ar.strings[key],key);
 }
 for(const k of ['demo_badge','demo_notice','checking','hide_password','permit_band','drawing_title'])assert.notEqual(ar.strings['auth.login.'+k],en.strings['auth.login.'+k],k);
 const js=read('auth/login/login.js');
 const phrases=[...js.matchAll(/(?:showMessage\("[a-z]*", |setError\([^,]+, [^,]+, |setAttribute\("aria-label", show \? )"([^"]+)"/g)].map(m=>m[1]).concat(['Show password']);
 assert.ok(phrases.length>=9,'found '+phrases.length);
 for(const p of phrases){assert.ok(p in en.runtime,'en '+p);assert.ok(p in ar.runtime&&ar.runtime[p]!==p,'ar '+p);}
 assert.equal(ar.runtime['Password is required.'],'كلمة المرور مطلوبة.');
 assert.match(ar.strings['auth.login.demo_notice'],/تجريبي/);
});
