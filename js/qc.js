/* ========= QC Before/After (ไม่ต้องมีใบ Inspection) + แบบหน้างาน =========
   - QC DEFECT เก็บใน S.defects โดยมี qc:true  (rootId ว่าง จึงไม่ปนกับ DEFECT ของใบตรวจ)
   - แบบหน้างานใช้คลังแบบ S.library  (ฟิลด์เพิ่ม: rev, date, group, shapes) */
const QC_ST={open:['ต้องแก้ไข','bad'],fixed:['แก้แล้ว รอตรวจซ้ำ','warn'],closed:['ผ่าน QC ปิดแล้ว','good']};
const qcList=()=>S.defects.filter(d=>d.qc);
const qcImageIds=()=>qcList().flatMap(d=>[...(d.before||[]),...(d.after||[])].map(p=>p.imgId));
function qcNext(){const n=qcList().reduce((m,d)=>Math.max(m,d.num||0),0)+1;return{num:n,code:'QC-'+String(n).padStart(3,'0')}}
function newQC(loc){
  const n=qcNext();
  const d={id:'df'+uid(),qc:true,rootId:'',foundIn:'',num:n.num,code:n.code,status:'open',building:'',area:'',surface:'',face:'',type:'',desc:'',fix:'',protect:'',due:'',grid:null,loc:loc||null,before:[],after:[],found:todayISO(),fixedOn:'',closedOn:'',created:Date.now()};
  const last=qcList().slice(-1)[0];if(last){d.building=last.building||'';d.area=last.area;d.surface=last.surface}
  S.defects.push(d);save();return d;
}
const libById=id=>S.library.find(l=>l.id===id);
const qcThumb=p=>p?annotatedSvg(imgSrc(p.imgId),p.w,p.h,p.shapes,[]):'';
function qcFiltered(){
  const f=UI.qf||'open',q=(UI.qq||'').trim().toLowerCase();
  return qcList().filter(d=>(f==='all'||(f==='open'?d.status!=='closed':f==='need'?(d.status||'open')==='open':d.status===f))&&(!q||[d.code,d.building,d.area,d.type,d.desc,d.fix].join(' ').toLowerCase().includes(q)))
    .sort((a,b)=>String(a.code).localeCompare(String(b.code),undefined,{numeric:true}));
}

