/* Continuous safety hardhat geometry and a lightweight studio material. No image frames. */
(function () {
  "use strict";
  const vertex = `
    varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying float vAO;
    attribute float occlusion;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz; vLocal = position; vAO = occlusion;
      vNormal = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * world;
    }`;
  const fragment = `
    precision highp float;
    varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying float vAO;
    uniform vec3 uColor; uniform float uRoughness; uniform float uFabric;
    // v13.4 studio controls, shared by every helmet material.
    uniform vec3 uKey; uniform float uExposure; uniform float uRim; uniform float uSweep;
    uniform float uScan; uniform float uScanOn; uniform float uTech; uniform vec4 uFocus;
    uniform float uFocusAmt; uniform float uField; uniform float uTime;
    vec3 light(vec3 n, vec3 v, vec3 l, vec3 tint, float strength) {
      vec3 h = normalize(v + l);
      float nl = max(dot(n,l),0.0), nv = max(dot(n,v),0.001), nh = max(dot(n,h),0.0);
      float rough = max(.22,uRoughness), a2 = rough * rough * rough * rough;
      float d = a2 / max(3.141593 * pow(nh * nh * (a2 - 1.0) + 1.0,2.0),.0001);
      float k = (rough + 1.0) * (rough + 1.0) / 8.0;
      float g = (nl / (nl * (1.0-k) + k)) * (nv / (nv * (1.0-k) + k));
      float f = .038 + .962 * pow(1.0-max(dot(v,h),0.0),5.0);
      float spec = min(1.2,d*g*f / max(4.0*nl*nv,.001));
      return tint * strength * nl * (uColor*.8 + vec3(spec));
    }
    void main() {
      vec3 n = normalize(vNormal); if (!gl_FrontFacing) n = -n;
      vec3 v = normalize(cameraPosition-vWorld);
      float nv = max(dot(n,v),0.0);
      vec3 c = uColor * (.24 + .12*max(n.y,0.0));
      c += light(n,v,normalize(uKey),vec3(1.0,.96,.90),1.25);
      c += light(n,v,normalize(vec3(3.7,1.5,2.0)),vec3(.86,.93,1.0),.62);
      c += light(n,v,normalize(vec3(.3,2.8,-3.8)),vec3(1.0,.91,.80),.88);
      vec3 reflected = reflect(-v,n);
      float strip = exp(-pow((reflected.x+.4)/.24,4.0)) * smoothstep(.2,.5,reflected.y);
      c += vec3(.12,.115,.11) * strip * (1.0-uRoughness) * smoothstep(-.25,.3,reflected.z);
      float weave = sin(vLocal.x*180.0)*sin(vLocal.z*180.0);
      c *= vAO * (1.0 + weave*.035*uFabric);
      vec3 footprint = fwidth(vLocal)*130.0;
      float grain = sin(vLocal.x*130.0)*sin(vLocal.y*127.0)*sin(vLocal.z*133.0);
      float filtered = 1.0-smoothstep(.45,1.0,max(footprint.x,max(footprint.y,footprint.z)));
      c *= 1.0 + grain*.055*filtered*(1.0-uFabric);
      if (!gl_FrontFacing) c *= .58;
      // Warm rim light from behind the helmet (studio reveal).
      float fres = pow(1.0-nv,3.0);
      c += vec3(1.0,.62,.30) * fres * uRim * (.35 + .65*smoothstep(-.2,.6,n.y+n.z*.2));
      // A diagonal light sweep travelling across the shell.
      float band = exp(-pow((vWorld.x*.72 + vWorld.y*.55 - uSweep)/.2,2.0));
      c += vec3(1.0,.86,.66) * band * (.18 + .55*pow(nv,2.0)) * (1.0-.6*uFabric);
      // Focus region: everything outside the checkpoint focus falls into shadow.
      float dist = distance(vLocal,uFocus.xyz);
      float inside = 1.0 - smoothstep(uFocus.w*.55,uFocus.w,dist);
      c *= mix(1.0,.42+.58*inside,uFocusAmt);
      // Protection field: contour lines rippling out from the focus point.
      float ripple = abs(fract(dist*6.0 - uTime*.3) - .5);
      float contour = (1.0 - smoothstep(.0,.035,ripple)) * (1.0 - smoothstep(uFocus.w*.45,uFocus.w*.95,dist));
      c += vec3(1.0,.78,.5) * contour * uField * .3 * (1.0-uFabric);
      // Hazard scan band.
      float scan = exp(-pow((vWorld.y-uScan)/.035,2.0));
      float trail = smoothstep(uScan,uScan+.45,vWorld.y) * (1.0-smoothstep(uScan+.45,uScan+.9,vWorld.y)) * .5 + .5;
      float lines = 1.0 - smoothstep(.0,.08,abs(fract(vWorld.y*22.0)-.5));
      c = mix(c, vec3(1.0,.66,.32), clamp(scan*.85 + lines*.08*trail*step(uScan,vWorld.y),0.0,1.0)*uScanOn);
      // Technical blueprint mode: engineering grid and silhouette lines.
      vec3 gridPos = vLocal*7.0;
      vec3 gw = abs(fract(gridPos-.5)-.5)/max(fwidth(gridPos),vec3(.0001));
      float gridLine = 1.0 - clamp(min(min(gw.x,gw.y),gw.z),0.0,1.0);
      float edge = pow(1.0-nv,1.6);
      vec3 blueprint = vec3(.035,.085,.125) + vec3(.48,.76,.98)*(edge*.95 + gridLine*.42) + vec3(1.0,.6,.28)*gridLine*.08;
      c = mix(c, blueprint, uTech);
      c *= uExposure;
      c = c / (1.0+c*.18);
      gl_FragColor = vec4(pow(clamp(c,0.0,1.0),vec3(1.0/2.2)),1.0);
    }`;

  function build(T) {
    const bins = [[], [], []], parts = [], tau = Math.PI * 2;
    function grid(nu, nv, sample, reverse) {
      const positions = [], indices = [];
      for (let j=0;j<=nv;j++) for(let i=0;i<=nu;i++) positions.push.apply(positions,sample(i/nu,j/nv));
      for (let j=0;j<nv;j++) for(let i=0;i<nu;i++) {
        const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;
        indices.push.apply(indices,reverse?[a,c,b,b,c,d]:[a,b,c,b,d,c]);
      }
      const g=new T.BufferGeometry();
      g.setAttribute("position",new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
      const normals=g.attributes.normal;
      for(let j=0;j<=nv;j++) {
        const first=j*(nu+1),last=first+nu;
        const a=first*3,b=last*3;
        if(Math.abs(positions[a]-positions[b])+Math.abs(positions[a+1]-positions[b+1])+Math.abs(positions[a+2]-positions[b+2])<1e-8) {
          const n=new T.Vector3(normals.getX(first)+normals.getX(last),normals.getY(first)+normals.getY(last),normals.getZ(first)+normals.getZ(last)).normalize();
          normals.setXYZ(first,n.x,n.y,n.z);normals.setXYZ(last,n.x,n.y,n.z);
        }
      }
      return g;
    }
    function add(name, geometry, bin, ao) { bins[bin].push({geometry:geometry,ao:ao===undefined?1:ao});parts.push(name); }
    function roundedBox(w,h,depth,r) {
      const s=new T.Shape(),x=-w/2,y=-h/2;
      s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
      s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
      s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
      return new T.ExtrudeGeometry(s,{depth:depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:r*.45,bevelThickness:r*.45,curveSegments:3}).translate(0,0,-depth/2);
    }
    function brim(theta,u,underside) {
      const front=Math.pow(Math.max(0,Math.cos(theta)),7);
      const rx=1.015+.075*u,rz=1.16+(.07+.43*front)*u;
      return [rx*Math.sin(theta),-.055-(.028+.105*front)*u*u+(underside?-.026:0),rz*Math.cos(theta)];
    }
    add("Asymmetric moulded shell and three reinforcing channels",grid(144,52,function(u,v) {
      const theta=u*tau,phi=Math.max(.0001,v*Math.PI/2),radial=Math.pow(Math.sin(phi),.86);
      const x=1.015*radial*Math.sin(theta),z=1.16*radial*Math.cos(theta)-.045*(1-radial);
      let y=1.27*Math.pow(Math.cos(phi),1.12)-.055;
      const fade=Math.min(1,Math.max(0,(y+.015)/.22));
      const channel=.058*Math.exp(-Math.pow(x/.105,6))+.044*Math.exp(-Math.pow((x-.34)/.06,4))+.044*Math.exp(-Math.pow((x+.34)/.06,4));
      y+=channel*fade;
      return [x,y,z];
    },true),0);
    add("Curved front brim",grid(128,10,function(u,v){return brim(u*tau,v,false);},true),0);
    add("Underside of brim",grid(128,4,function(u,v){return brim(u*tau,v,true);}),0,.66);
    add("Closed rolled brim edge",grid(128,4,function(u,v){const p=brim(u*tau,1,false);p[1]-=.026*v;return p;},true),0,.96);
    add("Moulded lower collar",grid(128,4,function(u,v){const t=u*tau;return [1.016*Math.sin(t),-.055+v*.085,1.161*Math.cos(t)];}),0,.88);
    for (const side of [-1,1]) for (const z of [-.64,.07,.65]) {
      const x=side*1.015*Math.sqrt(1-Math.pow(z/1.16,2));
      const socket=roundedBox(.22,.16,.05,.024).rotateY(side*Math.PI/2).translate(x,.026,z);
      add("Accessory mount "+side+":"+z,socket,0,.93);
      const opening=roundedBox(.13,.029,.053,.008).rotateY(side*Math.PI/2).translate(x+side*.025,.073,z);
      add("Accessory slot "+side+":"+z,opening,1,.85);
    }
    add("Interior suspension headband",grid(96,3,function(u,v) {
      const t=u*tau;return [.85*Math.sin(t),-.105-.055*Math.cos(t)+v*.12,.97*Math.cos(t)];
    }),1,.85);
    for (const angle of [Math.PI/4,Math.PI*3/4]) {
      add("Woven crossed suspension strap "+angle,grid(36,2,function(u,v) {
        const length=(u-.5)*1.62,width=(v-.5)*.11;
        return [Math.cos(angle)*length-Math.sin(angle)*width,-.11+Math.sin(u*Math.PI)*.76,Math.sin(angle)*length+Math.cos(angle)*width];
      },true),2,.8);
    }
    add("Rear ratchet housing",roundedBox(.44,.16,.11,.035).translate(0,-.12,-1.01),1,.9);
    add("Rear ratchet wheel",new T.CylinderGeometry(.145,.145,.066,36,1).rotateX(Math.PI/2).translate(0,-.12,-1.09),1);
    add("Ratchet inset",new T.CylinderGeometry(.106,.106,.071,32,1).rotateX(Math.PI/2).translate(0,-.12,-1.094),1,.7);
    for(let i=0;i<24;i++) {
      const a=i/24*tau;
      add("Ratchet grip "+i,new T.BoxGeometry(.025,.029,.061).rotateZ(-a).translate(Math.sin(a)*.145,-.12+Math.cos(a)*.145,-1.09),1,.93);
    }
    function merge(list) {
      const positions=[],normals=[],occlusion=[];
      list.forEach(function(item) {
        const g=item.geometry.index?item.geometry.toNonIndexed():item.geometry;
        for(const value of g.attributes.position.array)positions.push(value);
        for(const value of g.attributes.normal.array)normals.push(value);
        for(let i=0;i<g.attributes.position.count;i++)occlusion.push(item.ao);
        if(g!==item.geometry)g.dispose();item.geometry.dispose();
      });
      const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(positions,3));
      g.setAttribute("normal",new T.Float32BufferAttribute(normals,3));g.setAttribute("occlusion",new T.Float32BufferAttribute(occlusion,1));
      g.computeBoundingSphere();return g;
    }
    const specs=[{name:"Polypropylene shell and moulded details",color:[.97,.205,.027],rough:.31,fabric:0},
      {name:"Suspension frame and rear ratchet",color:[.014,.027,.039],rough:.47,fabric:0},
      {name:"Woven suspension",color:[.015,.024,.036],rough:.82,fabric:1}];
    const group=new T.Group();group.name="SafePermit continuous safety hardhat";
    // One set of studio uniforms drives every material (key light, rim, sweep, scan, focus, blueprint).
    const studio={uKey:{value:new T.Vector3(-2.6,4.0,3.2)},uExposure:{value:1},uRim:{value:0},uSweep:{value:-9},
      uScan:{value:-9},uScanOn:{value:0},uTech:{value:0},uFocus:{value:[0,.5,0,9]},uFocusAmt:{value:0},uField:{value:0},uTime:{value:0}};
    specs.forEach(function(s,i){
      const uniforms=Object.assign({uColor:{value:new T.Vector3(s.color[0],s.color[1],s.color[2])},uRoughness:{value:s.rough},uFabric:{value:s.fabric}},studio);
      const material=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,side:T.DoubleSide,toneMapped:false,uniforms:uniforms});
      const mesh=new T.Mesh(merge(bins[i]),material);mesh.name=s.name;group.add(mesh);
    });
    group.userData.studio=studio;
    // Named points on the real geometry (model space) with an outward normal, used for callouts and focus.
    group.userData.anchors={
      crown:{p:[0,1.27,-.04],n:[0,1,0]},
      ridge:{p:[0,1.03,.69],n:[0,.82,.57]},
      shell:{p:[.65,.81,.42],n:[.62,.55,.56]},
      brim:{p:[0,-.17,1.62],n:[0,-.1,1]},
      mount:{p:[1.03,.03,.07],n:[1,0,.05]},
      side:{p:[-.93,.35,.24],n:[-.93,.1,.3]},
      mountRear:{p:[.83,.03,-.64],n:[.78,0,-.62]},
      suspension:{p:[-.62,-.1,.62],n:[-.7,-.2,.68]},
      ratchet:{p:[0,-.12,-1.13],n:[0,0,-1]}
    };
    group.userData.parts=parts;group.userData.triangles=group.children.reduce(function(n,m){return n+m.geometry.attributes.position.count/3;},0);
    return group;
  }
  window.SafePermitHelmetModel={build:build,vertex:vertex,fragment:fragment};
})();
