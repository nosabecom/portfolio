import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const designs=JSON.parse(document.getElementById('design-data').textContent);
const $=id=>document.getElementById(id), root='/engineering-100/', cache=new Map(), viewers=[];
const vec=()=>new THREE.Vector3(), zAxis=new THREE.Vector3(0,0,1);
let activeId='compound',progress=0,explosion=0,playing=false,direction=1,inside=false,comparison=false,tween=null,destroyed=false,loadingFruit=false;
const corners=box=>[...Array(8)].map((_,i)=>new THREE.Vector3(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z));
const friendly=name=>name.replace(/\.par:\d+$/i,'').replace(/^\d+_/,'').replaceAll('_',' ');
async function fetchOK(url){const r=await fetch(url);if(!r.ok)throw new Error(`${r.status}: ${url}`);return r;}
function loadModel(id){
  if(cache.has(id))return cache.get(id);
  const task=(async()=>{
    const data=await(await fetchOK(`${root}${id}/scene.json`)).json(),geometries=new Map();
    await Promise.all(Object.entries(data.meshes).map(async([key,info])=>{
      const buffer=await(await fetchOK(`${root}${id}/${info.file}`)).arrayBuffer();
      if(buffer.byteLength<info.vertices*12)throw new Error('Incomplete mesh');
      const raw=new THREE.BufferGeometry();raw.setAttribute('position',new THREE.BufferAttribute(new Float32Array(buffer,0,info.vertices*3),3));raw.computeVertexNormals();
      const geometry=toCreasedNormals(raw,Math.PI/5);raw.dispose();geometry.computeBoundingBox();geometries.set(key,geometry);
    }));
    const transforms=data.poses.map(pose=>pose.map(a=>{const position=vec(),quaternion=new THREE.Quaternion(),scale=vec();new THREE.Matrix4().fromArray(a).decompose(position,quaternion,scale);return{position,quaternion,scale};}));
    const envelope=new THREE.Box3();
    data.poses.forEach(pose=>pose.forEach((a,i)=>envelope.union(geometries.get(data.occurrences[i].mesh).boundingBox.clone().applyMatrix4(new THREE.Matrix4().fromArray(a)))));
    return{...data,geometries,transforms,envelope};
  })();cache.set(id,task);task.catch(()=>cache.delete(id));return task;
}

// Shelf packing uses each component's projected bounds, including room for its balloon.
// Every occurrence gets its own rectangle, even when several reuse the same part file.
function pack(rects,aspect,gap){
  const sorted=rects.map(r=>({...r,w:Math.max(r.w,.025)+gap,h:Math.max(r.h,.025)+gap})).sort((a,b)=>b.h-a.h||b.w-a.w);
  const area=sorted.reduce((s,r)=>s+r.w*r.h,0),minWidth=Math.max(...sorted.map(r=>r.w));let best=null;
  for(let k=0;k<23;k++){
    const limit=Math.max(minWidth,Math.sqrt(area*aspect)*(.65+k*.065));let x=0,y=0,rowHeight=0,width=0;const placed=[];
    for(const r of sorted){if(x+r.w>limit+1e-8&&x>0){y+=rowHeight;x=0;rowHeight=0;}placed.push({...r,x:x+r.w/2,y:y+r.h/2});x+=r.w;rowHeight=Math.max(rowHeight,r.h);width=Math.max(width,x);}
    const height=y+rowHeight,score=Math.max(width/aspect,height);
    if(!best||score<best.score)best={placed,width,height,score};
  }
  best.placed.forEach(r=>{r.x-=best.width/2;r.y=best.height/2-r.y;});return best;
}

