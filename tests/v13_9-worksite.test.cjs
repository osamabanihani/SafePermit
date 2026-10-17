// v13.9 "The Worksite": the shared WebGL miniature behind sign-in and password setup.
// Presentation only, render on demand, accessible, and the pages never depend on it.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const W=read('auth/worksite/worksite-scene.js');
const body=(name,next)=>W.slice(W.indexOf(name),W.indexOf(next,W.indexOf(name)));

test('scene: bundled Three.js only, procedural, no model or texture downloads',()=>{
 assert.match(W,/root\.SafePermitTHREE/);
 assert.ok(!/import\s|require\(|fetch\(|XMLHttpRequest|GLTFLoader|TextureLoader|\.glb|\.gltf|https?:\/\//.test(W),'nothing is loaded at runtime');
 assert.ok(fs.existsSync(path.join(root,'assets/vendor/three/three-0.186.1.min.js')));
});

test('scene: performance — capped pixel ratio, lighter shadows on small or low-end devices, render on demand',()=>{
 assert.match(W,/Math\.min\(root\.devicePixelRatio \|\| 1, compact \? 1\.25 : 1\.75/);
 assert.match(W,/const sm = compact \|\| lowEnd \? 1024 : 2048;/);
 assert.ok(!/setInterval|setTimeout/.test(W),'no timers');
 assert.equal((W.match(/requestAnimationFrame\(/g)||[]).length,1,'one place requests frames (wake)');
 assert.match(W,/if \(tweens\.size \|\| processing \|\| !settledUser\(\)\) wake\(\); else last = 0;/,'frames stop when nothing moves');
 assert.match(W,/function onVisibility\(\) \{ hidden = doc\.hidden; if \(hidden\) \{ if \(raf\) root\.cancelAnimationFrame\(raf\)/,'paused while hidden');
});

test('scene: every listener and GPU resource is released on dispose',()=>{
 const mountSrc=body('function mount(','function attach(');
 const added=[...mountSrc.matchAll(/(root|doc|doc\.documentElement)\.addEventListener\("([a-z]+)"/g)].map(m=>m[1]+':'+m[2]);
 const removed=[...body('dispose() {','root.SafePermitWorksite').matchAll(/(root|doc|doc\.documentElement)\.removeEventListener\("([a-z]+)"/g)].map(m=>m[1]+':'+m[2]);
 assert.ok(added.length>=3);
 for(const a of added)assert.ok(removed.includes(a),'removed '+a);
 assert.match(W,/renderer\.dispose\(\); canvas\.remove\(\);/);
 assert.match(W,/ro\.disconnect\(\)/);
});

test('scene: accessible and calm — hidden canvas, desktop-mouse pointer only, never while typing, reduced motion',()=>{
 assert.match(W,/canvas\.setAttribute\("aria-hidden", "true"\)/);
 const p=body('function onPointer(','function onLeave(');
 assert.match(p,/reduced \|\| typing \|\| e\.pointerType !== "mouse" \|\| !fine\.matches \|\| completing/);
 assert.match(p,/user\.tYaw = -nx \* \.045; user\.tPitch = ny \* \.025;/,'small range');
 assert.match(W,/setTyping\(on\) \{ typing = !!on; if \(typing\) \{ user\.tYaw = 0; user\.tPitch = 0;/,'returns to rest while typing');
});

test('scene: the gate opens only on completion; processing and invalid never move the camera or the gate',()=>{
 const proc=body('setProcessing(on) {','flag() {'),flag=body('flag() {','setSections(flags) {'),comp=body('complete(done) {','reset() {');
 for(const [n,s] of [['setProcessing',proc],['flag',flag]]){
  assert.ok(!/gateAngle|cam\.|camera\./.test(s),n+' leaves the gate closed and the camera still');
 }
 assert.ok(!/translate|shake/i.test(flag),'no shake');
 const opens=[...W.matchAll(/gateAngle = (?!0\b)/g)].map(m=>m.index);
 assert.ok(opens.length>0&&opens.every(i=>i>W.indexOf('complete(done) {')&&i<W.indexOf('// Back to the resting site')),'gateAngle is only opened inside complete()');
 assert.match(comp,/setIndicator\(startColor\.clone\(\)\.lerp\(success, k\)\)/,'indicator turns the success colour first');
});

test('scene: password setup sections follow booleans only and connect the route only on a match',()=>{
 const s=body('setSections(flags) {','// After a successful result only');
 assert.match(s,/if \(mode !== "reset" \|\| completing \|\| !flags\) return;/);
 assert.match(s,/const want = \[!!flags\.length, !!flags\.upper, !!flags\.number\];/);
 assert.match(s,/const link = !!flags\.match && want\[0\] && want\[1\] && want\[2\];/);
 assert.match(W,/on: mode === "login" \? 1 : 0/,'sign-in shows the walkway installed; password setup starts with the section missing');
});

// A tiny DOM host for the adapters.
function host(){const cls=new Set();const attrs={};return {cls,attrs,classList:{add:c=>cls.add(c),remove:c=>cls.delete(c)},setAttribute:(k,v)=>attrs[k]=String(v),querySelectorAll:()=>[]};}
function ctxWith(worksite,h){const ctx={console,Array,Object,String,document:{querySelector:s=>s==='[data-spw-scene]'?h:null},addEventListener(){},matchMedia:()=>({matches:false})};ctx.window=ctx;if(worksite)ctx.SafePermitWorksite=worksite;vm.createContext(ctx);return ctx;}

test('adapters: login release calls back once; without the scene the image shows and callbacks run at once',()=>{
 const calls=[];let held=null;
 const ws={attach:(h,mode)=>{calls.push(['attach',mode]);return {setTyping:v=>calls.push(['typing',v]),setProcessing:v=>calls.push(['processing',v]),flag:()=>calls.push(['flag']),reset:()=>calls.push(['reset']),complete:d=>{held=d;}};}};
 const h=host();const L=ctxWith(ws,h);vm.runInContext(read('auth/login/login-scene.js'),L);
 const S=L.SafePermitLoginScene;let done=0;
 S.focusField('email');S.blurField();S.setProcessing(true);S.flagField('email');S.setState('invalid');S.release(()=>done++);
 assert.deepEqual(calls,[['attach','login'],['typing',true],['typing',false],['processing',true],['flag']]);
 assert.equal(h.attrs['data-auth-state'],'invalid');
 assert.equal(done,0,'waits for the scene');held();held();assert.equal(done,1,'once');
 const h2=host();const N=ctxWith(null,h2);vm.runInContext(read('auth/login/login-scene.js'),N);
 let d2=0;N.SafePermitLoginScene.release(()=>d2++);
 assert.ok(h2.cls.has('is-fallback'));assert.equal(d2,1,'no scene: navigation is not delayed');
 const h3=host();const R=ctxWith(null,h3);vm.runInContext(read('auth/reset-password/reset-scene.js'),R);
 let d3=0;R.SafePermitResetScene.update({length:'x'});R.SafePermitResetScene.complete(()=>d3++);
 assert.ok(h3.cls.has('is-fallback'));assert.equal(d3,1);
});

test('attach(): without WebGL or the vendor build, the static image shows and complete() never strands the page',()=>{
 const h=host();const ctx={console,Array,Object,String,Math,document:{createElement:()=>({getContext:()=>null,setAttribute(){},addEventListener(){}})},addEventListener(){},matchMedia:()=>({matches:true})};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(W,ctx);
 const api=ctx.SafePermitWorksite.attach(h,'login');
 assert.ok(h.cls.has('is-fallback'));assert.equal(api.live(),false);
 let d=0;api.complete(()=>d++);api.setProcessing(true);api.flag();api.setSections({length:true});
 assert.equal(d,1);
});

test('pages: the prototype controls and simulated success are gone; demo disclosure stays',()=>{
 for(const p of ['auth/login/index.html','auth/reset-password/index.html']){
  const h=read(p);
  assert.ok(!/spw-tools|data-spw-action|Simulate|Prototype|Replay entrance/.test(h),p);
  assert.match(h,/spg-demo-note__badge/,p+' keeps its demo disclosure');
  assert.match(h,/\?v=13\.9\.0/,p+' cache-busts the new release');
 }
 for(const f of ['auth/login/login.js','auth/login/login-scene.js','auth/reset-password/reset-password.js','auth/reset-password/reset-scene.js','auth/worksite/worksite-scene.js'])
  assert.ok(!/simulat|prototype/i.test(read(f)),f+' contains no simulation');
});
