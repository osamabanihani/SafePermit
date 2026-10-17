/* Optional backend transport. Import and configure explicitly after authentication is available. */
(function(root){"use strict";
function createHttpRepository({baseUrl="/api/v1",getAccessToken=()=>null,fetchImpl=root.fetch}={}){
  if(typeof fetchImpl!=="function")throw new Error("fetch is unavailable");
  const base=String(baseUrl).replace(/\/$/,"");
  async function request(path,{method="GET",body,signal,headers={}}={}){
    const token=await getAccessToken();
    const response=await fetchImpl(base+path,{method,credentials:"same-origin",signal,headers:{Accept:"application/json",...(body===undefined?{}:{"Content-Type":"application/json"}),...(token?{Authorization:"Bearer "+token}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const contentType=response.headers?.get?.("content-type")||"";
    const data=response.status===204?null:contentType.includes("json")?await response.json():null;
    if(!response.ok){const error=new Error(data?.error?.message||"Request failed (HTTP "+response.status+")");error.status=response.status;error.code=data?.error?.code||"HTTP_ERROR";error.details=data?.error?.details||null;throw error;}
    return data;
  }
  const id=x=>encodeURIComponent(String(x));
  return Object.freeze({
    listPermits:(params={})=>request("/permits"+(Object.keys(params).length?"?"+new URLSearchParams(params):"")),
    getPermit:permitId=>request("/permits/"+id(permitId)),
    createPermit:payload=>request("/permits",{method:"POST",body:payload}),
    updatePermit:(permitId,payload,version)=>request("/permits/"+id(permitId),{method:"PATCH",body:payload,headers:version?{"If-Match":String(version)}:{}}),
    applyDecision:(record,role)=>request("/permits/"+id(record.permitId)+"/decisions",{method:"POST",body:{...record,role}}),
    getSafetyReview:permitId=>request("/permits/"+id(permitId)+"/safety-review"),
    listRisks:()=>request("/risks"),
    listIncidents:()=>request("/incidents"),
    listActions:()=>request("/corrective-actions"),
    request
  });
}
root.SafePermitHttp=Object.freeze({createHttpRepository});
})(typeof window!=="undefined"?window:globalThis);
