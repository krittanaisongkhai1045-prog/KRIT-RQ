/* ========= report (A4 pages, fixed px design: 794 x 1123) ========= */
const REPORT_CSS=`
.sheet{position:relative;width:794px;height:1123px;background:#fff;color:#111;font-family:'Sarabun','Noto Sans Thai',sans-serif;overflow:hidden;box-sizing:border-box;line-height:1.3}
.sheet *{box-sizing:border-box}
.sheet.land{width:1123px;height:794px}
.fit{position:relative;width:920px;height:1301px;transform:scale(.863);transform-origin:top left;padding:12px 22px;font-size:10px;line-height:1.22}
.f-plan{position:absolute;left:22px;top:176px;width:268px;height:134px;border:1px solid #222;background:#fff;overflow:hidden}.f-plan .in{height:119px;background:#fff}.f-plan .cap{font-size:8px;height:15px;line-height:15px;padding:0 4px;border-top:1px solid #222;background:#eee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pbox.l{width:100%;height:640px}.pg>.lg.lgl{margin-top:4px;font-size:10px;gap:2px 14px}.side{width:232px;flex:none;font-size:11px}.side .lg{flex-direction:column;margin-top:4px}.side .pl{columns:1;margin-top:4px}.side b.h{display:block;margin-top:10px;border-bottom:1px solid #999}
.f-title{text-align:center;font-weight:700;font-size:12.5px;margin-bottom:4px}
.f-a{display:flex;gap:14px;align-items:flex-end;height:112px}
.f-logo{width:150px;height:112px;display:flex;align-items:center}.f-logo img{max-width:150px;max-height:112px}
.f-co{flex:1;font-size:9.5px;padding-bottom:6px}.f-co b{font-size:10.5px}
.f-req{width:286px;font-size:9.5px;align-self:flex-start}
.f-bar{display:flex;gap:6px;align-items:flex-start;padding:2px 4px;margin-bottom:2px}.f-bar.g{background:#c9e2b8}.f-bar.b{background:#d4e0f2}
.f-bar b{font-size:10px}.f-bar i{font-style:normal;display:block;font-size:9px}
.bx{display:inline-block;width:15px;height:15px;border:1.2px solid #1d4f91;text-align:center;font-size:12px;line-height:13px;font-weight:700;color:#111;flex:none;background:#fff}
.sbx{display:inline-block;width:9px;height:9px;border:1px solid #333;text-align:center;font-size:8px;line-height:8px;vertical-align:-1px;margin-right:2px}
.f-proj{font-size:9.5px;margin:2px 0 0}
.f-info{margin:-6px 0 0 300px;width:560px;font-size:9.5px;border-collapse:collapse}
.f-info td{padding:1px 4px;vertical-align:top}.f-info td.v{font-weight:700;font-size:11px;text-align:center;width:300px}
.f-info td.v.u{border-bottom:1px solid #111}
.f-struct{margin:4px 0 0 300px;display:flex;gap:16px;font-size:9.5px}
.f-pos{display:flex;gap:14px;margin-top:52px;font-size:9.5px;align-items:flex-end}.f-pos .ln{border-bottom:1px solid #111;min-width:70px;display:inline-block;text-align:center;font-weight:700}
.ck{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9.8px;margin-top:4px}
.ck th,.ck td{border:1px solid #111;padding:0 3px;height:15px;line-height:13px;overflow:hidden;white-space:nowrap}
.ck th{font-weight:600;text-align:center;font-size:9px;height:13px}
.ck td.g{text-align:center;vertical-align:middle;line-height:12px;font-size:9px;white-space:pre-line}
.ck td.c{text-align:center;font-weight:700;font-size:9.5px;padding:0}
.ck tr.s td{background:#dbe6f3}
.ck td.c.f{color:#c00}
.f-foot{display:flex;border:1px solid #111;border-top:0;font-size:9.5px;margin-top:-1px}
.f-foot>div{flex:1;padding:4px 8px;min-height:152px;position:relative}.f-foot>div+div{border-left:1px solid #111}
.sg{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding-top:2px}.sgi{display:flex;flex-direction:column;align-items:stretch;text-align:center}.sgi .sl{text-align:left;font-size:9.5px}.sgi .ss{height:50px;position:relative;display:flex;align-items:flex-end;justify-content:center}.sgi .ss img{max-height:46px;max-width:100%;mix-blend-mode:multiply}.sgi .sn{border-top:1px solid #111;padding-top:2px;font-weight:600;font-size:9.5px;min-height:13px}.sgi .sr{font-size:9px;color:#222;min-height:12px}.sgi .sd{font-size:9px;color:#333;margin-top:2px}
.dl{border-bottom:1px dashed #111;display:inline-block;min-width:150px;text-align:center;min-height:13px}
.f-copy{display:flex;border:1px solid #111;border-top:0;font-size:9.5px;font-weight:600}.f-copy div{flex:1;padding:2px 8px}.f-copy div+div{border-left:1px solid #111}
.sigimg{position:absolute;height:34px;left:70px;top:76px;mix-blend-mode:multiply}
/* other pages */
.pg{padding:26px 28px 40px;height:100%;position:relative;font-size:12px}
.ph{display:flex;gap:12px;align-items:center;border-bottom:2px solid #111;padding-bottom:7px;margin-bottom:10px}
.ph img{height:44px}.ph .pt{font-size:16px;font-weight:700}.ph .ps{font-size:11px;color:#333}.ph .pn{margin-left:auto;text-align:right;font-weight:700;font-family:'IBM Plex Mono',monospace;font-size:12px}
.pf{position:absolute;left:28px;right:28px;bottom:14px;font-size:10px;color:#444;display:flex;justify-content:space-between;border-top:1px solid #999;padding-top:3px}
.pbox{border:1px solid #222;height:740px;background:#fff}
.lg{display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:8px;font-size:11px}
.lg .dt{display:inline-block;width:11px;height:11px;border:1px solid #333;vertical-align:-1px;margin-right:4px}
.pl{margin-top:6px;font-size:10.5px;columns:2;column-gap:20px}
.rmband{height:16px;line-height:16px;margin:0 0 4px;font-size:10.5px;background:#eee;border-left:3px solid #222;padding:0 6px}
.drow{display:flex;gap:10px;border:1px solid #222;height:226px;margin-bottom:6px;padding:6px;font-size:10.5px;overflow:hidden}
.drow .c1{width:86px;flex:none}.drow .code{font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:14px}
.drow .c2{width:140px;flex:none;text-align:center}.drow .c2 svg{max-width:140px;max-height:150px;width:100%;height:auto}
.drow .c3{flex:1;min-width:0}.drow .c3 div{margin-bottom:2px}
.drow .c4{width:232px;flex:none;display:flex;gap:6px}
.pth{flex:1;min-width:0}.pth .im{height:116px;border:1px solid #555;background:#f2f2f2;display:flex;align-items:center;justify-content:center;font-size:10px;color:#777}
.pth .cp{font-size:9.5px;text-align:center}
.pgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pcell .im{height:352px;border:1px solid #222;background:#f2f2f2}.pcell .cp{font-size:11px;margin-top:3px;min-height:34px}
.pcell .cp b{font-family:'IBM Plex Mono',monospace}
.tag{display:inline-block;border:1px solid #222;border-radius:3px;padding:0 4px;font-size:10px;margin-left:4px}
`;
const FIXCOL=['#e03131','#f08c00','#f2c800','#2f9e44','#1971c2','#7048e8','#d6336c','#212529'];
const longDate=iso=>{if(!iso)return'';const d=new Date(iso+'T00:00:00');return d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})};
function focusBox(pl,pins){
  const xs=[],ys=[];(pl.shapes||[]).forEach(s=>{if(s.t==='poly'&&!s.ref)s.pts.forEach(p=>{xs.push(p[0]);ys.push(p[1])})});pins.forEach(p=>{xs.push(p.x);ys.push(p.y)});
  if(!xs.length)return[0,0,pl.w,pl.h];
  const pad=Math.max(pl.w,pl.h)*.03;let x0=Math.max(0,Math.min(...xs)-pad),y0=Math.max(0,Math.min(...ys)-pad),x1=Math.min(pl.w,Math.max(...xs)+pad),y1=Math.min(pl.h,Math.max(...ys)+pad);
  const minW=pl.w*.18;if(x1-x0<minW){const c=(x0+x1)/2;x0=Math.max(0,c-minW/2);x1=Math.min(pl.w,x0+minW)}
  const minH=pl.h*.18;if(y1-y0<minH){const c=(y0+y1)/2;y0=Math.max(0,c-minH/2);y1=Math.min(pl.h,y0+minH)}
  return[x0,y0,x1-x0,y1-y0];
}
const hasCover=r=>r.cover?true:(r.cover===undefined&&(r.plans||[]).length>0);
function coverPlan(r){
  let pl=r.cover,pins=[];
  if(r.cover===undefined){pl=(r.plans||[]).find(p=>(p.shapes||[]).some(s=>s.t==='poly'&&!s.ref))||(r.plans||[])[0];if(pl)pins=planPins(r,pl)}   // เอกสารเก่า: ใช้แบบแนบเป็นแบบปก
  if(!pl)return'';
  return`<div class="f-plan"><div class="in">${annotatedSvg(imgSrc(pl.imgId),pl.w,pl.h,pl.shapes,pins,{viewBox:focusBox(pl,pins),labels:false,scale:pl.sym})}</div><div class="cap">แบบขอบเขตที่ส่งตรวจ${pl.name?' · '+esc(pl.name):''}</div></div>`;
}
const sigImg=id=>{const u=id&&imgSrc(id);return u?`<img src="${u}" alt="">`:''};
function formHTML(r){
  const P=S.project;const logo=imgSrc(P.logoId)||'';const sig=P.sigId&&imgSrc(P.sigId)||'';
  const sym=v=>v==='P'?'✓':v==='F'?'✗':v==='N'?'N/A':'';
  const rows=P.checklist.map(g=>g.items.map((it,k)=>{const c=r.checklist[it.id]||{};
    return`<tr class="${c.sel?'s':''}">${k===0?`<td class="g" rowspan="${g.items.length}">${esc(g.label)}</td>`:''}<td>${esc(it.en)}</td><td>${esc(it.th)}</td>
     <td class="c ${c.r1==='F'?'f':''}">${sym(c.r1)}</td><td class="c" style="font-weight:400;font-size:8.5px">${esc(c.d1||'')}</td><td class="c ${c.r2==='F'?'f':''}">${sym(c.r2)}</td><td class="c" style="font-weight:400;font-size:8.5px">${esc(c.d2||'')}</td><td class="c">${sym(c.km)}</td><td class="c">${sym(c.cs)}</td><td style="font-size:8.5px">${esc(c.rm||'')}</td></tr>`}).join('')).join('');
  const st=r.structure||{};
  const res=r.result;
  return`<div class="fit">
  <div class="f-title">REQUEST FOR INSPECTION &amp; REQUEST FOR CONCRETE&nbsp; List</div>
  <div class="f-a"><div class="f-logo">${logo?`<img src="${logo}" alt="">`:''}</div>
   <div class="f-co"><b>${esc(P.company.name)}</b><br>${esc(P.company.addr1)}<br>${esc(P.company.addr2)}</div>
   <div class="f-req"><div class="f-bar g"><span class="bx">✕</span><div><b>REQUEST FOR INSPECTION</b><i>หนังสือขออนุมัติการตรวจสอบ</i></div></div>
    <div class="f-bar b"><span class="bx"></span><div><b>REQUEST FOR CONCRETE</b><i>หนังสือขออนุมัติเทคอนกรีต</i></div></div>
    <b>Request No:${esc(r.no)}</b><br>หนังสือเล่มที่ ${esc(r.bookNo||'')}<br>Date: <b>${fmtDate(r.date)}</b><br>วันที่</div></div>
  <div class="f-proj"><b>PROJECT:</b>&nbsp; ${esc(P.name)}<br><b>LOCATE :</b>&nbsp; ${esc(P.locate)}</div>
  <table class="f-info"><tr><td>Date/ Planning Time:<br>เริ่มทำการเวลา</td><td class="v">${esc(r.planTime||'')} ${fmtDate(r.planDate)}</td></tr>
   <tr><td>Type of work For Inspection<br>ชนิดงานที่ตรวจสอบ</td><td class="v">${esc(kindLabel(r))}${r.workText?' '+esc(r.workText):''}${r.type==='CLOSE'?` (รอบ ${r.round})`:''}<div class="u" style="margin-top:3px;border-bottom:1px solid #111;font-size:11px">${esc(r.workType)}</div></td></tr>
   <tr><td>Location:<br>บริเวณที่ทำงานสถาปัตยกรรม</td><td class="v u" style="font-size:10px">${esc(r.location)}</td></tr></table>
  <div class="f-struct">${STRUCT.map(s=>`<span><span class="sbx">${st[s[0]]?'✕':''}</span>${s[1]}</span>`).join('')}</div>
  ${coverPlan(r)}
  <div class="f-pos" style="${hasCover(r)?'margin-top:60px':''}"><div>Position:<br>ตำแหน่ง :</div><div>อาคาร<br>ชั้น</div><div style="font-weight:700;font-size:11px">${esc(r.building)}<br>${esc(r.floor)}</div><div>Level :<br>ระดับ :</div><div class="ln">${esc(r.level)}</div><div>Concrete Strength:<br>กำลังอัดประลัย</div><div class="ln">${esc(r.strength)}</div><div>Slump:<br>การยุบตัว</div><div class="ln">${esc(r.slump)}</div></div>
  <div style="margin:3px 0 0;font-size:9.5px">Reference Shop Drawing No.: <b>${esc(r.refDwg||'')}</b></div>
  <table class="ck"><colgroup><col style="width:92px"><col style="width:170px"><col style="width:150px"><col style="width:34px"><col style="width:54px"><col style="width:34px"><col style="width:54px"><col style="width:42px"><col style="width:48px"><col></colgroup>
   <thead><tr><th colspan="3" style="border-bottom:0;height:12px">Checklist</th><th colspan="6" style="border-bottom:0;height:12px">Result of Inspection</th><th style="border-bottom:0;height:12px">Remark(s)</th></tr>
   <tr><th colspan="3" style="border-top:0">รายการที่ต้องตรวจสอบ</th><th>1 st</th><th>Date</th><th>2 nd</th><th>Date</th><th>KMIT</th><th>Consult</th><th style="border-top:0">หมายเหตุ</th></tr></thead>
   <tbody>${rows}</tbody></table>
  <div class="f-foot"><div><div class="sg">
    <div class="sgi"><div class="sl">Requested by:</div><div class="ss">${sigImg(P.reqSigId)}</div><div class="sn">${esc(r.requestedName||P.requestedName||'')}</div><div class="sr">${esc(P.requestedRole||'')}</div><div class="sd">Date : ………………</div></div>
    <div class="sgi"><div class="sl">Site Engineer:</div><div class="ss">${sigImg(P.engSigId)}</div><div class="sn">${esc(P.engName)}</div><div class="sr">${esc(P.engRole)}</div><div class="sd">Date : ………………</div></div>
    <div class="sgi"><div class="sl">Reviewed by (CC):</div><div class="ss">${sig?`<img src="${sig}" alt="">`:''}</div><div class="sn">${esc(P.ccName)}</div><div class="sr">${esc(P.ccRole)}</div><div class="sd">${longDate(r.date)}</div></div>
   </div></div>
   <div>Inspected by:<br><div style="margin:10px 0 8px;display:flex;gap:16px"><span><span class="bx" style="width:34px;height:14px;line-height:12px">${res==='approved'?'✕':''}</span> Approved</span><span><span class="bx" style="width:34px;height:14px;line-height:12px">${res==='disapproved'?'✕':''}</span> Disapproved</span><span><span class="bx" style="width:34px;height:14px;line-height:12px">${res==='other'?'✕':''}</span> Other</span></div>
    Notes: ${esc(r.notes||'')}<div style="position:absolute;bottom:8px;left:8px;right:8px;text-align:right;border-top:1px dashed #111;padding-top:2px">${esc(P.cmName)}<br>Date: …../…../……….</div></div></div>
  <div class="f-copy"><div>Copy: Owner : ${esc(P.owner)}</div><div>Contractor (${esc(P.contractor)})</div></div></div>`;
}
function pageHead(r,title,sub){const logo=imgSrc(S.project.logoId)||'';return`<div class="ph">${logo?`<img src="${logo}" alt="">`:''}<div><div class="pt">${esc(title)}</div><div class="ps">${esc(sub||'')}</div></div><div class="pn">${esc(r.no)}<br>${esc(kindLabel(r))}${r.type==='CLOSE'?' รอบ '+r.round:''}</div></div>`}
function planPageHTML(r,pl){
  const pins=planPins(r,pl);const land=pl.w>=pl.h;
  const legend=[...new Map((pl.shapes||[]).filter(s=>s.t==='poly'&&s.label).map(s=>[s.c+s.label,s])).values()];
  const ds=pins.map(p=>defectById(p.id));
  const svg=annotatedSvg(imgSrc(pl.imgId),pl.w,pl.h,pl.shapes,pins,{scale:pl.sym});
  const lg=`<div class="lg">${legend.map(s=>`<span><span class="dt" style="background:${s.c}"></span>${esc(s.label)}</span>`).join('')}${pins.length?`<span><span class="dt" style="background:#e03131;border-radius:50%"></span>ตำแหน่ง DEFECT ${r.type==='CLOSE'?'ที่แก้ไขและส่งตรวจซ้ำ':''}</span>`:''}${(pl.shapes||[]).some(s=>s.ref)?`<span><span class="dt" style="border-style:dashed"></span>โซนอ้างอิงรอบก่อน</span>`:''}</div>`;
  const list=ds.length?`<div class="pl">${ds.map(d=>`<div><b class="mono">${esc(pinLabel(d))}</b> ${esc(d.area||'')} ${esc(d.surface||'')} ${esc(d.face||'')} — ${esc(d.type||'')}</div>`).join('')}</div>`:'';
  const head=pageHead(r,'แบบแสดงขอบเขต / ตำแหน่งที่ส่งตรวจ',`${pl.name} · ${S.project.name} · ${r.workType} · ${fmtDate(r.date)}`);
  const foot=`<div class="pf"><span>${esc(r.no)}</span><span>หน้า %%P%% / %%N%%</span></div>`;
  if(land)return{land:true,html:`<div class="pg">${head}<div class="pbox l">${svg}</div>${lg.replace('class="lg"','class="lg lgl"')}${foot}</div>`};
  return{land:false,html:`<div class="pg">${head}<div class="pbox">${svg}</div>${lg}${list}${foot}</div>`};
}
function defectPhotos(r,d){
  const rid=rootId(r);const chain=chainReqs(rid);
  const before=[];chain.filter(x=>x.round<=r.round).forEach(x=>x.photos.forEach(p=>{if(p.defectId===d.id&&p.stage!=='after')before.push(p)}));
  const after=r.photos.filter(p=>p.defectId===d.id&&p.stage==='after');
  return{before:before[0],after:after[0]};
}
/* ตำแหน่ง DEFECT บนแบบ ซูมเข้าใกล้หมุด — ใช้แทนผังกระเบื้องเมื่อไม่ได้ทำผัง */
function planOfDefect(d){
  if(!d||!d.loc)return null;
  if(d.loc.libId)return S.library.find(l=>l.id===d.loc.libId)||null;
  for(const q of chainReqs(d.rootId).slice().reverse()){const p=(q.plans||[]).find(x=>x.key===d.loc.planKey);if(p)return p}
  return null;
}
function locCropSvg(d,pl,z){
  const sz=Math.max(pl.w,pl.h)*(z||.1),W=sz*1.4,Hh=sz;
  const vx=Math.min(Math.max(d.loc.x-W/2,0),Math.max(pl.w-W,0)),vy=Math.min(Math.max(d.loc.y-Hh/2,0),Math.max(pl.h-Hh,0));
  return annotatedSvg(imgSrc(pl.imgId),pl.w,pl.h,pl.shapes||[],[{id:d.id,label:pinLabel(d),x:d.loc.x,y:d.loc.y,st:'open'}],{viewBox:[vx,vy,W,Hh],scale:pl.sym,labels:false});
}
function defectPagesHTML(r){
  const vis0=visibleDefects(r);if(!vis0.length||!defectsOn(r))return[];
  const groups=groupRooms(vis0,r.defGroup||'room');const vis=groups.flatMap(g=>g.list);const pages=[];
  const rowHTML=d=>{
      const ph=defectPhotos(r,d);const res=r.res&&r.res[d.id]&&r.res[d.id].r;
      const im=(p,lab)=>`<div class="pth"><div class="im">${p?annotatedSvg(imgSrc(p.imgId),p.w,p.h,p.shapes,[]):'—'}</div><div class="cp">${lab}${p&&p.caption?': '+esc(p.caption):''}</div></div>`;
      return`<div class="drow"><div class="c1"><div class="code">${esc(pinLabel(d))}</div><div class="mono" style="font-size:9px">${esc(d.code)}</div>${d.zone?`<div style="font-size:9px;font-weight:700;color:#b00">โซน ${zoneCount(d)} แผ่น</div>`:''}<div style="margin-top:8px;font-size:10px"><span class="sbx">${res==='pass'?'✕':''}</span>ผ่าน<br><span class="sbx">${res==='fail'?'✕':''}</span>ไม่ผ่าน</div></div>
       <div class="c2">${d.grid&&d.grid.cols?gridSvg(d.grid):(planOfDefect(d)?`<div style="height:112px;border:1px solid #bbb;overflow:hidden;margin-top:4px">${locCropSvg(d,planOfDefect(d))}</div><div style="font-size:8.5px;color:#444">ตำแหน่งบนแบบ · ${esc(planOfDefect(d).name||'')}</div>`:'<div style="color:#888;margin-top:50px">ไม่มีผังกระเบื้อง</div>')}${d.grid&&d.grid.cols?`<div style="font-size:9px">${d.grid.tw?`กระเบื้อง ${d.grid.tw}×${d.grid.th} ซม.`:''}</div>`:''}</div>
       <div class="c3"><div><b>${esc(d.area||'—')}</b> · ${esc(d.surface||'')} ${esc(d.face?'ด้าน '+d.face:'')}</div><div><b>${esc(d.type||'')}</b>${d.desc?' — '+esc(d.desc):''}</div>${d.zone?`<div><b>DEFECT แบบโซน:</b> ${zoneCount(d)} แผ่น${d.zoneNote?' · '+esc(d.zoneNote):''}</div>`:''}
        ${d.grid&&d.grid.cells&&d.grid.cells.length?`<div>ตำแหน่งกระเบื้อง: ${esc(gridText(d.grid))}</div>`:''}
        ${d.fix?`<div><b>วิธีแก้เฉพาะจุด:</b> ${esc(d.fix)}</div>`:''}${d.protect?`<div style="color:#b00"><b>ห้ามกระทบ:</b> ${esc(d.protect)}</div>`:''}${d.due?`<div>กำหนดแก้เสร็จ ${fmtDate(d.due)}</div>`:''}
        ${r.res&&r.res[d.id]&&r.res[d.id].note?`<div>หมายเหตุผลตรวจ: ${esc(r.res[d.id].note)}</div>`:''}</div>
       <div class="c4">${im(ph.before,'ก่อนแก้')}${im(ph.after,'หลังแก้')}</div></div>`};
  /* จัดหน้า: รายการเรียงตามห้อง ใส่แถบหัวห้อง ไม่ให้ล้นหน้า */
  const ROW=232,BAND=22,CAP=956;let cur=[],h=0,last=null;const pg=[];
  const flush=()=>{if(cur.length)pg.push(cur);cur=[];h=0;last=null};
  for(const g of groups){const tiles=g.list.reduce((n,x)=>n+zoneCount(x),0);
    g.list.forEach((d,i)=>{if(h+ROW+(last!==g.room?BAND:0)>CAP)flush();
      if(last!==g.room){cur.push(`<div class="rmband">${g.mode==='item'?'หมวดงาน':'ห้อง/พื้นที่'}: <b>${esc(g.room)}</b>${i>0?' (ต่อ)':''} · ${g.list.length} รายการ${tiles?` · โซนรวม ${tiles} แผ่น`:''}</div>`);h+=BAND;last=g.room}
      cur.push(rowHTML(d));h+=ROW})}
  flush();
  pg.forEach(rows=>pages.push(`<div class="pg">${pageHead(r,r.type==='CLOSE'?'ใบรายการ DEFECT ที่แก้ไข (ส่งตรวจซ้ำเฉพาะจุด)':'ใบรายการ DEFECT ที่พบ',`${S.project.name} · ${r.workType} · ${esc(r.location)} · ${vis.length} จุด`)}${rows.join('')}<div class="pf"><span>${esc(r.no)}</span><span>หน้า %%P%% / %%N%%</span></div></div>`));
  return pages;
}
/* รูป DEFECT ที่แสดงในรายการ DEFECT แล้ว ไม่ต้องซ้ำในหน้ารูปประกอบ */
function shownDefectPhotoIds(r){const s=new Set();visibleDefects(r).forEach(d=>{const x=defectPhotos(r,d);if(x.before)s.add(x.before.id);if(x.after)s.add(x.after.id)});return s}
/* หน้ารูป: list = [{p,n}] n = เลขรูปในเอกสารต้นทาง */
function photoGridPages(r,list,title){
  const pages=[];
  for(let i=0;i<list.length;i+=4){
    const cells=list.slice(i,i+4).map(({p,n})=>{const d=p.defectId&&defectById(p.defectId);
      return`<div class="pcell"><div class="im">${annotatedSvg(imgSrc(p.imgId),p.w,p.h,p.shapes,[])}</div><div class="cp"><b>รูปที่ ${n}</b>${d?`<span class="tag">${esc(pinLabel(d))}</span>`:''}${p.stage?`<span class="tag">${p.stage==='before'?'ก่อนแก้':'หลังแก้'}</span>`:''} ${esc(p.caption||'')}</div></div>`}).join('');
    pages.push(`<div class="pg">${pageHead(r,title,`${S.project.name} · ${r.workType} · ${esc(r.location)} · ${fmtDate(r.date)}`)}<div class="pgrid">${cells}</div><div class="pf"><span>${esc(r.no)}</span><span>หน้า %%P%% / %%N%%</span></div></div>`);
  }
  return pages;
}
/* รูปของใบนี้ (ไม่รวมรูปที่แสดงในแถว DEFECT แล้ว): OPEN = สภาพหน้างานก่อนตรวจ, CLOSE = รูปตอนตรวจปิด */
function photoPagesHTML(r){
  const shown=shownDefectPhotoIds(r);
  return photoGridPages(r,r.photos.filter(p=>!shown.has(p.id)).map(p=>({p,n:r.photos.indexOf(p)+1})),r.type==='CLOSE'?'รูปตอนตรวจปิด':'รูปสภาพหน้างานก่อนตรวจ');
}
/* ใบส่งปิด: รูปตอนตรวจเปิดจากใบ OPEN */
function openPhotoPagesHTML(r){
  const root=reqById(rootId(r));if(r.type!=='CLOSE'||!root)return[];
  return photoGridPages(r,openPhotosFor(r).map(p=>({p,n:root.photos.indexOf(p)+1})),`รูปตอนตรวจเปิด (อ้างอิง ${root.no})`);
}
function buildReport(r){
  let pages=[{land:false,html:formHTML(r)}];
  const pl=()=>plansSorted(r).forEach(x=>pages.push(planPageHTML(r,x)));
  const add=arr=>arr.forEach(h=>pages.push({land:false,html:h}));
  if(r.type==='CLOSE'){add(openPhotoPagesHTML(r));pl();add(defectPagesHTML(r));add(photoPagesHTML(r))}   // ใบส่งปิด: รูปตอนตรวจเปิด → แบบ+ตำแหน่ง DEFECT → รายการ DEFECT+รูป → รูปตอนตรวจปิด
  else{add(photoPagesHTML(r));pl();add(defectPagesHTML(r))}                                              // ใบส่งเปิด: ใบปะหน้า → รูปก่อนตรวจ → แบบ
  const N=pages.length;pages=pages.map((p,i)=>({land:p.land,html:p.html.replace('%%P%%',i+1).replace('%%N%%',N)}));
  return{pages};
}
async function reportImages(r){
  const ids=[];if(r.cover)ids.push(r.cover.imgId);r.plans.forEach(p=>ids.push(p.imgId));r.photos.forEach(p=>ids.push(p.imgId));openPhotosFor(r).forEach(p=>ids.push(p.imgId));
  await ensureData(ids);await ensureData([S.project.logoId,S.project.sigId,S.project.reqSigId,S.project.engSigId],true);
}
async function exportPDF(){
  const r=curReq();toast('กำลังสร้าง PDF…',4000);
  try{
    if(!window.html2canvas)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    if(!window.jspdf)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await reportImages(r);
    const rep=buildReport(r);const host=document.createElement('div');host.style.cssText='position:fixed;left:-9999px;top:0;width:1123px;z-index:-1';
    host.innerHTML=rep.pages.map(p=>`<div class="sheet ${p.land?'land':''}">${p.html}</div>`).join('');document.body.appendChild(host);
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;await sleep(200);
    const pdf=new jspdf.jsPDF({unit:'mm',format:'a4',orientation:rep.pages[0].land?'l':'p',compress:true});const sh=$$('.sheet',host);
    for(let i=0;i<sh.length;i++){const land=rep.pages[i].land;if(i>0)pdf.addPage('a4',land?'l':'p');
      const cv=await html2canvas(sh[i],{scale:2,backgroundColor:'#ffffff',logging:false});pdf.addImage(cv.toDataURL('image/jpeg',.88),'JPEG',0,0,land?297:210,land?210:297,undefined,'FAST')}
    host.remove();await saveFile(`${r.no}_CM-${r.type}${r.type==='CLOSE'?r.round:''}.pdf`,pdf.output('blob'));
  }catch(e){toast('สร้าง PDF ไม่สำเร็จ: '+(e.message||e)+' — ลองดาวน์โหลดไฟล์ HTML แทน',5000)}
}
async function exportHTML(){
  const r=curReq();await reportImages(r);const rep=buildReport(r);
  const doc=`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${esc(r.no)}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Sarabun:wght@300;400;500;600;700&display=swap"><style>${REPORT_CSS}body{margin:0;background:#777}.sheet{margin:12px auto}@page land{size:A4 landscape;margin:0}@media print{body{background:none}.sheet{margin:0;page-break-after:always;break-after:page}.sheet.land{page:land}@page{size:A4;margin:0}}</style></head><body>${rep.pages.map(p=>`<div class="sheet ${p.land?'land':''}">${p.html}</div>`).join('')}</body></html>`;
  await saveFile(`${r.no}_CM-${r.type}${r.type==='CLOSE'?r.round:''}.html`,new Blob([doc],{type:'text/html'}));
}

