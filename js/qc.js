/* ========= QC Before/After (ไม่ต้องมีใบ Inspection) + แบบหน้างาน =========
   - QC DEFECT เก็บใน S.defects โดยมี qc:true  (rootId ว่าง จึงไม่ปนกับ DEFECT ของใบตรวจ)
   - แบบหน้างานใช้คลังแบบ S.library  (ฟิลด์เพิ่ม: rev, date, group, shapes) */
const QC_ST={open:['ต้องแก้ไข','bad'],fixed:['แก้แล้ว รอตรวจซ้ำ','warn'],closed:['ผ่าน QC ปิดแล้ว','good']};
const qcList=()=>S.defects.filter(d=>d.qc);
const qcImageIds=()=>[...qcList().flatMap(d=>[...(d.before||[]),...(d.after||[])].map(p=>p.imgId)),...(typeof accImageIds==='function'?accImageIds():[])];
function qcNext(){const n=qcList().reduce((m,d)=>Math.max(m,d.num||0),0)+1;return{num:n,code:'QC-'+String(n).padStart(3,'0')}}
function newQC(loc,num0){
  const n=num0!=null?{num:num0,code:'QC-'+String(num0).padStart(3,'0')}:qcNext();
  const d={id:'df'+uid(),qc:true,rootId:'',foundIn:'',num:n.num,code:n.code,status:'open',building:'',area:'',surface:'',face:'',type:'',desc:'',fix:'',protect:'',due:'',floor:'',scope:'',inspector:'',owner:'',note:'',grid:null,loc:loc||null,before:[],after:[],found:todayISO(),fixedOn:'',closedOn:'',created:Date.now()};
  const last=qcList().slice(-1)[0];if(last){d.building=last.building||'';d.floor=last.floor||'';d.area=last.area;d.surface=last.surface;d.inspector=last.inspector||'';d.owner=last.owner||''}
  S.defects.push(d);save();return d;
}
const libById=id=>S.library.find(l=>l.id===id);
const qcThumb=p=>p?annotatedSvg(imgSrc(p.imgId),p.w,p.h,p.shapes,[]):'';
/* ประเภทงานของ DEFECT → ไอคอน (จับจากคำใน Scope งาน / ประเภท) */
const QCI=p=>`<svg viewBox="0 0 24 24">${p}</svg>`;
const QC_CATS=[
 ['กระเบื้อง|tile|ยาแนว|ปูพื้น|ปูผนัง',QCI('<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>')],
 ['สี|ทาสี|paint|เคลือบ|อะคริลิก',QCI('<rect x="4" y="4" width="14" height="6" rx="1.5"/><path d="M18 7h2v5h-7v3"/><rect x="11" y="15" width="4" height="6" rx="1"/>')],
 ['ฝ้า|เพดาน|ceiling|ยิปซั่ม',QCI('<path d="M3 6h18M3 11h18"/><path d="M7 11v4M12 11v6M17 11v4"/>')],
 ['ประตู|หน้าต่าง|door|window|อลูมิเนียม|กระจก',QCI('<rect x="6" y="3.500" width="12" height="17" rx="1.500"/><circle cx="15" cy="12.500" r=".900"/>')],
 ['สุขภัณฑ์|ห้องน้ำ|ประปา|ท่อ|plumb|sanitary|สุขา',QCI('<path d="M12 3.500c3 4 5 6.500 5 9a5 5 0 0 1-10 0c0-2.500 2-5 5-9z"/>')],
 ['ไฟ|electric|สวิตช์|ปลั๊ก|โคม',QCI('<path d="M13 3L5 13.500h6L10 21l8-10.500h-6z"/>')],
 ['พื้น|floor|ปูน|คอนกรีต|ปรับระดับ|สระ',QCI('<path d="M3 17l9-5 9 5-9 5z"/><path d="M3 12l9-5 9 5"/>')],
 ['ผนัง|wall|ก่อ|ฉาบ|อิฐ',QCI('<rect x="3.500" y="4" width="17" height="16" rx="1"/><path d="M3.500 9.500h17M3.500 14.500h17M9 4v5.500M15 9.500v5M9 14.500V20"/>')],
 ['เหล็ก|กันตก|ราว|steel|เชื่อม',QCI('<path d="M5 20V8M12 20V8M19 20V8M3 8h18M3 14h18"/>')]];
const QC_OTHER=QCI('<circle cx="6" cy="12" r="1.800"/><circle cx="12" cy="12" r="1.800"/><circle cx="18" cy="12" r="1.800"/>');
const qcWork=d=>(d.scope||d.type||'').trim()||'ไม่ระบุงาน';
function qcCatIcon(name){const n=String(name).toLowerCase();for(const[k,ic]of QC_CATS)if(new RegExp(k,'i').test(n))return ic;return QC_OTHER}
function qcCatTiles(){
  const all=qcList();const m=new Map();all.forEach(d=>{const k=qcWork(d);const e=m.get(k)||{n:0,open:0};e.n++;if(d.status!=='closed')e.open++;m.set(k,e)});
  if(!m.size)return'';const cur=UI.qs||'';
  const tile=(k,ic,n,open)=>`<button class="qcat ${cur===k?'on':''}" data-act="qcat" data-qcat="${esc(k)}"><i class="ic">${ic}</i><b>${esc(k||'ทั้งหมด')}</b><span>${open?`<em>${open}</em> ค้าง · `:''}${n} จุด</span></button>`;
  return`<div class="qcats">${tile('',QCI('<rect x="4" y="4" width="6.500" height="6.500" rx="1.500"/><rect x="13.500" y="4" width="6.500" height="6.500" rx="1.500"/><rect x="4" y="13.500" width="6.500" height="6.500" rx="1.500"/><rect x="13.500" y="13.500" width="6.500" height="6.500" rx="1.500"/>'),all.length,all.filter(d=>d.status!=='closed').length)}${[...m.entries()].sort((a,b)=>b[1].n-a[1].n).map(([k,e])=>tile(k,qcCatIcon(k),e.n,e.open)).join('')}</div>`}
function qcFiltered(){
  const f=UI.qf||'open',q=(UI.qq||'').trim().toLowerCase();
  return qcList().filter(d=>(!UI.qs||qcWork(d)===UI.qs)&&(f==='all'||(f==='open'?d.status!=='closed':f==='need'?(d.status||'open')==='open':d.status===f))&&(!q||[d.code,d.building,d.area,d.type,d.desc,d.fix].join(' ').toLowerCase().includes(q)))
    .sort((a,b)=>String(a.code).localeCompare(String(b.code),undefined,{numeric:true}));
}

/* ---------- หน้ารายการ QC ---------- */
function viewQC(){
  const f=UI.qf||'open',g=UI.qg||'work';const all=qcList();const owner=canCreate();
  const cnt=k=>all.filter(d=>(d.status||'open')===k).length;
  let h=`<div class="row" style="margin-bottom:6px"><h1 style="font-size:22px;margin-right:auto">QC DEFECT · Before / After</h1>
   ${owner?'<label class="btn pri" for="qccam">📷 ถ่าย QC DEFECT ใหม่</label><input id="qccam" type="file" accept="image/*" capture="environment" hidden><label class="btn" for="qcmulti" title="เลือกรูปหลายรูปพร้อมกัน แต่ละรูปสร้างเป็น 1 รายการ">🖼 เลือกรูปหลายรูป (1 รูป = 1 รายการ)</label><input id="qcmulti" type="file" accept="image/*" multiple hidden><button class="btn" data-act="qcnew">＋ บันทึก DEFECT ใหม่</button>':''}<button class="btn" data-act="qcpdf">PDF${UI.qv==='table'?' (ตาราง)':''}</button><button class="btn" data-act="qchtml">HTML${UI.qv==='table'?' (ตาราง)':''}</button></div>
   <p class="hint" style="margin:0 0 10px">ใช้บันทึกงานที่พบจากการตรวจ QC โดยไม่ต้องมีใบ Inspection: ถ่ายรูปก่อนแก้ → แก้ → ถ่ายรูปหลังแก้ → ปิด · ปักหมุดตำแหน่งบน “แบบหน้างาน” และระบุแผ่นกระเบื้องที่ต้องแก้ได้</p>
   ${qcCatTiles()}
   <div class="stats"><div><b>${all.length}</b><span>ทั้งหมด</span></div><div><b style="color:var(--bad)">${cnt('open')}</b><span>ต้องแก้ไข</span></div><div><b style="color:var(--warn)">${cnt('fixed')}</b><span>แก้แล้ว รอตรวจซ้ำ</span></div><div><b style="color:var(--good)">${cnt('closed')}</b><span>ปิดแล้ว</span></div></div>
   <div class="row" style="margin:12px 0"><select id="qf" style="width:auto">${[['open','ค้างอยู่ (ยังไม่ปิด)'],['need','ต้องแก้ไข'],['fixed','แก้แล้ว รอตรวจซ้ำ'],['closed','ปิดแล้ว'],['all','ทั้งหมด']].map(o=>`<option value="${o[0]}" ${o[0]===f?'selected':''}>${o[1]}</option>`).join('')}</select>
   <label class="row small muted" style="gap:6px">มุมมอง<select id="qv" style="width:auto;color:var(--fg)"><option value="card" ${UI.qv!=='table'?'selected':''}>การ์ด</option><option value="table" ${UI.qv==='table'?'selected':''}>ตาราง DEFECTS LIST</option></select></label>
   <label class="row small muted" style="gap:6px">จัดกลุ่ม<select id="qg" style="width:auto;color:var(--fg)">${[['building','อาคาร'],['work','งาน (Scope)'],['area','ห้อง / พื้นที่'],['type','ประเภท'],['none','ไม่จัดกลุ่ม']].map(o=>`<option value="${o[0]}" ${o[0]===g?'selected':''}>${o[1]}</option>`).join('')}</select></label>
   <input type="search" id="qq" placeholder="ค้นหารหัส / ห้อง / ประเภท" value="${esc(UI.qq||'')}" style="width:220px"></div>`;
  const ds=qcFiltered();
  if(!ds.length)return h+`<div class="empty">${all.length?'ไม่มีรายการในมุมมองนี้':owner?'ยังไม่มี QC DEFECT กด “บันทึก DEFECT ใหม่” หรือเปิด “แบบหน้างาน” แล้วปักหมุดที่จุดที่พบ':'ยังไม่มีข้อมูล'}</div>`;
  if(UI.qv==='table')return h+(MODE.ro?qcTableView(ds):qcTableEdit(ds));
  const key=d=>g==='work'?qcWork(d):g==='building'?(d.building?'อาคาร '+d.building:'ไม่ระบุอาคาร'):g==='area'?(d.area||'ไม่ระบุพื้นที่'):g==='type'?(d.type||'ไม่ระบุประเภท'):'';
  const groups=new Map();ds.forEach(d=>{const k=key(d);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(d)});
  for(const k of [...groups.keys()].sort((a,b)=>a.localeCompare(b,'th',{numeric:true}))){
    const list=groups.get(k);const open=list.filter(d=>d.status!=='closed').length;
    if(k!=='')h+=`<div class="ghead l1"><b>${esc(k)}</b><span class="small muted">${list.length} จุด</span>${open?`<span class="chip bad">ค้าง ${open}</span>`:'<span class="chip good">ปิดครบ</span>'}</div>`;
    h+=`<div class="cards">${list.map(qcCard).join('')}</div>`;
  }
  return h;
}
function qcCard(d){
  const st=QC_ST[d.status||'open'];const b=(d.before||[])[0],a=(d.after||[])[0];
  return`<div class="card" style="cursor:pointer" data-act="qcopen" data-id="${d.id}">
   <div class="ba"><div class="bx"><span class="tg">BEFORE${(d.before||[]).length>1?' ×'+d.before.length:''}</span>${b?qcThumb(b):'<i>ไม่มีรูป</i>'}</div><div class="bx"><span class="tg af">AFTER${(d.after||[]).length>1?' ×'+d.after.length:''}</span>${a?qcThumb(a):'<i>ยังไม่มีรูป</i>'}</div></div>
   <div class="body"><div class="row"><b class="mono">${esc(d.code)}</b>${chip(st[0],st[1])}<span class="small muted" style="margin-left:auto">${esc(fmtDate(d.found))}</span></div>
   <div class="small">${esc([d.building&&'อาคาร '+d.building,d.area,d.surface,d.face].filter(Boolean).join(' · '))||'<span class="muted">ยังไม่ระบุตำแหน่ง</span>'}</div>
   <div class="small muted">${esc(d.type||'')}${d.fix?' → '+esc(d.fix):''}</div>
   <div class="row small">${d.loc?'<span class="chip good">มีหมุดบนแบบ</span>':'<span class="chip">ไม่มีหมุด</span>'}${d.grid&&d.grid.cells&&d.grid.cells.length?`<span class="chip good">ระบุแผ่น ${d.grid.cells.length}</span>`:''}</div></div></div>`;
}

