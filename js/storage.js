/* ========= storage =========
   cloud : Supabase — สิทธิ์ต่อเอกสาร (เจ้าของกำหนดผู้อ่าน/ผู้แก้ไข) ดู supabase/schema.sql
   local : IndexedDB in this browser, used when config.js has no Supabase keys (try-out / offline) */
let S=null; const IMG=new Map(); const IMGDATA=new Map(); let IDBH=null, memOnly=false, saveT=null;
const CFG=window.APP_CONFIG||{};
const BUCKET='inspection-images';
const MODE={kind:'local',sb:null,uid:'',email:'',admin:false,ready:true,loginUi:false,_ro:false,snap:new Map(),acl:new Map(),busy:false,dirty:false,pending:0,
  /* ro = มุมมองปัจจุบันแก้ไขไม่ได้ — คิดจากหน้าต่างบนสุดที่เปิดอยู่ (data-ro) ถ้าไม่มีก็คิดจากหน้าปัจจุบัน */
  get ro(){const ov=document.querySelectorAll('.ov');if(ov.length){const t=ov[ov.length-1].dataset.ro;if(t!==undefined)return t==='1'}return routeRO()},
  set ro(v){this._ro=v},
  get owner(){return !this.ro}};
const ACLCOLS='collection,id,grp,owner_id,owner_email,access,readers,editors';
function routeRO(){
  if(MODE.kind!=='cloud')return false;
  if(!MODE.uid||!MODE.ready)return true;
  if(UI.route==='req'){const r=curReq();return r?!canEditReq(r):true}
  if(UI.route==='settings')return !MODE.admin;
  return false;
}
/* สิทธิ์ต่อเอกสาร */
function canEditKey(c,id){
  if(MODE.kind!=='cloud')return true;if(!MODE.uid)return false;
  const a=MODE.acl.get(c+'/'+id);if(c==='meta')return MODE.admin;
  if(!a)return true;                                   // เอกสารใหม่ที่เราเพิ่งสร้าง ยังไม่ซิงก์
  return MODE.admin||a.owner_id===MODE.uid||(a.editors||[]).includes(MODE.email);
}
function isOwnerKey(c,id){
  if(MODE.kind!=='cloud')return true;if(!MODE.uid)return false;const a=MODE.acl.get(c+'/'+id);
  return !a||MODE.admin||a.owner_id===MODE.uid;
}
const canEditReq=r=>canEditKey('requests',rootId(r));
const canEditPlan=l=>canEditKey('plans',l.id);
const docKey=d=>d.qc?['defects',d.id]:['requests',d.rootId];
const canEditDefect=d=>canEditKey(...docKey(d));
const canCreate=()=>MODE.kind!=='cloud'||(!!MODE.uid&&MODE.ready);
const grpOf=(c,o)=>c==='requests'?(o.rootId||o.id):c==='defects'?(o.qc?o.id:(o.rootId||o.id)):c==='plans'?(o.fileId||o.id):c==='access'?o.id:'';
async function allocNo(kind,start){
  if(MODE.kind!=='cloud')return null;
  if(MODE.offline){toast('ออฟไลน์: ใช้เลขที่ชั่วคราวจากเครื่อง อาจซ้ำกับคนอื่น ตรวจเลขหลังซิงก์',6000);return null}
  let r;try{r=await MODE.sb.rpc('next_no',{p_k:kind,p_start:start||1})}catch(e){r={error:e}}
  if(r.error){if(isDenied(r.error))throw r.error;toast('สัญญาณอ่อน: ใช้เลขที่ชั่วคราวจากเครื่อง อาจซ้ำกับคนอื่น ตรวจเลขหลังซิงก์',6000);return null}
  return r.data;
}
/* image id -> something an <img>/<image href> can load */
const imgSrc=id=>{
  if(!id)return'';const v=IMGDATA.get(id)||IMG.get(id);if(v)return v;
  if(id==='logo')return'assets/logo.png';if(id==='sig')return'assets/signature.png';
  if(MODE.kind==='cloud')return String(CFG.SUPABASE_URL).replace(/\/$/,'')+'/storage/v1/object/public/'+BUCKET+'/'+encodeURIComponent(id);
  return'';
};
function openIDB(){return new Promise((res,rej)=>{try{const q=indexedDB.open('inspection-desk-v1',1);q.onupgradeneeded=()=>{q.result.createObjectStore('kv');q.result.createObjectStore('img')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)}catch(e){rej(e)}})}
const idbReq=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function readLocal(){
  const h=await openIDB();const tx=h.transaction(['kv','img'],'readonly');
  const st=await idbReq(tx.objectStore('kv').get('state'));const imgs=new Map();
  await new Promise((res,rej)=>{const c=tx.objectStore('img').openCursor();c.onsuccess=()=>{const cur=c.result;if(cur){imgs.set(cur.key,cur.value);cur.continue()}else res()};c.onerror=()=>rej(c.error)});
  return{h,st,imgs};
}
async function loadAll(){try{const l=await readLocal();IDBH=l.h;S=l.st;l.imgs.forEach((v,k)=>IMG.set(k,v))}catch(e){memOnly=true;S=null}}
const setSS=t=>{const e=$('#savestate');if(e)e.textContent=t};
function save(){if(MODE.kind==='cloud'?!MODE.uid:MODE.ro)return;clearTimeout(saveT);saveT=setTimeout(saveNow,MODE.kind==='cloud'?1200:350);setSS('กำลังบันทึก…');
  if(MODE.kind==='cloud'){clearTimeout(stashT);stashT=setTimeout(()=>{try{stashDirty(docsOf())}catch(e){}},1500)}}   // สำรองลงเครื่องทันที กันรีหน้า/ปิดแท็บก่อนส่งขึ้นคลาวด์
