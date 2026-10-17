// Slide Tabs navbar and Shutter Glyph public footer (vanilla ports).
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

function footerModule(){
 const ctx={Math,Object,Array,String,Number,JSON};ctx.globalThis=ctx;vm.createContext(ctx);
 vm.runInContext(read('shared/js/public-footer.js'),ctx);
 return ctx.SafePermitPublicFooter;
}
function letterSwap(){
 const ctx={Math,Array,String,Number,WeakMap,window:{matchMedia:()=>({matches:false,addEventListener(){}})}};
 vm.createContext(ctx);vm.runInContext(read('shared/js/letter-swap.js'),ctx);
 return ctx.window.SafePermitLetterSwap;
}

test('every letter of the SAFEPERMIT wordmark is a geometric glyph',()=>{
 const F=footerModule();const g=F.geometry;
 assert.equal(F.WORD,'SAFEPERMIT');
 for(const ch of F.WORD){const glyph=g.GLYPHS[ch];assert.ok(glyph&&glyph.d.length,ch);for(const d of glyph.d)assert.match(d,/^M[\d. -]+[HVLAZ]/,ch);}
 const {items,width}=g.layout(F.WORD);
 assert.equal(items.length,10);
 assert.equal(width,items.at(-1).x+items.at(-1).w);
 assert.ok(items.every((it,i)=>i===0||it.x>items[i-1].x+items[i-1].w),'letters never overlap');
});

test('shutter: three blades, a quarter turn per activation, pivot clamped inside the square',()=>{
 const g=footerModule().geometry;
 const b=g.blades(77,77,0);
 assert.equal(b.length,3);
 for(const blade of b){assert.equal(blade.length,8);for(const v of blade)assert.ok(v>=0&&v<=100,String(v));}
 assert.deepEqual([...g.turn(10,20,4)],[10,20]);
 assert.deepEqual([...g.turn(10,20,1)],[80,10]);
 assert.deepEqual([...g.restPivot(1)],[23,77]);
 const far=g.blades(500,-500,0);const near=g.blades(92,8,0);
 assert.deepEqual(JSON.stringify(far),JSON.stringify(near),'pointer outside the shutter is clamped');
 // Frame-rate independent easing settles on the target.
 let x=0;for(let i=0;i<400;i++)x=g.approach(x,50,0.12,1/60);
 assert.ok(Math.abs(x-50)<0.01);
});

test('link scramble settles on the real label and never touches spaces or punctuation',()=>{
 const L=letterSwap();
 assert.equal(L.scramble('Safety Review',1,3),'Safety Review');
 const mid=L.scramble('How It Works',0.25,7);
 assert.equal(mid.length,'How It Works'.length);
 assert.equal(mid[3],' ');assert.equal(mid[6],' ');
 assert.equal(mid.slice(0,3),'How');
 assert.equal(L.scramble('About Us',NaN,1),'About Us');
});

test('public footer content: SafePermit brand, CTA to login, no demo branding, form or placeholder links',()=>{
 const html=read('shared/components/public-footer.html');
 assert.ok(!/<form|<input|newsletter|subscribe|Vanda|Verso|Instagram|Linked ?In|Spotify|Privacy|Terms|Cookies|href="#"/i.test(html));
 assert.ok(html.includes('data-sp-login-link'),'CTA uses SafePermitPaths.login through applyLinks');
 for(const attr of ['data-sp-nav-home','data-sp-nav-workflow','data-sp-nav-features','data-sp-nav-roles','data-sp-nav-about','data-sp-nav-contact','data-sp-risk-assessment-info','data-sp-safety-review-info','data-sp-approval-tracking-info','data-sp-year','data-sp-logo','data-sp-back-to-top','data-sp-shutter'])
  assert.ok(html.includes(attr),attr);
 assert.ok(!/<a [^>]*href=/.test(html),'every destination is resolved at runtime');
 assert.ok(html.includes('dir="ltr"'),'wordmark stays LTR');
});