class PressViewer{
  constructor(stage){
    this.stage=stage;this.viewport=stage.querySelector('.viewport');this.canvas=stage.querySelector('canvas');this.labels=stage.querySelector('.part-labels');this.items=[];this.selected='';this.isolate=false;this.token=0;this.view='iso';this.gap=.07;
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,.001,100);this.camera.up.set(0,0,1);
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
    this.controls=new OrbitControls(this.camera,this.canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.minZoom=.2;this.controls.maxZoom=20;this.controls.maxPolarAngle=Math.PI*.96;
    this.controls.addEventListener('change',()=>{this.dirty=true;});
    this.controls.addEventListener('start',()=>{this.gestureRotation=this.camera.quaternion.clone();});
    this.controls.addEventListener('end',()=>{if(explosion>.01&&this.data&&this.gestureRotation?.angleTo(this.camera.quaternion)>.0001){this.layout();this.applyPose();this.fit();}});
    this.scene.add(new THREE.HemisphereLight(0xedf5ff,0x253332,2.3));
    const key=new THREE.DirectionalLight(0xfff4df,3.2);key.position.set(3,-4,5);this.scene.add(key);
    const rim=new THREE.DirectionalLight(0xd7ecff,2.2);rim.position.set(-3,2,3);this.scene.add(rim);
    this.group=new THREE.Group();this.scene.add(this.group);
    this.grid=new THREE.GridHelper(3,24,0x41524d,0x30403e);this.grid.rotation.x=Math.PI/2;this.grid.material.transparent=true;this.grid.material.opacity=.3;this.scene.add(this.grid);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.viewport);
    this.setView('iso');
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.fail('3D paused. Reload to restore.');});
  }
  async load(id){
    const token=++this.token;this.stage.classList.remove('ready','failed');this.stage.querySelector('.loading').textContent='Loading model…';this.stage.querySelector('.component-count').textContent=`${designs.find(d=>d.id===id).occurrences} components`;
    try{
      const data=await loadModel(id);if(token!==this.token||destroyed)return;
      this.items.forEach(i=>{i.mesh.material.dispose();for(const edge of i.mesh.children){edge.geometry.dispose();edge.material.dispose();}});this.group.clear();this.labels.replaceChildren();this.items=[];this.data=data;this.id=id;this.selected='';this.isolate=false;
      data.occurrences.forEach((occ,index)=>{
        const material=new THREE.MeshStandardMaterial({color:new THREE.Color().setRGB(...occ.color,THREE.SRGBColorSpace),metalness:.2,roughness:.49,side:THREE.DoubleSide});
        const mesh=new THREE.Mesh(data.geometries.get(occ.mesh),material);this.group.add(mesh);
        if(Math.max(...occ.color)<.15){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,35),new THREE.LineBasicMaterial({color:0x637973,transparent:true,opacity:.65}));mesh.add(edge);}
        const balloon=document.createElement('button');balloon.type='button';balloon.className='part-balloon';balloon.textContent=String(index+1).padStart(2,'0');balloon.title=`${index+1}. ${friendly(occ.name)}`;balloon.setAttribute('aria-label',balloon.title);balloon.setAttribute('aria-pressed','false');balloon.hidden=true;
        balloon.addEventListener('click',()=>{this.selected=String(index);if(this===viewers[0]){$('part-select').value=this.selected;$('part-hint').textContent=friendly(occ.name);}this.applyPose();});this.labels.append(balloon);
        this.items.push({mesh,occ,index,balloon,original:material.color.clone(),offset:vec()});
      });
      const size=data.envelope.getSize(vec()),centre=data.envelope.getCenter(vec());this.unit=1/Math.max(size.x,size.y,size.z);this.group.scale.setScalar(this.unit);this.group.position.copy(centre).multiplyScalar(-this.unit);this.group.updateMatrixWorld(true);
      this.envelope=data.envelope.clone().applyMatrix4(this.group.matrixWorld);this.grid.position.z=this.envelope.min.z-.008;
      this.stage.querySelector('.component-count').textContent=`${this.items.length} components`;
      this.stage.dataset.model=id;this.stage.dataset.loaded='true';this.stage.classList.add('ready');this.resize();this.setView('iso');this.applyPose();this.layout();this.applyPose();this.fit();
      this.canvas.setAttribute('aria-label',`Interactive ${designs.find(d=>d.id===id).name}`);
      if(this===viewers[0])populateParts();
    }catch(error){if(token!==this.token)return;console.error(error);this.fail('Model unavailable. Solid Edge captures and downloads are below.');}
  }
  fail(message){this.stage.classList.remove('ready');this.stage.classList.add('failed');this.stage.querySelector('.loading').textContent=message;}
  resize(){
    const{width,height}=this.viewport.getBoundingClientRect();if(!width||!height)return;this.width=width;this.height=height;this.aspect=width/height;this.renderer.setSize(width,height,false);
    if(this.data){this.layout();this.applyPose();this.fit();}this.dirty=true;
  }
  setView(view){
    this.view=view;const d=view==='front'?new THREE.Vector3(0,-1,0):view==='top'?new THREE.Vector3(0,-.0001,1):loadingFruit&&this.id==='twist'?new THREE.Vector3(.8,-1.8,2.4):new THREE.Vector3(1.1,-1.8,1.05);
    this.controls.target.set(0,0,0);this.camera.position.copy(d.normalize().multiplyScalar(10));this.camera.zoom=1;this.controls.update();this.camera.updateMatrixWorld(true);
    if(this.data){this.layout();this.applyPose();this.fit();}this.dirty=true;
  }
  basePose(){
    if(!this.data)return;const at=progress*(this.data.transforms.length-1),lo=Math.floor(at),hi=Math.min(lo+1,this.data.transforms.length-1),f=at-lo;
    this.items.forEach(item=>{
      const a=this.data.transforms[lo][item.index],b=this.data.transforms[hi][item.index];item.mesh.position.copy(a.position).lerp(b.position,f);item.mesh.scale.copy(a.scale);
      if(Math.abs(item.occ.spin)>.01){const angle=item.occ.spin*progress,c=item.occ.spinCenter;if(c){const first=this.data.transforms[0][item.index].position,x=first.x-c[0],y=first.y-c[1];item.mesh.position.x=c[0]+x*Math.cos(angle)-y*Math.sin(angle);item.mesh.position.y=c[1]+x*Math.sin(angle)+y*Math.cos(angle);}item.mesh.quaternion.setFromAxisAngle(zAxis,angle).multiply(this.data.transforms[0][item.index].quaternion);}else item.mesh.quaternion.copy(a.quaternion).slerp(b.quaternion,f);
      if(loadingFruit&&this.id==='twist'&&item.index===3)item.mesh.position.add(new THREE.Vector3(.11,.015,.11));
    });this.group.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);
  }
  projectBox(box,matrix){
    const out=new THREE.Box3();for(const p of corners(box)){if(matrix)p.applyMatrix4(matrix);p.applyMatrix4(this.camera.matrixWorldInverse);out.expandByPoint(p);}return out;
  }
  itemBox(item){return this.projectBox(item.mesh.geometry.boundingBox,item.mesh.matrixWorld);}
  layout(){
    if(!this.data||!this.aspect)return;this.basePose();
    const rects=this.items.map(item=>{const b=this.itemBox(item);return{index:item.index,w:b.max.x-b.min.x,h:b.max.y-b.min.y,cx:(b.max.x+b.min.x)/2,cy:(b.max.y+b.min.y)/2};});
    let gap=.07,packed;
    for(let pass=0;pass<4;pass++){packed=pack(rects,this.aspect,gap);gap=Math.max(.06,packed.score*1.16*34/this.height);}
    this.gap=gap;const right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1);
    for(const placed of packed.placed){const r=rects[placed.index];this.items[placed.index].offset.copy(right).multiplyScalar(placed.x-r.cx).addScaledVector(up,placed.y-r.cy);}
  }
  applyPose(){
    if(!this.data)return;this.controls.enableDamping=explosion<.001;this.basePose();
    this.items.forEach(item=>{
      item.mesh.position.addScaledVector(item.offset,explosion/this.unit);const selected=this.selected===String(item.index);item.mesh.visible=!this.isolate||this.selected===''||selected;
      const shell=/basket|strainer|collar|container|guard|funnel/.test((item.occ.name+' '+item.occ.mesh).toLowerCase());
      let opacity=explosion>.95?1:item.occ.opacity<.9?Math.max(item.occ.opacity,.4):1;if(inside&&shell&&explosion<.95)opacity=.14;if(selected)opacity=1;
      const m=item.mesh.material;m.opacity=opacity;m.transparent=opacity<.99;m.depthWrite=opacity>.85;m.color.copy(selected?new THREE.Color(0xc9e1a5):item.original);m.emissive.setHex(selected?0x18230c:0);item.mesh.renderOrder=opacity<.99?1:0;
    });this.group.updateMatrixWorld(true);this.grid.visible=explosion<.05;
    if(this.id&&this.stage.id==='stage-secondary')this.stage.querySelector('.secondary-readout').textContent=readout(this.id);
    this.stage.dataset.progress=progress.toFixed(3);this.stage.dataset.explosion=explosion.toFixed(3);this.stage.dataset.loadingFruit=String(loadingFruit&&this.id==='twist');this.dirty=true;
  }
  fit(){
    if(!this.data||!this.aspect)return;this.group.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);
    const bounds=new THREE.Box3();
    if(explosion<.001&&!this.isolate&&!(loadingFruit&&this.id==='twist'))bounds.copy(this.projectBox(this.envelope));else this.items.filter(i=>i.mesh.visible).forEach(i=>bounds.union(this.itemBox(i)));
    if(bounds.isEmpty())return;
    const cx=(bounds.min.x+bounds.max.x)/2,cy=(bounds.min.y+bounds.max.y)/2;
    const shift=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0).multiplyScalar(cx).addScaledVector(new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1),cy);
    this.camera.position.add(shift);this.controls.target.add(shift);
    const padding=explosion>.001?this.gap*.9:.04,halfH=Math.max((bounds.max.y-bounds.min.y)/2+padding,((bounds.max.x-bounds.min.x)/2+padding)/this.aspect)*1.1;
    this.camera.left=-halfH*this.aspect;this.camera.right=halfH*this.aspect;this.camera.top=halfH;this.camera.bottom=-halfH;this.camera.zoom=1;this.camera.updateProjectionMatrix();this.controls.update();this.camera.updateMatrixWorld(true);this.dirty=true;
  }
  labelsAndDiagnostics(){
    this.camera.updateMatrixWorld(true);let clipped=0;const rects=[];
    this.items.forEach(item=>{
      const visible=item.mesh.visible&&explosion>.97;item.balloon.hidden=!visible;item.balloon.setAttribute('aria-pressed',String(this.selected===String(item.index)));if(!item.mesh.visible)return;
      const b=this.itemBox(item);const p=new THREE.Vector3((b.min.x+b.max.x)/2,b.max.y+this.gap*.32,(b.min.z+b.max.z)/2).applyMatrix4(this.camera.matrixWorld).project(this.camera);
      item.balloon.style.left=`${(p.x+1)*this.width/2}px`;item.balloon.style.top=`${(1-p.y)*this.height/2}px`;
      const a=new THREE.Vector3(b.min.x,b.min.y,b.min.z).applyMatrix4(this.camera.matrixWorld).project(this.camera),c=new THREE.Vector3(b.max.x,b.max.y,b.max.z).applyMatrix4(this.camera.matrixWorld).project(this.camera);
      if(a.x< -1||a.y< -1||c.x>1||c.y>1)clipped++;
      rects.push({index:item.index,minX:a.x,maxX:c.x,minY:a.y,maxY:c.y});
    });
    this.stage.dataset.clippedParts=String(clipped);this.stage.dataset.visibleParts=String(rects.length);this.stage.dataset.rects=JSON.stringify(rects);
  }
  tick(){if(this.stage.hidden||!this.data)return;this.controls.update();if(this.dirty){this.renderer.render(this.scene,this.camera);this.labelsAndDiagnostics();this.dirty=false;}}
  dispose(){this.resizeObserver.disconnect();this.controls.dispose();this.renderer.dispose();}
}