let stashT=null;
function flushNow(){if(MODE.kind==='cloud'&&MODE.uid){clearTimeout(saveT);try{stashDirty(docsOf())}catch(e){}cloudFlush()}else if(MODE.kind!=='cloud'&&!MODE.ro){clearTimeout(saveT);saveNow()}}
if(typeof window!=='undefined'){window.addEventListener('pagehide',flushNow);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){flushNow();if(MODE.kind==='cloud'&&MODE.uid)setTimeout(()=>refreshCache(true),1500)}})}
function docsOf(){const m=new Map();m.set('meta/project',S.project);S.library.forEach(l=>m.set('plans/'+l.id,l));S.requests.forEach(r=>m.set('requests/'+r.id,r));S.defects.forEach(d=>m.set('defects/'+d.id,d));(S.access||[]).forEach(a=>m.set('access/'+a.id,a));return m}
const splitKey=k=>{const i=k.indexOf('/');return[k.slice(0,i),k.slice(i+1)]};
const isDenied=e=>e&&(e.code==='42501'||/row-level security|permission denied|not authorized|no permission|login required|only owner|admin only/i.test((e.message||'')));
function cloudError(e){
  const msg=(e&&e.message)||String(e);
  if(isDenied(e)){setSS('ไม่มีสิทธิ์แก้ไข');toast('คุณไม่มีสิทธิ์แก้ไขรายการนี้ (หรือยังไม่ได้เข้าสู่ระบบ)',5000);return}
  setSS('บันทึกไม่สำเร็จ');toast('บันทึกขึ้น Supabase ไม่สำเร็จ: '+msg,6000);
}
/* อัปเดตข้อมูลสำรองสำหรับเปิดแบบออฟไลน์/โหมดหน้างานให้ตรงกับงานล่าสุดทุกครั้งที่ส่งสำเร็จ (เดิมอัปเดตเฉพาะตอนโหลดจากเซิร์ฟเวอร์ ทำให้เปิดใหม่แล้วเห็นข้อมูลเก่า รายการที่เพิ่งเพิ่มหาย) */
let cacheT=0;
function refreshCache(force){if(!force&&Date.now()-cacheT<30000)return;cacheT=Date.now();try{const rows=[];docsOf().forEach((o,k)=>{const[c,id]=splitKey(k);const a=MODE.acl.get(k)||{};rows.push({collection:c,id,data:o,grp:a.grp||grpOf(c,o),owner_id:a.owner_id||MODE.uid,owner_email:a.owner_email||MODE.email,access:a.access||'members',readers:a.readers||[],editors:a.editors||[]})});obPut('cache','rows:'+(MODE.uid||'anon'),JSON.parse(JSON.stringify(rows)))}catch(e){}}
async function cloudFlush(){
  if(MODE.busy){MODE.dirty=true;return}
  MODE.busy=true;let denied=0;
  try{do{MODE.dirty=false;const docs=docsOf();await stashDirty(docs);
      for(const[k,o]of docs){const str=JSON.stringify(o);if(MODE.snap.get(k)===str)continue;
        const[c,id]=splitKey(k);if(!canEditKey(c,id)){denied++;MODE.snap.set(k,str);continue}
        const{data,error}=await MODE.sb.from('docs').upsert({collection:c,id,data:o,grp:grpOf(c,o)},{onConflict:'collection,id'}).select(ACLCOLS);
        if(error){if(isDenied(error)){denied++;MODE.snap.set(k,str);continue}throw error}
        MODE.snap.set(k,str);if(data&&data[0])MODE.acl.set(k,data[0])}
      for(const k of [...MODE.snap.keys()].filter(k=>!docs.has(k))){const[c,id]=splitKey(k);
        const{data,error}=await MODE.sb.from('docs').delete().eq('collection',c).eq('id',id).select('id');
        if(error){if(isDenied(error)){denied++;continue}throw error}
        if(!data||!data.length)denied++;else{MODE.snap.delete(k);MODE.acl.delete(k)}}
    }while(MODE.dirty);
    await obClear('docs');MODE.netFail=0;refreshCache();updNetStatus();
  }catch(e){
    if(isDenied(e))cloudError(e);
    else{MODE.netFail=(MODE.netFail||0)+1;if(MODE.netFail===1)toast('สัญญาณอ่อน/ส่งไม่สำเร็จ — งานเก็บไว้ในเครื่องแล้ว ระบบจะลองส่งใหม่เอง',6000);updNetStatus();scheduleRetry()}}
  MODE.busy=false;
  if(denied){toast('มีรายการที่คุณไม่มีสิทธิ์แก้ไข ระบบโหลดข้อมูลล่าสุดแทน',5000);await reloadCloud()}
}
async function saveNow(){
  if(MODE.kind==='cloud'){if(MODE.uid)return cloudFlush();return}
  if(MODE.ro)return;
  if(!IDBH)return;
  try{const tx=IDBH.transaction('kv','readwrite');tx.objectStore('kv').put(S,'state');await new Promise((r,j)=>{tx.oncomplete=r;tx.onerror=()=>j(tx.error)});setSS('บันทึกในเครื่องแล้ว')}
  catch(e){setSS('บันทึกไม่สำเร็จ')}
}
function dataUrlToBlob(url){const[h,b]=url.split(',');const mime=(h.match(/:(.*?);/)||[])[1]||'image/jpeg';const bin=atob(b);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type:mime})}
/* images: the data URL stays in memory for this session; cloud mode also uploads it to the Storage bucket (id = file name) */
async function putImage(url,id){
  id=id||('im'+uid());IMGDATA.set(id,url);
  if(MODE.kind==='cloud'){await obPut('img',id,url);queueImage(id,url);return id}   // เก็บลงเครื่องก่อน แล้วอัปโหลดเบื้องหลังพร้อมลองใหม่เมื่อสัญญาณอ่อน
  IMG.set(id,url);
  if(IDBH){try{const tx=IDBH.transaction('img','readwrite');tx.objectStore('img').put(url,id)}catch(e){}}
  return id;
}
const reqImageIds=r=>r?[...(r.plans||[]).map(p=>p.imgId),...(r.photos||[]).map(p=>p.imgId),r.cover&&r.cover.imgId].filter(Boolean):[];
const projectImageIds=()=>[S.project.logoId,S.project.sigId,S.project.reqSigId,S.project.engSigId,...S.library.map(l=>l.imgId)];
/* make sure every id has a data: URL (SVG pages are rasterised for PDF / standalone HTML) */
async function ensureData(ids,png){
  for(const id of ids){if(!id||IMGDATA.has(id)||(IMG.has(id)&&String(IMG.get(id)).startsWith('data:')))continue;
    try{const s=imgSrc(id);const im=await loadImgEl(/^https?:/.test(s)?s+(s.includes('?')?'&':'?')+'cors=1':s);
      const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext('2d');
      if(!png){x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height)}x.drawImage(im,0,0);IMGDATA.set(id,c.toDataURL(png?'image/png':'image/jpeg',.92))}catch(e){}}
}
async function gcImages(){
  if(!IDBH||MODE.kind!=='local')return;const used=new Set(['logo','sig']);
  const add=id=>id&&used.add(id);
  S.library.forEach(p=>{add(p.imgId);add(p.srcId)});S.requests.forEach(r=>reqImageIds(r).forEach(add));qcImageIds().forEach(add);add(S.project.logoId);add(S.project.sigId);add(S.project.reqSigId);add(S.project.engSigId);
  const tx=IDBH.transaction('img','readwrite');
  for(const k of [...IMG.keys()]){if(!used.has(k)){IMG.delete(k);tx.objectStore('img').delete(k)}}
}
/* ----- cloud: load / live updates / auth ----- */
function fillState(p,lib,rq,df,ac){S={project:p||defaultProject(),library:lib||[],requests:rq||[],defects:df||[],access:ac||[]}}
/* Supabase ตอบกลับสูงสุด 1,000 แถวต่อครั้ง (ตั้งโดยเซิร์ฟเวอร์) ต้องดึงทีละหน้าและเรียงลำดับให้คงที่ ไม่งั้นแถวใหม่ๆ จะถูกตัดทิ้งเงียบๆ เมื่อเอกสารเกิน 1,000 */
async function fetchAllDocs(){
  const cols='collection,id,data,'+ACLCOLS.replace('collection,id,','');const out=[];
  for(let from=0;;from+=1000){
    const{data,error}=await MODE.sb.from('docs').select(cols).order('collection',{ascending:true}).order('id',{ascending:true}).range(from,from+999);
    if(error)return{data:null,error};out.push(...data);if(data.length<1000)break}
  return{data:out,error:null}}