/* ---------- หน้าต่างแก้ไข QC DEFECT ---------- */
async function addQCPhotos(d,stage,files){
  let n=0;d[stage]=d[stage]||[];
  for(const f of files){if(!f.type.startsWith('image/'))continue;try{const im=await fileToImage(f,1400,.8);const imgId=await putImage(im.url);d[stage].push({id:'ph'+uid(),imgId,w:im.w,h:im.h,caption:'',shapes:[]});n++}catch(e){toast('อ่านรูปไม่ได้: '+(f.name||''))}}
  if(n){save();toast(`เพิ่มรูป ${n} รูป`)}
}
function editQC(d,ctx){
  ctx=ctx||{};const P=S.project;const ro=MODE.ro||!canEditDefect(d);
  const opt=(arr,v)=>arr.map(x=>`<option ${x===v?'selected':''}>${esc(x)}</option>`).join('');
  const o=overlay('<div class="box wide"></div>','modal');o.dataset.ro=ro?'1':'0';const box=$('.box',o);
  const photoCol=(stage,title,cls)=>{const L=d[stage]||[];
    return`<div class="qcol"><div class="row" style="margin-bottom:6px"><b class="tg ${cls}" style="position:static">${title}</b><span class="small muted">${L.length} รูป</span>${ro?'':`<label class="btn sm" for="qc-${stage}" style="margin-left:auto">📷 ถ่าย</label><input id="qc-${stage}" data-qstage="${stage}" type="file" accept="image/*" capture="environment" hidden><label class="btn sm" for="qf-${stage}">＋ เพิ่มรูป</label><input id="qf-${stage}" data-qstage="${stage}" type="file" accept="image/*" multiple hidden>`}</div>
     ${L.length?`<div class="qph">${L.map(p=>`<div class="qp"><div class="thumb" data-q="open" data-st="${stage}" data-id="${p.id}">${qcThumb(p)}</div><input type="text" data-qp="${stage}:${p.id}" value="${esc(p.caption)}" placeholder="คำอธิบาย" ${ro?'disabled':''}>${ro?'':`<button class="btn sm bad" data-q="delp" data-st="${stage}" data-id="${p.id}">ลบ</button>`}</div>`).join('')}</div>`:`<div class="empty small">${stage==='before'?'ยังไม่มีรูปก่อนแก้':'ยังไม่มีรูปหลังแก้'}</div>`}</div>`};
  function draw(){
    const st=d.status||'open';const lib=d.loc&&libById(d.loc.libId);
    box.innerHTML=`<div class="row" style="margin-bottom:12px"><h3 style="margin-right:auto">QC DEFECT <span class="mono">${esc(d.code)}</span> ${chip(QC_ST[st][0],QC_ST[st][1])}</h3><button class="btn pri" data-q="close">เสร็จ</button></div>
     ${MODE.kind==='cloud'?`<div class="row small" style="margin-bottom:10px;gap:6px">${aclSummary('defects',d.id)}</div>`:''}
     <div class="row" style="margin-bottom:12px">${Object.keys(QC_ST).map(k=>`<button class="tool" data-q="st" data-v="${k}" aria-pressed="${st===k}" ${ro?'disabled':''}>${QC_ST[k][0]}</button>`).join('')}
      ${st==='fixed'&&!(d.after||[]).length?'<span class="chip warn">ยังไม่มีรูป After</span>':''}</div>
     <div class="qcols">${photoCol('before','BEFORE · ก่อนแก้','')}${photoCol('after','AFTER · หลังแก้','af')}</div>
     <div class="grid g2" style="margin-top:14px">
      <label class="f">รหัส<input type="text" data-qf="code" value="${esc(d.code)}"></label>
      <label class="f">อาคาร<input type="text" data-qf="building" value="${esc(d.building||'')}" list="qcbld"></label>
      <label class="f">ชั้นที่<input type="text" data-qf="floor" value="${esc(d.floor||'')}"></label>
      <label class="f">ห้อง / พื้นที่<input type="text" data-qf="area" value="${esc(d.area||'')}"></label>
      <label class="f">Scope งาน<input type="text" data-qf="scope" value="${esc(d.scope||'')}" placeholder="เช่น งานกระเบื้อง งานสี งานฝ้า" list="qcscope"></label>
      <label class="f">ผู้ตรวจ<input type="text" data-qf="inspector" value="${esc(d.inspector||'')}"></label>
      <label class="f">ผู้รับผิดชอบ<input type="text" data-qf="owner" value="${esc(d.owner||'')}" placeholder="ผู้รับเหมา / หัวหน้าช่าง"></label>
      <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">พื้นผิว<select data-qf="surface"><option value="">—</option>${opt(SURFACES,d.surface)}</select></label><label class="f">ด้าน / แนว<input type="text" data-qf="face" value="${esc(d.face||'')}"></label></div>
      <label class="f">ประเภท DEFECT<select data-qf="type"><option value="">—</option>${opt(P.defectTypes,d.type)}</select></label>
      ${pfSelect('data-qf',d)}
      <label class="f">กำหนดแก้เสร็จ<input type="date" data-qf="due" value="${esc(d.due||'')}"></label>
      <label class="f">วันที่พบ<input type="date" data-qf="found" value="${esc(d.found||'')}"></label>
      <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">วันที่แก้แล้ว<input type="date" data-qf="fixedOn" value="${esc(d.fixedOn||'')}"></label><label class="f">วันที่ปิด<input type="date" data-qf="closedOn" value="${esc(d.closedOn||'')}"></label></div>
     </div><datalist id="qcbld">${[...new Set([...qcList().map(x=>x.building),...S.requests.map(r=>r.building)].filter(Boolean))].map(b=>`<option>${esc(b)}</option>`).join('')}</datalist>
     <datalist id="qcscope">${[...new Set(qcList().map(x=>x.scope).filter(Boolean))].map(b=>`<option>${esc(b)}</option>`).join('')}</datalist>
     <label class="f" style="margin-top:10px">รายละเอียด<textarea data-qf="desc" rows="2">${esc(d.desc||'')}</textarea></label>
     <label class="f" style="margin-top:10px">หมายเหตุ<input type="text" data-qf="note" value="${esc(d.note||'')}"></label>
     <label class="f" style="margin-top:10px">วิธีแก้เฉพาะจุด<select data-qf="fix"><option value="">—</option>${opt(P.fixMethods,d.fix)}</select></label>
     <div class="row" style="margin-top:12px"><button class="btn" data-q="detail">${ro?'ดู':'ระบุ'}แผ่นกระเบื้องที่ต้องแก้ / ข้อควรระวัง</button>
      ${d.grid&&d.grid.cells&&d.grid.cells.length?`<span class="small">${esc(gridText(d.grid))}</span>`:'<span class="small muted">ยังไม่ระบุแผ่น</span>'}</div>
     <div class="row" style="margin-top:12px">${lib?`<button class="btn" data-q="goplan">ดูตำแหน่งบน “${esc(lib.name)}”</button>`:''}${ro?'':`<button class="btn" data-q="pin">${lib?'ย้ายหมุด':'ปักหมุดบนแบบหน้างาน'}</button>`}${lib?'<span class="chip good">มีหมุดบนแบบ</span>':'<span class="chip warn">ยังไม่ปักหมุด</span>'}
      ${ro?'':'<button class="btn bad" style="margin-left:auto" data-q="del">ลบ</button>'}</div>`;
    if(ro)$$('input,select,textarea',box).forEach(x=>{if(!x.hasAttribute('data-qstage'))x.disabled=true});
  }
  draw();
  const done=()=>{o.remove();ctx.after&&ctx.after(true)};
  o.addEventListener('input',e=>{const t=e.target;if(ro)return;
    if(t.dataset.qf){d[t.dataset.qf]=t.value;save()}
    else if(t.dataset.qp){const[s,id]=t.dataset.qp.split(':');const p=(d[s]||[]).find(x=>x.id===id);if(p){p.caption=t.value;save()}}});
  o.addEventListener('change',async e=>{const t=e.target;if(ro)return;
    if(t.dataset.qstage){await addQCPhotos(d,t.dataset.qstage,[...t.files]);t.value='';draw();return}
    if(t.dataset.qf==='surface'||t.dataset.qf==='type'||t.dataset.qf==='fix')return});
  o.addEventListener('click',e=>{
    if(e.target===o){done();return}
    const b=e.target.closest('[data-q]');if(!b)return;const q=b.dataset.q;
    if(q==='close'){done();return}
    if(q==='st'){if(ro)return;d.status=b.dataset.v;const t=todayISO();if(d.status==='fixed'&&!d.fixedOn)d.fixedOn=t;if(d.status==='closed'){if(!d.fixedOn)d.fixedOn=t;if(!d.closedOn)d.closedOn=t}save();draw();return}
    if(q==='open'){const L=d[b.dataset.st]||[];const p=L.find(x=>x.id===b.dataset.id);const i=L.indexOf(p);
      openBoard({kind:'photo',ro,title:`${d.code} · ${b.dataset.st==='before'?'BEFORE':'AFTER'} รูปที่ ${i+1}`,imgUrl:imgSrc(p.imgId),w:p.w,h:p.h,shapes:p.shapes,onChange:save,onClose:draw});return}
    if(q==='delp'){armBtn(b,'กดอีกครั้งเพื่อลบ',()=>{d[b.dataset.st]=d[b.dataset.st].filter(x=>x.id!==b.dataset.id);save();draw()});return}
    if(q==='detail'){editDefect(d,{qc:true,canDelete:false,after:()=>draw()});return}
    if(q==='goplan'){const lib=libById(d.loc.libId);if(lib){o.remove();openSite(lib,{after:()=>{ctx.after&&ctx.after(true)}})}return}
    if(q==='pin'){pickSitePlan(lib=>{o.remove();openSite(lib,{pinFor:d,after:()=>{editQC(d,ctx)}})});return}
    if(q==='del'){armBtn(b,'กดอีกครั้งเพื่อลบ',()=>{S.defects=S.defects.filter(z=>z.id!==d.id);save();done()});return}
  });
}
/* ---------- แบบหน้างาน = รายการไฟล์ (1 ไฟล์ = 1 แถว, PDF หลายหน้าแสดงเป็นหน้าเมื่อกดเปิด) ----------
   รายการใน S.library: หน้าแบบ {fileId,fileName,page,pages,ext,...} หรือไฟล์แนบ DWG {type:'attach',srcId,...} */