test('footer and navbar placement rules in shared.js',()=>{
 const src=read('shared/js/shared.js');
 const routes=JSON.parse(src.match(/PUBLIC_FOOTER_ROUTES = (\[[^\]]+\])/)[1]);
 assert.deepEqual(routes,["","about/","contact/","resources/risk-assessment/","resources/safety-review/","resources/approval-tracking/","auth/login/","auth/reset-password/"]);
 assert.ok(src.includes('PUBLIC_FOOTER_ROUTES.indexOf(route) !== -1 && slideTabsEligible(route)'),"footer also requires a sidebar-free layout");
 const role=src.slice(src.indexOf('if (isRolePage) {'),src.indexOf('return;',src.indexOf('if (isRolePage) {')));
 assert.ok(role.includes('"footer.html"')&&!/slide|public-footer/i.test(role),'role pages keep footer.html and never load slide tabs');
 assert.ok(/!getRolePageConfig\(\) && !\/\^archive/.test(src)&&src.includes('hasSidebar()'),'eligibility checks route, archive and sidebar presence');
 assert.ok(exists('shared/components/footer.html'));
});
function exists(f){return fs.existsSync(path.join(root,f));}

test('landing page: inline .sc-footer replaced by the shared host, exactly once',()=>{
 const html=read('index.html');
 assert.ok(!html.includes('class="sc-footer"'));
 assert.equal((html.match(/id="shared-footer"/g)||[]).length,1);
 for(const f of ['auth/login/index.html','auth/reset-password/index.html','about/index.html','contact/index.html','resources/risk-assessment/index.html','resources/safety-review/index.html','resources/approval-tracking/index.html'])
  assert.equal((read(f).match(/id="shared-footer"/g)||[]).length,1,f);
});