async function loadCloud(){
  const{data,error}=await fetchAllDocs();
  if(error)throw error;
  obPut('cache','rows:'+(MODE.uid||'anon'),data);
  return applyRows(data);
}
function applyRows(data){
  const by={project:null,library:[],requests:[],defects:[],access:[]};MODE.acl.clear();MODE.snap.clear();
  for(const r of data){MODE.acl.set(r.collection+'/'+r.id,{collection:r.collection,id:r.id,grp:r.grp,owner_id:r.owner_id,owner_email:r.owner_email,access:r.access,readers:r.readers||[],editors:r.editors||[]});
    if(r.collection==='meta'&&r.id==='project')by.project=r.data;else if(r.collection==='plans')by.library.push(r.data);else if(r.collection==='requests')by.requests.push(r.data);else if(r.collection==='defects')by.defects.push(r.data);else if(r.collection==='access')by.access.push(r.data)}
  by.library.sort((a,b)=>(a.created||0)-(b.created||0));
  if(!by.project){fillState();return false}
  fillState(by.project,by.library,by.requests,by.defects,by.access);
  docsOf().forEach((o,k)=>MODE.snap.set(k,JSON.stringify(o)));
  return true;
}
async function reloadCloud(){try{await loadCloud();render()}catch(e){toast('โหลดข้อมูลไม่สำเร็จ: '+((e&&e.message)||e),5000)}}
let rerenderT=null;
function schedRerender(){clearTimeout(rerenderT);rerenderT=setTimeout(()=>{const ae=document.activeElement;if($('.ov')||(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)&&ae.closest('#main'))){schedRerender();return}const y=window.scrollY;render();window.scrollTo(0,y)},800)}
/* ระหว่างเปิดกระดานวาด/หน้าต่างแก้ไข ห้ามสลับอ็อบเจกต์ข้อมูลใต้เท้า (ไม่งั้นเส้น/ลูกศรที่วาดต่อจะไปลงอ็อบเจกต์เก่าแล้วหาย) */
function applyRemote(ev,n,o){
  if(typeof document!=='undefined'&&document.querySelector('.ov')){(MODE.defer=MODE.defer||[]).push([ev,n,o]);clearTimeout(MODE.dt);MODE.dt=setTimeout(flushDefer,800);return}
  applyRemoteNow(ev,n,o);
}
function flushDefer(){
  if(document.querySelector('.ov')){MODE.dt=setTimeout(flushDefer,800);return}
  const q=MODE.defer||[];MODE.defer=[];q.forEach(a=>applyRemoteNow(...a));
}
function applyRemoteNow(ev,n,o){
  const row=ev==='DELETE'?o:n;if(!row||!row.collection)return;const key=row.collection+'/'+row.id;
  const put=(arr,obj)=>{const i=arr.findIndex(x=>x.id===obj.id);i>=0?arr[i]=obj:arr.push(obj)};
  const arrOf=c=>c==='requests'?S.requests:c==='defects'?S.defects:c==='plans'?S.library:c==='access'?(S.access=S.access||[]):null;
  if(ev==='DELETE'){MODE.snap.delete(key);MODE.acl.delete(key);
    if(row.collection==='requests')S.requests=S.requests.filter(x=>x.id!==row.id);
    else if(row.collection==='defects')S.defects=S.defects.filter(x=>x.id!==row.id);
    else if(row.collection==='plans')S.library=S.library.filter(x=>x.id!==row.id);
    else if(row.collection==='access')S.access=(S.access||[]).filter(x=>x.id!==row.id);
  }else{
    MODE.acl.set(key,{collection:n.collection,id:n.id,grp:n.grp,owner_id:n.owner_id,owner_email:n.owner_email,access:n.access,readers:n.readers||[],editors:n.editors||[]});
    const str=JSON.stringify(n.data);if(MODE.snap.get(key)===str)return;
    const cur0=docsOf().get(key);if(cur0&&JSON.stringify(cur0)===str){MODE.snap.set(key,str);return}   // เสียงสะท้อนจากการบันทึกของเราเอง ไม่ต้องวาดหน้าใหม่
    /* ถ้าเรามีการแก้ในเครื่องที่ยังไม่ได้บันทึก ให้คงของเราไว้ (จะบันทึกทับตอน save) */
    const cur=docsOf().get(key);if(cur&&MODE.snap.has(key)&&JSON.stringify(cur)!==MODE.snap.get(key))return;
    MODE.snap.set(key,str);
    if(n.collection==='meta'&&n.id==='project')S.project=n.data;
    else if(arrOf(n.collection))put(arrOf(n.collection),n.data)}
  schedRerender();
}
function subscribeCloud(){
  MODE.sb.channel('docs-live-'+uid()).on('postgres_changes',{event:'*',schema:'public',table:'docs'},p=>applyRemote(p.eventType,p.new,p.old)).subscribe();
}
function loginDialog(){
  const o=overlay(`<div class="box"><h3 style="margin-bottom:6px">เข้าสู่ระบบสมาชิก</h3><p class="hint">สมาชิกที่แอดมินเชิญสร้างเอกสารได้ และแก้ไขได้ตามสิทธิ์ที่เจ้าของเอกสารกำหนด ผู้ไม่ได้ล็อกอินดูได้เฉพาะเอกสารที่เปิดสาธารณะ</p>
   <label class="f">อีเมล<input type="email" id="lgmail" autocomplete="username"></label><label class="f" style="margin-top:8px">รหัสผ่าน<input type="password" id="lgpass" autocomplete="current-password"></label>
   <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn" data-x="no">ยกเลิก</button><button class="btn pri" data-x="ok">เข้าสู่ระบบ</button></div></div>`,'modal');
  o.dataset.ro='0';
  const go1=async()=>{const email=$('#lgmail',o).value.trim(),password=$('#lgpass',o).value;
    const{error}=await MODE.sb.auth.signInWithPassword({email,password});
    if(error){toast('เข้าสู่ระบบไม่สำเร็จ: '+error.message,5000);return}o.remove();location.reload()};
  o.addEventListener('click',e=>{const b=e.target.closest('[data-x]');if(b&&b.dataset.x==='ok')go1();else if(b||e.target===o)o.remove()});
  o.addEventListener('keydown',e=>{if(e.key==='Enter')go1()});
  setTimeout(()=>$('#lgmail',o).focus(),30);
}
async function logout(){try{await MODE.sb.auth.signOut()}catch(e){}location.reload()}