/* ========= sample data (marked as example) ========= */
function canvasUrl(w,h,fn,q){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return c.toDataURL('image/jpeg',q||.85)}
function samplePlan(){return canvasUrl(1600,1000,(x,w,h)=>{
  x.fillStyle='#fbfaf6';x.fillRect(0,0,w,h);x.strokeStyle='#33403d';x.lineWidth=5;x.strokeRect(60,60,1480,880);
  x.lineWidth=3;x.font='bold 34px Sarabun, sans-serif';x.fillStyle='#33403d';x.textAlign='center';
  for(let i=0;i<6;i++){const X=60+i*246.6;x.strokeRect(X,60,246.6,380);x.strokeRect(X,560,246.6,380);x.fillText('ห้อง '+(101+i),X+123,260);x.fillText('ห้อง '+(107+i),X+123,770);
    x.strokeRect(X+8,68,90,110);x.strokeRect(X+8,822,90,110);x.font='20px Sarabun, sans-serif';x.fillText('WC',X+53,130);x.fillText('WC',X+53,886);x.font='bold 34px Sarabun, sans-serif'}
  x.fillStyle='#8a948f';x.font='bold 40px Sarabun, sans-serif';x.fillText('ทางเดินกลาง  CORRIDOR',w/2,515);
  x.font='22px Sarabun, sans-serif';x.fillText('ตัวอย่างแบบ BUILDING E ชั้น 1 (ข้อมูลตัวอย่าง)',w/2,40)},.9)}