const isPage=l=>l.type!=='attach';
const sitePages=()=>S.library.filter(isPage);
const fidOf=l=>l.fileId||l.id;
const fileItems=fid=>S.library.filter(l=>fidOf(l)===fid);
const byPage=(a,b)=>(a.page||1)-(b.page||1);
const isCad=f=>/\.(dwg|dxf)$/i.test(f.name||'');
const fmtSize=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
function siteGroups(){
  const m=new Map();
  S.library.forEach(l=>{const k=fidOf(l);if(!m.has(k))m.set(k,{fid:k,pages:[],attach:[]});const g=m.get(k);(isPage(l)?g.pages:g.attach).push(l)});
  const out=[...m.values()];
  out.forEach(g=>{g.pages.sort(byPage);g.head=g.pages[0]||g.attach[0];g.name=g.head.fileName||g.head.name;g.rev=g.head.rev||'';g.date=g.head.date||'';g.group=g.head.group||''});
  out.sort((a,b)=>String(a.group).localeCompare(String(b.group),'th',{numeric:true})||String(a.name).localeCompare(String(b.name),'th',{numeric:true}));
  return out;
}
/* ทำให้ชื่อ/เลขหน้า/จำนวนหน้าของไฟล์สอดคล้องกัน หลังเพิ่ม-แทนที่-ลบหน้า */
function normalizeFile(fid){
  const pg=fileItems(fid).filter(isPage).sort(byPage);const head=pg[0];if(!head)return;
  const base=head.fileName||head.name;
  pg.forEach((l,i)=>{l.fileId=fid;l.fileName=base;l.page=i+1;l.pages=pg.length;l.name=pg.length>1?`${base} (หน้า ${i+1})`:base});
}
function setFileMeta(fid,k,v){
  const its=fileItems(fid);
  if(k==='name'){its.forEach(l=>{l.fileName=v});normalizeFile(fid)}
  else its.forEach(l=>{l[k]=v});
}
async function addAttach(file,fid,meta){
  if(file.size>45*1024*1024){toast('ไฟล์ '+file.name+' ใหญ่เกิน 45 MB (ข้อจำกัดของ Supabase แพ็กเกจฟรี) — ส่งเป็น PDF แทน หรือบีบอัดไฟล์',6000);return null}
  toast('กำลังอัปโหลด '+file.name+' ('+fmtSize(file.size)+')…',4000);
  const url=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(fr.error);fr.readAsDataURL(new Blob([file],{type:'application/octet-stream'}))});
  const srcId=await putImage(url);if(MODE.kind==='cloud')IMGDATA.delete(srcId);   // ไม่ถือไฟล์ใหญ่ไว้ในหน่วยความจำ
  const l={id:'lb'+uid(),type:'attach',fileId:fid,name:file.name,ext:(file.name.match(/\.([^.]+)$/)||[])[1]||'dwg',srcId,size:file.size,date:todayISO(),...(meta||{})};
  S.library.push(l);return l;
}
async function downloadAttach(l){
  try{toast('กำลังดาวน์โหลด…',2500);const s=imgSrc(l.srcId);let blob;
    if(/^data:/.test(s))blob=dataUrlToBlob(s);else{const r=await fetch(s);if(!r.ok)throw new Error('HTTP '+r.status);blob=await r.blob()}
    await saveFile(l.name,new Blob([blob],{type:'application/octet-stream'}));
  }catch(e){toast('ดาวน์โหลดไม่สำเร็จ: '+(e.message||e),4500)}
}
/* ใส่หน้าแบบ (PDF/รูป) ลงไฟล์: แทนที่ตามลำดับหน้า คงโซน/หมุดเดิม, หน้าเกินต่อท้าย, หน้าเดิมที่เหลือไม่ลบ */
async function replaceSite(fid,f){
  const items=fileItems(fid);const old=items.filter(isPage).sort(byPage);const head=old[0]||items[0];
  const nl=await importPlanFiles([f],{fileId:fid,maxPages:40});if(!nl.length)return;
  S.library=S.library.filter(x=>!nl.includes(x));
  let shift=false;
  nl.forEach((n,i)=>{const o=old[i];
    if(o){if(Math.abs(o.w/o.h-n.w/n.h)>.03)shift=true;o.imgId=n.imgId;o.w=n.w;o.h=n.h;o.ext=n.ext;o.date=todayISO()}
    else{n.rev=head.rev;n.group=head.group;n.date=todayISO();n.shapes=[];if(head.sym)n.sym=head.sym;S.library.push(n)}});
  const keep=head.fileName||(nl[0]&&nl[0].fileName);fileItems(fid).forEach(x=>x.fileName=keep);
  normalizeFile(fid);save();render();
  toast(old.length>nl.length?`แทนที่ ${nl.length} หน้า (หน้าเดิมที่เหลือยังอยู่ ลบเองได้ถ้าไม่ใช้)`:shift?'เปลี่ยนแบบแล้ว แต่สัดส่วนรูปต่างจากเดิม โซน/หมุดอาจเลื่อน ตรวจสอบอีกครั้ง':'เปลี่ยนเป็นฉบับใหม่แล้ว โซนและหมุดคงเดิม',5000);
}

function pickSitePlan(cb){
  const L=sitePages();
  if(!L.length){toast('ยังไม่มีแบบหน้างาน — เพิ่มที่แท็บ “แบบหน้างาน” ก่อน',3500);return}
  if(L.length===1)return cb(L[0]);
  const o=overlay(`<div class="box"><h3 style="margin-bottom:10px">ปักหมุดบนแบบไหน</h3>${L.map(l=>`<button class="pickrow" data-l="${l.id}"><b>${esc(l.name)}</b><span class="small muted">${esc(l.rev||'')}</span></button>`).join('')}<div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn" data-l="">ยกเลิก</button></div></div>`,'modal');
  o.addEventListener('click',e=>{const b=e.target.closest('[data-l]');if(!b&&e.target!==o)return;o.remove();if(b&&b.dataset.l)cb(libById(b.dataset.l))});
}

