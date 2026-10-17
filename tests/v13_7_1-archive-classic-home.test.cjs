// v13.7.1: the archived classic home page sits two folders deep, so every shared reference must climb back to
// the project root, and the page keeps its own frozen v13.0 copies of the scripts and styles it was built with.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const pageDir='archive/classic-home';
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read(pageDir+'/index.html');
const refs=[...html.matchAll(/\s(?:src|href|poster|data-sp-video-src)="([^"]+)"/g)].map(m=>m[1]).filter(r=>!/^(?:[a-z]+:|#|\/\/)/i.test(r));
const target=r=>{const p=r.split('#')[0].split('?')[0];return path.join(root,pageDir,p.endsWith('/')?p+'index.html':p);};
const frozen=['home-safety-sections.css','home-safety-sections.js','home-helmet-model.js','home-helmet-scene.js','home-helmet-story.css'];

test('every local reference on the archived classic home page resolves to an existing file',()=>{
 assert.ok(refs.length>=20,'found '+refs.length+' references');
 const missing=refs.filter(r=>!fs.existsSync(target(r)));
 assert.deepEqual(missing,[]);
});
test('shared and asset references climb to the project root, never page-relative',()=>{
 for(const r of refs)assert.ok(!/^(?:shared|assets|landing|auth|resources)\//.test(r),r);
 for(const f of ['shared/js/paths.js','shared/js/shared.js','shared/css/theme.css','assets/vendor/three/three-0.186.1.min.js','assets/video/factory-inspection.mp4','auth/login/'])
  assert.ok(html.includes('"../../'+f),f);
});
test('the page loads its own frozen v13.0 safety and helmet files, never the live landing copies',()=>{
 assert.ok(!refs.some(r=>r.includes('landing/')),'no landing/ reference');
 for(const f of frozen){assert.ok(refs.includes(f),f+' referenced beside the page');assert.ok(fs.existsSync(path.join(root,pageDir,f)),f+' present');}
 const css=read(pageDir+'/home-safety-sections.css');
 const fonts=[...css.matchAll(/url\("([^"]+)"\)/g)].map(m=>m[1]);
 assert.equal(fonts.length,2);
 for(const u of fonts){assert.ok(u.startsWith('../../assets/fonts/'),u);assert.ok(fs.existsSync(path.join(root,pageDir,u)),u);}
 assert.ok(read(pageDir+'/home-safety-sections.js').includes('SafePermitHelmetScene'),'v13.0 sections script mounts the 3D helmet itself');
});
test('the archive stays unlinked from live pages',()=>{
 for(const f of ['index.html','home-preview.html','shared/js/shared.js','shared/js/nav-config.js'].filter(f=>fs.existsSync(path.join(root,f))))
  assert.ok(!read(f).includes('classic-home'),f);
});
