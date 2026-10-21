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
function accImageIds(){return(S.access||[]).flatMap(a=>[...(a.photos||[]).map(p=>p.imgId),...(a.before||[]).map(p=>p.imgId),a.imgId]).filter(Boolean)}
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
   <div class="accdate"><button class="btn sm" data-act="accday" data-id="-1" aria-label="วันก่อนหน้า">‹</button><b>${accDateLabel(day)}</b>${isToday?'<span class="chip bad">วันนี้</span>':''}<button class="btn sm" data-act="accday" data-id="1" aria-label="วันถัดไป">›</button>${isToday?'':'<button class="btn sm" data-act="accday" data-id="0">กลับไปวันนี้</button>'}<input type="date" id="accd" value="${day}" style="width:auto"></div>
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
    box.innerHTML=`<div class="row" style="margin-bottom:10px"><h3 style="margin-right:auto">${isNew?'บันทึกคำขอเข้าห้อง':'คำขอเข้าห้อง'} ${isNew?'':chip(ACC_ST[st][0],ACC_ST[st][1])}</h3><button class="btn pri" data-a="close">${isNew?'ยกเลิก':'เสร็จ'}</button></div>
     <div class="accphotos">${(a.photos||[]).map(p=>`<div class="qp"><div class="thumb" data-a="photo" data-id="${p.id}">${annotatedSvg(imgSrc(p.imgId),p.w,p.h,[],[])}</div>${ro?'':`<button class="btn sm bad" data-a="delp" data-id="${p.id}">ลบรูป</button>`}</div>`).join('')}
      ${ro?'':`<div class="qp"><label class="btn" for="ac-cam">📷 ถ่ายเอกสาร</label><input id="ac-cam" data-accph="1" type="file" accept="image/*" capture="environment" hidden><label class="btn" for="ac-up">🖼 เลือกรูป (หลายรูป)</label><input id="ac-up" data-accph="1" type="file" accept="image/*" multiple hidden></div>`}</div>
     <div class="f" style="margin-top:12px"><b class="small">📸 รูป BEFORE ก่อนเข้าห้อง (${(a.before||[]).length})</b>
      <div class="accphotos">${(a.before||[]).map(p=>`<div class="qp"><div class="thumb" data-a="photo" data-id="${p.id}">${annotatedSvg(imgSrc(p.imgId),p.w,p.h,[],[])}</div>${ro?'':`<button class="btn sm bad" data-a="delb" data-id="${p.id}">ลบรูป</button>`}</div>`).join('')}
      ${ro?'':`<div class="qp"><label class="btn" for="ac-bcam">📷 ถ่าย Before</label><input id="ac-bcam" data-accph="before" type="file" accept="image/*" capture="environment" hidden><label class="btn" for="ac-bup">🖼 เลือกรูป (หลายรูป)</label><input id="ac-bup" data-accph="before" type="file" accept="image/*" multiple hidden></div>`}</div></div>
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
     ${lock&&perm?`<div class="hint" style="margin-top:10px">🔒 กำลังใช้ห้องอยู่ — แก้ไขไม่ได้จนกว่าจะหมดเวลาที่ขอ (${esc(accTime(a))}) หรือกด “ออกจากห้องแล้ว”</div><div class="row" style="margin-top:10px;justify-content:flex-end"><button class="btn pri" data-a="out">ออกจากห้องแล้ว</button></div>`:''}${ro?'':`<div class="row" style="margin-top:14px;justify-content:flex-end">${isNew?'':`<button class="btn bad" data-a="del">ลบ</button><button class="btn" data-a="cancel">${a.status==='cancel'?'ยกเลิกการยกเลิก':'ยกเลิกคำขอ'}</button>${a.done||st==='done'?'':'<button class="btn" data-a="out">ออกจากห้องแล้ว</button>'}`}<button class="btn pri" data-a="save">บันทึก</button></div>`}`;
  };
  draw();
  const finish=()=>{o.remove();accPaintAll()};
  o.addEventListener('input',e=>{const t=e.target;if(ro)return;
    if(t.id==='ac-q'){q=t.value;const p=t.selectionStart;draw();const n=$('#ac-q',o);n.focus();n.setSelectionRange(p,p);return}
    if(t.dataset.af){a[t.dataset.af]=t.value}});
  o.addEventListener('change',async e=>{const t=e.target;if(ro)return;
    if(t.dataset.accph){const fs=[...t.files];t.value='';if(fs.length){toast('กำลังเพิ่มรูป…',20000);await accAddPhotos(a,fs,t.dataset.accph==='before'?'before':'photos');draw();if(!isNew)accSave(a,false)}return}
    if(t.dataset.af==='date'){draw()}});
  o.addEventListener('click',e=>{
    if(e.target===o){if(isNew){o.remove()}else finish();return}
    const b=e.target.closest('[data-a]');if(!b)return;const k=b.dataset.a;
    if(k==='close'){if(isNew){o.remove()}else{if(!ro)accSave(a,false);finish()}return}
    if(k==='photo'){const p=[...(a.photos||[]),...(a.before||[])].find(x=>x.id===b.dataset.id);if(p)openBoard({kind:'photo',ro:true,title:'เอกสารขอเข้าห้อง',imgUrl:imgSrc(p.imgId),w:p.w,h:p.h,shapes:[],onChange:()=>{},onClose:()=>{}});return}
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
function accSnapHTML(day){
  const reqs=accDayReqs(day).filter(a=>a.status!=='cancel');const P=S.project;
  const used=new Set();reqs.forEach(a=>(a.rooms||[]).forEach(k=>used.add(k)));
  const rooms=accRoomList();
  const cell=r=>{const rs=reqs.filter(a=>(a.rooms||[]).includes(r.key));
    return`<div style="border:1px solid ${rs.length?'#e8761a':'#cfd5d3'};background:${rs.length?'#fff2e5':'#f6f8f7'};border-radius:8px;padding:6px 8px;min-height:54px"><div style="font-weight:700;font-size:15px">${esc(r.n)}</div>${rs.length?rs.map(a=>`<div style="font-size:11px;line-height:1.3">${esc(a.who||'-')}${a.org?' ('+esc(a.org)+')':''} <span style="font-family:monospace">${esc(accTime(a))}</span></div>`).join(''):'<div style="font-size:11px;color:#8a9490">ไม่มีผู้ขอ</div>'}</div>`};
  const body=accGroups().map(g=>`<div style="margin-top:12px"><div style="font-weight:700;font-size:16px;border-bottom:2px solid #cfd5d3;padding-bottom:3px;margin-bottom:6px">${g.b==='-'?'ไม่ระบุอาคาร':'อาคาร '+esc(g.b)}</div>${g.floors.map(fl=>`<div style="display:flex;gap:8px;margin-bottom:6px"><div style="width:58px;flex:none;font-weight:600;font-size:13px;padding-top:6px">${fl.f?'ชั้น '+esc(fl.f):''}</div><div style="flex:1;display:grid;grid-template-columns:repeat(6,1fr);gap:6px">${fl.rooms.map(cell).join('')}</div></div>`).join('')}</div>`).join('');
  return`<div style="width:1123px;box-sizing:border-box;padding:28px 32px;background:#fff;color:#18231f;font-family:Sarabun,'Noto Sans Thai',sans-serif">
   <div style="display:flex;align-items:flex-end;gap:16px"><div style="flex:1"><div style="font-size:12px;color:#5a6b66">${esc(P.name||'')} · ${esc(P.company&&P.company.name||'')}</div><div style="font-size:26px;font-weight:700">ตารางสถานะการเข้าใช้ห้อง</div></div><div style="text-align:right"><div style="font-size:20px;font-weight:700">${esc(accDateLabel(day))}</div><div style="font-size:12px;color:#5a6b66">${reqs.length} คำขอ · ${used.size}/${rooms.length} ห้องมีผู้ขอ</div></div></div>${body||'<p>ยังไม่มีรายชื่อห้อง</p>'}
   <div style="margin-top:14px;font-size:11px;color:#8a9490">บันทึกอัตโนมัติโดย Inspection Desk · ${esc(new Date().toLocaleString('th-TH'))}</div></div>`;
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
