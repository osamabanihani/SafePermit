const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const contract=JSON.parse(fs.readFileSync(path.join(root,'docs/API-CONTRACT-v10.json'),'utf8'));
assert.equal(contract.openapi,'3.0.3');
for(const p of ['/permits','/permits/{permitId}','/permits/{permitId}/decisions','/permits/{permitId}/safety-review','/risks','/incidents','/corrective-actions'])assert.ok(contract.paths[p],p);
for(const role of ['supervisor','safety','admin']){
 const s=fs.readFileSync(path.join(root,role,'review-permit/review-permit.js'),'utf8');
 const h=fs.readFileSync(path.join(root,role,'review-permit/index.html'),'utf8');
 assert.match(s,/await window\.SafePermitData\.repository\.applyDecision/);
 assert.match(s,/await saveDecision\(decision\)/);
 assert.match(h,/safety-workflow\.js/);
 assert.match(h,/safety-suite-store\.js/);
}
const calls=[];
const ctx={fetch:async(url,opts)=>{calls.push({url,opts});return {ok:true,status:200,headers:{get:()=>"application/json"},json:async()=>({id:'P1'})};}};
ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'shared/js/http-repository.js'),'utf8'),ctx);
(async()=>{
 const repo=ctx.SafePermitHttp.createHttpRepository({baseUrl:'/api/v1',getAccessToken:()=> 'token'});
 await repo.getPermit('P 1');
 assert.equal(calls[0].url,'/api/v1/permits/P%201');
 assert.equal(calls[0].opts.headers.Authorization,'Bearer token');
 await repo.applyDecision({permitId:'P 1',decision:'approve'},'safety');
 assert.equal(calls[1].opts.method,'POST');
 assert.equal(calls[1].url,'/api/v1/permits/P%201/decisions');
 console.log('v10 contract tests PASSED');
})().catch(e=>{console.error(e);process.exitCode=1});