/* ---------- หน้าแบบหน้างาน ---------- */
function siteThumb(l){
  const pins=qcList().filter(d=>d.loc&&d.loc.libId===l.id&&d.status!=='closed').map(d=>({id:d.id,label:pinLabel(d),x:d.loc.x,y:d.loc.y,st:d.status}));
  return annotatedSvg(imgSrc(l.imgId),l.w,l.h,l.shapes||[],pins,{scale:l.sym});
}
function siteStats(g){
  const ids=new Set(g.pages.map(p=>p.id));const open=qcList().filter(d=>d.loc&&ids.has(d.loc.libId)&&d.status!=='closed').length;
  const nz=g.pages.reduce((n,p)=>n+(p.shapes||[]).filter(s=>s.t==='poly').length,0);
  return `<span class="chip ${open?'bad':'good'}">${open?'QC ค้าง '+open:'ไม่มี QC ค้าง'}</span>${nz?`<span class="chip">${nz} โซน</span>`:''}`;
}
function viewSite(){
  const owner=canCreate();const groups=siteGroups();
  if(UI.siteFile){const g=groups.find(x=>x.fid===UI.siteFile);if(g&&g.pages.length>1)return viewSiteFile(g);UI.siteFile=null}
  let h=`<div class="row" style="margin-bottom:6px"><h1 style="font-size:22px;margin-right:auto">แบบหน้างาน (ฉบับปัจจุบัน)</h1>${owner?'<label class="btn pri" for="sitefile">＋ อัปโหลดแบบ (PDF / รูป / DWG)</label><input id="sitefile" type="file" accept="image/*,application/pdf,.dwg,.dxf" multiple hidden>':''}</div>
   <p class="hint" style="margin:0 0 12px">${owner?'อัปโหลดแบบฉบับล่าสุดให้ทีมใช้ที่หน้างาน — PDF หลายหน้าแสดงเป็น 1 ไฟล์ กดเปิดเพื่อดูทีละหน้า · เปิดแบบเพื่อวาดโซนสีและปักหมุด QC DEFECT · ไฟล์ DWG เก็บไว้ให้ดาวน์โหลด (เบราว์เซอร์เปิดดู DWG ไม่ได้ — ถ้าจะดู/ปักหมุดหน้างาน ให้ส่งออกเป็น PDF แล้วเพิ่มภาพแบบเข้าไฟล์เดียวกัน, ตั้งชื่อไฟล์เหมือนกันตอนอัปโหลดพร้อมกันจะจับคู่ให้อัตโนมัติ)':'แตะไฟล์เพื่อเปิดแบบ ซูม ดูหมุด QC DEFECT และขีดเขียน/วางโซนของตัวเองได้ (เก็บในเครื่องนี้ ไม่ส่งถึงคนอื่น) แล้วกด “บันทึกเป็นรูป” เพื่อแชร์'}</p>`;
  if(!groups.length)return h+`<div class="empty">${owner?'ยังไม่มีแบบ กด “อัปโหลดแบบ” เพื่อเพิ่มแบบฉบับปัจจุบัน':'ยังไม่มีแบบหน้างาน'}</div>`;
  const hasGroup=groups.some(x=>x.group);let last=null,rows='';
  for(const g of groups){
    const hd=g.head,can=canEditPlan(hd),mine=isOwnerKey('plans',hd.id),editing=UI.siteEdit===g.fid&&can;
    if(hasGroup&&g.group!==last)rows+=`<div class="ghead l1" style="margin-top:10px"><b>${esc(g.group||'ไม่ระบุกลุ่ม')}</b></div>`;last=g.group;
    const p0=g.pages[0];const cad=g.attach.filter(a=>/^(dwg|dxf)$/i.test(a.ext||''));
    const kind=!p0?'DWG':p0.ext==='pdf'?'PDF':'รูป';
    const thumb=p0?`<div class="sth" data-act="siteopenf" data-id="${g.fid}">${siteThumb(p0)}</div>`:`<div class="sth cad" data-act="siteopenf" data-id="${g.fid}"><b>DWG</b><span>ยังไม่มีภาพแบบ</span></div>`;
    rows+=`<div class="srow">${thumb}<div class="sbd">
      <div class="row" style="gap:6px"><b class="sn">${esc(g.name)}</b><span class="chip">${kind}${g.pages.length>1?` · ${g.pages.length} หน้า`:''}</span>${g.pages.length&&cad.length?'<span class="chip">+ DWG</span>':''}</div>
      <div class="small muted">${esc([g.rev,g.date&&fmtDate(g.date)].filter(Boolean).join(' · ')||'—')}</div>
      <div class="row small" style="gap:4px">${p0?siteStats(g):''}${MODE.kind==='cloud'?aclSummary('plans',hd.id):''}</div>
      ${g.attach.map(a=>`<div class="row small" style="gap:6px"><span class="chip">${esc(a.name)}${a.size?' · '+fmtSize(a.size):''}</span><button class="btn sm" data-act="sitedl" data-id="${a.id}">ดาวน์โหลด</button>${can?`<button class="btn sm bad" data-act="delatt" data-id="${a.id}">ลบไฟล์นี้</button>`:''}</div>`).join('')}
      ${editing?`<div class="sedit"><input type="text" data-sl="${g.fid}" data-k="name" value="${esc(g.name)}" aria-label="ชื่อไฟล์แบบ">
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:6px"><input type="text" data-sl="${g.fid}" data-k="rev" value="${esc(g.rev)}" placeholder="Rev. เช่น R3" aria-label="revision"><input type="date" data-sl="${g.fid}" data-k="date" value="${esc(g.date)}" aria-label="วันที่แบบ"></div>
        <input type="text" data-sl="${g.fid}" data-k="group" value="${esc(g.group)}" placeholder="กลุ่ม เช่น อาคาร A / ชั้น 3" list="sitegrp"></div>`:''}
      <div class="row"><button class="btn pri sm" data-act="siteopenf" data-id="${g.fid}">${g.pages.length>1?'เปิดไฟล์':'เปิดแบบ'}</button>
       ${can?`<button class="btn sm" data-act="siteedit" data-id="${g.fid}">${editing?'เสร็จ':'แก้ไขชื่อ/Rev.'}</button><label class="btn sm" for="siterep-${g.fid}">${p0?'อัปโหลดฉบับใหม่':'ใส่ภาพแบบ (PDF/รูป)'}</label><input id="siterep-${g.fid}" data-rep="${g.fid}" type="file" accept="image/*,application/pdf" hidden>
       <label class="btn sm" for="siteatt-${g.fid}">แนบ DWG</label><input id="siteatt-${g.fid}" data-attach="${g.fid}" type="file" hidden>`:''}
       ${mine?`<button class="btn sm bad" data-act="sitedel" data-id="${g.fid}">ลบไฟล์</button>`:''}</div></div></div>`;
  }
  return h+`<div class="siterows">${rows}</div><datalist id="sitegrp">${[...new Set(groups.map(g=>g.group).filter(Boolean))].map(g=>`<option>${esc(g)}</option>`).join('')}</datalist>`;
}
function viewSiteFile(g){
  const can=canEditPlan(g.head);
  return `<div class="row" style="margin-bottom:10px"><button class="btn" data-act="siteback">‹ รายการแบบ</button><h1 style="font-size:20px;margin-right:auto">${esc(g.name)}</h1><span class="chip">${g.pages.length} หน้า</span>${g.rev?`<span class="chip">${esc(g.rev)}</span>`:''}</div>
  <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${g.pages.map(l=>{
    const open=qcList().filter(d=>d.loc&&d.loc.libId===l.id&&d.status!=='closed').length;const nz=(l.shapes||[]).filter(s=>s.t==='poly').length;
    return `<div class="card"><div class="thumb" data-act="siteopen" data-id="${l.id}">${siteThumb(l)}</div><div class="body"><b class="small">หน้า ${l.page||1}</b>
     <div class="row small">${open?`<span class="chip bad">QC ค้าง ${open}</span>`:'<span class="chip good">ไม่มี QC ค้าง</span>'}${nz?`<span class="chip">${nz} โซน</span>`:''}</div>
     <div class="row"><button class="btn pri sm" data-act="siteopen" data-id="${l.id}">เปิดหน้านี้</button>${can&&g.pages.length>1&&isOwnerKey('plans',l.id)?`<button class="btn sm bad" data-act="sitedelpg" data-id="${l.id}">ลบหน้า</button>`:''}</div></div></div>`}).join('')}</div>`;
}
const SITE_MINE=id=>'sitemine:'+id;
function openSite(lib,opts){
  opts=opts||{};const owner=canEditPlan(lib);const canPin=canCreate();let showClosed=!!opts.pinFor;let pinFor=opts.pinFor||null;
  const U=unitOf(lib.w,lib.h);let shapes;
  const symKey='symmine:'+lib.id;let sc=lib.sym||1;if(!owner){try{sc=+localStorage.getItem(symKey)||lib.sym||1}catch(e){}}
  if(owner){shapes=lib.shapes||(lib.shapes=[])}
  else{try{shapes=JSON.parse(localStorage.getItem(SITE_MINE(lib.id))||'[]')}catch(e){shapes=[]}}
  const pins=()=>qcList().filter(d=>d.loc&&d.loc.libId===lib.id&&(showClosed||d.status!=='closed')).map(d=>({id:d.id,label:pinLabel(d),x:d.loc.x,y:d.loc.y,st:d.status==='closed'?'closed':d.status==='fixed'?'fixed':'open'}));
  const board=openBoard({kind:'plan',ro:false,stampRO:!canCreate(),pinLock:id=>{const d=defectById(id);return !(d&&canEditDefect(d))},noPin:!canPin,title:lib.name+(lib.rev?' · '+lib.rev:''),imgUrl:imgSrc(lib.imgId),w:lib.w,h:lib.h,shapes,pinFor,
    ...(owner?{onFlip:async ax=>{const id=await flippedImageId(lib.imgId,ax);lib.imgId=id;mirrorShapes(lib.shapes,lib.w,lib.h,ax);qcList().forEach(d=>{if(d.loc&&d.loc.libId===lib.id){if(ax==='x')d.loc.x=lib.w-d.loc.x;else d.loc.y=lib.h-d.loc.y}});save();return imgSrc(id)}}:{}),
    scale:()=>sc,onScale:v=>{sc=v;if(owner){lib.sym=v;save()}else try{localStorage.setItem(symKey,v)}catch(e){}},
    header:`<button class="btn sm" data-a="tglc">แสดงที่ปิดแล้ว</button><button class="btn sm" data-a="png">บันทึกเป็นรูป</button>${owner?'':'<span class="chip warn">ขีดเขียนเก็บเฉพาะเครื่องนี้ (ไม่มีสิทธิ์แก้แบบนี้)</span>'}`,
    under:owner?null:()=>(lib.shapes||[]).map((s,i)=>shapeSvg(s,i,U*(lib.sym||1),false)).join(''),
    pins,
    onChange:()=>{if(owner)save();else try{localStorage.setItem(SITE_MINE(lib.id),JSON.stringify(shapes))}catch(e){}},
    onPinMove:()=>save(),
    onPinClick:id=>{const d=defectById(id);if(d)editQC(d,{after:()=>board.redraw()})},
    onPinAdd:(x,y)=>{
      if(pinFor){pinFor.loc={libId:lib.id,x,y};save();pinFor=null;board.redraw();toast('ปักหมุดแล้ว กด “เสร็จ” เพื่อกลับ');board.setTool('select');return}
      Promise.resolve(allocNo('qc',1)).then(n=>{const d=newQC({libId:lib.id,x,y},n);save();board.redraw();editQC(d,{after:()=>board.redraw()})}).catch(e=>toast('ขอเลขที่ไม่สำเร็จ: '+((e&&e.message)||e),5000))},
    onAction:async a=>{
      if(a==='tglc'){showClosed=!showClosed;board.redraw();toast(showClosed?'แสดงหมุดที่ปิดแล้ว':'ซ่อนหมุดที่ปิดแล้ว');return}
      if(a==='png'){await sitePng(lib,(lib.shapes||[]).concat(owner?[]:shapes),pins(),sc);return}
    },
    onClose:()=>{opts.after&&opts.after()}});
  return board;
}
async function sitePng(lib,shapes,pins,sc){
  try{
    toast('กำลังสร้างรูป…',2500);
    const im=await loadImgEl(imgSrc(lib.imgId));const k=Math.min(1,3000/Math.max(lib.w,lib.h));const W=Math.round(lib.w*k),H=Math.round(lib.h*k);
    const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.drawImage(im,0,0,W,H);
    const U=unitOf(lib.w,lib.h)*(sc||lib.sym||1);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lib.w} ${lib.h}" width="${W}" height="${H}">${shapes.map((s,i)=>shapeSvg(s,i,U,false)).join('')}${pins.map(p=>pinSvg(p,U,false)).join('')}</svg>`;
    const ov=await loadImgEl('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));x.drawImage(ov,0,0,W,H);
    const blob=await new Promise(r=>c.toBlob(r,'image/png'));
    await saveFile((lib.name||'plan')+'_'+todayISO()+'.png',blob);
  }catch(e){toast('สร้างรูปไม่สำเร็จ: '+(e.message||e),4500)}
}

