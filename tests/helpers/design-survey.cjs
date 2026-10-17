const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {launch}=require(root+'/tests/helpers/browser.cjs');
const phase=process.argv[2]||'before';
const out=path.join(root,'docs/qa/phase4');fs.mkdirSync(out,{recursive:true});
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name.startsWith('.')?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const pages=walk(root).filter(f=>f.endsWith('.html')).map(f=>path.relative(root,f).replaceAll('\\','/')).filter(f=>!/^docs\/|^archive\/|^shared\/components\/|^admin\/resume-permit\/|^home-preview.html$/.test(f));
const inventory=pages.map(file=>{const source=fs.readFileSync(path.join(root,file),'utf8');return {file,route:'/'+file.replace(/index.html$/,''),body:(source.match(/<body[^>]*class=["']([^"']*)/)||[])[1]||'',styles:[...source.matchAll(/<link\b[^>]*(?:href=["']([^"']*\.css[^"']*)["'])[^>]*>/g)].map(m=>m[1]),bytes:Buffer.byteLength(source)};});
if(phase==='before')fs.writeFileSync(path.join(out,'source-inventory.json'),JSON.stringify(inventory,null,2)+'\n');
const shots=new Set(['/', '/worker/dashboard/','/supervisor/dashboard/','/safety/dashboard/','/admin/dashboard/','/worker/create-permit/basic-info/','/supervisor/review-queue/','/safety/risk-command-center/','/admin/active-permits/','/safety/controlled-resume/','/about/','/contact/','/permit-verify/']);
(async()=>{const b=await launch(root);const results=[];try{
 await b.goto('/auth/login/');
 const modes=phase==='before'?[{width:1440,lang:'en',theme:'light'},{width:390,lang:'ar',theme:'dark'}]:[{width:1440,lang:'en',theme:'light'},{width:1024,lang:'en',theme:'dark'},{width:768,lang:'ar',theme:'light'},{width:390,lang:'ar',theme:'dark'},{width:320,lang:'en',theme:'light'},{width:320,lang:'ar',theme:'dark'}];
 await b.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const mode of modes){
  await b.eval(({lang,theme})=>{localStorage.clear();localStorage.setItem('safePermitLanguage',lang);localStorage.setItem('safePermitTheme',theme);},mode);
  await b.command('Emulation.setDeviceMetricsOverride',{width:mode.width,height:1000,deviceScaleFactor:1,mobile:mode.width<600});
  for(const page of inventory){
   await b.goto(page.route);await b.delay(80);
   const metrics=await b.eval(()=>{
    const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[hidden],[inert],[aria-hidden=true]');};
    const text=[...document.querySelectorAll('main p,main label,main td,main th,main button,main a,main small,main span')].filter(e=>visible(e)&&e.textContent.trim()&&![...e.children].some(c=>c.textContent.trim()));
    const sizes=text.map(e=>({cls:e.className,tag:e.tagName,size:parseFloat(getComputedStyle(e).fontSize),text:e.textContent.trim().slice(0,55)}));
    const controls=[...document.querySelectorAll('main button,main input:not([type=hidden]):not([type=checkbox]):not([type=radio]),main select,main .sp-btn')].filter(visible).map(e=>{const r=e.getBoundingClientRect();return {cls:e.className,id:e.id,w:Math.round(r.width),h:Math.round(r.height)};});
    return {lang:document.documentElement.lang,dir:document.documentElement.dir,overflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),smallText:sizes.filter(x=>x.size<13),smallControls:controls.filter(x=>x.h<44||x.w<24),fonts:[...new Set(text.map(e=>getComputedStyle(e).fontFamily))],heading:document.querySelector('h1')?.textContent.trim(),resources:performance.getEntriesByType('resource').map(r=>({url:new URL(r.name).pathname,bytes:r.transferSize,duration:Math.round(r.duration)})),animations:document.getAnimations().filter(a=>a.playState==='running').length};
   });
   results.push({route:page.route,...mode,...metrics,exceptions:[...b.errors]});
   if(shots.has(page.route)&&(mode.width===1440||(mode.width===390&&mode.lang==='ar'))){
    const name=(page.route==='/'?'home':page.route.split('/').filter(Boolean).join('-'))+'-'+mode.width+'-'+mode.lang;
    const {data}=await b.command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,phase+'-'+name+'.png'),Buffer.from(data,'base64'));
   }
   if(page.route==='/'){
    await b.eval(()=>document.getElementById('permit-record')?.scrollIntoView());
    const {data}=await b.command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,phase+'-home-lower-'+mode.width+'.png'),Buffer.from(data,'base64'));
   }
  }
  console.log(phase,mode.width,mode.lang,'pages',inventory.length);
 }
 fs.writeFileSync(path.join(out,phase+'-browser.json'),'[\n'+results.map(row=>JSON.stringify(row)).join(',\n')+'\n]\n');
 console.log(JSON.stringify({pages:pages.length,checks:results.length,overflow:results.filter(r=>r.overflow>0).map(r=>[r.route,r.width,r.overflow]),exceptions:results.filter(r=>r.exceptions.length).map(r=>[r.route,r.exceptions]),smallText:results.reduce((s,r)=>s+r.smallText.length,0),smallControls:results.reduce((s,r)=>s+r.smallControls.length,0)}));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
