/* ========= storage =========
   cloud : Supabase (public read, only the owner account can write) — see supabase/schema.sql
   local : IndexedDB in this browser, used when config.js has no Supabase keys (try-out / offline) */
let S=null; const IMG=new Map(); const IMGDATA=new Map(); let IDBH=null, memOnly=false, saveT=null;
const CFG=window.APP_CONFIG||{};
const BUCKET='inspection-images';
const MODE={kind:'local',sb:null,ro:false,owner:true,loginUi:false,email:'',snap:new Map(),busy:false,dirty:false,pending:0};
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
function save(){if(MODE.ro)return;clearTimeout(saveT);saveT=setTimeout(saveNow,MODE.kind==='cloud'?700:350);setSS('กำลังบันทึก…')}
function docsOf(){const m=new Map();m.set('meta/project',S.project);m.set('meta/library',{items:S.library});S.requests.forEach(r=>m.set('requests/'+r.id,r));S.defects.forEach(d=>m.set('defects/'+d.id,d));return m}
const splitKey=k=>{const i=k.indexOf('/');return[k.slice(0,i),k.slice(i+1)]};
function cloudError(e){
  const msg=(e&&e.message)||String(e);
  if(e&&(e.code==='42501'||/row-level security|permission denied|not authorized/i.test(msg))){MODE.ro=true;setSS('ไม่มีสิทธิ์แก้ไข');toast('บัญชีนี้ไม่ใช่เจ้าของ (ตาราง app_owners) จึงเป็นโหมดดูอย่างเดียว',6000);render();return}
  setSS('บันทึกไม่สำเร็จ');toast('บันทึกขึ้น Supabase ไม่สำเร็จ: '+msg,6000);
}
async function cloudFlush(){
  if(MODE.busy){MODE.dirty=true;return}
  MODE.busy=true;
  try{do{MODE.dirty=false;const docs=docsOf();const ops=[];
      docs.forEach((o,k)=>{const str=JSON.stringify(o);if(MODE.snap.get(k)!==str)ops.push([k,str])});
      const del=[...MODE.snap.keys()].filter(k=>!docs.has(k));
      for(let i=0;i<ops.length;i+=10){const part=ops.slice(i,i+10);
        const rows=part.map(([k,str])=>{const[c,id]=splitKey(k);return{collection:c,id,data:JSON.parse(str),updated_at:new Date().toISOString()}});
        const{error}=await MODE.sb.from('docs').upsert(rows,{onConflict:'collection,id'});if(error)throw error;
        part.forEach(([k,str])=>MODE.snap.set(k,str))}
      for(const k of del){const[c,id]=splitKey(k);const{error}=await MODE.sb.from('docs').delete().eq('collection',c).eq('id',id);if(error)throw error;MODE.snap.delete(k)}
    }while(MODE.dirty);
    setSS(MODE.pending?`กำลังอัปโหลดรูป ${MODE.pending}…`:'บันทึกขึ้น Supabase แล้ว');
  }catch(e){cloudError(e)}
  MODE.busy=false;
}
async function saveNow(){
  if(MODE.ro)return;
  if(MODE.kind==='cloud')return cloudFlush();
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
const reqImageIds=r=>r?[...(r.plans||[]).map(p=>p.imgId),...(r.photos||[]).map(p=>p.imgId)]:[];
const projectImageIds=()=>[S.project.logoId,S.project.sigId,...S.library.map(l=>l.imgId)];
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
  S.library.forEach(p=>add(p.imgId));S.requests.forEach(r=>reqImageIds(r).forEach(add));qcImageIds().forEach(add);add(S.project.logoId);add(S.project.sigId);
  const tx=IDBH.transaction('img','readwrite');
  for(const k of [...IMG.keys()]){if(!used.has(k)){IMG.delete(k);tx.objectStore('img').delete(k)}}
}
/* ----- cloud: load / live updates / auth ----- */
function fillState(p,lib,rq,df){S={project:p||defaultProject(),library:lib||[],requests:rq||[],defects:df||[]}}
async function loadCloud(){
  const{data,error}=await MODE.sb.from('docs').select('collection,id,data').range(0,9999);
  if(error)throw error;
  const by={project:null,library:[],requests:[],defects:[]};
  for(const r of data){if(r.collection==='meta'&&r.id==='project')by.project=r.data;else if(r.collection==='meta'&&r.id==='library')by.library=r.data.items||[];else if(r.collection==='requests')by.requests.push(r.data);else if(r.collection==='defects')by.defects.push(r.data)}
  if(!by.project){fillState();return false}
  fillState(by.project,by.library,by.requests,by.defects);
  docsOf().forEach((o,k)=>MODE.snap.set(k,JSON.stringify(o)));
  return true;
}
let rerenderT=null;
function schedRerender(){clearTimeout(rerenderT);rerenderT=setTimeout(()=>{if($('.ov')){schedRerender();return}render()},600)}
function applyRemote(ev,n,o){
  const row=ev==='DELETE'?o:n;if(!row||!row.collection)return;const key=row.collection+'/'+row.id;
  const put=(arr,obj)=>{const i=arr.findIndex(x=>x.id===obj.id);i>=0?arr[i]=obj:arr.push(obj)};
  if(ev==='DELETE'){MODE.snap.delete(key);
    if(row.collection==='requests')S.requests=S.requests.filter(x=>x.id!==row.id);
    else if(row.collection==='defects')S.defects=S.defects.filter(x=>x.id!==row.id);
  }else{const str=JSON.stringify(n.data);if(MODE.snap.get(key)===str)return;MODE.snap.set(key,str);
    if(n.collection==='meta'&&n.id==='project')S.project=n.data;
    else if(n.collection==='meta'&&n.id==='library')S.library=n.data.items||[];
    else if(n.collection==='requests')put(S.requests,n.data);
    else if(n.collection==='defects')put(S.defects,n.data)}
  schedRerender();
}
function subscribeCloud(){
  MODE.sb.channel('docs-live').on('postgres_changes',{event:'*',schema:'public',table:'docs'},p=>applyRemote(p.eventType,p.new,p.old)).subscribe();
}
function loginDialog(){
  const o=overlay(`<div class="box"><h3 style="margin-bottom:6px">เข้าสู่ระบบผู้แก้ไข</h3><p class="hint">เฉพาะบัญชีเจ้าของที่อยู่ในตาราง app_owners เท่านั้นที่แก้ข้อมูลได้ ทุกคนที่เหลือดูได้อย่างเดียว</p>
   <label class="f">อีเมล<input type="email" id="lgmail" autocomplete="username"></label><label class="f" style="margin-top:8px">รหัสผ่าน<input type="password" id="lgpass" autocomplete="current-password"></label>
   <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn" data-x="no">ยกเลิก</button><button class="btn pri" data-x="ok">เข้าสู่ระบบ</button></div></div>`,'modal');
  const go1=async()=>{const email=$('#lgmail',o).value.trim(),password=$('#lgpass',o).value;
    const{error}=await MODE.sb.auth.signInWithPassword({email,password});
    if(error){toast('เข้าสู่ระบบไม่สำเร็จ: '+error.message,5000);return}o.remove();location.reload()};
  o.addEventListener('click',e=>{const b=e.target.closest('[data-x]');if(b&&b.dataset.x==='ok')go1();else if(b||e.target===o)o.remove()});
  o.addEventListener('keydown',e=>{if(e.key==='Enter')go1()});
  setTimeout(()=>$('#lgmail',o).focus(),30);
}
async function logout(){try{await MODE.sb.auth.signOut()}catch(e){}location.reload()}
async function initStorage(){
  if(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&window.supabase){
    try{
      MODE.sb=supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY);MODE.kind='cloud';MODE.loginUi=true;
      const{data:{session}}=await MODE.sb.auth.getSession();MODE.email=(session&&session.user&&session.user.email)||'';
      let owner=false;if(session){const r=await MODE.sb.rpc('is_owner');owner=r.data===true}
      MODE.owner=owner;MODE.ro=!owner;
      const ok=await loadCloud();
      if(MODE.ro)subscribeCloud();
      else if(!ok){S.project.nextNo=1;await cloudFlush()}
      return;
    }catch(e){MODE.kind='local';MODE.sb=null;MODE.ro=false;MODE.owner=true;MODE.loginUi=false;toast('เชื่อม Supabase ไม่ได้ ('+((e&&e.message)||e)+') ใช้โหมดเก็บในเครื่องนี้แทน',7000)}
  }
  await loadAll();
  if(!S){await seedDemo();await saveNow()}
  else{S.library=S.library||[];S.defects=S.defects||[];S.requests=S.requests||[]}
}