/* ---------- หน้ารายการ QC ---------- */
function viewQC(){
  const f=UI.qf||'open',g=UI.qg||'building';const all=qcList();const owner=!MODE.ro;
  const cnt=k=>all.filter(d=>(d.status||'open')===k).length;
  let h=`<div class="row" style="margin-bottom:6px"><h1 style="font-size:22px;margin-right:auto">QC DEFECT · Before / After</h1>
   ${owner?'<button class="btn pri" data-act="qcnew">＋ บันทึก DEFECT ใหม่</button>':''}<button class="btn" data-act="qcpdf">PDF</button><button class="btn" data-act="qchtml">HTML</button></div>
   <p class="hint" style="margin:0 0 10px">ใช้บันทึกงานที่พบจากการตรวจ QC โดยไม่ต้องมีใบ Inspection: ถ่ายรูปก่อนแก้ → แก้ → ถ่ายรูปหลังแก้ → ปิด · ปักหมุดตำแหน่งบน “แบบหน้างาน” และระบุแผ่นกระเบื้องที่ต้องแก้ได้</p>
   <div class="stats"><div><b>${all.length}</b><span>ทั้งหมด</span></div><div><b style="color:var(--bad)">${cnt('open')}</b><span>ต้องแก้ไข</span></div><div><b style="color:var(--warn)">${cnt('fixed')}</b><span>แก้แล้ว รอตรวจซ้ำ</span></div><div><b style="color:var(--good)">${cnt('closed')}</b><span>ปิดแล้ว</span></div></div>
   <div class="row" style="margin:12px 0"><select id="qf" style="width:auto">${[['open','ค้างอยู่ (ยังไม่ปิด)'],['need','ต้องแก้ไข'],['fixed','แก้แล้ว รอตรวจซ้ำ'],['closed','ปิดแล้ว'],['all','ทั้งหมด']].map(o=>`<option value="${o[0]}" ${o[0]===f?'selected':''}>${o[1]}</option>`).join('')}</select>
   <label class="row small muted" style="gap:6px">จัดกลุ่ม<select id="qg" style="width:auto;color:var(--fg)">${[['building','อาคาร'],['area','ห้อง / พื้นที่'],['type','ประเภท'],['none','ไม่จัดกลุ่ม']].map(o=>`<option value="${o[0]}" ${o[0]===g?'selected':''}>${o[1]}</option>`).join('')}</select></label>
   <input type="search" id="qq" placeholder="ค้นหารหัส / ห้อง / ประเภท" value="${esc(UI.qq||'')}" style="width:220px"></div>`;
  const ds=qcFiltered();
  if(!ds.length)return h+`<div class="empty">${all.length?'ไม่มีรายการในมุมมองนี้':owner?'ยังไม่มี QC DEFECT กด “บันทึก DEFECT ใหม่” หรือเปิด “แบบหน้างาน” แล้วปักหมุดที่จุดที่พบ':'ยังไม่มีข้อมูล'}</div>`;
  const key=d=>g==='building'?(d.building?'อาคาร '+d.building:'ไม่ระบุอาคาร'):g==='area'?(d.area||'ไม่ระบุพื้นที่'):g==='type'?(d.type||'ไม่ระบุประเภท'):'';
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
  ctx=ctx||{};const P=S.project;const ro=MODE.ro;
  const opt=(arr,v)=>arr.map(x=>`<option ${x===v?'selected':''}>${esc(x)}</option>`).join('');
  const o=overlay('<div class="box wide"></div>','modal');const box=$('.box',o);
  const photoCol=(stage,title,cls)=>{const L=d[stage]||[];
    return`<div class="qcol"><div class="row" style="margin-bottom:6px"><b class="tg ${cls}" style="position:static">${title}</b><span class="small muted">${L.length} รูป</span>${ro?'':`<label class="btn sm" for="qf-${stage}" style="margin-left:auto">＋ เพิ่มรูป</label><input id="qf-${stage}" data-qstage="${stage}" type="file" accept="image/*" multiple hidden>`}</div>
     ${L.length?`<div class="qph">${L.map(p=>`<div class="qp"><div class="thumb" data-q="open" data-st="${stage}" data-id="${p.id}">${qcThumb(p)}</div><input type="text" data-qp="${stage}:${p.id}" value="${esc(p.caption)}" placeholder="คำอธิบาย" ${ro?'disabled':''}>${ro?'':`<button class="btn sm bad" data-q="delp" data-st="${stage}" data-id="${p.id}">ลบ</button>`}</div>`).join('')}</div>`:`<div class="empty small">${stage==='before'?'ยังไม่มีรูปก่อนแก้':'ยังไม่มีรูปหลังแก้'}</div>`}</div>`};
  function draw(){
    const st=d.status||'open';const lib=d.loc&&libById(d.loc.libId);
    box.innerHTML=`<div class="row" style="margin-bottom:12px"><h3 style="margin-right:auto">QC DEFECT <span class="mono">${esc(d.code)}</span> ${chip(QC_ST[st][0],QC_ST[st][1])}</h3><button class="btn pri" data-q="close">เสร็จ</button></div>
     <div class="row" style="margin-bottom:12px">${Object.keys(QC_ST).map(k=>`<button class="tool" data-q="st" data-v="${k}" aria-pressed="${st===k}" ${ro?'disabled':''}>${QC_ST[k][0]}</button>`).join('')}
      ${st==='fixed'&&!(d.after||[]).length?'<span class="chip warn">ยังไม่มีรูป After</span>':''}</div>
     <div class="qcols">${photoCol('before','BEFORE · ก่อนแก้','')}${photoCol('after','AFTER · หลังแก้','af')}</div>
     <div class="grid g2" style="margin-top:14px">
      <label class="f">รหัส<input type="text" data-qf="code" value="${esc(d.code)}"></label>
      <label class="f">อาคาร<input type="text" data-qf="building" value="${esc(d.building||'')}" list="qcbld"></label>
      <label class="f">ห้อง / พื้นที่<input type="text" data-qf="area" value="${esc(d.area||'')}"></label>
      <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">พื้นผิว<select data-qf="surface"><option value="">—</option>${opt(SURFACES,d.surface)}</select></label><label class="f">ด้าน / แนว<input type="text" data-qf="face" value="${esc(d.face||'')}"></label></div>
      <label class="f">ประเภท DEFECT<select data-qf="type"><option value="">—</option>${opt(P.defectTypes,d.type)}</select></label>
      <label class="f">กำหนดแก้เสร็จ<input type="date" data-qf="due" value="${esc(d.due||'')}"></label>
      <label class="f">วันที่พบ<input type="date" data-qf="found" value="${esc(d.found||'')}"></label>
      <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">วันที่แก้แล้ว<input type="date" data-qf="fixedOn" value="${esc(d.fixedOn||'')}"></label><label class="f">วันที่ปิด<input type="date" data-qf="closedOn" value="${esc(d.closedOn||'')}"></label></div>
     </div><datalist id="qcbld">${[...new Set([...qcList().map(x=>x.building),...S.requests.map(r=>r.building)].filter(Boolean))].map(b=>`<option>${esc(b)}</option>`).join('')}</datalist>
     <label class="f" style="margin-top:10px">รายละเอียด<textarea data-qf="desc" rows="2">${esc(d.desc||'')}</textarea></label>
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
function pickSitePlan(cb){
  if(!S.library.length){toast('ยังไม่มีแบบหน้างาน — เพิ่มที่แท็บ “แบบหน้างาน” ก่อน',3500);return}
  if(S.library.length===1)return cb(S.library[0]);
  const o=overlay(`<div class="box"><h3 style="margin-bottom:10px">ปักหมุดบนแบบไหน</h3>${S.library.map(l=>`<button class="pickrow" data-l="${l.id}"><b>${esc(l.name)}</b><span class="small muted">${esc(l.rev||'')}</span></button>`).join('')}<div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn" data-l="">ยกเลิก</button></div></div>`,'modal');
  o.addEventListener('click',e=>{const b=e.target.closest('[data-l]');if(!b&&e.target!==o)return;o.remove();if(b&&b.dataset.l)cb(libById(b.dataset.l))});
}

/* ---------- หน้าแบบหน้างาน ---------- */
function viewSite(){
  const owner=!MODE.ro;const lib=[...S.library].sort((a,b)=>String(a.group||'').localeCompare(String(b.group||''),'th',{numeric:true})||String(a.name).localeCompare(String(b.name),'th',{numeric:true}));
  let h=`<div class="row" style="margin-bottom:6px"><h1 style="font-size:22px;margin-right:auto">แบบหน้างาน (ฉบับปัจจุบัน)</h1>${owner?'<label class="btn pri" for="sitefile">＋ อัปโหลดแบบ (รูป / PDF)</label><input id="sitefile" type="file" accept="image/*,application/pdf" multiple hidden>':''}</div>
   <p class="hint" style="margin:0 0 12px">${owner?'อัปโหลดแบบฉบับล่าสุดให้ทีมใช้ที่หน้างาน · เปิดแบบเพื่อวาดโซนสี (บันทึกให้ทุกคนเห็น) และปักหมุด QC DEFECT · เมื่อแบบอัปเดต ใช้ “อัปโหลดฉบับใหม่” เพื่อแทนรูปโดยคงโซนและหมุดเดิม':'แตะแบบเพื่อเปิด ซูม ดูหมุด QC DEFECT และขีดเขียน/วางโซนของตัวเองได้ (เก็บในเครื่องนี้ ไม่ส่งถึงคนอื่น) แล้วกด “บันทึกเป็นรูป” เพื่อแชร์'}</p>`;
  if(!lib.length)return h+`<div class="empty">${owner?'ยังไม่มีแบบ กด “อัปโหลดแบบ” เพื่อเพิ่มแบบฉบับปัจจุบัน':'ยังไม่มีแบบหน้างาน'}</div>`;
  const hasGroup=lib.some(x=>x.group);let last=null,cards='';
  for(const l of lib){
    const pins=qcList().filter(d=>d.loc&&d.loc.libId===l.id);const open=pins.filter(d=>d.status!=='closed');const nz=(l.shapes||[]).filter(s=>s.t==='poly').length;
    if(hasGroup&&(l.group||'')!==last)cards+=`<div class="ghead l1" style="grid-column:1/-1;margin-top:10px"><b>${esc(l.group||'ไม่ระบุกลุ่ม')}</b></div>`;last=l.group||'';
    cards+=`<div class="card"><div class="thumb" data-act="siteopen" data-id="${l.id}">${annotatedSvg(imgSrc(l.imgId),l.w,l.h,l.shapes||[],open.map(d=>({id:d.id,label:pinLabel(d),x:d.loc.x,y:d.loc.y,st:d.status})))}</div><div class="body">
     ${owner?`<input type="text" data-sl="${l.id}" data-k="name" value="${esc(l.name)}" aria-label="ชื่อแบบ">
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:6px"><input type="text" data-sl="${l.id}" data-k="rev" value="${esc(l.rev||'')}" placeholder="Rev. เช่น R3" aria-label="revision"><input type="date" data-sl="${l.id}" data-k="date" value="${esc(l.date||'')}" aria-label="วันที่แบบ"></div>
      <input type="text" data-sl="${l.id}" data-k="group" value="${esc(l.group||'')}" placeholder="กลุ่ม เช่น อาคาร A / ชั้น 3" list="sitegrp">`
      :`<b>${esc(l.name)}</b><div class="small muted">${esc([l.rev,l.date&&fmtDate(l.date)].filter(Boolean).join(' · '))}</div>`}
     <div class="row small">${open.length?`<span class="chip bad">QC ค้าง ${open.length}</span>`:'<span class="chip good">ไม่มี QC ค้าง</span>'}${nz?`<span class="chip">${nz} โซน</span>`:''}</div>
     <div class="row"><button class="btn pri sm" data-act="siteopen" data-id="${l.id}">เปิดแบบ</button>${owner?`<label class="btn sm" for="siterep-${l.id}">อัปโหลดฉบับใหม่</label><input id="siterep-${l.id}" data-rep="${l.id}" type="file" accept="image/*,application/pdf" hidden><button class="btn sm bad" data-act="sitedel" data-id="${l.id}">ลบ</button>`:''}</div></div></div>`;
  }
  return h+`<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">${cards}</div><datalist id="sitegrp">${[...new Set(S.library.map(l=>l.group).filter(Boolean))].map(g=>`<option>${esc(g)}</option>`).join('')}</datalist>`;
}
const SITE_MINE=id=>'sitemine:'+id;
function openSite(lib,opts){
  opts=opts||{};const owner=!MODE.ro;let showClosed=!!opts.pinFor;let pinFor=opts.pinFor||null;
  const U=unitOf(lib.w,lib.h);let shapes;
  if(owner){shapes=lib.shapes||(lib.shapes=[])}
  else{try{shapes=JSON.parse(localStorage.getItem(SITE_MINE(lib.id))||'[]')}catch(e){shapes=[]}}
  const pins=()=>qcList().filter(d=>d.loc&&d.loc.libId===lib.id&&(showClosed||d.status!=='closed')).map(d=>({id:d.id,label:pinLabel(d),x:d.loc.x,y:d.loc.y,st:d.status==='closed'?'closed':d.status==='fixed'?'fixed':'open'}));
  const board=openBoard({kind:'plan',ro:false,pinLock:!owner,noPin:!owner,title:lib.name+(lib.rev?' · '+lib.rev:''),imgUrl:imgSrc(lib.imgId),w:lib.w,h:lib.h,shapes,pinFor,
    header:`<button class="btn sm" data-a="tglc">แสดงที่ปิดแล้ว</button><button class="btn sm" data-a="png">บันทึกเป็นรูป</button>${owner?'':'<span class="chip warn">ขีดเขียนเก็บเฉพาะเครื่องนี้</span>'}`,
    under:owner?null:()=>(lib.shapes||[]).map((s,i)=>shapeSvg(s,i,U,false)).join(''),
    pins,
    onChange:()=>{if(owner)save();else try{localStorage.setItem(SITE_MINE(lib.id),JSON.stringify(shapes))}catch(e){}},
    onPinMove:()=>save(),
    onPinClick:id=>{const d=defectById(id);if(d)editQC(d,{after:()=>board.redraw()})},
    onPinAdd:(x,y)=>{
      if(pinFor){pinFor.loc={libId:lib.id,x,y};save();pinFor=null;board.redraw();toast('ปักหมุดแล้ว กด “เสร็จ” เพื่อกลับ');board.setTool('select');return}
      const d=newQC({libId:lib.id,x,y});save();board.redraw();editQC(d,{after:()=>board.redraw()})},
    onAction:async a=>{
      if(a==='tglc'){showClosed=!showClosed;board.redraw();toast(showClosed?'แสดงหมุดที่ปิดแล้ว':'ซ่อนหมุดที่ปิดแล้ว');return}
      if(a==='png'){await sitePng(lib,(lib.shapes||[]).concat(owner?[]:shapes),pins());return}
    },
    onClose:()=>{opts.after&&opts.after()}});
  return board;
}
async function sitePng(lib,shapes,pins){
  try{
    toast('กำลังสร้างรูป…',2500);
    const im=await loadImgEl(imgSrc(lib.imgId));const k=Math.min(1,3000/Math.max(lib.w,lib.h));const W=Math.round(lib.w*k),H=Math.round(lib.h*k);
    const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.drawImage(im,0,0,W,H);
    const U=unitOf(lib.w,lib.h);
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
          side+=`<div class="tt">ตำแหน่งบนแบบ · ${esc(lib.name)}${lib.rev?' ('+esc(lib.rev)+')':''}</div><div class="rb">${annotatedSvg(imgSrc(lib.imgId),lib.w,lib.h,lib.shapes||[],pin)}</div><div class="rb">${annotatedSvg(imgSrc(lib.imgId),lib.w,lib.h,lib.shapes||[],pin,{viewBox:[vx,vy,sz*1.5,sz]})}</div>`}
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
async function qcPrepare(list){
  const ids=[];list.forEach(d=>{[...(d.before||[]),...(d.after||[])].forEach(p=>ids.push(p.imgId));const l=d.loc&&libById(d.loc.libId);if(l)ids.push(l.imgId)});
  await ensureData(ids);await ensureData([S.project.logoId,S.project.sigId],true);
}
async function exportQC(kind){
  const list=qcFiltered();if(!list.length){toast('ไม่มีรายการในมุมมองนี้');return}
  const name=`QC-BeforeAfter_${todayISO()}`;
  try{
    toast(kind==='pdf'?'กำลังสร้าง PDF…':'กำลังสร้างไฟล์…',4000);await qcPrepare(list);const pages=qcPages(list);
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
  qcnew(){const d=newQC();render();editQC(d,{after:()=>render()})},
  qcopen(a,id){const d=defectById(id);if(d)editQC(d,{after:()=>render()})},
  qcpdf(){exportQC('pdf')},qchtml(){exportQC('html')},
  siteopen(a,id){const l=libById(id);if(l)openSite(l,{after:()=>render()})},
  sitedel(a,id){armBtn(a,'กดอีกครั้งเพื่อลบ',()=>{S.library=S.library.filter(l=>l.id!==id);S.defects.forEach(d=>{if(d.qc&&d.loc&&d.loc.libId===id)d.loc=null});save();render()})}
};
function qcInput(t){
  if(t.id==='qf'){UI.qf=t.value;$('#main').innerHTML=viewQC();return true}
  if(t.id==='qg'){UI.qg=t.value;$('#main').innerHTML=viewQC();return true}
  if(t.id==='qq'){UI.qq=t.value;const p=t.selectionStart;$('#main').innerHTML=viewQC();const q=$('#qq');q.focus();q.setSelectionRange(p,p);return true}
  if(t.dataset&&t.dataset.sl){if(MODE.ro)return true;const l=libById(t.dataset.sl);if(l){l[t.dataset.k]=t.value;save()}return true}
  return false;
}
async function qcChange(t){
  if(t.id==='sitefile'&&!MODE.ro){const libs=await importPlanFiles([...t.files]);t.value='';libs.forEach(l=>{l.date=todayISO();l.shapes=[]});if(libs.length){save();render();toast('เพิ่มแบบ '+libs.length+' แผ่นแล้ว ตั้งชื่อ/Rev. ได้ที่การ์ด')}return true}
  if(t.dataset&&t.dataset.rep&&!MODE.ro){const l=libById(t.dataset.rep);const files=[...t.files];t.value='';if(!l||!files.length)return true;
    const nl=await importPlanFiles(files.slice(0,1));if(nl.length){const n=nl[0];S.library=S.library.filter(x=>x!==n);const ar0=l.w/l.h,ar1=n.w/n.h;l.imgId=n.imgId;l.w=n.w;l.h=n.h;l.date=todayISO();save();render();
      toast(Math.abs(ar0-ar1)>.03?'เปลี่ยนแบบแล้ว แต่สัดส่วนรูปต่างจากเดิม โซน/หมุดอาจเลื่อน ตรวจสอบอีกครั้ง':'เปลี่ยนเป็นฉบับใหม่แล้ว โซนและหมุดคงเดิม',5000)}
    return true}
  return false;
}
/* UI + report styles for this module */
(function(){const s=document.createElement('style');s.id='qccss';s.textContent=`
[hidden]{display:none!important}
.ba{display:grid;grid-template-columns:1fr 1fr;gap:2px;background:var(--line)}
.ba .bx{position:relative;aspect-ratio:4/3;background:var(--surface2);overflow:hidden;display:flex;align-items:center;justify-content:center}
.ba .bx svg{width:100%;height:100%;display:block}.ba .bx i{font-size:12px;color:var(--muted);font-style:normal}
.tg{position:absolute;left:6px;top:6px;z-index:1;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:#e03131;color:#fff;letter-spacing:.03em}
.tg.af{background:#2f9e44}
.qcols{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:700px){.qcols{grid-template-columns:1fr}}
.qph{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
.qp{display:flex;flex-direction:column;gap:5px}.qp .thumb{background:var(--surface2);aspect-ratio:4/3;border-radius:6px;overflow:hidden;cursor:pointer}.qp .thumb svg{width:100%;height:100%;display:block}
.nav{overflow-x:auto;scrollbar-width:none}.nav button{white-space:nowrap}
`+QC_REPORT_CSS;document.head.appendChild(s)})();
