const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync(require('node:path').join(__dirname,'../admin/active-permits/active-permits.js'),'utf8');
const nodes=new Map();
function node(id){if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:'',dataset:{},listeners:{},addEventListener(type,cb){this.listeners[type]=cb;},classList:{add(){},remove(){}}});return nodes.get(id)}
const storage={safePermitAdminLifecycle:JSON.stringify({'PTW-1038':{status:'Pending Admin Approval'}})};
const records=[{id:'PTW-1038',status:'Stopped',previousStatusBeforeStop:'Pending Admin Approval',basicInfo:{workerName:'QA Worker',site:'Plant B',area:'Utility Area'},stopWorkCaseId:'S-1'}];
const listeners={};
const window={SafePermitData:{repository:{listKnownPermits:async()=>records,getPermit:async id=>records.find(p=>p.id===id),savePermit:async p=>{records[0]=p;return p;}}},addEventListener:(n,cb)=>{listeners[n]=cb}};
const ctx={window,document:{documentElement:{lang:'en'},getElementById:node},localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v},alert:()=>{throw Error('Unexpected alert')},console};
vm.runInNewContext(code,ctx);
setImmediate(()=>{
 assert.match(node('activePermitList').innerHTML,/PTW-1038/);
 assert.match(node('activePermitList').innerHTML,/Stopped/);
 assert.match(node('activePermitList').innerHTML,/Pending Admin Approval/);
 assert.equal(node('stoppedCount').textContent,1);
 assert.doesNotMatch(node('activePermitList').innerHTML,/data-action="activate"[^>]*data-id="PTW-1038"/);
 assert.doesNotMatch(node('activePermitList').innerHTML,/data-action="close"[^>]*data-id="PTW-1038"/);
 node('statusFilter').value='Stopped';node('statusFilter').listeners.change();
 assert.match(node('activePermitList').innerHTML,/PTW-1038/);
 node('statusFilter').value='Active';node('statusFilter').listeners.change();
 assert.doesNotMatch(node('activePermitList').innerHTML,/PTW-1038/);
 console.log('Lifecycle v12.5: 7 assertions passed');
});