/* ----- สิทธิ์ของเอกสาร: ดู / กำหนด (เจ้าของหรือแอดมิน) ----- */
const ACCESS_TXT={public:'ทุกคนอ่านได้ (ไม่ต้องล็อกอิน)',members:'สมาชิกที่ล็อกอินอ่านได้',listed:'เฉพาะผู้ที่ระบุ'};
function aclSummary(c,id){
  if(MODE.kind!=='cloud')return'';
  const a=MODE.acl.get(c+'/'+id);const mine=isOwnerKey(c,id);
  if(!a)return`<span class="chip">เอกสารใหม่ · ${esc(MODE.email||'')} เป็นเจ้าของ</span>`;
  const ed=(a.editors||[]).length;
  return`<span class="chip">เจ้าของ: ${esc(a.owner_email||'-')}</span><span class="chip ${a.access==='public'?'good':a.access==='members'?'':'warn'}">${esc(ACCESS_TXT[a.access]||a.access)}</span>${ed?`<span class="chip">ผู้แก้ไขเพิ่ม ${ed} คน</span>`:''}${canEditKey(c,id)?'':'<span class="chip bad">คุณอ่านได้อย่างเดียว</span>'}${mine?`<button class="btn sm" data-aclbtn="${c}/${esc(id)}">สิทธิ์การเข้าถึง</button>`:''}`;
}
function aclDialog(c,id,after){
  const a=MODE.acl.get(c+'/'+id);
  if(!a){toast('เอกสารนี้ยังไม่ซิงก์ขึ้นระบบ รอสักครู่แล้วลองใหม่');return}
  const o=overlay(`<div class="box"><h3 style="margin-bottom:4px">สิทธิ์การเข้าถึงเอกสาร</h3><p class="hint">เจ้าของ: ${esc(a.owner_email||'-')} · ใช้กับทั้งชุดเอกสาร (เช่น ใบ OPEN + CLOSE + DEFECT ของชุดนั้น) เจ้าของและผู้ได้สิทธิ์แก้ไขเปลี่ยนสถานะได้ตลอด</p>
   <div class="f"><b class="small">ใครอ่านได้</b>${Object.keys(ACCESS_TXT).map(k=>`<label class="chk" style="margin-top:4px"><input type="radio" name="acc" value="${k}" ${a.access===k?'checked':''}> ${ACCESS_TXT[k]}</label>`).join('')}</div>
   <label class="f" style="margin-top:10px">ผู้อ่านที่ระบุ (อีเมล บรรทัดละ 1 คน — ใช้เมื่อเลือก “เฉพาะผู้ที่ระบุ”)<textarea id="aclr" rows="3">${esc((a.readers||[]).join('\n'))}</textarea></label>
   <label class="f" style="margin-top:10px">ผู้แก้ไขได้ (อีเมล บรรทัดละ 1 คน — แก้เนื้อหาและเปลี่ยนสถานะได้ แต่เปลี่ยนสิทธิ์/ลบเอกสารหลักไม่ได้)<textarea id="acle" rows="3">${esc((a.editors||[]).join('\n'))}</textarea></label>
   <p class="hint">ผู้ถูกระบุต้องมีบัญชีสมาชิก (อีเมลเดียวกับที่ล็อกอิน)</p>
   <div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn" data-x="no">ยกเลิก</button><button class="btn pri" data-x="ok">บันทึกสิทธิ์</button></div></div>`,'modal');
  o.dataset.ro='0';
  o.addEventListener('click',async e=>{const b=e.target.closest('[data-x]');if(!b&&e.target!==o)return;
    if(b&&b.dataset.x==='ok'){
      const lines=t=>t.split(/[\n,;]+/).map(x=>x.trim().toLowerCase()).filter(Boolean);
      const acc=($('input[name=acc]:checked',o)||{}).value||'public';
      const{error}=await MODE.sb.rpc('set_acl',{p_grp:a.grp,p_access:acc,p_readers:lines($('#aclr',o).value),p_editors:lines($('#acle',o).value)});
      if(error){toast('บันทึกสิทธิ์ไม่สำเร็จ: '+error.message,5000);return}
      const r=await MODE.sb.from('docs').select(ACLCOLS).eq('grp',a.grp);
      (r.data||[]).forEach(x=>MODE.acl.set(x.collection+'/'+x.id,x));
      toast('บันทึกสิทธิ์แล้ว');o.remove();after&&after();render();return}
    o.remove()});
}
async function initStorage(){
  if(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&!window.supabase)toast('โหลดไลบรารีเชื่อมต่อไม่ได้ (ไม่มีอินเทอร์เน็ต?) — ตอนนี้อยู่ในโหมดเก็บในเครื่อง ข้อมูลไม่ได้ขึ้น Supabase ให้เปิดใหม่เมื่อมีสัญญาณ',9000);
  if(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&window.supabase){
    try{
      MODE.sb=supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY,{global:{fetch:fetchTO}});MODE.kind='cloud';MODE.loginUi=true;
      let session=null;try{session=(await MODE.sb.auth.getSession()).data.session}catch(e){}
      if(session){MODE.uid=session.user.id;MODE.email=String(session.user.email||'').toLowerCase();
        let r=null;try{r=await MODE.sb.rpc('is_admin')}catch(e){}
        if(r&&!r.error){MODE.admin=r.data===true;try{localStorage.setItem('adm:'+MODE.uid,MODE.admin?'1':'0')}catch(e){}}
        else{try{MODE.admin=localStorage.getItem('adm:'+MODE.uid)==='1'}catch(e){}}}
      let ok;
      let sm=null;try{sm=JSON.parse(localStorage.getItem('sitemode')||'null')}catch(e){}
      if(sm&&session&&sm.uid===MODE.uid){   // โหมดหน้างาน: เปิดจากข้อมูลในเครื่องทันที ไม่รอเครือข่าย แล้วค่อยซิงก์เบื้องหลัง
        const rows=await obGet('cache','rows:'+MODE.uid);
        if(rows&&rows.length){applyRows(rows);MODE.offline=true;MODE.netFail=1;MODE.siteMode=true;ok=true;
          for(const[id,url]of await obAll('imgcache'))IMGDATA.set(id,url)}}
      if(!ok)try{try{ok=await loadCloud()}catch(e1){await sleepMs(1500);ok=await loadCloud()}}
      catch(e){const rows=await obGet('cache','rows:'+(MODE.uid||'anon'));
        if(rows&&rows.length){applyRows(rows);MODE.offline=true;MODE.netFail=1;ok=true;toast('ไม่มีสัญญาณ — เปิดจากข้อมูลที่เก็บไว้ในเครื่อง แก้ไขได้ และจะส่งขึ้นระบบอัตโนมัติเมื่อมีสัญญาณ',8000)}else throw e}
      if(!ok){if(MODE.admin){S.project.nextNo=1;await cloudFlush()}else{MODE.ready=false}}
      await restoreOutbox();
      subscribeCloud();startNetWatch();
      return;
    }catch(e){MODE.kind='local';MODE.sb=null;MODE.uid='';MODE.ready=true;MODE.loginUi=false;toast('เชื่อม Supabase ไม่ได้ ('+((e&&e.message)||e)+') ใช้โหมดเก็บในเครื่องนี้แทน',7000)}
  }
  await loadAll();
  if(!S){await seedDemo();await saveNow()}
  else{S.library=S.library||[];S.defects=S.defects||[];S.requests=S.requests||[];S.access=S.access||[]}
}

