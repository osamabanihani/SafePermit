// v13 architecture & navigation regression tests.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const exists=f=>fs.existsSync(path.join(root,f));
const ctx={URLSearchParams};vm.createContext(ctx);vm.runInContext(read('shared/js/nav-config.js'),ctx);
const nav=ctx.SafePermitNav;
const routeFile=route=>{const p=route.split('#')[0].split('?')[0];return p.endsWith('/')?p+'index.html':p;};
function walk(dir,out=[]){for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const p=path.posix.join(dir,e.name);if(e.isDirectory()){if(!['archive','docs','tests','assets','node_modules'].includes(e.name))walk(p,out);}else out.push(p);}return out;}
const files=walk('.').map(f=>f.replace(/^\.\//,''));

test('every sidebar route resolves to an existing page',()=>{
 for(const [role,config] of Object.entries(nav.roles))for(const item of config.items)
  assert.ok(exists(routeFile(item.route)),role+'/'+item.id+' -> '+item.route);
});
test('sidebar item ids are unique per role and every group has a label',()=>{
 for(const [role,config] of Object.entries(nav.roles)){
  const ids=config.items.map(i=>i.id);assert.equal(new Set(ids).size,ids.length,role);
  for(const item of config.items){assert.ok(nav.groups[item.group],role+' group '+item.group);assert.ok(item.en&&item.ar&&item.ar!==item.en,role+' '+item.id+' bilingual');}
 }
});
test('Command Center deep links name real sections, each exactly once',()=>{
 const ui=read('shared/js/safety-suite-ui.js');const sections=[...ui.matchAll(/\["(\w+)", "[^"]+"\]/g)].map(m=>m[1]).filter((v,i,a)=>a.indexOf(v)===i).slice(0,10);
 assert.equal(sections.length,10);
 const hashes=nav.roles.safety.items.filter(i=>i.route.includes('risk-command-center')).map(i=>i.route.split('#')[1]);
 assert.deepEqual([...hashes].sort(),[...sections].sort());
});
test('D6: safety controls are only in the Safety Officer sidebar',()=>{
 for(const role of ['worker','supervisor','admin'])for(const item of nav.roles[role].items)
  assert.ok(!/risk-command-center|controlled-resume/.test(item.route),role+' exposes '+item.route);
 for(const role of ['worker','supervisor','safety','admin'])
  assert.ok(!read(role+'/dashboard/index.html').includes('position:fixed;bottom:18px'),role+' dashboard still has the floating Command Center link');
});
test('every role page is reachable from its sidebar or from a permit row',()=>{
 const contextual=new Set(['supervisor/permit-details/index.html','safety/permit-details/index.html','worker/permit-details/index.html','supervisor/review-permit/index.html','safety/review-permit/index.html','admin/review-permit/index.html','worker/create-permit/risk-assessment/index.html','worker/create-permit/safety-checklist/index.html','worker/create-permit/review-submit/index.html']);
 const linked=new Set(Object.values(nav.roles).flatMap(c=>c.items.map(i=>routeFile(i.route))));
 const redirects=new Set(['admin/resume-permit/index.html']);
 for(const f of files.filter(f=>/^(worker|supervisor|safety|admin)\/.+\/index\.html$/.test(f))){
  if(redirects.has(f)||contextual.has(f))continue;
  assert.ok(linked.has(f),'unreachable from navigation: '+f);
 }
});
test('moved pages keep working: redirects preserve query and hash',()=>{
 for(const [stub,target] of [['home-preview.html','index.html'],['admin/resume-permit/index.html','../../safety/controlled-resume/']]){
  const html=read(stub);assert.ok(html.includes('location.replace("'+target+'" + location.search + location.hash)'),stub);
  assert.ok(exists(target==='index.html'?'index.html':'safety/controlled-resume/index.html'));
 }
 assert.ok(read('index.html').includes('class="sc-page"'),'index.html is the cinematic landing page');
});
test('no external font or CDN request from the application',()=>{
 for(const f of files.filter(f=>/\.(css|html|js)$/.test(f)))
  assert.ok(!/fonts\.googleapis|fonts\.gstatic|cdnjs|jsdelivr|unpkg/.test(read(f)),f);
 const tokens=read('shared/css/tokens.css');
 for(const m of tokens.matchAll(/url\("([^"]+)"\)/g))assert.ok(fs.existsSync(path.resolve(root,'shared/css',m[1])),m[1]);
});
test('D5: app stylesheets use radius tokens instead of literal pixel radii',()=>{
 for(const f of files.filter(f=>f.endsWith('.css')&&!f.startsWith('landing/')&&f!=='shared/css/tokens.css')){
  const literal=[...read(f).matchAll(/border-radius:\s*([^;}]+)/g)].map(m=>m[1].trim()).filter(v=>/\b([1-9]|[1-3]\d)px\b/.test(v.replace(/var\([^)]*\)/g,'')));
  assert.deepEqual(literal,[],f);
 }
});
test('D2/D3: tokens hold the approved palette; dark theme accent is orange, not gold',()=>{
 const tokens=read('shared/css/tokens.css');
 for(const v of ['--color-ink: #101D26','--color-background: #F1F2EE','--color-accent: #FF9B51','--color-background: #101D26'])assert.ok(tokens.includes(v),v);
 for(const f of ['shared/css/theme.css','shared/css/shared.css','shared/css/tokens.css'])assert.ok(!/#FFD700/i.test(read(f)),f+' still uses gold');
});
test('Arabic parity for all English runtime strings',()=>{
 const en=JSON.parse(read('shared/locales/en.json')),ar=JSON.parse(read('shared/locales/ar.json'));
 assert.deepEqual(Object.keys(en.runtime).filter(k=>!(k in ar.runtime)),[]);
 assert.deepEqual(Object.keys(en.strings).filter(k=>!(k in ar.strings)),[]);
});
test('Worker My Permits groups Stopped permits separately (not as Pending)',()=>{
 const src=read('worker/permits/permits.js');const fn=src.match(/function statusGroup\(status\)\{[^}]*\}/)[0];
 const statusGroup=vm.runInNewContext(fn+';statusGroup;');
 assert.equal(statusGroup('Stopped'),'stopped');assert.equal(statusGroup('Pending Safety Review'),'pending');assert.equal(statusGroup('Active'),'approved');
});
test('active item: query-specific links win over the plain page link',()=>{
 const link=(href,extra={})=>{const u=new URL(href,'http://x/');return {pathname:u.pathname,search:u.search,hash:u.hash,dataset:extra};};
 const links=[link('/worker/permits/'),link('/worker/permits/?status=active'),link('/worker/dashboard/#ai-assistant-entry')];
 assert.equal(nav.activeItem(links,{pathname:'/worker/permits/',search:'?status=active',hash:''}),links[1]);
 assert.equal(nav.activeItem(links,{pathname:'/worker/permits/',search:'?status=active&q=panel',hash:''}),links[1]);
 assert.equal(nav.activeItem(links,{pathname:'/worker/permits/',search:'?status=Active&q=panel',hash:''}),links[1]);
 assert.equal(nav.activeItem(links,{pathname:'/worker/permits/index.html',search:'',hash:''}),links[0]);
});