/* ---------- รายงาน QC Before/After ---------- */
const QC_REPORT_CSS=`
.qh{display:flex;gap:12px;align-items:center;border-bottom:2px solid #111;padding-bottom:7px;margin-bottom:10px}.qh img{height:40px}
.qh .pt{font-weight:700;font-size:18px}.qh .ps{font-size:11px;color:#444}.qh .pn{margin-left:auto;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:700}
.qi{display:grid;grid-template-columns:repeat(4,1fr);gap:4px 14px;font-size:11.5px;margin-bottom:8px}.qi b{font-weight:600;color:#444}
.qm{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 230px;gap:10px;height:540px}
.qs{display:flex;flex-direction:column;gap:6px;min-height:0}.qs .lb{font-weight:700;font-size:12px;color:#fff;background:#e03131;padding:3px 8px;border-radius:3px;align-self:flex-start}.qs .lb.af{background:#2f9e44}
.qs .im{flex:1;min-height:0;border:1px solid #bbb;background:#f2f2f2;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}.qs .im svg{width:100%;height:100%;display:block}
.qs .im i{color:#999;font-size:12px;font-style:normal}.qs .cp{font-size:10.5px;color:#333;min-height:13px}
.qr{display:flex;flex-direction:column;gap:6px;font-size:10.5px;min-width:0}.qr .rb{border:1px solid #bbb;height:150px;overflow:hidden;background:#f2f2f2}.qr .rb svg{width:100%;height:100%;display:block}.qr .tt{font-weight:700;font-size:11px}
.dlp{position:absolute;inset:0;padding:16px 22px;font-size:11px;color:#111}
.dl-title{text-align:center;font-weight:700;font-size:17px;letter-spacing:.04em;border:1px solid #111;padding:5px 0;font-family:'Sarabun',serif}
.dl-loc{display:flex;gap:28px;border:1px solid #111;border-top:0;background:#fde4d3;padding:6px 8px;font-size:12px}
.dl-pj{display:flex;border:1px solid #111;border-top:0;font-size:11.5px}.dl-pj .l{flex:1;padding:3px 6px;border-right:1px solid #111}.dl-pj .l .v{font-weight:700;margin-left:20px}.dl-pj .r{width:380px;padding:3px 6px;display:flex;align-items:center}
.dl-tb{width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid #111}
.dl-tb th{border:1px solid #111;font-size:10.5px;font-weight:700;padding:3px 2px;line-height:1.2;text-align:center}
.dl-tb td{border:1px solid #111;padding:3px 4px;vertical-align:top;font-size:10.5px;height:180px;overflow:hidden;word-break:break-word}
.dl-tb td.c{text-align:center}.dl-tb td.dph{padding:2px;text-align:center}
.dl-im{height:148px;background:#f2f2f2;overflow:hidden}.dl-im svg{width:100%;height:100%;display:block}
.dl-none{color:#aaa;padding-top:60px}.dl-more{font-size:9.5px;color:#555}.dl-cap{font-size:9.5px;color:#333;line-height:1.15}
.dl-code{font-family:'IBM Plex Mono',monospace;font-size:8.5px;color:#555;margin-top:2px}.dl-tk{font-size:16px;font-weight:700}
.qpf{position:absolute;left:28px;right:28px;bottom:14px;display:flex;justify-content:space-between;font-size:10px;color:#666}
`;
function qcPages(list){
  const P=S.project;const logo=imgSrc(P.logoId)||'';const pages=[];
  const head=d=>`<div class="qh">${logo?`<img src="${logo}" alt="">`:''}<div><div class="pt">รายงาน QC DEFECT · Before / After</div><div class="ps">${esc(P.name)}${P.locate?' · '+esc(P.locate):''}</div></div><div class="pn">${esc(d.code)}<br><span style="font-size:11px">${esc(QC_ST[d.status||'open'][0])}</span></div></div>`;
  for(const d of list){
    const B=d.before||[],A=d.after||[];const np=Math.max(1,Math.ceil(Math.max(B.length,A.length)/2));
    const lib=d.loc&&libById(d.loc.libId);
    for(let k=0;k<np;k++){
      const col=(L,cls,t)=>`<div class="qs"><span class="lb ${cls}">${t}</span>${[0,1].map(j=>{const p=L[k*2+j];return`<div class="im" style="${p?'':'flex:.35'}">${p?qcThumb(p):`<i>${j===0&&k===0?'— ไม่มีรูป —':''}</i>`}</div><div class="cp">${p?esc(p.caption||''):''}</div>`}).join('')}</div>`;
      let side='';
      if(k===0){
        if(lib){const pin=[{id:d.id,label:pinLabel(d),x:d.loc.x,y:d.loc.y,st:d.status==='closed'?'closed':'open'}];const sz=Math.max(lib.w,lib.h)*.22;const vx=Math.min(Math.max(d.loc.x-sz*.75,0),Math.max(lib.w-sz*1.5,0)),vy=Math.min(Math.max(d.loc.y-sz*.5,0),Math.max(lib.h-sz,0));
          side+=`<div class="tt">ตำแหน่งบนแบบ · ${esc(lib.name)}${lib.rev?' ('+esc(lib.rev)+')':''}</div><div class="rb">${annotatedSvg(imgSrc(lib.imgId),lib.w,lib.h,lib.shapes||[],pin,{scale:lib.sym})}</div><div class="rb">${annotatedSvg(imgSrc(lib.imgId),lib.w,lib.h,lib.shapes||[],pin,{viewBox:[vx,vy,sz*1.5,sz],scale:lib.sym})}</div>`}
        if(d.grid&&d.grid.cols)side+=`<div class="tt">ตำแหน่งกระเบื้องที่ต้องแก้</div><div style="max-height:150px;display:flex;justify-content:center">${gridSvg(d.grid,150)}</div><div>${esc(gridText(d.grid))}</div>`;
        if(d.protect)side+=`<div class="tt">ข้อควรระวัง</div><div>${esc(d.protect)}</div>`;
      }
      pages.push({land:true,html:`<div class="pg">${head(d)}<div class="qi"><div><b>อาคาร</b> ${esc(d.building||'-')}</div><div><b>ห้อง/พื้นที่</b> ${esc(d.area||'-')}</div><div><b>พื้นผิว</b> ${esc([d.surface,d.face].filter(Boolean).join(' ')||'-')}</div><div><b>ประเภท</b> ${esc(d.type||'-')}</div>
        <div><b>วันที่พบ</b> ${esc(fmtDate(d.found)||'-')}</div><div><b>วันที่แก้</b> ${esc(fmtDate(d.fixedOn)||'-')}</div><div><b>วันที่ปิด</b> ${esc(fmtDate(d.closedOn)||'-')}</div><div><b>วิธีแก้</b> ${esc(d.fix||'-')}</div>
        <div style="grid-column:1/-1"><b>รายละเอียด</b> ${esc(d.desc||'-')}</div></div>
        <div class="qm">${col(B,'','BEFORE · ก่อนแก้')}${col(A,'af','AFTER · หลังแก้')}<div class="qr">${side}</div></div>
        <div class="qpf"><span>${esc(d.code)}${np>1?` (แผ่นที่ ${k+1}/${np})`:''}</span><span>%%P%% / %%N%%</span></div></div>`});
    }
  }
  const N=pages.length;return pages.map((p,i)=>({land:true,html:p.html.replace('%%P%%',i+1).replace('%%N%%',N)}));
}

