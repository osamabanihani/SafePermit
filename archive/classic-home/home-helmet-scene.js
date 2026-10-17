/* An on-demand Three.js product view. The page scroll controller owns its single animation clock. */
(function () {
  "use strict";
  if (window.SafePermitHelmetScene) return;
  function create(host) {
    const T=window.SafePermitTHREE, builder=window.SafePermitHelmetModel;
    if (!host || !T || !builder) return null;
    const canvas=document.createElement("canvas");
    canvas.className="sp-safety-helmet__canvas";canvas.setAttribute("aria-hidden","true");
    let gl;
    try { gl=canvas.getContext("webgl2",{alpha:true,antialias:true,powerPreference:"high-performance"}); }
    catch(error) { return null; }
    if(!gl)return null;
    let renderer,model;
    try {
      renderer=new T.WebGLRenderer({canvas:canvas,context:gl,alpha:true,antialias:true,powerPreference:"high-performance"});
      renderer.setClearColor(0,0);
      model=builder.build(T);
    } catch(error) { if(renderer)renderer.dispose();return null; }
    const scene=new T.Scene();scene.add(model);
    const camera=new T.PerspectiveCamera(33,1,.1,30);
    camera.position.set(0,1.128,6.3);camera.lookAt(0,.12,0);
    model.position.y=-.42;
    host.appendChild(canvas);
    let disposed=false,lost=false,ready=false,progress=0,rtl=false,dirty=true;
    let lastProgress=-1,lastRtl=false,width=0,height=0,quality=1.5,ratio=1,slowFrames=0,draws=0,generation=0;
    const now=function(){return window.performance && window.performance.now ? window.performance.now() : 0;};
    function resize(w,h) {
      if(disposed)return;
      w=Math.max(1,Math.round(w || host.clientWidth || 1));h=Math.max(1,Math.round(h || host.clientHeight || 1));
      const nextRatio=Math.min(window.devicePixelRatio || 1,quality,Math.sqrt(650000/(w*h)));
      if(w===width && h===height && Math.abs(nextRatio-ratio)<.0001)return;
      width=w;height=h;ratio=nextRatio;
      renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);
      camera.aspect=width/height;
      camera.position.z=6.3/Math.min(1,camera.aspect);
      camera.position.y=.12+camera.position.z*.16;
      camera.lookAt(0,.12,0);camera.updateProjectionMatrix();dirty=true;
    }
    function draw() {
      if(disposed || lost || !ready || document.hidden)return;
      if(!dirty && Math.abs(progress-lastProgress)<.000001 && rtl===lastRtl)return;
      resize(width,height);
      model.rotation.y=-.42+(rtl?-1:1)*progress*Math.PI*2;
      model.rotation.x=-.045+.045*Math.sin(progress*Math.PI);
      model.position.y=-.42+.035*Math.sin(progress*Math.PI);
      const started=now();
      try { renderer.render(scene,camera); }
      catch(error) { ready=false;host.classList.remove("is-helmet-3d");return; }
      const cost=now()-started;
      lastProgress=progress;lastRtl=rtl;dirty=false;draws++;
      // Limit driver/CPU work on slower devices; no timing claim is made from GPU submission alone.
      if(draws>8 && cost>12)slowFrames++;else slowFrames=0;
      if(slowFrames>=6 && quality>1) {quality=Math.max(1,quality-.25);slowFrames=0;dirty=true;}
      if(!host.classList.contains("is-helmet-3d"))host.classList.add("is-helmet-3d");
      if(host.dataset && host.dataset.spHelmetRenderer!=="three")host.dataset.spHelmetRenderer="three";
    }
    function prepare() {
      const token=++generation;
      const complete=function(){if(disposed || lost || token!==generation)return;ready=true;dirty=true;draw();};
      if(renderer.compileAsync) {
        let promise;try{promise=renderer.compileAsync(scene,camera);}catch(error){ready=false;return;}
        Promise.resolve(promise).then(complete,function(){if(!disposed && token===generation){ready=false;host.classList.remove("is-helmet-3d");}});
      } else {if(renderer.compile)renderer.compile(scene,camera);complete();}
    }
    function contextLost(event){event.preventDefault();lost=true;ready=false;generation++;host.classList.remove("is-helmet-3d");}
    function contextRestored(){lost=false;dirty=true;prepare();}
    canvas.addEventListener("webglcontextlost",contextLost);
    canvas.addEventListener("webglcontextrestored",contextRestored);
    resize();prepare();
    return {
      setProgress:function(value,reversed){progress=Math.max(0,Math.min(1,value));rtl=!!reversed;draw();},
      resize:resize,
      dispose:function(){
        if(disposed)return;disposed=true;generation++;
        canvas.removeEventListener("webglcontextlost",contextLost);canvas.removeEventListener("webglcontextrestored",contextRestored);
        model.children.forEach(function(mesh){mesh.geometry.dispose();mesh.material.dispose();});
        renderer.dispose();if(renderer.forceContextLoss)renderer.forceContextLoss();
        host.classList.remove("is-helmet-3d");if(host.dataset)delete host.dataset.spHelmetRenderer;canvas.remove();
      }
    };
  }
  window.SafePermitHelmetScene={create:create,kind:"continuous-three-model",needsThree:true};
})();
