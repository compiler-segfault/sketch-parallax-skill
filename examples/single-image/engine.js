(() => {
  'use strict';
  const data=window.AI_CHARACTERS,$=id=>document.getElementById(id),canvas=$('art');
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:true});
  if(!gl){$('loading').textContent='当前浏览器未启用 WebGL2，请启用硬件加速后刷新。';return;}
  const mode=window.INK_MODE||"mixed";const count=data.length,block=4.5,duration=count*block+2,ALIGN=8,HEIGHT=5.8,F=1/Math.tan(42*Math.PI/360);
  const families=data.map((c,i)=>({c:mode==='pages'?[0,0,0]:(c.center||[i%2?7:0,0,-i*6]),yaw:mode==='pages'?0:(c.yaw??(i===0?0:i%2?.20:-.20))}));
  const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(v,k)=>v.map(x=>x*k),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>mul(a,1/(Math.hypot(...a)||1));
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  let selected=0,t=0,playing=false,raf=0,last=0,manual=null,depth=1,ready=false,frames=0;
  const objects=[],audio=new Audio(window.AI_AUDIO||'');audio.preload='none';let sound=false;
  function pose(i,d=ALIGN,orbit=0,lift=0){const f=families[i],a=f.yaw+orbit;return {eye:add(f.c,[Math.sin(a)*d,lift,Math.cos(a)*d]),target:f.c.slice()};}
  const keys=[];
  for(let i=0;i<count;i++){
    const base=i*block,dir=i%2?-1:1;
    keys.push({t:base,...pose(i),stop:true},{t:base+1.1,...pose(i),stop:true});
    if(i<count-1){
      const near=pose(i,1.05,dir*.35,1.8);near.target=add(families[i].c,[0,1.8,0]);
      const middle=pose(i,4.5,dir*.23,.8);middle.target=add(families[i].c,[0,.8,0]);
      const corner=mix(families[i].c,families[i+1].c,.48),next=pose(i+1,6.7,-dir*.12,.12);
      keys.push({t:base+2.0,...middle},{t:base+2.7,...near},
        {t:base+3.35,eye:mix(near.eye,next.eye,.52),target:corner},{t:base+3.95,...next});
    }else keys.push({t:base+3.0,...pose(i,6.4,-.35,.65)},{t:base+5.3,...pose(i,9,-.15,.2)},{t:duration,...pose(i),stop:true});
  }
  function cameraAt(time){
    if(mode==='pages'){const i=Math.min(count-1,Math.floor(time/block)),u=(time-i*block)/block,q=smooth((u-.24)/.76);return pose(i,ALIGN+.25*Math.sin(q*Math.PI),.38*Math.sin(q*Math.PI*2),.22*Math.sin(q*Math.PI));}
    let j=0;while(j<keys.length-2&&time>keys[j+1].t)j++;
    const a=keys[j],b=keys[j+1],p=keys[Math.max(0,j-1)],q=keys[Math.min(keys.length-1,j+2)],dt=b.t-a.t,u=Math.max(0,Math.min(1,(time-a.t)/dt)),u2=u*u,u3=u2*u;
    const calc=field=>a[field].map((v,k)=>{const va=a.stop?0:(b[field][k]-p[field][k])/(b.t-p.t)*.62,vb=b.stop?0:(q[field][k]-a[field][k])/(q.t-a.t)*.62;return (2*u3-3*u2+1)*v+(u3-2*u2+u)*va*dt+(-2*u3+3*u2)*b[field][k]+(u3-u2)*vb*dt});
    return {eye:calc('eye'),target:calc('target')};
  }
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  const vs=`#version 300 es
  precision highp float;layout(location=0) in vec3 local;layout(location=1) in vec2 uv;
  uniform vec3 center,eye,right,up,forward;uniform float yaw,depthScale,focal,aspect;
  out vec2 texUV;out float cameraZ;
  void main(){float z=local.z*depthScale;float k=(8.0-z)/8.0;vec3 p=vec3(local.x*k*cos(yaw)+z*sin(yaw),local.y*k,-local.x*k*sin(yaw)+z*cos(yaw))+center;
  vec3 v=p-eye;float d=dot(v,forward);cameraZ=d;texUV=uv;gl_Position=vec4(dot(v,right)*focal/aspect,dot(v,up)*focal,d*1.004-.2004,d);}`;
  const fs=`#version 300 es
  precision highp float;in vec2 texUV;in float cameraZ;uniform sampler2D image;uniform int roleIndex,subjectIndex;out vec4 color;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  int chooseInk(vec3 c){float L=dot(c,vec3(.299,.587,.114));if(L<.38)return 8;if(c.r>c.b+.05)return 2+int(clamp(floor((L-.38)*5.0),0.0,2.0));if(c.b>c.r+.025)return 10+int(clamp(floor((L-.38)*5.0),0.0,2.0));if(L<.7)return 6;return int(clamp(floor((L-.7)*10.0),0.0,2.0));}
  void main(){if(cameraZ<.11)discard;vec4 p=texture(image,texUV);if(p.a<.012||chooseInk(p.rgb)!=roleIndex)discard;
    float L=dot(p.rgb,vec3(.299,.587,.114)),C=max(p.r,max(p.g,p.b))-min(p.r,min(p.g,p.b));
    float mark=max(clamp((.985-L)/.28,0.0,1.0),clamp(C*4.0,0.0,1.0));p.a*=mark;
    if(p.a<.015)discard;color=p;}`;
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  const loc=Object.fromEntries(['center','eye','right','up','forward','yaw','depthScale','focal','aspect','image','roleIndex','subjectIndex'].map(k=>[k,gl.getUniformLocation(program,k)]));
  gl.useProgram(program);gl.uniform1i(loc.image,0);gl.uniform1f(loc.focal,F);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
  const roles=Array.from({length:14},(_,i)=>'局部笔触 '+(i+1));
  const levels=Array.from({length:14},(_,i)=>(i-6.5)*.23);
  function makeMeshes(i,im){
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.generateMipmap(gl.TEXTURE_2D);
    const w=HEIGHT*im.width/im.height,NX=20,NY=36;
    for(let role=0;role<14;role++){
      const arr=[],z=levels[role];
      for(let y=0;y<NY;y++)for(let x=0;x<NX;x++)for(const [dx,dy] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]]){
        const u=(x+dx)/NX,v=(y+dy)/NY,xx=(u-.5)*w,yy=(.5-v)*HEIGHT;
        const d=z+.16*Math.sin(xx*2.3+role*.7)*Math.sin(yy*1.4)+.055*xx*Math.sin(role*2.3);
        arr.push(xx,yy,d,u,1-v);
      }
      const vao=gl.createVertexArray(),buf=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,20,12);gl.bindVertexArray(null);objects.push({i,role,z,vao,texture,count:arr.length/5});
    }
  }
  function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio,1.5);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);if(ready)renderAt(t);}
  function label(i){selected=i;$('previous').disabled=i===0;$('next').disabled=i===count-1;const c=data[i];document.documentElement.style.setProperty('--accent',c.color);$('name').textContent=c.name;$('tagline').textContent=c.tagline;$('ghost-name').textContent=c.name.toUpperCase();$('chapter').textContent=`${String(i+1).padStart(2,'0')} / ${String(count).padStart(2,'0')}`;document.querySelectorAll('.character').forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));}
  function renderAt(time){
    t=Math.max(0,Math.min(duration,time));const cam=manual||cameraAt(t),forward=norm(sub(cam.target,cam.eye)),right=norm(cross(forward,[0,1,0])),up=norm(cross(right,forward));
    gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);gl.uniform3fv(loc.eye,cam.eye);gl.uniform3fv(loc.right,right);gl.uniform3fv(loc.up,up);gl.uniform3fv(loc.forward,forward);gl.uniform1f(loc.depthScale,depth);gl.uniform1f(loc.aspect,canvas.width/canvas.height);
    const point=o=>add(families[o.i].c,[Math.sin(families[o.i].yaw)*o.z*depth,0,Math.cos(families[o.i].yaw)*o.z*depth]);
    const staged=objects.slice().sort((a,b)=>dot(sub(point(b),cam.eye),forward)-dot(sub(point(a),cam.eye),forward));
    for(const o of staged){if(mode==='pages'&&o.i!==Math.min(count-1,Math.floor(t/block)))continue;const f=families[o.i],v=sub(f.c,cam.eye),z=dot(v,forward);if(z<-4||z>35||Math.abs(dot(v,right))>Math.max(z,0)*canvas.width/canvas.height/F+4)continue;
      gl.uniform1i(loc.roleIndex,o.role);gl.uniform1i(loc.subjectIndex,o.i);gl.uniform3fv(loc.center,f.c);gl.uniform1f(loc.yaw,f.yaw);gl.bindTexture(gl.TEXTURE_2D,o.texture);gl.bindVertexArray(o.vao);gl.drawArrays(gl.TRIANGLES,0,o.count);}
    gl.bindVertexArray(null);label(Math.min(count-1,Math.floor(t/block)));$('seek').value=t;$('clock').textContent=`${t.toFixed(1).padStart(4,'0')} / ${duration.toFixed(1)}`;
    window.__lastFrame={time:t,eye:cam.eye.slice(),target:cam.target.slice(),depth,selected,playing};frames++;return window.__lastFrame;
  }
  function pause(){playing=false;cancelAnimationFrame(raf);raf=0;audio.pause();$('play').textContent=mode==='pages'?'▶ 播放手稿':'▶ 播放穿梭';$('view-state').textContent='自由视角';}
  function play(){if(t>=duration-.05)t=0;manual=null;playing=true;last=performance.now();$('play').textContent=mode==='pages'?'Ⅱ 暂停手稿':'Ⅱ 暂停穿梭';$('view-state').textContent='自动穿梭';if(sound){audio.currentTime=t;audio.play().catch(()=>{});}raf=requestAnimationFrame(tick);}
  function tick(now){if(!playing)return;const dt=now-last;if(dt>=1000/60){last=now;renderAt(Math.min(duration,t+dt/1000));if(t>=duration){pause();return;}}raf=requestAnimationFrame(tick);}
  function select(i){pause();manual=null;renderAt(i*block);}
  function zoom(f){pause();manual=manual||cameraAt(t);const v=sub(manual.eye,manual.target),d=Math.hypot(...v);manual={eye:add(manual.target,mul(v,Math.max(2.3,Math.min(18,d*f))/d)),target:manual.target.slice()};renderAt(t);}
  $('previous').onclick=()=>select(Math.max(0,selected-1));$('next').onclick=()=>select(Math.min(count-1,selected+1));
  $('play').onclick=()=>playing?pause():play();$('reset').onclick=()=>select(selected);$('zoom-in').onclick=()=>zoom(.86);$('zoom-out').onclick=()=>zoom(1.16);
  $('sound').onclick=()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').textContent=sound?'♪ 配乐开':'♪ 配乐关';if(sound&&playing){audio.currentTime=t;audio.play().catch(()=>{});}else audio.pause();};
  $('seek').oninput=e=>{pause();manual=null;renderAt(Number(e.target.value));};
  $('depth').oninput=e=>{depth=Number(e.target.value);$('depth-value').textContent=depth.toFixed(1)+'×';renderAt(t);};
  let pointer=null;canvas.addEventListener('pointerdown',e=>{pause();manual=manual||cameraAt(t);pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y,v=sub(manual.eye,manual.target),dist=Math.hypot(...v),a=Math.atan2(v[0],v[2])-dx*.006,b=Math.max(-.9,Math.min(.9,Math.asin(v[1]/dist)+dy*.004));manual.eye=add(manual.target,[Math.sin(a)*Math.cos(b)*dist,Math.sin(b)*dist,Math.cos(a)*Math.cos(b)*dist]);pointer.x=e.clientX;pointer.y=e.clientY;renderAt(t);});
  ['pointerup','pointercancel'].forEach(type=>canvas.addEventListener(type,()=>pointer=null));canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(e.deltaY*.001));},{passive:false});canvas.addEventListener('dblclick',()=>select(selected));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('resize',resize);
  $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}};
  document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.code==='Space'){e.preventDefault();playing?pause():play();}if(/^[1-8]$/.test(e.key)&&Number(e.key)<=count)select(Number(e.key)-1);if(e.key==='ArrowRight')select((selected+1)%count);if(e.key==='ArrowLeft')select((selected+count-1)%count);if(e.key==='r'||e.key==='R')select(selected);});
  const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  $('seek').max=duration;if(!window.AI_AUDIO){$('sound').disabled=true;$('sound').textContent='未配乐';}
  data.forEach((c,i)=>{const b=document.createElement('button');b.className='character';b.setAttribute('aria-pressed',String(i===0));b.innerHTML=`<img class="portrait" src="${c.image}" alt=""><span><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.tagline||'SKETCH IN SPACE')}</small></span><span class="number">0${i+1}</span>`;b.onclick=()=>select(i);$('characters').append(b);});
  window.__renderAt=seconds=>{manual=null;return renderAt(seconds);};window.__getDuration=()=>duration;window.__selectSubject=select;window.__statistics={version:'desktop-sketch-space-1',mode,portraits:count,semanticLayers:count*14,whiteBodyPlanes:0,fixedWorld:true,photoSwap:false,renderer:mode==='pages'?'independent 3D pages':'shared 3D space',visiblePersonas:mode==='pages'?1:count};window.__sceneSnapshot=()=>objects.map(o=>({family:o.i,role:roles[o.role],depth:o.z,center:families[o.i].c.slice(),yaw:families[o.i].yaw}));window.__interactionState=()=>({mode,playing,selected,depth,frames,width:canvas.width,height:canvas.height});
  async function init(){try{resize();for(let i=0;i<data.length;i++){const im=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=data[i].image;});makeMeshes(i,im);}ready=true;window.__ready=true;$('loading').hidden=true;renderAt(0);}catch(e){window.__error=String(e.stack||e);$('loading').textContent='素材加载失败，请保留完整 assets 文件夹。';}}
  init();
})();



