// Local, dependency-free browser harness for behavior tests. Requires Node 22+ and Chrome/Edge.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const {spawn} = require('node:child_process');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function executable() {
  return [process.env.CHROME_PATH, process.env.PUPPETEER_EXECUTABLE_PATH,
    path.join(process.env.PROGRAMFILES || 'C:/Program Files','Google/Chrome/Application/chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)','Microsoft/Edge/Application/msedge.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
    '/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    .find(file => file && fs.existsSync(file));
}
async function launch(root) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'safepermit-a11y-'));
  const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css',
    '.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp'};
  const server = http.createServer((req,res) => {
    try {
      let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
      if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
      if(fs.statSync(file).isDirectory()) file=path.join(file,'index.html');
      res.writeHead(200, {'content-type':mime[path.extname(file)] || 'application/octet-stream'});
      fs.createReadStream(file).pipe(res);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const child = spawn(executable(), ['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,
    '--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-gpu',
    '--no-sandbox','about:blank'], {stdio:['ignore','ignore','pipe'],windowsHide:true});
  let ws, next = 0; const pending = new Map(), listeners = new Map(), errors=[];
  async function cleanup() {
    if (ws) { try { await send('Browser.close',{},undefined,1500); } catch {} ws.close(); }
    child.kill();
    // Windows can retain the profile lock until Chromium has actually exited.
    if (child.exitCode === null && child.signalCode === null) await new Promise(resolve => {
      const timer=setTimeout(resolve,2500);
      child.once('exit',()=>{clearTimeout(timer);resolve();});
    });
    await new Promise(resolve => server.close(resolve));
    await delay(150);
    // Only remove this harness's own verified temporary browser profile.
    if(path.dirname(profile) === path.resolve(os.tmpdir()) && path.basename(profile).startsWith('safepermit-a11y-'))
      await fs.promises.rm(profile,{recursive:true,force:true,maxRetries:20,retryDelay:100});
  }
  function send(method,params={},sessionId,timeout=15000) {
    const id=++next;
    return new Promise((resolve,reject) => {
      const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},timeout);
      pending.set(id,{resolve,reject,timer});
      ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
    });
  }
  try {
    const url=await new Promise((resolve,reject)=>{
      let output='';const timer=setTimeout(()=>reject(Error('Browser startup timed out')),15000);
      child.stderr.on('data',bytes=>{output+=bytes;const match=output.match(/DevTools listening on (ws:\/\/\S+)/);
        if(match){clearTimeout(timer);resolve(match[1]);}});
      child.once('error',e=>{clearTimeout(timer);reject(e);});
      child.once('exit',code=>{clearTimeout(timer);reject(Error('Browser exited: '+code));});
    });
    ws=new WebSocket(url);
    await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
    ws.onmessage=event=>{
      const msg=JSON.parse(event.data);
      if(msg.id && pending.has(msg.id)) {
        const task=pending.get(msg.id);pending.delete(msg.id);clearTimeout(task.timer);
        if(msg.error)task.reject(Error(msg.error.message));else task.resolve(msg.result);
      } else {
        if(msg.method==='Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
        for(const fn of listeners.get(msg.method)||[]) fn(msg);
      }
    };
    const {targetId}=await send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    const command=(method,params={})=>send(method,params,sessionId);
    await command('Page.enable');await command('Runtime.enable');
    async function evaluate(fn,arg) {
      const expression=typeof fn==='function'?`(${fn})(${arg===undefined?'':JSON.stringify(arg)})`:fn;
      const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
      if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    }
    let navigationCount=0;
    async function goto(route) {
      errors.length=0;
      let handler,timer;
      const loaded=new Promise((resolve,reject)=>{
        handler=msg=>{if(msg.sessionId===sessionId){clearTimeout(timer);listeners.get('Page.loadEventFired').delete(handler);resolve();}};
        if(!listeners.has('Page.loadEventFired'))listeners.set('Page.loadEventFired',new Set());
        listeners.get('Page.loadEventFired').add(handler);
        timer=setTimeout(()=>{listeners.get('Page.loadEventFired').delete(handler);reject(Error('Page load timed out: '+route));},15000);
      });
      // Force a fresh document, including hash routes; an immediate reload can race a hash commit.
      const url=new URL(route,origin);
      url.searchParams.set('_phase1_test',String(++navigationCount));
      await command('Page.navigate',{url:url.href});
      await loaded;
      await evaluate(async()=>{if(window.SafePermitI18n)await window.SafePermitI18n.ready();await document.fonts.ready;});
      await delay(120);
    }
    async function key(key,shift=false) {
      const code=key==='Tab'?9:27;
      for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',
        {type,key,code:key,windowsVirtualKeyCode:code,modifiers:shift?8:0});
    }
    function on(method, fn) {
      if (!listeners.has(method)) listeners.set(method,new Set());
      listeners.get(method).add(fn);
      return () => listeners.get(method).delete(fn);
    }
    return {origin,command,eval:evaluate,goto,key,errors,close:cleanup,delay,on};
  } catch(error) {await cleanup();throw error;}
}
module.exports={launch,executable};
