/* ========= ขอเข้าห้อง (Room access) =========
   เก็บใน S.access (คอลเลกชัน 'access' ของ Supabase) 3 ชนิด:
   - kind:'req'   คำขอเข้าห้อง  {date,from,to,who,org,rooms[],note,photos[],status,done}
   - kind:'rooms' รายชื่อห้อง (เอกสารเดียว id:'rooms')  {text,list:[{b,f,n,key}]}
   - kind:'snap'  ภาพสรุปสถานะรายวัน id:'snap-YYYY-MM-DD' {date,imgId,w,h,reqs,roomsUsed}
   สถานะห้องคำนวณจากเวลาปัจจุบันทุกครั้งที่วาด (อัปเดตเองทุก 30 วินาที) และเปลี่ยนวันที่เองเมื่อข้ามเที่ยงคืน */
const accReqs=()=>(S.access||[]).filter(a=>a.kind==='req');
const accSnaps=()=>(S.access||[]).filter(a=>a.kind==='snap').sort((a,b)=>b.date.localeCompare(a.date));
const accRoomsDoc=()=>(S.access||[]).find(a=>a.kind==='rooms');
const accRoomList=()=>{const d=accRoomsDoc();return d&&d.list?d.list:[]};
function accImageIds(){return(S.access||[]).flatMap(a=>[...(a.photos||[]).map(p=>p.imgId),...(a.before||[]).map(p=>p.imgId),...(a.after||[]).map(p=>p.imgId),a.imgId]).filter(Boolean)}
const accNowHM=()=>{const d=new Date();return pad2(d.getHours())+':'+pad2(d.getMinutes())};
const accMin=t=>{if(!t)return null;const p=String(t).split(':').map(Number);return(p[0]||0)*60+(p[1]||0)};
const accNowMin=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
const accDay=()=>UI.accDate||todayISO();
function accShift(iso,n){const p=iso.split('-').map(Number);const d=new Date(p[0],p[1]-1,p[2]+n);return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())}
const ACC_DOW=['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
function accDateLabel(iso){const p=iso.split('-').map(Number);const d=new Date(p[0],p[1]-1,p[2]);return`${ACC_DOW[d.getDay()]} ${p[2]}/${p[1]}/${p[0]}`}

/* ----- แยกรายชื่อห้องจากข้อความ: "A/1: 101-110, 112" (อาคาร/ชั้น: ห้อง) ----- */
function accParseRooms(text){
  const out=[],seen=new Set();
  String(text||'').split('\n').forEach(line=>{
    line=line.trim();if(!line)return;
    const m=line.match(/^([^:：]+)[:：](.*)$/);let head='',rest=line;
    if(m){head=m[1].trim();rest=m[2]}
    const hp=head.split('/').map(x=>x.trim());const b=hp[0]||'',f=hp.slice(1).join('/')||'';
    rest.split(/[,，;；\s]+/).map(x=>x.trim()).filter(Boolean).forEach(tok=>{
      const r=tok.match(/^(\D*?)(\d+)\s*[-–]\s*(\D*?)(\d+)$/);let names=[tok];
      if(r&&r[1]===r[3]){const a=+r[2],z=+r[4];if(z>=a&&z-a<=300){const w=r[2].length;names=[];for(let i=a;i<=z;i++)names.push(r[1]+String(i).padStart(w,'0'))}}
      names.forEach(n=>{const key=b+'/'+f+'/'+n;if(!seen.has(key)){seen.add(key);out.push({b,f,n,key})}})});
  });
  return out;
}
const accRoomByKey=k=>accRoomList().find(r=>r.key===k);
const accRoomName=k=>{const r=accRoomByKey(k);return r?(r.b?r.b+' ':'')+r.n:String(k).split('/').pop()};

/* ----- สถานะ ----- */
/* คืนค่า 'in' ใช้อยู่ | 'wait' ขอไว้ ยังไม่ถึงเวลา | 'done' ใช้เสร็จ | 'cancel' */
function accState(a,day){
  if(a.status==='cancel')return'cancel';
  const today=todayISO();
  if(day<today)return'done';if(day>today)return'wait';
  if(a.done)return'done';
  const now=accNowMin(),f=accMin(a.from),t=accMin(a.to);
  if(f!=null&&now<f)return'wait';
  if(t!=null&&now>=t)return'done';
  return'in';
}
const ACC_ST={in:['กำลังใช้ห้อง','bad'],wait:['รอเข้า','warn'],done:['ใช้เสร็จแล้ว','good'],cancel:['ยกเลิก','']};
const accTime=a=>(a.from||'--:--')+(a.to?'–'+a.to:'–')
function accDayReqs(day){return accReqs().filter(a=>a.date===day).sort((a,b)=>String(a.from||'').localeCompare(String(b.from||''))||(a.created||0)-(b.created||0))}
function accRoomState(key,reqs,day){
  const rs=reqs.filter(a=>(a.rooms||[]).includes(key)&&a.status!=='cancel');
  if(!rs.length)return{k:'none',rs:[]};
  const sts=rs.map(a=>accState(a,day));
  return{k:sts.includes('in')?'in':sts.includes('wait')?'wait':'done',rs,sts};
}
/* กลุ่มห้อง: อาคาร → ชั้น → ห้อง */
function accGroups(){
  const m=new Map();accRoomList().forEach(r=>{const bk=r.b||'-';if(!m.has(bk))m.set(bk,new Map());const fm=m.get(bk);const fk=r.f||'';if(!fm.has(fk))fm.set(fk,[]);fm.get(fk).push(r)});
  return[...m.entries()].sort((a,b)=>natCmp(a[0],b[0])).map(([b,fm])=>({b,floors:[...fm.entries()].sort((a,z)=>natCmp(a[0],z[0])).map(([f,rooms])=>({f,rooms:rooms.slice().sort((a,z)=>natCmp(a.n,z.n))}))}));
}

/* ----- หน้าหลัก ----- */
function accLiveHTML(day){
  const reqs=accDayReqs(day);const rooms=accRoomList();const isToday=day===todayISO();
  const states=rooms.map(r=>({r,s:accRoomState(r.key,reqs,day)}));
  const nIn=states.filter(x=>x.s.k==='in').length,nWait=states.filter(x=>x.s.k==='wait').length,nDone=states.filter(x=>x.s.k==='done').length,nNone=states.filter(x=>x.s.k==='none').length;
  let h=`<div class="accsum"><div class="a-in"><b>${nIn}</b><span>กำลังใช้ห้อง</span></div><div class="a-wait"><b>${nWait}</b><span>รอเข้า</span></div><div class="a-done"><b>${nDone}</b><span>ใช้เสร็จแล้ว</span></div><div class="a-none"><b>${nNone}</b><span>ไม่มีผู้ขอ</span></div></div>
   <div class="small muted" style="margin:2px 2px 10px">${isToday?`สถานะ ณ เวลา <b class="mono">${accNowHM()}</b> · อัปเดตอัตโนมัติทุก 30 วินาที · ข้อมูลขึ้นวันใหม่เองเมื่อข้ามเที่ยงคืน`:'ดูข้อมูลของวันที่เลือก (ย้อนหลัง/ล่วงหน้า)'}</div>`;
  if(!rooms.length)h+=`<div class="empty">ยังไม่มีรายชื่อห้อง กด “จัดการรายชื่อห้อง” เพื่อใส่อาคาร/ชั้น/ห้อง แล้วตารางสถานะจะขึ้นที่นี่</div>`;
  else for(const g of accGroups()){
    h+=`<div class="ghead l1"><b>${g.b==='-'?'ไม่ระบุอาคาร':'อาคาร '+esc(g.b)}</b></div>`;
    for(const fl of g.floors){
      h+=`<div class="accfl">${fl.f?`<div class="accfn">ชั้น ${esc(fl.f)}</div>`:''}<div class="accgrid">${fl.rooms.map(r=>{
        const s=accRoomState(r.key,reqs,day);const top=s.rs.find((a,i)=>s.sts[i]==='in')||s.rs.find((a,i)=>s.sts[i]==='wait')||s.rs[s.rs.length-1];
        const sub=top?`<span class="w">${esc(top.who||'-')}${s.rs.length>1?` <em>+${s.rs.length-1}</em>`:''}</span><span class="w mono">${esc(top.from||'--:--')}</span>`:'';
        return`<button class="rc rc-${s.k}" data-act="accroom" data-id="${esc(r.key)}" title="${s.k==='none'?'ไม่มีผู้ขอ':''}"><b>${esc(r.n)}</b><span>${sub}</span></button>`}).join('')}</div></div>`}
  }
  h+=`<h2 class="mh-sec2">คำขอเข้าห้องของวันนี้ <span class="small muted">${reqs.length} รายการ</span></h2>`;
  h+=reqs.length?`<div class="accl">${reqs.map(a=>accCard(a,day)).join('')}</div>`:`<div class="empty small">${isToday?'วันนี้ยังไม่มีคำขอเข้าห้อง':'ไม่มีคำขอในวันนี้'} — กด “ถ่ายเอกสารขอเข้า” เพื่อบันทึก</div>`;
  return h;
}
function accCard(a,day){
  const st=accState(a,day);const ph=(a.photos||[])[0];
  return`<div class="acard" data-act="accedit" data-id="${a.id}"><div class="th">${ph?annotatedSvg(imgSrc(ph.imgId),ph.w,ph.h,[],[]):'<i>ไม่มีรูป</i>'}</div>
   <div class="bd"><div class="row" style="gap:6px"><b>${esc(a.who||'(ไม่ระบุผู้ขอ)')}</b>${chip(ACC_ST[st][0],ACC_ST[st][1])}</div>
   <div class="small muted">${esc(a.org||'')}</div><div class="small mono">${esc(accTime(a))}${(a.photos||[]).length>1?` · ${a.photos.length} รูป`:''}</div>
   <div class="accrooms">${(a.rooms||[]).slice(0,8).map(k=>`<span class="chip">${esc(accRoomName(k))}</span>`).join('')}${(a.rooms||[]).length>8?`<span class="chip">+${a.rooms.length-8}</span>`:''}</div></div></div>`;
}
function viewAccess(){
  const day=accDay();const isToday=day===todayISO();const can=canCreate();
  let h=`<div class="row" style="margin-bottom:8px"><h1 style="font-size:22px;margin-right:auto">ขอเข้าห้อง</h1>
   ${can?`<label class="btn pri" for="acccam">📷 ถ่ายเอกสารขอเข้า</label><input id="acccam" type="file" accept="image/*" capture="environment" hidden><button class="btn" data-act="accnew">＋ บันทึกคำขอ</button><button class="btn" data-act="accrooms">จัดการรายชื่อห้อง</button>`:''}</div>
   <div class="accdate"><button class="btn sm" data-act="accday" data-id="-1" aria-label="วันก่อนหน้า">‹</button><b>${accDateLabel(day)}</b>${isToday?'<span class="chip bad">วันนี้</span>':''}<button class="btn sm" data-act="accday" data-id="1" aria-label="วันถัดไป">›</button>${isToday?'':'<button class="btn sm" data-act="accday" data-id="0">กลับไปวันนี้</button>'}<input type="date" id="accd" value="${day}" style="width:auto"><span class="accexp"><button class="btn sm" data-act="accpdf">⬇ PDF</button><button class="btn sm" data-act="accpng">⬇ PNG</button></span></div>
   <div id="acclive">${accLiveHTML(day)}</div>`;
  const sn=accSnaps();
  h+=`<h2 class="mh-sec2" style="margin-top:22px">ภาพสรุปย้อนหลังรายวัน <span class="small muted">${sn.length} วัน</span></h2>
   <p class="hint">ระบบบันทึกภาพตารางห้องของแต่ละวันไว้ให้เอง (หลัง 21:00 ของวันนั้น หรือครั้งแรกที่เปิดแอปในวันถัดไป) กดดูย้อนหลังได้</p>
   ${can?`<div class="row" style="margin-bottom:10px"><button class="btn" data-act="accsnapnow">บันทึกภาพของ ${esc(accDateLabel(day))} ตอนนี้</button></div>`:''}
   ${sn.length?`<div class="accsnaps">${sn.map(x=>`<button class="snp" data-act="accsnapopen" data-id="${x.id}"><div class="im">${x.imgId?`<img src="${imgSrc(x.imgId)}" alt="" loading="lazy">`:''}</div><b>${esc(accDateLabel(x.date))}</b><span class="small muted">${x.reqs||0} คำขอ · ${x.roomsUsed||0} ห้อง</span></button>`).join('')}</div>`:'<div class="empty small">ยังไม่มีภาพสรุป</div>'}`;
  return h;
}
function accPaint(){const el=$('#acclive');if(el)el.innerHTML=accLiveHTML(accDay())}

/* ----- ฟอร์มคำขอ ----- */
function accNew(over){
  return Object.assign({id:'ac'+uid(),kind:'req',date:accDay(),from:accDay()===todayISO()?accNowHM():'',to:'',who:'',org:'',rooms:[],note:'',photos:[],status:'',done:false,created:Date.now(),by:MODE.email||''},over||{});
}
async function accAddPhotos(a,files,field){
  field=field||'photos';let n=0;a[field]=a[field]||[];
  for(const f of files){if(!f.type.startsWith('image/'))continue;try{const im=await fileToImage(f,1600,.82);const imgId=await putImage(im.url);a[field].push({id:'ph'+uid(),imgId,w:im.w,h:im.h});n++}catch(e){toast('อ่านรูปไม่ได้: '+(f.name||''))}}
  return n;
}
function accEdit(a,isNew){
  const perm=!(MODE.ro||(!isNew&&!canEditKey('access',a.id)));
  /* ล็อก: คำขอที่กำลังใช้ห้องอยู่ แก้ไขไม่ได้จนกว่าจะหมดเวลาที่ขอ (หรือกด "ออกจากห้องแล้ว") */
  const lock=!isNew&&accState(a,a.date)==='in';
  const ro=!perm||lock;
  const rooms=accRoomList();let q='';
  const o=overlay('<div class="box wide"></div>','modal');o.dataset.ro=perm?'0':'1';const box=$('.box',o);
  const draw=()=>{
    const st=isNew?'':accState(a,a.date);
    box.innerHTML=`<div class="row" style="margin-bottom:10px"><h3 style="margin-right:auto">${isNew?'บันทึกคำขอเข้าห้อง':'คำขอเข้าห้อง'} ${isNew?'':chip(ACC_ST[st][0],ACC_ST[st][1])}</h3>${!isNew&&[...(a.photos||[]),...(a.before||[]),...(a.after||[])].length?'<button class="btn" data-a="dlall" style="margin-right:6px">⬇ ดาวน์โหลดรูปทั้งหมด</button>':''}<button class="btn pri" data-a="close">${isNew?'ยกเลิก':'เสร็จ'}</button></div>
     <div class="accphotos">${(a.photos||[]).map(p=>`<div class="qp"><div class="thumb" data-a="photo" data-id="${p.id}">${annotatedSvg(imgSrc(p.imgId),p.w,p.h,[],[])}</div>${ro?'':`<button class="btn sm bad" data-a="delp" data-id="${p.id}">ลบรูป</button>`}</div>`).join('')}
      ${ro?'':`<div class="qp"><label class="btn" for="ac-cam">📷 ถ่ายเอกสาร</label><input id="ac-cam" data-accph="1" type="file" accept="image/*" capture="environment" hidden><label class="btn" for="ac-up">🖼 เลือกรูป (หลายรูป)</label><input id="ac-up" data-accph="1" type="file" accept="image/*" multiple hidden></div>`}</div>
     ${[['before','📸 รูป BEFORE ก่อนเข้าห้อง','ac-b','Before',ro],['after','📷 รูป AFTER หลังใช้ห้อง','ac-a','After',!perm]].map(([f,t,id,lb,r0])=>`<div class="f" style="margin-top:12px"><b class="small">${t} (${(a[f]||[]).length})</b>
      <div class="accphotos">${(a[f]||[]).map(p=>`<div class="qp"><div class="thumb" data-a="photo" data-id="${p.id}">${annotatedSvg(imgSrc(p.imgId),p.w,p.h,[],[])}</div>${r0?'':`<button class="btn sm bad" data-a="del${f[0]}" data-id="${p.id}">ลบรูป</button>`}</div>`).join('')}
      ${r0?'':`<div class="qp"><label class="btn" for="${id}cam">📷 ถ่าย ${lb}</label><input id="${id}cam" data-accph="${f}" type="file" accept="image/*" capture="environment" hidden><label class="btn" for="${id}up">🖼 เลือกรูป (หลายรูป)</label><input id="${id}up" data-accph="${f}" type="file" accept="image/*" multiple hidden></div>`}</div></div>`).join('')}
     <div class="grid" style="margin-top:10px">
      <label class="f">ผู้ขอเข้า<input type="text" data-af="who" value="${esc(a.who||'')}" ${ro?'disabled':''} placeholder="ชื่อ-นามสกุล"></label>
      <label class="f">หน่วยงาน / บริษัท / ทีม<input type="text" data-af="org" value="${esc(a.org||'')}" ${ro?'disabled':''}></label>
      <label class="f">วันที่ขอเข้า<input type="date" data-af="date" value="${esc(a.date||'')}" ${ro?'disabled':''}></label>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px"><label class="f">เวลาเข้า<input type="time" data-af="from" value="${esc(a.from||'')}" ${ro?'disabled':''}></label><label class="f">เวลาออก (ถ้าทราบ)<input type="time" data-af="to" value="${esc(a.to||'')}" ${ro?'disabled':''}></label></div>
     </div>
     <div class="f" style="margin-top:10px"><b class="small">ห้องที่ขอเข้า (${(a.rooms||[]).length})</b>
      ${rooms.length?`<input type="search" id="ac-q" placeholder="ค้นหาห้อง" value="${esc(q)}" style="margin:6px 0">
       <div class="accpick">${accGroups().map(g=>g.floors.map(fl=>{const list=fl.rooms.filter(r=>!q||(g.b+fl.f+r.n).toLowerCase().includes(q.toLowerCase()));if(!list.length)return'';return`<div class="accpf"><span class="small muted">${g.b==='-'?'':esc(g.b)}${fl.f?' ชั้น '+esc(fl.f):''}</span>${list.map(r=>`<button class="pk ${(a.rooms||[]).includes(r.key)?'on':''}" data-a="room" data-id="${esc(r.key)}" ${ro?'disabled':''}>${esc(r.n)}</button>`).join('')}</div>`}).join('')).join('')}</div>`
       :'<div class="hint">ยังไม่มีรายชื่อห้อง — ปิดหน้านี้แล้วกด “จัดการรายชื่อห้อง” ก่อน</div>'}</div>
     <label class="f" style="margin-top:10px">หมายเหตุ / วัตถุประสงค์<input type="text" data-af="note" value="${esc(a.note||'')}" ${ro?'disabled':''}></label>
     ${lock&&perm?`<div class="hint" style="margin-top:10px">🔒 กำลังใช้ห้องอยู่ — แก้ไขไม่ได้จนกว่าจะหมดเวลาที่ขอ (${esc(accTime(a))}) หรือกด “ออกจากห้องแล้ว” · เพิ่มรูป After ได้</div><div class="row" style="margin-top:10px;justify-content:flex-end"><button class="btn pri" data-a="out">ออกจากห้องแล้ว</button></div>`:''}${ro?'':`<div class="row" style="margin-top:14px;justify-content:flex-end">${isNew?'':`<button class="btn bad" data-a="del">ลบ</button><button class="btn" data-a="cancel">${a.status==='cancel'?'ยกเลิกการยกเลิก':'ยกเลิกคำขอ'}</button>${a.done||st==='done'?'':'<button class="btn" data-a="out">ออกจากห้องแล้ว</button>'}`}<button class="btn pri" data-a="save">บันทึก</button></div>`}`;
  };
  draw();
  const finish=()=>{o.remove();accPaintAll()};
  o.addEventListener('input',e=>{const t=e.target;if(ro)return;
    if(t.id==='ac-q'){q=t.value;const p=t.selectionStart;draw();const n=$('#ac-q',o);n.focus();n.setSelectionRange(p,p);return}
    if(t.dataset.af){a[t.dataset.af]=t.value}});
  o.addEventListener('change',async e=>{const t=e.target;if(ro&&!(perm&&t.dataset.accph))return;
    if(t.dataset.accph){const fs=[...t.files];t.value='';if(fs.length){toast('กำลังเพิ่มรูป…',20000);await accAddPhotos(a,fs,['before','after'].includes(t.dataset.accph)?t.dataset.accph:'photos');draw();if(!isNew)accSave(a,false)}return}
    if(t.dataset.af==='date'){draw()}});
  o.addEventListener('click',e=>{
    if(e.target===o){if(isNew){o.remove()}else finish();return}
    const b=e.target.closest('[data-a]');if(!b)return;const k=b.dataset.a;
    if(k==='close'){if(isNew){o.remove()}else{if(!ro)accSave(a,false);finish()}return}
    if(k==='dlall'){accDownloadPhotos(a,b);return}
    if(k==='photo'){const p=[...(a.photos||[]),...(a.before||[]),...(a.after||[])].find(x=>x.id===b.dataset.id);if(p)openBoard({kind:'photo',ro:true,title:'เอกสารขอเข้าห้อง',imgUrl:imgSrc(p.imgId),w:p.w,h:p.h,shapes:[],onChange:()=>{},onClose:()=>{}});return}
    if(k==='dela'&&perm){a.after=(a.after||[]).filter(x=>x.id!==b.dataset.id);draw();if(!isNew)accSave(a,false);return}
    if(k==='out'&&perm&&!isNew){a.to=accNowHM();a.done=true;accSave(a,false);toast('บันทึกเวลาออกแล้ว');finish();return}
    if(ro)return;
    if(k==='delb'){a.before=(a.before||[]).filter(x=>x.id!==b.dataset.id);draw();return}
    if(k==='delp'){a.photos=a.photos.filter(x=>x.id!==b.dataset.id);draw();return}
    if(k==='room'){const i=(a.rooms||[]).indexOf(b.dataset.id);a.rooms=a.rooms||[];if(i>=0)a.rooms.splice(i,1);else a.rooms.push(b.dataset.id);b.classList.toggle('on');const h=$('.f b.small',box);if(h)h.textContent=`ห้องที่ขอเข้า (${a.rooms.length})`;return}
    if(k==='save'){if(!(a.who||'').trim()&&!(a.photos||[]).length){toast('ใส่ชื่อผู้ขอ หรือถ่ายรูปเอกสารอย่างน้อย 1 อย่าง');return}
      if(!(a.rooms||[]).length&&rooms.length){toast('เลือกห้องที่ขอเข้าอย่างน้อย 1 ห้อง');return}
      accSave(a,isNew);toast('บันทึกคำขอแล้ว');finish();return}
    if(k==='out'){a.to=accNowHM();a.done=true;accSave(a,false);toast('บันทึกเวลาออกแล้ว');finish();return}
    if(k==='cancel'){a.status=a.status==='cancel'?'':'cancel';accSave(a,false);finish();return}
    if(k==='del'){armBtn(b,'กดอีกครั้งเพื่อลบ',()=>{S.access=S.access.filter(x=>x.id!==a.id);save();finish()})}
  });
}
function accSave(a,isNew){
  S.access=S.access||[];
  if(isNew&&!S.access.includes(a))S.access.push(a);else if(!S.access.find(x=>x.id===a.id))S.access.push(a);
  save();
}
const accPaintAll=()=>{if(UI.route==='access')$('#main').innerHTML=viewAccess()};

/* ----- จัดการรายชื่อห้อง ----- */
function accRoomsDlg(){
  const d=accRoomsDoc();
  const o=overlay(`<div class="box"><h3 style="margin-bottom:6px">รายชื่อห้อง</h3>
   <p class="hint">พิมพ์ 1 บรรทัดต่อ 1 ชั้น รูปแบบ <b>อาคาร/ชั้น: ห้อง, ห้อง, ช่วง</b> เช่น<br><span class="mono">A/1: 101-110, 112<br>A/2: 201-210<br>B/1: B101-B108</span></p>
   <textarea id="acc-rt" rows="9" style="width:100%" placeholder="A/1: 101-110">${esc(d?d.text:'')}</textarea>
   <div class="small muted" id="acc-rc" style="margin:6px 0"></div>
   <div class="row" style="justify-content:flex-end"><button class="btn" data-x="no">ยกเลิก</button><button class="btn pri" data-x="ok">บันทึก</button></div></div>`,'modal');
  const cnt=()=>{$('#acc-rc',o).textContent=`อ่านได้ ${accParseRooms($('#acc-rt',o).value).length} ห้อง`};cnt();
  o.addEventListener('input',e=>{if(e.target.id==='acc-rt')cnt()});
  o.addEventListener('click',e=>{const b=e.target.closest('[data-x]');if(!b&&e.target!==o)return;
    if(b&&b.dataset.x==='ok'){const text=$('#acc-rt',o).value;const list=accParseRooms(text);S.access=S.access||[];
      let doc=accRoomsDoc();if(!doc){doc={id:'rooms',kind:'rooms',text:'',list:[],created:Date.now()};S.access.push(doc)}
      doc.text=text;doc.list=list;save();toast(`บันทึก ${list.length} ห้องแล้ว`);accPaintAll()}
    o.remove()});
}

/* ----- ภาพสรุปรายวัน ----- */
function accSnapHTML(day,opt){
  opt=opt||{};
  const reqs=accDayReqs(day).filter(a=>a.status!=='cancel');const P=S.project;
  const used=new Set();reqs.forEach(a=>(a.rooms||[]).forEach(k=>used.add(k)));
  const rooms=accRoomList();
  const cell=r=>{const rs=reqs.filter(a=>(a.rooms||[]).includes(r.key));
    return`<div style="border:1px solid ${rs.length?'#e8761a':'#cfd5d3'};background:${rs.length?'#fff2e5':'#f6f8f7'};border-radius:8px;padding:6px 8px;min-height:54px"><div style="font-weight:700;font-size:15px">${esc(r.n)}</div>${rs.length?rs.map(a=>`<div style="font-size:11px;line-height:1.3">${esc(a.who||'-')}${a.org?' ('+esc(a.org)+')':''} <span style="font-family:monospace">${esc(accTime(a))}</span></div>`).join(''):'<div style="font-size:11px;color:#8a9490">ไม่มีผู้ขอ</div>'}</div>`};
  const body=(opt.groups||accGroups()).map(g=>`<div style="margin-top:12px"><div style="font-weight:700;font-size:16px;border-bottom:2px solid #cfd5d3;padding-bottom:3px;margin-bottom:6px">${g.b==='-'?'ไม่ระบุอาคาร':'อาคาร '+esc(g.b)}</div>${g.floors.map(fl=>`<div style="display:flex;gap:8px;margin-bottom:6px"><div style="width:58px;flex:none;font-weight:600;font-size:13px;padding-top:6px">${fl.f?'ชั้น '+esc(fl.f):''}</div><div style="flex:1;display:grid;grid-template-columns:repeat(6,1fr);gap:6px">${fl.rooms.map(cell).join('')}</div></div>`).join('')}</div>`).join('');
  return`<div style="width:1123px;box-sizing:border-box;padding:28px 32px;background:#fff;color:#18231f;font-family:Sarabun,'Noto Sans Thai',sans-serif">
   <div style="display:flex;align-items:flex-end;gap:16px"><div style="flex:1"><div style="font-size:12px;color:#5a6b66">${esc(P.name||'')} · ${esc(P.company&&P.company.name||'')}</div><div style="font-size:26px;font-weight:700">ตารางสถานะการเข้าใช้ห้อง${opt.title?' · '+esc(opt.title):''}</div></div><div style="text-align:right"><div style="font-size:20px;font-weight:700">${esc(accDateLabel(day))}</div><div style="font-size:12px;color:#5a6b66">${opt.groups?`${opt.groups.reduce((n,g)=>n+g.floors.reduce((m,f)=>m+f.rooms.length,0),0)} ห้อง · ${opt.groups.reduce((n,g)=>n+g.floors.reduce((m,f)=>m+f.rooms.filter(r=>used.has(r.key)).length,0),0)} ห้องมีผู้ขอ`:`${reqs.length} คำขอ · ${used.size}/${rooms.length} ห้องมีผู้ขอ`}</div></div></div>${body||'<p>ยังไม่มีรายชื่อห้อง</p>'}
   <div style="margin-top:14px;font-size:11px;color:#8a9490">${opt.groups?'ส่งออกโดย':'บันทึกอัตโนมัติโดย'} Inspection Desk · ${esc(new Date().toLocaleString('th-TH'))}</div></div>`;
}
async function accMakeSnap(day,quiet){
  if(!accRoomList().length){if(!quiet)toast('ยังไม่มีรายชื่อห้อง');return false}
  if(!window.html2canvas)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  const host=document.createElement('div');host.style.cssText='position:fixed;left:-9999px;top:0;z-index:-1';host.innerHTML=accSnapHTML(day);document.body.appendChild(host);
  try{
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;await sleep(150);
    const cv=await html2canvas(host.firstElementChild,{scale:1.5,backgroundColor:'#ffffff',logging:false});
    const url=cv.toDataURL('image/jpeg',.82);const id='snap-'+day;S.access=S.access||[];
    let doc=S.access.find(x=>x.id===id);const old=doc&&doc.imgId;
    const imgId=await putImage(url,'accsnap-'+day+'-'+Date.now().toString(36));
    const reqs=accDayReqs(day).filter(a=>a.status!=='cancel');const used=new Set();reqs.forEach(a=>(a.rooms||[]).forEach(k=>used.add(k)));
    if(!doc){doc={id,kind:'snap',date:day};S.access.push(doc)}
    Object.assign(doc,{imgId,w:cv.width,h:cv.height,reqs:reqs.length,roomsUsed:used.size,created:Date.now(),by:MODE.email||''});
    save();return true;
  }finally{host.remove()}
}
/* ส่งออกตารางสถานะห้อง: เลือกอาคาร/ชั้น แยกไฟล์ตามอาคาร/ชั้น และแนบรายละเอียดแต่ละห้อง (รูปเอกสาร/Before/After) */
const accRoomsOf=gs=>gs.flatMap(g=>g.floors.flatMap(f=>f.rooms));
function accFilterGroups(b,f){
  return accGroups().filter(g=>!b||g.b===b).map(g=>({b:g.b,floors:g.floors.filter(fl=>!f||fl.f===f)})).filter(g=>g.floors.length);
}
/* แยกกลุ่มตามโหมด: all=รวม, b=แยกอาคาร, f=แยกชั้น  → [{name,groups}] */
function accSplit(gs,mode){
  const bl=g=>g.b==='-'?'ไม่ระบุอาคาร':'อาคาร '+g.b;
  if(mode==='b')return gs.map(g=>({name:bl(g),groups:[g]}));
  if(mode==='f')return gs.flatMap(g=>g.floors.map(fl=>({name:bl(g)+(fl.f?' ชั้น '+fl.f:''),groups:[{b:g.b,floors:[fl]}]})));
  return[{name:'',groups:gs}];
}
function accDetailBlocks(day,keys){
  const set=new Set(keys);
  return accDayReqs(day).filter(a=>a.status!=='cancel'&&(a.rooms||[]).some(k=>set.has(k)));
}
function accDetailPages(day,reqs,title){
  const P=S.project,W=794,PH=1123,PAD=28,CH=PH-PAD*2-52;
  const th=p=>`<div style="width:172px;height:130px;background:#eef1f0;border-radius:6px;overflow:hidden">${annotatedSvg(imgSrc(p.imgId),p.w,p.h,[],[]).replace('<svg','<svg style="width:100%;height:100%;display:block"')}</div>`;
  const sec=(lb,L)=>{if(!(L||[]).length)return{h:'',n:0};const sh=L.slice(0,8);const rows=Math.ceil(sh.length/4);
    return{n:28+rows*138,h:`<div style="font-size:12px;font-weight:700;margin:8px 0 4px;color:#444">${lb} (${L.length})${L.length>8?' · แสดง 8 รูปแรก':''}</div><div style="display:grid;grid-template-columns:repeat(4,172px);gap:6px">${sh.map(th).join('')}</div>`}};
  const blocks=reqs.map(a=>{
    const rn=(a.rooms||[]).map(accRoomName);const chips=rn.slice(0,16).map(x=>`<span style="display:inline-block;background:#fff2e5;border:1px solid #e8761a;border-radius:99px;padding:1px 9px;margin:0 4px 4px 0;font-size:12px">${esc(x)}</span>`).join('')+(rn.length>16?`<span style="font-size:12px">+${rn.length-16}</span>`:'');
    const ss=[sec('เอกสารขอเข้าห้อง',a.photos),sec('BEFORE ก่อนเข้าห้อง',a.before),sec('AFTER หลังใช้ห้อง',a.after)];
    return{h:`<div style="border:1px solid #cfd5d3;border-radius:10px;padding:10px 12px;margin-bottom:10px;break-inside:avoid"><div style="display:flex;gap:10px;align-items:baseline"><b style="font-size:16px">${esc(a.who||'(ไม่ระบุผู้ขอ)')}</b><span style="font-size:12px;color:#555">${esc(a.org||'')}</span><span style="margin-left:auto;font-family:monospace;font-size:13px">${esc(accTime(a))}</span></div>
     <div style="margin-top:6px">${chips}</div>${a.note?`<div style="font-size:12px;color:#555">หมายเหตุ: ${esc(a.note)}</div>`:''}${ss.map(x=>x.h).join('')||'<div style="font-size:12px;color:#999;margin-top:6px">ไม่มีรูปแนบ</div>'}</div>`,
     n:Math.min(CH,62+(a.note?18:0)+Math.ceil(rn.slice(0,16).length/6)*26+ss.reduce((t,x)=>t+x.n,0)+(ss.every(x=>!x.n)?24:0))}});
  const pages=[];let cur=[],used=0;
  for(const b of blocks){if(cur.length&&used+b.n>CH){pages.push(cur);cur=[];used=0}cur.push(b);used+=b.n+12}
  if(cur.length)pages.push(cur);
  return pages.map((pg,i)=>`<div style="width:${W}px;height:${PH}px;box-sizing:border-box;padding:${PAD}px;background:#fff;color:#18231f;font-family:Sarabun,'Noto Sans Thai',sans-serif;overflow:hidden"><div style="display:flex;align-items:baseline;gap:12px;border-bottom:2px solid #cfd5d3;padding-bottom:6px;margin-bottom:10px"><div><div style="font-size:11px;color:#5a6b66">${esc(P.name||'')}</div><b style="font-size:18px">รายละเอียดการเข้าใช้ห้อง${title?' · '+esc(title):''}</b></div><div style="margin-left:auto;font-size:13px">${esc(accDateLabel(day))} · หน้า ${i+1}/${pages.length}</div></div>${pg.map(b=>b.h).join('')}</div>`);
}
async function accExport(kind){
  const day=accDay();if(!accRoomList().length){toast('ยังไม่มีรายชื่อห้อง');return}
  const all=accGroups();const o=overlay('<div class="box"></div>','modal');o.dataset.ro='0';const box=$('.box',o);
  const st={b:'',f:'',split:'all',fmt:kind==='png'?'png':'pdf',det:kind!=='png'};
  const draw=()=>{
    const bs=all.map(g=>g.b);const fs=[...new Set(all.filter(g=>!st.b||g.b===st.b).flatMap(g=>g.floors.map(f=>f.f)))];
    const gs=accFilterGroups(st.b,st.f);const n=accSplit(gs,st.split).length;
    box.innerHTML=`<h3 style="margin-bottom:4px">ส่งออกสถานะห้อง · ${esc(accDateLabel(day))}</h3><p class="hint">เลือกอาคาร/ชั้นที่ต้องการ และแยกเป็นภาพ/หน้าแยกตามอาคารหรือชั้นได้</p>
     <div class="grid"><label class="f">อาคาร<select data-e="b"><option value="">ทุกอาคาร</option>${bs.map(b=>`<option value="${esc(b)}" ${st.b===b?'selected':''}>${b==='-'?'ไม่ระบุอาคาร':esc(b)}</option>`).join('')}</select></label>
      <label class="f">ชั้น<select data-e="f"><option value="">ทุกชั้น</option>${fs.map(f=>`<option value="${esc(f)}" ${st.f===f?'selected':''}>${f?esc(f):'ไม่ระบุชั้น'}</option>`).join('')}</select></label>
      <label class="f">แยกภาพ/หน้า<select data-e="split"><option value="all" ${st.split==='all'?'selected':''}>รวมเป็นภาพเดียว</option><option value="b" ${st.split==='b'?'selected':''}>แยกตามอาคาร</option><option value="f" ${st.split==='f'?'selected':''}>แยกตามชั้น</option></select></label>
      <label class="f">รูปแบบไฟล์<select data-e="fmt"><option value="pdf" ${st.fmt==='pdf'?'selected':''}>PDF (หลายหน้า)</option><option value="png" ${st.fmt==='png'?'selected':''}>PNG (ภาพ${n>1?' — รวมเป็น ZIP':''})</option></select></label></div>
     <label class="chk" style="margin-top:10px"><input type="checkbox" data-e="det" ${st.det?'checked':''}> แนบรายละเอียดแต่ละห้อง (ผู้ขอ เวลา และรูปเอกสาร / Before / After)</label>
     <p class="small muted" style="margin:8px 0 0">จะได้ ${n} ${st.fmt==='pdf'?'ส่วน':'ภาพ'}ตารางห้อง${st.det?' + หน้ารายละเอียด':''}</p>
     <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn" data-x="no">ยกเลิก</button><button class="btn pri" data-x="go">ส่งออก</button></div>`};
  draw();
  o.addEventListener('change',e=>{const t=e.target,k=t.dataset.e;if(!k)return;st[k]=t.type==='checkbox'?t.checked:t.value;if(k==='b')st.f='';draw()});
  o.addEventListener('click',async e=>{
    if(e.target===o||e.target.closest('[data-x=no]')){o.remove();return}
    if(!e.target.closest('[data-x=go]'))return;o.remove();await accRunExport(day,st)});
}
/* ดาวน์โหลดรูปทั้งหมดของคำขอ (เอกสาร / Before / After) เป็น ZIP หรือทีละไฟล์ */
async function accDownloadPhotos(a,btn){
  const L=[['เอกสาร',a.photos],['Before',a.before],['After',a.after]].flatMap(([n,l])=>(l||[]).map((p,i)=>({p,name:`${(a.who||'request').replace(/[\\/:*?"<>|\s]+/g,'-')}_${a.date||''}_${n}_${i+1}.jpg`})));
  if(!L.length)return;if(btn)btn.classList.add('busy');
  try{
    toast('กำลังเตรียมรูป…',30000);await ensureData(L.map(x=>x.p.imgId));
    const files=[];for(const x of L){const r=await fetch(imgSrc(x.p.imgId));files.push({name:x.name,blob:await r.blob()})}
    if(files.length===1){await saveFile(files[0].name,files[0].blob);return}
    let ok=false;try{if(!window.JSZip)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
      const z=new JSZip();files.forEach(f=>z.file(f.name,f.blob));await saveFile(`${(a.who||'photos').replace(/[\\/:*?"<>|\s]+/g,'-')}_${a.date||''}.zip`,await z.generateAsync({type:'blob'}));ok=true}catch(e){}
    if(!ok)for(const f of files){await saveFile(f.name,f.blob);await sleep(400)}
  }catch(e){toast('ดาวน์โหลดไม่สำเร็จ: '+(e.message||e),5000)}finally{if(btn)btn.classList.remove('busy');toast('ดาวน์โหลดเสร็จแล้ว')}
}
async function accRunExport(day,st){
  const gs=accFilterGroups(st.b,st.f);if(!gs.length){toast('ไม่พบห้องตามที่เลือก');return}
  const parts=accSplit(gs,st.split);const pages=[]; // {html,w,h,land,name}
  toast('กำลังเตรียมรูป…',30000);
  const all=[];parts.forEach(p=>{const keys=accRoomsOf(p.groups).map(r=>r.key);const rq=st.det?accDetailBlocks(day,keys):[];p.rq=rq;rq.forEach(a=>[...(a.photos||[]),...(a.before||[]),...(a.after||[])].forEach(x=>all.push(x.imgId)))});
  await ensureData(all);
  parts.forEach((p,i)=>{
    pages.push({html:accSnapHTML(day,{groups:p.groups,title:p.name}),land:true,name:(p.name||'ทั้งหมด')});
    if(st.det)accDetailPages(day,p.rq,p.name).forEach((h,j)=>pages.push({html:h,land:false,name:(p.name||'ทั้งหมด')+' รายละเอียด'+(j+1)}))});
  const host=document.createElement('div');host.style.cssText='position:fixed;left:-9999px;top:0;z-index:-1';host.innerHTML=pages.map(p=>`<div class="accpg">${p.html}</div>`).join('');document.body.appendChild(host);
  try{
    toast(st.fmt==='pdf'?'กำลังสร้าง PDF…':'กำลังสร้างรูป PNG…',60000);
    if(!window.html2canvas)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;await sleep(200);
    const els=$$('.accpg',host);const base='RoomStatus_'+day;
    if(st.fmt==='pdf'){
      if(!window.jspdf)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      let pdf=null;
      for(let i=0;i<els.length;i++){
        const cv=await html2canvas(els[i].firstElementChild,{scale:2,backgroundColor:'#ffffff',logging:false});
        const land=pages[i].land,W=land?297:210,H=land?210:297;
        if(!pdf)pdf=new jspdf.jsPDF({unit:'mm',format:'a4',orientation:land?'l':'p',compress:true});else pdf.addPage('a4',land?'l':'p');
        const k=Math.min(W/cv.width,H/cv.height);const w=cv.width*k,h=cv.height*k;
        pdf.addImage(cv.toDataURL('image/jpeg',.9),'JPEG',(W-w)/2,0,w,h,undefined,'FAST');
      }
      await saveFile(base+'.pdf',pdf.output('blob'));return}
    const files=[];
    for(let i=0;i<els.length;i++){
      const cv=await html2canvas(els[i].firstElementChild,{scale:2,backgroundColor:'#ffffff',logging:false});
      const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
      files.push({name:`${base}_${String(i+1).padStart(2,'0')}_${pages[i].name.replace(/[\\/:*?"<>|\s]+/g,'-')}.png`,blob});
    }
    if(files.length===1){await saveFile(files[0].name,files[0].blob);return}
    let zipped=false;
    try{if(!window.JSZip)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
      const z=new JSZip();files.forEach(f=>z.file(f.name,f.blob));await saveFile(base+'.zip',await z.generateAsync({type:'blob'}));zipped=true}catch(e){}
    if(!zipped){for(const f of files){await saveFile(f.name,f.blob);await sleep(400)}}
  }catch(e){toast('ส่งออกไม่สำเร็จ: '+(e.message||e),5000)}finally{host.remove();toast('ส่งออกเสร็จแล้ว')}
}
let accSnapBusy=false;
/* สร้างภาพสรุปให้เองเมื่อเปิดแอป/ข้ามวัน: วันก่อนหน้าที่ยังไม่มีภาพ (ย้อนหลังสูงสุด 31 วัน) + วันนี้หลัง 21:00 */
async function accAutoSnap(){
  if(accSnapBusy||!canCreate()||MODE.ro||!accRoomList().length)return;
  const today=todayISO();const have=new Set(accSnaps().map(x=>x.date));
  const first=[...accReqs().map(a=>a.date),(accRoomsDoc()&&accRoomsDoc().created?new Date(accRoomsDoc().created).toISOString().slice(0,10):today)].sort()[0]||today;
  const todo=[];for(let d=accShift(today,-31);d<today;d=accShift(d,1)){if(d>=first&&!have.has(d))todo.push(d)}
  if(new Date().getHours()>=21&&!have.has(today))todo.push(today);
  if(!todo.length)return;
  accSnapBusy=true;
  try{for(const d of todo.slice(0,7)){await accMakeSnap(d,true)}if(UI.route==='access'&&!document.querySelector('.ov'))accPaintAll()}catch(e){}
  accSnapBusy=false;
}

/* ----- เหตุการณ์ ----- */
const ACCACT={
  accday(a,id){UI.accDate=id==='0'?null:accShift(accDay(),+id);if(UI.accDate===todayISO())UI.accDate=null;accPaintAll()},
  accnew(){if(!canCreate()){toast('ต้องเข้าสู่ระบบก่อนสร้างเอกสาร');return}accEdit(accNew(),true)},
  accrooms(){accRoomsDlg()},
  accpdf(){accExport('pdf')},accpng(){accExport('png')},
  accedit(a,id){const x=(S.access||[]).find(z=>z.id===id);if(x)accEdit(x,false)},
  accroom(a,key){
    const day=accDay();const rs=accDayReqs(day).filter(x=>(x.rooms||[]).includes(key)&&x.status!=='cancel');
    const o=overlay(`<div class="box"><div class="row" style="margin-bottom:8px"><h3 style="margin-right:auto">ห้อง ${esc(accRoomName(key))} <span class="small muted">${esc(accDateLabel(day))}</span></h3><button class="btn pri" data-x="no">ปิด</button></div>
     ${rs.length?`<div class="accl">${rs.map(x=>accCard(x,day)).join('')}</div>`:'<div class="empty small">ห้องนี้ไม่มีผู้ขอเข้าในวันนี้</div>'}
     ${canCreate()?`<div class="row" style="margin-top:12px"><button class="btn pri" data-x="add">＋ บันทึกคำขอเข้าห้องนี้</button></div>`:''}</div>`,'modal');
    o.addEventListener('click',e=>{const b=e.target.closest('[data-x]'),c=e.target.closest('[data-act="accedit"]');
      if(c){const x=S.access.find(z=>z.id===c.dataset.id);o.remove();if(x)accEdit(x,false);return}
      if(b&&b.dataset.x==='add'){o.remove();accEdit(accNew({rooms:[key]}),true);return}
      if(b||e.target===o)o.remove()});
  },
  accsnapnow(){const d=accDay();toast('กำลังสร้างภาพสรุป…',20000);accMakeSnap(d).then(ok=>{if(ok){toast('บันทึกภาพสรุปแล้ว');accPaintAll()}}).catch(x=>toast('สร้างภาพไม่สำเร็จ: '+(x.message||x),5000))},
  accsnapopen(a,id){const x=(S.access||[]).find(z=>z.id===id);if(!x)return;
    openBoard({kind:'photo',ro:true,title:'ตารางห้อง '+accDateLabel(x.date),imgUrl:imgSrc(x.imgId),w:x.w,h:x.h,shapes:[],onChange:()=>{},onClose:()=>{}})}
};
function accInput(t){
  if(t.id==='accd'){UI.accDate=t.value&&t.value!==todayISO()?t.value:null;accPaintAll();return true}
  return false;
}
async function accChange(t){
  if(t.id==='acccam'&&!MODE.ro){const fs=[...t.files];t.value='';if(!fs.length)return true;if(!canCreate()){toast('ต้องเข้าสู่ระบบก่อนสร้างเอกสาร');return true}
    const a=accNew();toast('กำลังเพิ่มรูป…',20000);await accAddPhotos(a,fs,t.dataset.accph==='before'?'before':'photos');accEdit(a,true);return true}
  if(t.id==='accd'){UI.accDate=t.value&&t.value!==todayISO()?t.value:null;accPaintAll();return true}
  return false;
}
/* อัปเดตสถานะเรียลไทม์ทุก 30 วินาที และสลับวันเมื่อข้ามเที่ยงคืน */
let accLastDay=todayISO();
setInterval(()=>{
  const t=todayISO();
  if(t!==accLastDay){accLastDay=t;if(UI.route==='access'&&!UI.accDate&&!document.querySelector('.ov'))accPaintAll()}
  if(UI.route==='access'&&!document.querySelector('.ov'))accPaint();
  accAutoSnap();
},30000);
setTimeout(accAutoSnap,6000);