/* ===== สัญญาณอ่อน / ออฟไลน์: คิวส่งรูป + เก็บงานที่ยังไม่ส่งไว้ในเครื่อง + ลองใหม่อัตโนมัติ ===== */
const sleepMs=ms=>new Promise(r=>setTimeout(r,ms));
function fetchTO(u,o){o=o||{};const ctl=new AbortController();const ms=/\/storage\//.test(String(u&&u.url||u))?120000:25000;const t=setTimeout(()=>ctl.abort(),ms);
  if(o.signal){if(o.signal.aborted)ctl.abort();else o.signal.addEventListener('abort',()=>ctl.abort())}
  return fetch(u,{...o,signal:ctl.signal}).finally(()=>clearTimeout(t))}
let OBH=null;
function obOpen(){if(OBH)return Promise.resolve(OBH);
  return new Promise(res=>{try{const q=indexedDB.open('inspection-outbox',2);q.onupgradeneeded=()=>{['img','docs','cache','imgcache'].forEach(n=>{if(!q.result.objectStoreNames.contains(n))q.result.createObjectStore(n)})};q.onsuccess=()=>{OBH=q.result;res(OBH)};q.onerror=()=>res(null)}catch(e){res(null)}})}
async function obOp(store,mode,fn){const h=await obOpen();if(!h)return undefined;
  return new Promise(res=>{try{const tx=h.transaction(store,mode);const rq=fn(tx.objectStore(store));tx.oncomplete=()=>res(rq&&rq.result);tx.onerror=tx.onabort=()=>res(undefined)}catch(e){res(undefined)}})}