test('new styles and scripts use tokens only (no hard-coded colors)',()=>{
 for(const f of ['shared/css/slide-tabs.css','shared/css/public-footer.css','shared/js/slide-tabs.js','shared/js/public-footer.js']){
  const src=read(f).replace(/\/\*[\s\S]*?\*\//g,'');
  assert.deepEqual(src.match(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/gi)||[],[],f);
  assert.ok(!/mix-blend-mode/.test(src),f);
 }
 assert.ok(read('shared/css/slide-tabs.css').includes('@import url("tokens.css")'));
 assert.ok(read('shared/css/public-footer.css').includes('prefers-reduced-motion'));
});

test('new footer strings exist in English and Arabic',()=>{
 const en=JSON.parse(read('shared/locales/en.json')).strings,ar=JSON.parse(read('shared/locales/ar.json')).strings;
 const keys=[...read('shared/components/public-footer.html').matchAll(/data-i18n-(?:text|aria-label|title)="([^"]+)"/g)].map(m=>m[1]);
 assert.ok(keys.length>15);
 for(const k of keys){assert.ok(en[k],'en '+k);assert.ok(ar[k]&&ar[k]!==en[k]||k==='shared.public_footer.cta_button'&&ar[k],'ar '+k);}
 assert.equal(en['shared.public_footer.tagline'],'Work permits. Shared responsibility.');
 assert.equal(ar['shared.public_footer.tagline'],'تصاريح العمل. مسؤولية مشتركة.');
 assert.equal(ar['shared.public_footer.cta_button'],'الدخول إلى SafePermit');
});

test('no React, Tailwind, Framer Motion or new dependency was introduced',()=>{
 assert.ok(!exists('package.json')||!/react|tailwind|framer|lucide|shadcn/i.test(read('package.json')));
 assert.ok(!exists('components/ui'));
 for(const f of ['shared/js/slide-tabs.js','shared/js/public-footer.js'])assert.ok(!/\bimport\b|require\(/.test(read(f)),f);
});

test('v13.2.2 footer follows the original Shutter Glyph layout (orange, mono caps, inline shutter)',()=>{
 const css=read('shared/css/public-footer.css'),js=read('shared/js/public-footer.js');
 assert.ok(css.includes('grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 2fr) auto'),'original four-column top row');
 assert.ok(css.includes('@container (max-width: 760px)')&&css.includes('@container (max-width: 420px)'),'original container breakpoints');
 assert.ok(/--sp-pf-bg: var\(--color-accent\)/.test(css)&&/--sp-pf-ink: var\(--color-ink\)/.test(css),'SafePermit orange with ink lettering');
 assert.ok(/text-transform: uppercase/.test(css)&&/monospace/.test(css),'monospace caps');
 assert.ok(js.includes('const sx = width + SHUTTER_GAP')&&js.includes('SHUTTER_GAP = 12'),'shutter sits in the same row after the T, with the letter gap');
 assert.ok(js.includes('(i + 1) * 60'),'staggered fade, 60 ms per item');
 const html=read('shared/components/public-footer.html');
 assert.ok(html.includes('data-sp-pfooter-word')&&html.includes('data-sp-shutter'),'keyboard button over the shutter');
});

// v13.2.3: VS Code Live Server injected its reload <script> before every </svg> of fetched partials,
// which broke the footer markup after the first links. shared.js must strip it before inserting.
test('shared components survive Live Server script injection',()=>{
 const src=read('shared/js/shared.js');
 assert.ok(src.includes(String.raw`.replace(/<!--\s*Code injected by live-server\s*-->/gi, "")`),'live-server marker removed');
 assert.ok(src.includes(String.raw`.replace(/<script\b[\s\S]*?<\/script>/gi, "")`),'injected scripts removed');
 const clean=s=>s.replace(/<!--\s*Code injected by live-server\s*-->/gi,'').replace(/<script\b[\s\S]*?<\/script>/gi,'');
 const snippet='<!-- Code injected by live-server -->\n<script>\n\t// <![CDATA[  <-- For SVG support\n\tif (\'WebSocket\' in window) { for (var i = 0; i < 2; ++i) {} }\n\t// ]]>\n</script>\n';
 for(const f of ['shared/components/public-footer.html','shared/components/navbar.html','shared/components/footer.html']){
  const html=read(f);
  const injected=html.split('</svg>').join(snippet+'</svg>').replace(/<\/body>/i,snippet+'</body>');
  // Only whitespace may remain where the snippet was (blank text nodes, no visible effect).
  const ws=s=>s.replace(/\s+/g,'');
  assert.equal(ws(clean(injected)),ws(html),f);
  assert.ok(!/<script/i.test(html),f+' has no scripts of its own');
 }
});

// v13.2.4: Live Server injects before </body>, </svg> or </head> in every served .html and then truncates
// the response when it injects more than once. Shared partials must offer none of those tags.
test('shared components contain no Live Server injection points',()=>{
 for(const f of fs.readdirSync(path.join(root,'shared/components')).filter(f=>f.endsWith('.html')))
  assert.deepEqual(read('shared/components/'+f).match(/<\/(body|svg|head)>/gi)||[],[],f);
 const js=read('shared/js/public-footer.js');
 assert.ok(js.includes('function buildIcons')&&js.includes('buildIcons(footer)'),'footer icons are drawn by script');
 assert.equal((read('shared/components/public-footer.html').match(/data-sp-pf-icon=/g)||[]).length,11);
});

test('footer arrow slots are not picked up by the shared icon system (icons.js)',()=>{
 const sel=read('shared/js/icons.js').match(/const selector = '([^']+)'/)[1];
 assert.ok(sel.includes('[class*="__icon"]'));
 const classes=[...read('shared/components/public-footer.html').matchAll(/class="([^"]+)"/g)].flatMap(m=>m[1].split(/\s+/));
 assert.deepEqual(classes.filter(c=>/__icon/.test(c)||/-icon$/.test(c)),[]);
 assert.ok(!/data-sp-icon=|data-sp-theme-icon=|permit-type-icon/.test(read('shared/components/public-footer.html')));
});