function samplePhoto(k){return canvasUrl(1200,900,(x,w,h)=>{
  x.fillStyle='#a9a398';x.fillRect(0,0,w,h);const t=k===3?150:200;
  for(let j=0;j*t<h+t;j++)for(let i=0;i*t<w+t;i++){const g=222+((i*7+j*13+k*5)%5)*3;x.fillStyle=`rgb(${g},${g-3},${g-8})`;x.fillRect(i*t+5,j*t+5,t-10,t-10)}
  if(k===0){x.strokeStyle='#3a342c';x.lineWidth=5;x.beginPath();x.moveTo(430,260);x.lineTo(480,330);x.lineTo(465,400);x.lineTo(530,470);x.lineTo(520,540);x.stroke()}
  if(k===1){x.fillStyle='#6b6458';x.fillRect(205,395,t-10+6,34);x.fillRect(205,595,160,28)}
  if(k===2){x.fillStyle='rgba(0,0,0,.12)';x.fillRect(0,h-120,w,120)}
  },.8)}
async function seedDemo(){
  S={project:defaultProject(),requests:[],defects:[],library:[],access:[]};const cloud=MODE.kind==='cloud';
  S.project.logoId='logo';S.project.sigId='sig';
  const planId=await putImage(samplePlan());const lib={id:'lb'+uid(),name:'ผัง BUILDING E ชั้น 1 (ตัวอย่าง)',imgId:planId,w:1600,h:1000};S.library.push(lib);
  const id='rq'+uid();const r={id,rootId:id,type:'OPEN',round:0,num:359,no:'MOD-Inspection-AR-359',date:'2026-10-12',planDate:'2026-10-12',planTime:'10.30 AM.',bookNo:'',
    workText:'F8 BUILDING 1 FLOOR 01-11',workType:'กระเบื้อง',location:'BUILDING E',building:'E',floor:'1',level:'',strength:'',slump:'',refDwg:'',structure:{other:true},checklist:{},plans:[],photos:[],scope:[],res:{},result:'',notes:'(ข้อมูลตัวอย่าง — ลบได้)',sent:false,requestedName:'',created:Date.now()};
  const P=S.project;const items={};P.checklist.forEach(g=>g.items.forEach(i=>items[i.en]=i.id));
  ['Topping Room','Tile patterns','Wall Tile','Bathroom tile grout'].forEach(k=>r.checklist[items[k]]={sel:true});
  const key='pk'+uid();const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  r.plans.push({id:'pl'+uid(),key,libId:lib.id,name:lib.name,imgId:planId,w:1600,h:1000,shapes:[
    {t:'poly',pts:rect(60,60,246,380),c:'#e03131',label:'ห้อง 101 ปูกระเบื้องพื้น',ref:false},
    {t:'poly',pts:rect(306.6,60,246,380),c:'#1971c2',label:'ห้อง 102 กระเบื้องผนัง',ref:false}]});
  S.requests.push(r);P.nextNo=360;
  const mk=(n,o)=>({id:'df'+uid(),rootId:id,foundIn:id,num:n,code:`359-D${pad2(n)}`,item:'',type:'',desc:'',area:'',surface:'',face:'',fix:'',protect:'',due:'',grid:null,loc:null,created:Date.now(),...o});
  const d1=mk(1,{item:items['Wall Tile'],area:'ห้อง 101 ห้องน้ำ',surface:'ผนัง',face:'B',type:'กระเบื้องแตกร้าว',desc:'รอยร้าวพาดแผ่นกระเบื้องผนัง ตัวอย่าง',fix:'เปลี่ยนแผ่นเดียว (ตัดร่องรอบแผ่น ห้ามกระทบแผ่นข้างเคียง)',protect:'ห้ามสกัดโดนแผ่นข้างเคียงทั้ง 4 ด้าน',grid:{sw:240,sh:240,tw:30,th:60,origin:'มุมซ้ายล่าง เมื่อยืนหน้าผนัง B',cols:8,rows:4,cells:['5,3']},loc:{planKey:key,x:150,y:120}});
  const d2=mk(2,{item:items['Bathroom tile grout'],area:'ห้อง 102 ห้องน้ำ',surface:'ผนัง',face:'A',type:'ยาแนวไม่เต็ม / เป็นรู',desc:'ยาแนวขาดหาย ตัวอย่าง',fix:'ขุดร่องยาแนวเดิม แล้วยาแนวใหม่เฉพาะแนว',grid:{sw:240,sh:240,tw:30,th:60,origin:'มุมซ้ายล่าง',cols:8,rows:4,cells:['3,2','4,2']},loc:{planKey:key,x:400,y:130}});
  S.defects.push(d1,d2);
  const cap=['รอยแตกกระเบื้องผนัง ห้อง 101','ยาแนวไม่เต็ม ห้อง 102','ภาพรวมพื้นห้อง 101','ภาพรวมผนังห้อง 102'];
  for(let k=0;k<4;k++){const im={url:samplePhoto(k),w:1200,h:900};const sh=[];
    if(k===0){sh.push({t:'ell',cx:490,cy:400,rx:120,ry:190,c:'#e03131',sw:4},{t:'text',x:560,y:250,s:'แตก 1 แผ่น',c:'#e03131',fs:30})}
    if(k===1){sh.push({t:'arrow',x1:560,y1:700,x2:330,y2:620,c:'#e03131',sw:5},{t:'text',x:420,y:740,s:'ยาแนวขาด',c:'#e03131',fs:30})}
    const pid=await putImage(im.url);r.photos.push({id:'ph'+uid(),imgId:pid,w:1200,h:900,caption:cap[k],defectId:k===0?d1.id:k===1?d2.id:'',stage:k<2?'before':'',shapes:sh})}
}