const obPut=(s,k,v)=>obOp(s,'readwrite',st=>st.put(v,k));
const obDel=(s,k)=>obOp(s,'readwrite',st=>st.delete(k));
const obClear=s=>obOp(s,'readwrite',st=>st.clear());
const obGet=(s,k)=>obOp(s,'readonly',st=>st.get(k));
async function obAll(s){const h=await obOpen();if(!h)return[];
  return new Promise(res=>{try{const tx=h.transaction(s,'readonly');const st=tx.objectStore(s);const ks=st.getAllKeys(),vs=st.getAll();tx.oncomplete=()=>res(ks.result.map((k,i)=>[k,vs.result[i]]));tx.onerror=()=>res([])}catch(e){res([])}})}

const PEND=new Set(),INFL=new Set(),IMGQ=[];let imgRun=0;
async function pushImage(id,url){
  for(let i=0;i<3;i++){
    try{const blob=dataUrlToBlob(url);const{error}=await MODE.sb.storage.from(BUCKET).upload(id,blob,{contentType:blob.type,upsert:true,cacheControl:'31536000'});if(error)throw error;await obDel('img',id);return true}
    catch(e){if(isDenied(e))return false;if(i<2)await sleepMs(2000*(i+1)*(i+1))}}
  return false}
function queueImage(id,url){PEND.add(id);if(INFL.has(id))return;INFL.add(id);IMGQ.push([id,url]);updNetStatus();pumpImg()}
function pumpImg(){
  while(imgRun<2&&IMGQ.length){const[id,url]=IMGQ.shift();imgRun++;
    pushImage(id,url).then(ok=>{if(ok)PEND.delete(id);else scheduleRetry()}).catch(()=>scheduleRetry()).finally(()=>{imgRun--;INFL.delete(id);updNetStatus();pumpImg()})}}