function populateParts(){const v=viewers[0];$('part-select').replaceChildren(new Option('All components',''));v.items.forEach(i=>$('part-select').add(new Option(`${String(i.index+1).padStart(2,'0')} · ${friendly(i.occ.name)}`,String(i.index))));$('isolate').checked=false;$('part-hint').textContent='';}
function readout(id){if(id==='hybrid-pedestal')return`${(163.537420985*progress).toFixed(1)} mm plate drop`;if(id==='hybrid-geared-jar')return`${(74*progress).toFixed(1)} mm · ${(148*progress).toFixed(1)} turns`;if(id==='compound')return`${(163.537420985*progress).toFixed(1)} mm plate drop`;if(id==='geared')return`${(400*progress).toFixed(1)} mm · ${(200*progress).toFixed(1)} turns`;if(id==='twist'&&loadingFruit)return 'Lid removed · load berries';if(id==='twist')return`${(24*progress).toFixed(1)} mm · ${(4*progress).toFixed(2)} turns`;return`${(75*(1-progress)).toFixed(1)}° hinge opening`;}
function update({layout=false,fit=false}={}){
  $('state-loading').setAttribute('aria-pressed',String(loadingFruit));
  $('motion').value=String(Math.round(progress*1000));$('motion-value').textContent=`${Math.round(progress*100)}%`;$('state-readout').textContent=readout(activeId);$('explode').value=String(Math.round(explosion*100));$('explode-value').textContent=`${Math.round(explosion*100)}%`;$('explode-toggle').setAttribute('aria-pressed',String(explosion>.5));$('explode-toggle').textContent=explosion>.5?'Reassemble':'Explode';
  viewers.forEach(v=>{if(layout)v.layout();v.applyPose();if(fit)v.fit();});
}
function pause(){playing=false;$('play').setAttribute('aria-pressed','false');$('play').textContent='▶ Play';}
function choose(id){
  const d=designs.find(d=>d.id===id);if(!d)return;activeId=id;pause();tween=null;loadingFruit=false;progress=0;explosion=0;inside=false;$('inside').checked=false;$('isolate').checked=false;
  document.querySelectorAll('[data-model]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.model===id)));$('design-panel').setAttribute('aria-labelledby',`tab-${id}`);document.querySelector('[data-stage-name]').textContent=d.name;$('stage-owner').textContent=d.owner;
  $('state-loading').hidden=id!=='twist';$('loading-figure').hidden=id!=='twist';$('model-stats').textContent=`${d.parts} unique parts · ${d.occurrences} components`;$('active-download').href=`${root}downloads/${d.download}`;$('part-hint').textContent='';$('part-select').replaceChildren(new Option('Loading…',''));
  $('state-open').textContent=d.openLabel||'Open';
  const fallback=$('stage-primary').querySelector('.fallback');fallback.src=`${root}${d.preview}`;fallback.alt=`${d.name} in Solid Edge`;
  $('capture-name').textContent=d.name;$('sketch-figure').hidden=!d.sketch;if(d.sketch){$('sketch-image').src=`${root}${d.sketch}`;$('sketch-image').alt=`Original ${d.name} sketch`;$('sketch-link').href=`${root}${d.sketch}`;}
  $('cad-open').src=`${root}${id}/solid-edge-open.webp`;$('cad-open').alt=`${d.name} open in Solid Edge`;$('cad-open-link').href=$('cad-open').src;
  $('closed-figure').hidden=id==='geared';$('video-figure').hidden=id!=='geared';$('cad-video').pause();if(id!=='geared'){$('cad-closed').src=`${root}${id}/solid-edge-closed.webp`;$('cad-closed').alt=`${d.name} pressed in Solid Edge`;$('cad-closed-link').href=$('cad-closed').src;}
  viewers[0]?.load(id);update();setCameraButtons('iso');const url=new URL(location.href);url.searchParams.set('design',id);history.replaceState(null,'',url);
}
function setCameraButtons(view){document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));}
try{viewers.push(new PressViewer($('stage-primary')));}catch(error){console.error(error);$('stage-primary').classList.add('failed');$('stage-primary').querySelector('.loading').textContent='3D unavailable. Use the Solid Edge captures below.';['play','motion','explode','explode-toggle','inside','isolate','part-select','compare-toggle'].forEach(id=>$(id).disabled=true);}
document.querySelectorAll('[data-model]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.model)));
document.querySelector('.design-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const buttons=[...document.querySelectorAll('[data-model]')],i=buttons.findIndex(b=>b.dataset.model===activeId),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;e.preventDefault();buttons[next].focus();choose(buttons[next].dataset.model);});
document.querySelectorAll('[data-explore]').forEach(b=>b.addEventListener('click',()=>{choose(b.dataset.explore);$('explore').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{viewers.forEach(v=>v.setView(b.dataset.view));setCameraButtons(b.dataset.view);}));
$('fit').addEventListener('click',()=>viewers.forEach(v=>{v.layout();v.applyPose();v.fit();}));
$('motion').addEventListener('input',e=>{pause();tween=null;const wasLoading=loadingFruit;loadingFruit=false;progress=Number(e.target.value)/1000;update({layout:explosion>0,fit:explosion>0||wasLoading});});
$('state-open').addEventListener('click',()=>{pause();const wasLoading=loadingFruit;loadingFruit=false;progress=0;update({layout:explosion>0,fit:explosion>0||wasLoading});});
$('state-pressed').addEventListener('click',()=>{pause();const wasLoading=loadingFruit;loadingFruit=false;progress=1;update({layout:explosion>0,fit:explosion>0||wasLoading});});
$('state-loading').addEventListener('click',()=>{pause();tween=null;loadingFruit=!loadingFruit;progress=0;explosion=0;inside=false;$('inside').checked=false;$('isolate').checked=false;$('part-select').value='';$('part-hint').textContent='';viewers.forEach(v=>{v.selected='';v.isolate=false;v.setView('iso');});setCameraButtons('iso');update({layout:true,fit:true});});
$('play').addEventListener('click',()=>{if(playing)return pause();tween=null;loadingFruit=false;explosion=0;viewers.forEach(v=>{v.selected='';v.isolate=false;});$('part-select').value='';$('isolate').checked=false;if(progress>=1)progress=0;direction=1;playing=true;$('play').setAttribute('aria-pressed','true');$('play').textContent='Ⅱ Pause';update({fit:true});});
$('explode-toggle').addEventListener('click',()=>{pause();loadingFruit=false;inside=false;$('inside').checked=false;viewers.forEach(v=>{v.selected='';v.isolate=false;v.layout();});$('part-select').value='';$('isolate').checked=false;$('part-hint').textContent='';tween={from:explosion,to:explosion>.5?0:1,start:performance.now(),duration:matchMedia('(prefers-reduced-motion: reduce)').matches?1:950};});
$('explode').addEventListener('input',e=>{pause();tween=null;loadingFruit=false;const next=Number(e.target.value)/100;if(explosion===0&&next>0)viewers.forEach(v=>v.layout());explosion=next;update({fit:true});});
$('inside').addEventListener('change',e=>{inside=e.target.checked;update();});
$('part-select').addEventListener('change',e=>{const v=viewers[0];if(!v)return;v.selected=e.target.value;const item=v.items.find(i=>String(i.index)===v.selected);$('part-hint').textContent=item?friendly(item.occ.name):'';update({fit:v.isolate});});
$('isolate').addEventListener('change',e=>{if(!viewers[0])return;viewers[0].isolate=e.target.checked;update({fit:true});});
$('reset').addEventListener('click',()=>{pause();tween=null;loadingFruit=false;progress=0;explosion=0;inside=false;$('inside').checked=false;$('isolate').checked=false;$('part-select').value='';$('part-hint').textContent='';viewers.forEach(v=>{v.selected='';v.isolate=false;v.setView('iso');});setCameraButtons('iso');update({fit:true});});
$('compare-toggle').addEventListener('click',()=>{comparison=!comparison;$('compare-toggle').setAttribute('aria-pressed',String(comparison));$('compare-toggle').textContent=comparison?'− Close comparison':'＋ Compare';$('stage-secondary').hidden=!comparison;$('stages').classList.toggle('comparing',comparison);if(comparison){if(!viewers[1]){try{viewers.push(new PressViewer($('stage-secondary')));}catch(e){console.error(e);$('stage-secondary').querySelector('.loading').textContent='Second viewer unavailable.';}}if(viewers[1]?.id!==$('compare-model').value)viewers[1]?.load($('compare-model').value);}requestAnimationFrame(()=>viewers.forEach(v=>v.resize()));});
$('compare-model').addEventListener('change',e=>viewers[1]?.load(e.target.value));
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
let last=performance.now();function animate(now){if(destroyed)return;const dt=Math.min((now-last)/1000,.05);last=now;if(tween){const t=Math.min((now-tween.start)/tween.duration,1),ease=t*t*(3-2*t);explosion=tween.from+(tween.to-tween.from)*ease;update({fit:true});if(t===1)tween=null;}if(playing&&viewers[0]?.data){progress+=direction*dt/(activeId==='geared'?24:7);if(progress>=1){progress=1;direction=-1;}if(progress<=0){progress=0;direction=1;}update();}viewers.forEach(v=>v.tick());requestAnimationFrame(animate);}
window.addEventListener('pagehide',()=>{destroyed=true;viewers.forEach(v=>v.dispose());});
const requested=new URLSearchParams(location.search).get('design');choose(designs.some(d=>d.id===requested)?requested:designs[0].id);requestAnimationFrame(animate);
