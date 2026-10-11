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
const grpOf=(c,o)=>c==='requests'?(o.rootId||o.id):c==='defects'?(o.qc?o.id:(o.rootId||o.id)):c==='plans'?o.id:'';
async function allocNo(kind,start){
  if(MODE.kind!=='cloud')return null;
  const{data,error}=await MODE.sb.rpc('next_no',{p_k:kind,p_start:start||1});
  if(error)throw error;return data;
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
function save(){if(MODE.kind==='cloud'?!MODE.uid:MODE.ro)return;clearTimeout(saveT);saveT=setTimeout(saveNow,MODE.kind==='cloud'?700:350);setSS('กำลังบันทึก…')}
function docsOf(){const m=new Map();m.set('meta/project',S.project);S.library.forEach(l=>m.set('plans/'+l.id,l));S.requests.forEach(r=>m.set('requests/'+r.id,r));S.defects.forEach(d=>m.set('defects/'+d.id,d));return m}
const splitKey=k=>{const i=k.indexOf('/');return[k.slice(0,i),k.slice(i+1)]};
const isDenied=e=>e&&(e.code==='42501'||/row-level security|permission denied|not authorized|no permission|login required|only owner|admin only/i.test((e.message||'')));
function cloudError(e){
  const msg=(e&&e.message)||String(e);
  if(isDenied(e)){setSS('ไม่มีสิทธิ์แก้ไข');toast('คุณไม่มีสิทธิ์แก้ไขรายการนี้ (หรือยังไม่ได้เข้าสู่ระบบ)',5000);return}
  setSS('บันทึกไม่สำเร็จ');toast('บันทึกขึ้น Supabase ไม่สำเร็จ: '+msg,6000);
}
async function cloudFlush(){
  if(MODE.busy){MODE.dirty=true;return}
  MODE.busy=true;let denied=0;
  try{do{MODE.dirty=false;const docs=docsOf();
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
    setSS(MODE.pending?`กำลังอัปโหลดรูป ${MODE.pending}…`:'บันทึกขึ้น Supabase แล้ว');
  }catch(e){cloudError(e)}
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
  if(MODE.kind==='cloud'){MODE.pending++;setSS(`กำลังอัปโหลดรูป ${MODE.pending}…`);
    try{const blob=dataUrlToBlob(url);const{error}=await MODE.sb.storage.from(BUCKET).upload(id,blob,{contentType:blob.type,upsert:true,cacheControl:'31536000'});if(error)throw error}
    catch(e){cloudError(e)}finally{MODE.pending--;setSS(MODE.pending?`กำลังอัปโหลดรูป ${MODE.pending}…`:'บันทึกขึ้น Supabase แล้ว')}
    return id}
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
  S.library.forEach(p=>add(p.imgId));S.requests.forEach(r=>reqImageIds(r).forEach(add));qcImageIds().forEach(add);add(S.project.logoId);add(S.project.sigId);add(S.project.reqSigId);add(S.project.engSigId);
  const tx=IDBH.transaction('img','readwrite');
  for(const k of [...IMG.keys()]){if(!used.has(k)){IMG.delete(k);tx.objectStore('img').delete(k)}}
}
/* ----- cloud: load / live updates / auth ----- */
function fillState(p,lib,rq,df){S={project:p||defaultProject(),library:lib||[],requests:rq||[],defects:df||[]}}
async function loadCloud(){
  const{data,error}=await MODE.sb.from('docs').select('collection,id,data,'+ACLCOLS.replace('collection,id,','')).range(0,9999);
  if(error)throw error;
  const by={project:null,library:[],requests:[],defects:[]};MODE.acl.clear();MODE.snap.clear();
  for(const r of data){MODE.acl.set(r.collection+'/'+r.id,{collection:r.collection,id:r.id,grp:r.grp,owner_id:r.owner_id,owner_email:r.owner_email,access:r.access,readers:r.readers||[],editors:r.editors||[]});
    if(r.collection==='meta'&&r.id==='project')by.project=r.data;else if(r.collection==='plans')by.library.push(r.data);else if(r.collection==='requests')by.requests.push(r.data);else if(r.collection==='defects')by.defects.push(r.data)}
  by.library.sort((a,b)=>(a.created||0)-(b.created||0));
  if(!by.project){fillState();return false}
  fillState(by.project,by.library,by.requests,by.defects);
  docsOf().forEach((o,k)=>MODE.snap.set(k,JSON.stringify(o)));
  return true;
}
async function reloadCloud(){try{await loadCloud();render()}catch(e){toast('โหลดข้อมูลไม่สำเร็จ: '+((e&&e.message)||e),5000)}}
let rerenderT=null;
function schedRerender(){clearTimeout(rerenderT);rerenderT=setTimeout(()=>{if($('.ov')){schedRerender();return}render()},600)}
function applyRemote(ev,n,o){
  const row=ev==='DELETE'?o:n;if(!row||!row.collection)return;const key=row.collection+'/'+row.id;
  const put=(arr,obj)=>{const i=arr.findIndex(x=>x.id===obj.id);i>=0?arr[i]=obj:arr.push(obj)};
  const arrOf=c=>c==='requests'?S.requests:c==='defects'?S.defects:c==='plans'?S.library:null;
  if(ev==='DELETE'){MODE.snap.delete(key);MODE.acl.delete(key);
    if(row.collection==='requests')S.requests=S.requests.filter(x=>x.id!==row.id);
    else if(row.collection==='defects')S.defects=S.defects.filter(x=>x.id!==row.id);
    else if(row.collection==='plans')S.library=S.library.filter(x=>x.id!==row.id);
  }else{
    MODE.acl.set(key,{collection:n.collection,id:n.id,grp:n.grp,owner_id:n.owner_id,owner_email:n.owner_email,access:n.access,readers:n.readers||[],editors:n.editors||[]});
    const str=JSON.stringify(n.data);if(MODE.snap.get(key)===str){schedRerender();return}
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
  if(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&window.supabase){
    try{
      MODE.sb=supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY);MODE.kind='cloud';MODE.loginUi=true;
      const{data:{session}}=await MODE.sb.auth.getSession();
      if(session){MODE.uid=session.user.id;MODE.email=String(session.user.email||'').toLowerCase();const r=await MODE.sb.rpc('is_admin');MODE.admin=r.data===true}
      const ok=await loadCloud();
      if(!ok){if(MODE.admin){S.project.nextNo=1;await cloudFlush()}else{MODE.ready=false}}
      subscribeCloud();
      return;
    }catch(e){MODE.kind='local';MODE.sb=null;MODE.uid='';MODE.ready=true;MODE.loginUi=false;toast('เชื่อม Supabase ไม่ได้ ('+((e&&e.message)||e)+') ใช้โหมดเก็บในเครื่องนี้แทน',7000)}
  }
  await loadAll();
  if(!S){await seedDemo();await saveNow()}
  else{S.library=S.library||[];S.defects=S.defects||[];S.requests=S.requests||[]}
}