function updNetStatus(){
  if(MODE.kind!=='cloud')return;
  if(MODE.offline)setSS('ออฟไลน์ — เก็บในเครื่อง รอส่งเมื่อมีสัญญาณ'+(PEND.size?` (รูป ${PEND.size})`:''));
  else if(MODE.netFail)setSS('สัญญาณอ่อน — ยังไม่ได้ส่ง จะลองใหม่อัตโนมัติ'+(PEND.size?` (รูป ${PEND.size})`:''));
  else if(PEND.size)setSS(`กำลังอัปโหลดรูป ${PEND.size}…`);
  else setSS('บันทึกขึ้น Supabase แล้ว');
}
async function stashDirty(docs){
  for(const[k,o]of docs){if(MODE.snap.get(k)===JSON.stringify(o))continue;const[c,id]=splitKey(k);if(c==='meta'&&!MODE.admin)continue;await obPut('docs',k,{c,id,data:JSON.parse(JSON.stringify(o))})}}
function scheduleRetry(){
  if(MODE.rt)return;const n=Math.min(MODE.rn||0,5);MODE.rn=n+1;
  MODE.rt=setTimeout(()=>{MODE.rt=null;netRetry()},Math.min(60000,3000*Math.pow(2,n)))}
async function netRetry(){
  if(MODE.kind!=='cloud'||!MODE.uid&&!MODE.offline||MODE.retrying)return;MODE.retrying=true;let bad=false;
  try{
    for(const id of [...PEND]){if(INFL.has(id))continue;const url=IMGDATA.get(id)||await obGet('img',id);if(url)queueImage(id,url);else PEND.delete(id)}
    if(MODE.uid){MODE.dirty=false;await cloudFlush()}
    if(MODE.offline||MODE.netFail){if(document.querySelector('.ov'))throw new Error('busy');await loadCloudKeepLocal();MODE.offline=false;MODE.netFail=0;render();toast('กลับมาออนไลน์แล้ว ส่งงานที่ค้างเรียบร้อย',4000)}
  }catch(e){bad=true}
  MODE.retrying=false;
  if(bad||MODE.netFail||PEND.size){if(bad)scheduleRetry()}else MODE.rn=0;
  updNetStatus();
}
/* โหลดข้อมูลล่าสุดจากเซิร์ฟเวอร์ หลังส่งงานค้างหมดแล้ว (ถ้ายังมีงานค้างจะไม่ทับ) */
async function loadCloudKeepLocal(){
  const dirty=[...docsOf()].filter(([k,o])=>MODE.snap.get(k)!==JSON.stringify(o));
  if(dirty.length)throw new Error('ยังมีงานค้างส่ง');
  const{data,error}=await fetchAllDocs();
  if(error)throw error;
  obPut('cache','rows:'+(MODE.uid||'anon'),data);applyRows(data)}
async function restoreOutbox(){
  if(MODE.uid){for(const[id,url]of await obAll('img')){IMGDATA.set(id,url);queueImage(id,url)}}
  const ds=await obAll('docs');if(!ds.length||!MODE.uid||!MODE.ready)return;
  let n=0;
  for(const[k,v]of ds){const{c,id,data}=v||{};if(!c||!data)continue;if(c==='meta'||!canEditKey(c,id))continue;
    const arr=c==='requests'?S.requests:c==='defects'?S.defects:c==='plans'?S.library:c==='access'?(S.access=S.access||[]):null;if(!arr)continue;
    const i=arr.findIndex(x=>x.id===id);if(i>=0)arr[i]=data;else arr.push(data);n++}
  if(n){toast(`กู้งานที่ยังไม่ได้ส่งคืนมา ${n} รายการ กำลังส่งขึ้นระบบ…`,5000);save()}
}
function startNetWatch(){
  if(startNetWatch.on)return;startNetWatch.on=true;
  window.addEventListener('online',()=>{MODE.rn=0;netRetry()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&(MODE.offline||MODE.netFail||PEND.size))netRetry()});
  window.addEventListener('beforeunload',e=>{if(MODE.kind==='cloud'&&(PEND.size||MODE.netFail||MODE.offline)){e.preventDefault();e.returnValue=''}});
  if(MODE.offline)scheduleRetry();
}