/* ---------- ตาราง DEFECTS LIST OF WORK (ตามแบบฟอร์ม) ---------- */
const QC_ROWS_PER_PAGE=3;
const PF_OPTS=[['','อัตโนมัติ (ปิดแล้ว=ผ่าน, ที่เหลือเว้นว่าง)'],['p','ผ่าน'],['f','ไม่ผ่าน'],['n','ไม่ระบุ (เว้นว่าง)']];
const pfSelect=(attr,d)=>`<label class="f">ผลในตาราง DEFECTS LIST (ผ่าน / ไม่ผ่าน)<select ${attr}="result">${PF_OPTS.map(o=>`<option value="${o[0]}" ${(d.result||'')===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></label>`;
const qcPass=d=>d.result==='p'||d.result==='f'?d.result:d.result==='n'?'':(d.status==='closed'?'p':'');
const qcDesc=d=>[d.desc,[d.type,d.fix&&('วิธีแก้: '+d.fix)].filter(Boolean).join(' · '),d.grid&&d.grid.cells&&d.grid.cells.length?gridText(d.grid):''].filter(Boolean);
const qcAreaTxt=d=>[d.area,[d.surface,d.face].filter(Boolean).join(' ')].filter(Boolean);
const qcScope=d=>d.scope||d.type||'';
function qcGroups(list){
  const m=new Map();list.forEach(d=>{const k=(d.building||'')+'\u0001'+(d.floor||'');if(!m.has(k))m.set(k,{building:d.building||'',floor:d.floor||'',list:[]});m.get(k).list.push(d)});
  return [...m.values()].sort((a,b)=>natCmp(a.building,b.building)||natCmp(a.floor,b.floor));
}
function qcDateRange(list){const ds=list.map(d=>d.found).filter(Boolean).sort();if(!ds.length)return '';const a=fmtDate(ds[0]),b=fmtDate(ds[ds.length-1]);return a===b?a:a+' – '+b}
const qcTick=(on)=>on?'<span class="dl-tk">✓</span>':'';
function qcTablePages(list){
  const P=S.project;const pages=[];const subject=(P.qcSubject||'ตรวจสอบงาน QC · DEFECT Before / After');
  for(const g of qcGroups(list)){
    const types=[...new Set(g.list.map(qcScope).filter(Boolean))].join(', ');
    const np=Math.max(1,Math.ceil(g.list.length/QC_ROWS_PER_PAGE));
    for(let k=0;k<np;k++){
      const rows=g.list.slice(k*QC_ROWS_PER_PAGE,(k+1)*QC_ROWS_PER_PAGE);
      const ph=L=>{const p=(L||[])[0];return p?`<div class="dl-im">${qcThumb(p)}</div>${(L.length>1)?`<div class="dl-more">+${L.length-1} รูป</div>`:''}${p.caption?`<div class="dl-cap">${esc(p.caption)}</div>`:''}`:'<div class="dl-none">—</div>'};
      const tr=(d,i)=>{const pf=d?qcPass(d):'';return d?`<tr><td class="c"><b>${k*QC_ROWS_PER_PAGE+i+1}</b><div class="dl-code">${esc(d.code)}</div></td><td>${qcAreaTxt(d).map(esc).join('<br>')}</td><td class="dph">${ph(d.before)}</td><td class="dph">${ph(d.after)}</td><td>${qcDesc(d).map(esc).join('<br>')}</td><td>${esc(qcScope(d))}</td><td class="c">${esc(fmtDate(d.found)||'')}</td><td class="c">${esc(fmtDate(d.due)||'')}</td><td class="c">${qcTick(pf==='p')}</td><td class="c">${qcTick(pf==='f')}</td><td class="c">${esc(d.inspector||'')}</td><td class="c">${esc(d.owner||'')}</td><td>${esc(d.note||'')}</td></tr>`:'<tr>'+'<td></td>'.repeat(13)+'</tr>'};
      const body=[...rows.map(tr),...Array.from({length:QC_ROWS_PER_PAGE-rows.length},()=>tr(null))].join('');
      pages.push({land:true,html:`<div class="dlp"><div class="dl-title">DEFECTS LIST OF WORK</div>
       <div class="dl-loc"><span><b>Location</b> อาคาร ${esc(g.building||'-')}</span><span><b>ชั้นที่</b> ${esc(g.floor||'-')}</span><span style="flex:1"><b>TYPE :</b> ${esc(types||'-')}</span></div>
       <div class="dl-pj"><div class="l"><div><b>โครงการ / (Project) :</b> <span class="v">${esc(P.name)}</span></div><div><b>เรื่อง / (Subject) :</b> ${esc(subject)}</div></div><div class="r"><b>วันที่ตรวจสอบ / (Inspection date) :</b> ${esc(qcDateRange(g.list))}</div></div>
       <table class="dl-tb"><colgroup><col style="width:40px"><col style="width:90px"><col style="width:175px"><col style="width:175px"><col style="width:150px"><col style="width:70px"><col style="width:62px"><col style="width:62px"><col style="width:34px"><col style="width:40px"><col style="width:58px"><col style="width:58px"><col></colgroup>
       <thead><tr><th rowspan="2">ลำดับ<br>Item</th><th rowspan="2">พื้นที่<br>Area</th><th rowspan="2">ภาพก่อน<br>Photo Defect Before</th><th rowspan="2">ภาพหลัง<br>Photo Defect After</th><th rowspan="2">รายละเอียดของงาน<br>Description Defect</th><th rowspan="2">Scope งาน</th><th rowspan="2">วันที่<br>ตรวจสอบ</th><th rowspan="2">กำหนดวัน<br>แล้วเสร็จ</th><th colspan="2">ผลการตรวจสอบ</th><th rowspan="2">ผู้ตรวจ</th><th rowspan="2">ผู้รับ<br>ผิดชอบ</th><th rowspan="2">หมายเหตุ</th></tr><tr><th>ผ่าน</th><th>ไม่ผ่าน</th></tr></thead><tbody>${body}</tbody></table>
       <div class="qpf"><span>${esc(P.name)} · อาคาร ${esc(g.building||'-')} ชั้น ${esc(g.floor||'-')}${np>1?` (หน้า ${k+1}/${np})`:''}</span><span>%%P%% / %%N%%</span></div></div>`});
    }
  }
  const N=pages.length;return pages.map((p,i)=>({land:true,html:p.html.replace('%%P%%',i+1).replace('%%N%%',N)}));
}
/* ตารางแก้ไขในตัว: กรอกรายละเอียด/ใส่รูปหลายรูป/ติ๊กผ่าน-ไม่ผ่านได้ในช่องเลย */
function qcTableEdit(ds){
  let h='';
  const ph=(d,st,can)=>{const L=d[st]||[];const p=L[0];
    return`<div class="ph">${p?`<div class="im" data-act="qcopen" data-id="${d.id}" title="แตะเพื่อดู/ลบรูป">${qcThumb(p)}</div>`:'<i class="muted">—</i>'}${L.length>1?`<span class="small muted">+${L.length-1} รูป</span>`:''}
     ${can?`<div class="row"><label class="btn sm" for="tp-${st}-${d.id}">🖼 เพิ่มรูป</label><input id="tp-${st}-${d.id}" data-qtph="${st}:${d.id}" type="file" accept="image/*" multiple hidden></div>`:''}</div>`};
  for(const g of qcGroups(ds)){
    h+=`<div class="ghead l1"><b>${g.building?'อาคาร '+esc(g.building):'ไม่ระบุอาคาร'}${g.floor?' · ชั้น '+esc(g.floor):''}</b><span class="small muted">${g.list.length} จุด · พิมพ์ในช่องได้เลย บันทึกอัตโนมัติ</span></div>
     <div class="qtw"><table class="qtv qte"><thead><tr><th>ลำดับ</th><th>พื้นที่</th><th>ภาพก่อน</th><th>ภาพหลัง</th><th>รายละเอียด</th><th>Scope งาน</th><th>วันที่ตรวจ</th><th>กำหนดเสร็จ</th><th>ผ่าน</th><th>ไม่ผ่าน</th><th>ผู้ตรวจ</th><th>ผู้รับผิดชอบ</th><th>หมายเหตุ</th></tr></thead><tbody>
     ${g.list.map((d,i)=>{const can=!MODE.ro&&canEditDefect(d);const pf=qcPass(d);const dis=can?'':'disabled';
       const tx=(f,ph0)=>`<input type="text" data-qt="${f}:${d.id}" value="${esc(d[f]||'')}" ${ph0?`placeholder="${ph0}"`:''} ${dis}>`;
       const dt=f=>`<input type="date" data-qt="${f}:${d.id}" value="${esc(d[f]||'')}" ${dis}>`;
       return`<tr data-row="${d.id}"><td><b>${i+1}</b><div class="mono small codec" data-act="qcopen" data-id="${d.id}" title="เปิดรายละเอียดเต็ม">${esc(d.code)}</div></td>
       <td>${tx('area','ห้อง / พื้นที่')}</td><td class="dph">${ph(d,'before',can)}</td><td class="dph">${ph(d,'after',can)}</td>
       <td><textarea data-qt="desc:${d.id}" rows="4" ${dis}>${esc(d.desc||'')}</textarea></td><td>${tx('scope')}</td><td>${dt('found')}</td><td>${dt('due')}</td>
       <td class="c"><input type="checkbox" data-qpf="p:${d.id}" ${pf==='p'?'checked':''} ${dis}></td><td class="c"><input type="checkbox" data-qpf="f:${d.id}" ${pf==='f'?'checked':''} ${dis}></td>
       <td>${tx('inspector')}</td><td>${tx('owner')}</td><td>${tx('note')}</td></tr>`}).join('')}</tbody></table></div>`;
  }
  return h;
}
/* ตารางบนหน้าจอ (เลื่อนซ้าย-ขวาได้) — แตะแถวเพื่อแก้ไข */
function qcTableView(ds,act){act=act||'qcopen';
  let h='';
  for(const g of qcGroups(ds)){
    h+=`<div class="ghead l1"><b>${g.building?'อาคาร '+esc(g.building):'ไม่ระบุอาคาร'}${g.floor?' · ชั้น '+esc(g.floor):''}</b><span class="small muted">${g.list.length} จุด</span></div>
     <div class="qtw"><table class="qtv"><thead><tr><th>ลำดับ</th><th>พื้นที่</th><th>ภาพก่อน</th><th>ภาพหลัง</th><th>รายละเอียด</th><th>Scope งาน</th><th>วันที่ตรวจ</th><th>กำหนดเสร็จ</th><th>ผ่าน</th><th>ไม่ผ่าน</th><th>ผู้ตรวจ</th><th>ผู้รับผิดชอบ</th><th>หมายเหตุ</th></tr></thead><tbody>
     ${g.list.map((d,i)=>{const pf=qcPass(d);const b=(d.before||[])[0],a=(d.after||[])[0];return`<tr data-act="${act}" data-id="${d.id}"><td><b>${i+1}</b><div class="mono small">${esc(d.code)}</div></td><td>${qcAreaTxt(d).map(esc).join('<br>')||'<span class="muted">—</span>'}</td><td class="dph">${b?`<div class="im">${qcThumb(b)}</div>`:'<i>—</i>'}</td><td class="dph">${a?`<div class="im">${qcThumb(a)}</div>`:'<i>—</i>'}</td><td>${qcDesc(d).map(esc).join('<br>')}</td><td>${esc(qcScope(d))}</td><td>${esc(fmtDate(d.found)||'')}</td><td>${esc(fmtDate(d.due)||'')}</td><td class="c">${pf==='p'?'✓':''}</td><td class="c">${pf==='f'?'✓':''}</td><td>${esc(d.inspector||'')}</td><td>${esc(d.owner||'')}</td><td>${esc(d.note||'')}</td></tr>`}).join('')}</tbody></table></div>`;
  }
  return h;
}
async function qcPrepare(list){
  const ids=[];list.forEach(d=>{[...(d.before||[]),...(d.after||[])].forEach(p=>ids.push(p.imgId));const l=d.loc&&libById(d.loc.libId);if(l)ids.push(l.imgId)});
  await ensureData(ids);await ensureData([S.project.logoId,S.project.sigId],true);
}
async function exportQC(kind,opt){
  opt=opt||{};const list=opt.list||qcFiltered();if(!list.length){toast('ไม่มีรายการในมุมมองนี้');return}
  const tbl=opt.table||UI.qv==='table';
  const name=opt.name||((tbl?'QC-DefectsList_':'QC-BeforeAfter_')+todayISO());
  try{
    toast(kind==='pdf'?'กำลังสร้าง PDF…':'กำลังสร้างไฟล์…',4000);await qcPrepare(list);const pages=(tbl?qcTablePages:qcPages)(list);
    const css=REPORT_CSS+QC_REPORT_CSS;
    if(kind==='html'){
      const doc=`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${name}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Sarabun:wght@300;400;500;600;700&display=swap"><style>${css}body{margin:0;background:#777}.sheet{margin:12px auto}@page{size:A4 landscape;margin:0}@media print{body{background:none}.sheet{margin:0;page-break-after:always;break-after:page}}</style></head><body>${pages.map(p=>`<div class="sheet land">${p.html}</div>`).join('')}</body></html>`;
      await saveFile(name+'.html',new Blob([doc],{type:'text/html'}));return}
    if(!window.html2canvas)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    if(!window.jspdf)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const host=document.createElement('div');host.style.cssText='position:fixed;left:-9999px;top:0;width:1123px;z-index:-1';
    host.innerHTML=pages.map(p=>`<div class="sheet land">${p.html}</div>`).join('');document.body.appendChild(host);
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;await sleep(200);
    const pdf=new jspdf.jsPDF({unit:'mm',format:'a4',orientation:'l',compress:true});const sh=$$('.sheet',host);
    for(let i=0;i<sh.length;i++){if(i>0)pdf.addPage('a4','l');const cv=await html2canvas(sh[i],{scale:2,backgroundColor:'#ffffff',logging:false});pdf.addImage(cv.toDataURL('image/jpeg',.88),'JPEG',0,0,297,210,undefined,'FAST')}
    host.remove();await saveFile(name+'.pdf',pdf.output('blob'));
  }catch(e){toast('สร้างรายงานไม่สำเร็จ: '+(e.message||e),5000)}
}

