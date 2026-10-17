const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function pick(source,begin,end){const a=source.indexOf(begin),b=source.indexOf(end,a+begin.length);assert.ok(a>=0&&b>a);return source.slice(a,b);}
function fakeElement(){return {dataset:{},classList:{add(){},remove(){}},innerHTML:'',children:[],appendChild(x){this.children.push(x)},querySelector(){return {addEventListener(){}}},addEventListener(){}};}
function sandbox(src,code,ctx){const esc=src.slice(src.indexOf('  function escapeHTML('),src.indexOf('\n',src.indexOf('  function escapeHTML('))+1);ctx.document={createElement:fakeElement};vm.createContext(ctx);vm.runInContext(esc+code,ctx);return ctx;}
const payload='<img src=x onerror=alert(1)>';

test('admin users desktop row renders escaped name, email and site',()=>{
 const src=read('admin/users/users.js');
 const ctx=sandbox(src,pick(src,'  function buildTableRow(','  function renderUsers('),{
  initials:()=>'<svg onload=alert(1)>',roleClass:()=> 'worker',getStatusActionButtons:()=>''});
 const html=ctx.buildTableRow({id:'WRK-1',name:payload,email:payload,site:payload,role:'Worker',department:payload,status:'Active',lastActivity:payload}).innerHTML;
 assert.doesNotMatch(html,/<img|<svg/i);assert.match(html,/&lt;img/);assert.match(html,/&lt;svg/);
});

test('admin users mobile card renders escaped stored fields',()=>{
 const src=read('admin/users/users.js');
 const table=fakeElement(),mobile=fakeElement();
 const ctx=sandbox(src,pick(src,'  function buildTableRow(','  function populateDepartmentFilter('),{
  initials:()=> 'U',roleClass:()=> 'worker',getStatusActionButtons:()=>'',
  tableBody:table,mobileList:mobile,bindUserActions:()=>{}});
 ctx.renderUsers([{id:'WRK-1',name:payload,email:payload,site:payload,role:'Worker',department:payload,status:'Active',lastActivity:payload}]);
 assert.equal(mobile.children.length,1);assert.doesNotMatch(mobile.children[0].innerHTML,/<img/i);
 assert.match(mobile.children[0].innerHTML,/&lt;img/);
});

test('admin permit type card escapes name and description from editable settings',()=>{
 const src=read('admin/permit-types/permit-types.js');
 const ctx=sandbox(src,pick(src,'  function buildPermitTypeCard(','  function renderPermitTypes('),{});
 const result=ctx.buildPermitTypeCard({code:'HOT',name:payload,description:payload,status:'Active',
  validityHours:8,safetyReview:'Required',controlLevel:'High',riskAssessmentRequired:true,checklistRequired:true});
 assert.doesNotMatch(result.innerHTML,/<img/i);assert.match(result.innerHTML,/&lt;img/);
});

test('Admin Pending Permit dynamic HTML encodes malicious permit input',()=>{
 const src=read('admin/pending-permits/pending-permits.js');
 const ctx=sandbox(src,pick(src,'  function buildDynamicRow(','  function injectStoredPermits('),{
  tableBody:{querySelectorAll:()=>[]},getHighestResidualRisk:()=>({className:'low',label:'Low',score:2}),
  getStartInfo:()=>({category:'later',label:'Scheduled',time:'09:00',order:1}),getWaitingMinutes:()=>1,
  getSite:()=>payload,titleCase:v=>v,getPermitType:()=>payload,trailMarkup:()=>'<span>Unknown</span>',
  formatWaiting:()=> '1m'});
 const row=ctx.buildDynamicRow({id:'PTW-<img src=x onerror=alert(1)>',status:'Pending Admin Approval',basicInfo:{site:'Plant',area:payload,workerName:payload}});
 assert.ok(row);assert.doesNotMatch(row.innerHTML,/<img/i);assert.match(row.innerHTML,/&lt;img/);
});

test('admin notification renderer escapes untrusted localStorage strings',()=>{
 const src=read('admin/notifications/notifications.js');
 const list=fakeElement(),filter={value:'all',addEventListener(){}},mark=fakeElement();
 const ctx={document:{getElementById:id=>id==='notificationList'?list:id==='notificationFilter'?filter:mark},
 localStorage:{getItem:()=>JSON.stringify([{id:3,type:'approval',title:payload,text:payload,time:payload,read:false}]),setItem(){}},alert(){}};
 vm.createContext(ctx);vm.runInContext(src,ctx);
 assert.doesNotMatch(list.innerHTML,/<img/i);assert.match(list.innerHTML,/&lt;img/);
});