/* ===== โหมดหน้างาน: เตรียมข้อมูล/รูป/แอปลงเครื่องก่อนเข้าพื้นที่ที่สัญญาณไม่ดี ===== */
const cloudImgUrl=id=>String(CFG.SUPABASE_URL).replace(/\/$/,'')+'/storage/v1/object/public/'+BUCKET+'/'+encodeURIComponent(id);
function allImageIds(){
  const ids=new Set();projectImageIds().forEach(i=>ids.add(i));
  try{qcImageIds().forEach(i=>ids.add(i))}catch(e){}
  S.requests.forEach(r=>reqImageIds(r).forEach(i=>ids.add(i)));
  S.defects.forEach(d=>[...(d.before||[]),...(d.after||[])].forEach(p=>p&&p.imgId&&ids.add(p.imgId)));
  S.library.forEach(l=>l.imgId&&ids.add(l.imgId));
  return[...ids].filter(i=>i&&i!=='logo'&&i!=='sig');
}
const blobToUrl=b=>new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(fr.error);fr.readAsDataURL(b)});
async function cacheImage(id){
  if(await obGet('imgcache',id))return true;
  const mem=IMGDATA.get(id);if(mem&&String(mem).startsWith('data:')){await obPut('imgcache',id,mem);return true}
  const r=await fetchTO(cloudImgUrl(id));if(!r.ok)throw new Error('HTTP '+r.status);
  await obPut('imgcache',id,await blobToUrl(await r.blob()));return true;
}
async function prepareSite(o){
  const log=t=>{const e=$('#smlog',o);if(e)e.textContent=t};const bar=n=>{const e=$('#smbar',o);if(e)e.style.width=n+'%'};
  try{
    if(!navigator.onLine)throw new Error('ตอนนี้ยังไม่มีอินเทอร์เน็ต — ต้องกดตอนที่ยังมีสัญญาณ');
    log('1/4 ส่งงานที่ค้างอยู่ขึ้นระบบ…');MODE.dirty=false;MODE.netFail=0;await cloudFlush();
    if(MODE.netFail)throw new Error('ส่งงานที่ค้างไม่สำเร็จ ลองใหม่เมื่อสัญญาณดีขึ้น');
    log('2/4 โหลดข้อมูลล่าสุด…');await loadCloudKeepLocal();render();
    const ids=allImageIds();let done=0,bad=0;const q=[...ids];
    log(`3/4 เก็บรูปและแบบลงเครื่อง 0/${ids.length}…`);
    await Promise.all([0,1,2,3].map(async()=>{while(q.length){const id=q.shift();try{await cacheImage(id)}catch(e){bad++}done++;log(`3/4 เก็บรูปและแบบลงเครื่อง ${done}/${ids.length}…`);bar(Math.round(done/Math.max(ids.length,1)*90))}}));
    log('4/4 เตรียมตัวแอป…');
    try{if(navigator.serviceWorker){await Promise.race([navigator.serviceWorker.ready,sleepMs(6000)])}}catch(e){}
    await Promise.all(['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'].map(u=>fetch(u).catch(()=>{})));
    bar(100);
    localStorage.setItem('sitemode',JSON.stringify({uid:MODE.uid,ts:Date.now()}));MODE.siteMode=true;render();
    log(`พร้อมเข้าหน้างานแล้ว ✓ (เก็บ ${ids.length-bad}/${ids.length} รูป/แบบ${bad?` · ${bad} ไฟล์โหลดไม่ได้ กดเตรียมอีกครั้งเมื่อสัญญาณดี`:''})`);
    $('#smgo',o).hidden=false;
  }catch(e){log('ไม่สำเร็จ: '+((e&&e.message)||e));}
  $('#smrun',o).disabled=false;
}
function siteModeDialog(){
  if(MODE.kind!=='cloud'||!MODE.uid){toast('ต้องเข้าสู่ระบบก่อน');return}
  const on=!!MODE.siteMode;
  const o=overlay(`<div class="box"><h3 style="margin-bottom:6px">${on?'โหมดหน้างาน (เปิดอยู่)':'เตรียมเข้าหน้างาน'}</h3>
   <p class="hint">กดตอนที่ยังมีอินเทอร์เน็ต ระบบจะโหลดข้อมูล รูป และแบบทั้งหมดเก็บลงเครื่องนี้ ที่หน้างานเปิดแอป ปักหมุด ถ่ายรูป แก้ไขได้ตามปกติแม้ไม่มีสัญญาณ ทุกอย่างบันทึกไว้ในเครื่องก่อน แล้วส่งขึ้น Supabase อัตโนมัติเมื่อมีอินเทอร์เน็ตกลับมา</p>
   <div style="height:8px;background:var(--surface2);border-radius:4px;overflow:hidden;margin:10px 0"><div id="smbar" style="height:100%;width:0;background:var(--accent,#1971c2);transition:width .2s"></div></div>
   <div class="small" id="smlog" style="min-height:38px">${on?'โหมดหน้างานเปิดอยู่ — กด “เตรียมข้อมูลใหม่” เมื่อมีเน็ตเพื่อรีเฟรชข้อมูลในเครื่อง':'พร้อมเริ่ม — ใช้เวลาตามจำนวนรูป (ควรใช้ Wi-Fi/ฮอตสปอตที่แรง)'}</div>
   <div class="small muted" style="margin-top:6px">สถานะส่งงาน: <b>${esc(($('#savestate')||{}).textContent||'-')}</b></div>
   <div class="row" style="margin-top:12px;justify-content:flex-end;gap:6px"><button class="btn" data-x="close">ปิด</button>
    ${on?'<button class="btn bad" data-x="off">ออกจากโหมดหน้างาน</button><button class="btn" data-x="sync">ส่งขึ้นระบบตอนนี้</button>':''}
    <button class="btn pri" id="smrun" data-x="run">${on?'เตรียมข้อมูลใหม่':'เตรียมข้อมูลลงเครื่อง'}</button><button class="btn pri" id="smgo" data-x="close" hidden>เข้าหน้างาน</button></div></div>`,'modal');
  o.dataset.ro='0';
  o.addEventListener('click',async e=>{const b=e.target.closest('[data-x]');if(!b&&e.target!==o)return;const x=b&&b.dataset.x;
    if(x==='run'){b.disabled=true;await prepareSite(o);return}
    if(x==='sync'){MODE.rn=0;toast('กำลังส่งขึ้นระบบ…',2500);netRetry();return}
    if(x==='off'){try{localStorage.removeItem('sitemode')}catch(e){}MODE.siteMode=false;toast('ออกจากโหมดหน้างานแล้ว (ข้อมูลที่ค้างยังส่งต่ออัตโนมัติ)');o.remove();render();return}
    o.remove()});
}