/* ---------- ตัวจัดการเหตุการณ์ของหน้า QC / แบบหน้างาน ---------- */
const QCACT={
  qcat(a){UI.qs=a.dataset.qcat||'';$('#main').innerHTML=viewQC()},
  qcnew(){if(!canCreate()){toast('ต้องเข้าสู่ระบบก่อนสร้างเอกสาร');return}Promise.resolve(allocNo('qc',1)).then(n=>{const d=newQC(null,n);render();editQC(d,{after:()=>render()})}).catch(x=>toast('ขอเลขที่ไม่สำเร็จ: '+((x&&x.message)||x),5000))},
  qcopen(a,id){const d=defectById(id);if(d)editQC(d,{after:()=>render()})},
  qcpdf(){exportQC('pdf')},qchtml(){exportQC('html')},
  siteopen(a,id){const l=libById(id);if(l)openSite(l,{after:()=>render()})},
  siteopenf(a,id){const pg=fileItems(id).filter(isPage).sort(byPage);
    if(!pg.length){toast('ไฟล์นี้มีเฉพาะ DWG — กด “ใส่ภาพแบบ (PDF/รูป)” เพื่อเพิ่มภาพสำหรับดู/ปักหมุด หรือดาวน์โหลด DWG',5000);return}
    if(pg.length===1){openSite(pg[0],{after:()=>render()});return}
    UI.siteFile=id;render();window.scrollTo(0,0)},
  siteback(){UI.siteFile=null;render()},
  siteedit(a,id){UI.siteEdit=UI.siteEdit===id?null:id;render()},
  sitedl(a,id){const l=libById(id);if(l)downloadAttach(l)},
  delatt(a,id){armBtn(a,'กดอีกครั้งเพื่อลบ',()=>{S.library=S.library.filter(l=>l.id!==id);save();render()})},
  sitedelpg(a,id){armBtn(a,'กดอีกครั้งเพื่อลบหน้า',()=>{const l=libById(id);if(!l)return;const fid=fidOf(l);S.library=S.library.filter(x=>x.id!==id);S.defects.forEach(d=>{if(d.qc&&d.loc&&d.loc.libId===id)d.loc=null});normalizeFile(fid);save();render()})},
  sitedel(a,id){armBtn(a,'กดอีกครั้งเพื่อลบ',()=>{const ids=new Set(fileItems(id).map(l=>l.id));S.library=S.library.filter(l=>!ids.has(l.id));S.defects.forEach(d=>{if(d.qc&&d.loc&&ids.has(d.loc.libId))d.loc=null});if(UI.siteFile===id)UI.siteFile=null;save();render()})}
};
function qcInput(t){
  if(t.id==='qs'){UI.qs=t.value;$('#main').innerHTML=viewQC();return true}
  if(t.id==='qf'){UI.qf=t.value;$('#main').innerHTML=viewQC();return true}
  if(t.id==='qv'){UI.qv=t.value;$('#main').innerHTML=viewQC();return true}
  if(t.id==='qg'){UI.qg=t.value;$('#main').innerHTML=viewQC();return true}
  if(t.id==='qq'){UI.qq=t.value;const p=t.selectionStart;$('#main').innerHTML=viewQC();const q=$('#qq');q.focus();q.setSelectionRange(p,p);return true}
  if(t.dataset&&t.dataset.qt){if(MODE.ro)return true;const[f,id]=t.dataset.qt.split(':');const d=defectById(id);if(d&&canEditDefect(d)){d[f]=t.value;save()}return true}
  if(t.dataset&&t.dataset.sl){if(MODE.ro)return true;if(fileItems(t.dataset.sl).length){setFileMeta(t.dataset.sl,t.dataset.k,t.value);save()}return true}
  return false;
}
async function qcChange(t){
  if(t.dataset&&t.dataset.qpf){if(MODE.ro)return true;const[k,id]=t.dataset.qpf.split(':');const d=defectById(id);if(!d||!canEditDefect(d))return true;
    d.result=t.checked?k:'n';save();const tr=t.closest('tr');if(tr){tr.querySelectorAll('[data-qpf]').forEach(x=>{x.checked=!!t.checked&&x.dataset.qpf.split(':')[0]===k})}return true}
  if(t.dataset&&t.dataset.qtph){const fs=[...t.files].filter(f=>f.type.startsWith('image/'));t.value='';if(MODE.ro||!fs.length)return true;const[st,id]=t.dataset.qtph.split(':');const d=defectById(id);if(!d||!canEditDefect(d))return true;
    const y=window.scrollY;const sx=(t.closest('.qtw')||{}).scrollLeft||0;const ix=[...document.querySelectorAll('.qtw')].indexOf(t.closest('.qtw'));
    toast(`กำลังเพิ่มรูป ${fs.length} รูป…`,30000);await addQCPhotos(d,st,fs);render();window.scrollTo(0,y);const w=document.querySelectorAll('.qtw')[ix];if(w)w.scrollLeft=sx;return true}
  if(t.id==='qccam'&&!MODE.ro){const fs=[...t.files];t.value='';if(!fs.length)return true;if(!canCreate()){toast('ต้องเข้าสู่ระบบก่อนสร้างเอกสาร');return true}
    try{const n=await Promise.resolve(allocNo('qc',1));const d=newQC(null,n);await addQCPhotos(d,'before',fs);render();editQC(d,{after:()=>render()})}catch(x){toast('ขอเลขที่ไม่สำเร็จ: '+((x&&x.message)||x),5000)}
    return true}
  if(t.id==='qcmulti'&&!MODE.ro){const fs=[...t.files].filter(f=>f.type.startsWith('image/'));t.value='';if(!fs.length)return true;if(!canCreate()){toast('ต้องเข้าสู่ระบบก่อนสร้างเอกสาร');return true}
    let ok=0;
    for(let i=0;i<fs.length;i++){
      toast(`กำลังสร้าง QC DEFECT จากรูป ${i+1}/${fs.length}…`,60000);
      try{const n=await Promise.resolve(allocNo('qc',1));const d=newQC(null,n);await addQCPhotos(d,'before',[fs[i]]);ok++}
      catch(x){toast('ขอเลขที่ไม่สำเร็จ: '+((x&&x.message)||x),5000);break}}
    render();toast(`สร้าง QC DEFECT ${ok} รายการจากรูป ${fs.length} รูปแล้ว — แตะการ์ดเพื่อกรอกรายละเอียด (อาคาร/ชั้น/ห้อง คัดลอกจากรายการก่อนหน้าให้อัตโนมัติ)`,6000);return true}
  if(t.id==='sitefile'&&!MODE.ro){
    const files=[...t.files];t.value='';if(!files.length)return true;
    const byBase=new Map();let nPdf=0,nCad=0;
    for(const f of files.filter(f=>!isCad(f))){const ls=await importPlanFiles([f],{maxPages:40});if(ls.length){const fid=ls[0].fileId;ls.forEach(l=>{l.date=todayISO();l.shapes=[]});byBase.set(ls[0].fileName.toLowerCase(),fid);nPdf++}}
    for(const f of files.filter(isCad)){
      const base=f.name.replace(/\.[^.]+$/,'');const fid=byBase.get(base.toLowerCase())||('fl'+uid());
      const had=fileItems(fid)[0];const l=await addAttach(f,fid,had?{}:{fileName:base,rev:'',group:''});if(l){nCad++;if(had){l.fileName=had.fileName;l.rev=had.rev;l.group=had.group}}}
    if(nPdf+nCad){save();render();toast((nPdf?`เพิ่มไฟล์แบบ ${nPdf} ไฟล์`:'')+(nPdf&&nCad?' + ':'')+(nCad?`DWG ${nCad} ไฟล์`:'')+' แล้ว — กด “แก้ไขชื่อ/Rev.” ที่แถวเพื่อตั้งชื่อ/กลุ่ม',5000)}
    return true}
  if(t.dataset&&t.dataset.rep&&!MODE.ro){const f=[...t.files][0];t.value='';if(f)await replaceSite(t.dataset.rep,f);return true}
  if(t.dataset&&t.dataset.attach&&!MODE.ro){const f=[...t.files][0];t.value='';if(!f)return true;
    if(!isCad(f)){toast('ไฟล์แนบรองรับ .dwg / .dxf — ถ้าเป็น PDF/รูป ใช้ปุ่ม “อัปโหลดฉบับใหม่”',4500);return true}
    const fid=t.dataset.attach;const had=fileItems(fid)[0];const l=await addAttach(f,fid,{});if(l){if(had){l.fileName=had.fileName;l.rev=had.rev;l.group=had.group;l.date=had.date||l.date}save();render();toast('แนบ DWG แล้ว')}
    return true}
  return false;
}
/* UI + report styles for this module */
(function(){const s=document.createElement('style');s.id='qccss';s.textContent=`
.siterows{display:flex;flex-direction:column;gap:10px}
.srow{display:flex;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:10px}
.srow .sth{flex:0 0 130px;height:96px;background:var(--surface2);border-radius:6px;overflow:hidden;cursor:pointer;display:flex;align-items:center;justify-content:center}
.srow .sth svg{width:100%;height:100%;display:block}
.srow .sth.cad{flex-direction:column;gap:2px;color:var(--muted)}.srow .sth.cad b{font-size:22px;letter-spacing:.05em}.srow .sth.cad span{font-size:11px}
.srow .sbd{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}.srow .sn{font-size:15px;word-break:break-word}
.sedit{display:flex;flex-direction:column;gap:6px}
@media(max-width:560px){.srow{flex-direction:column}.srow .sth{flex:none;width:100%;height:150px}}
[hidden]{display:none!important}
.ba{display:grid;grid-template-columns:1fr 1fr;gap:2px;background:var(--line)}
.ba .bx{position:relative;aspect-ratio:4/3;background:var(--surface2);overflow:hidden;display:flex;align-items:center;justify-content:center}
.ba .bx svg{width:100%;height:100%;display:block}.ba .bx i{font-size:12px;color:var(--muted);font-style:normal}
.tg{position:absolute;left:6px;top:6px;z-index:1;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:#e03131;color:#fff;letter-spacing:.03em}
.tg.af{background:#2f9e44}
.qcols{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:700px){.qcols{grid-template-columns:1fr}}
.qph{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
.qp{display:flex;flex-direction:column;gap:5px}.qp .thumb{background:var(--surface2);aspect-ratio:4/3;border-radius:6px;overflow:hidden;cursor:pointer}.qp .thumb svg{width:100%;height:100%;display:block}

.qtw{overflow-x:auto;margin-bottom:14px;border:1px solid var(--line);border-radius:8px}
.qtv.qte{min-width:1700px}.qte th:nth-child(2){min-width:110px}.qte th:nth-child(5){min-width:220px}.qte th:nth-child(6),.qte th:nth-child(11),.qte th:nth-child(12){min-width:120px}.qte th:nth-child(13){min-width:150px}.qte th:nth-child(7),.qte th:nth-child(8){min-width:135px}.qte tbody tr{cursor:default}.qte td{padding:4px}.qte input[type=text],.qte input[type=date],.qte textarea,.qte select{width:100%;min-height:0;padding:5px 6px;font-size:13px}.qte textarea{resize:vertical;min-height:92px}
.qte .ph{display:flex;flex-direction:column;gap:4px;align-items:flex-start}.qte .ph .im{cursor:pointer;width:122px;height:92px}.qte .ph .row{gap:4px}.qte .ph .btn{padding:4px 8px;font-size:12px}.qte td.c input[type=checkbox]{width:20px;height:20px}.qte .codec{cursor:pointer}
.qtv{border-collapse:collapse;min-width:1000px;width:100%;font-size:13px}
.qtv th{background:var(--surface2);padding:7px 6px;font-size:12px;border:1px solid var(--line);white-space:nowrap}
.qtv td{border:1px solid var(--line);padding:6px;vertical-align:top}.qtv tbody tr{cursor:pointer}.qtv tbody tr:hover{background:var(--surface2)}
.qtv td.c{text-align:center;font-weight:700;color:var(--good)}.qtv td.dph{width:130px;min-width:130px}.qtv .im{width:122px;height:92px;background:var(--surface2);overflow:hidden;border-radius:4px}.qtv .im svg{width:100%;height:100%;display:block}
.nav{overflow-x:auto;scrollbar-width:none}.nav button{white-space:nowrap}
`+QC_REPORT_CSS;document.head.appendChild(s)})();

/* ---------- DEFECT ตามใบตรวจ → ตาราง DEFECTS LIST แบบเดียวกับ QC ---------- */
function dfAsQC(d,req){
  const root=reqById(d.rootId)||{};const chain=chainReqs(d.rootId);const fr=reqById(d.foundIn)||root;
  const before=[],after=[];chain.forEach(x=>(x.photos||[]).forEach(p=>{if(p.defectId===d.id){(p.stage==='after'?after:before).push(p)}}));
  let res=null;if(req&&req.res&&req.res[d.id]&&req.res[d.id].r)res=req.res[d.id].r;else for(const x of chain.filter(x=>x.type==='CLOSE').reverse()){const y=x.res&&x.res[d.id];if(y&&y.r){res=y.r;break}}
  const auto=res==='pass'?'p':res==='fail'?'f':'';
  const itemT=(()=>{for(const g of S.project.checklist||[])for(const i of g.items)if(i.id===d.item)return i.th||i.en;return''})();
  return{id:d.id,code:d.code,building:fr.building||root.building||'',floor:fr.floor||root.floor||'',area:d.area,surface:d.surface,face:d.face,type:d.type,desc:d.desc,fix:d.fix,grid:d.grid,
    before,after,scope:itemT||fr.workType||'',found:fr.date||'',due:d.due,result:d.result||auto||'n',inspector:'',owner:'',note:(d.zone?'โซน '+(zoneCount(d)||'')+' แผ่น':'')+(d.protect?(' '+d.protect):'')}}
const dfTableList=ds=>ds.map(dfAsQC);
