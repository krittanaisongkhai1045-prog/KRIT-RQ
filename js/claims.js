/* ========= งานเคลม =========
   เก็บใน S.access (คอลเลกชัน 'access' ของ Supabase) เป็น kind:'claim'
   {no,date,building,floor,area,cat,against,desc,status,photos:[{id,imgId,w,h,caption}],created} */
const CL_CATS=['งานสี','งานพื้น','งานผนัง','งานฝ้า','งานไฟฟ้า','งานสุขภัณฑ์','งานประตู-หน้าต่าง','งานโครงสร้าง','งานระบบ','อื่นๆ'];
const CL_ST={open:['รอเคลม','bad'],sent:['ส่งเคลมแล้ว','warn'],done:['เคลมเสร็จ','good']};
const clList=()=>(S.access||[]).filter(a=>a.kind==='claim');
const clNo=n=>'CL-'+String(n).padStart(3,'0');
function clNew(){
  const mx=clList().reduce((m,c)=>Math.max(m,c.num||0),0);
  return{id:'cl'+uid(),kind:'claim',num:mx+1,no:clNo(mx+1),date:todayISO(),building:UI.clb||'',floor:UI.clf||'',area:'',cat:UI.clc||'',against:UI.cla||'',desc:'',status:'open',photos:[],created:Date.now()};
}
function clSave(c){S.access=S.access||[];if(!S.access.find(x=>x.id===c.id))S.access.push(c);save()}
async function clAddPhotos(c,files){
  let n=0;c.photos=c.photos||[];
  for(const f of files){if(!f.type.startsWith('image/'))continue;try{const im=await fileToImage(f,1600,.82);const imgId=await putImage(im.url);c.photos.push({id:'ph'+uid(),imgId,w:im.w,h:im.h,caption:''});n++}catch(e){toast('อ่านรูปไม่ได้: '+(f.name||''))}}
  return n;
}
const clUniq=k=>[...new Set(clList().map(c=>(c[k]||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
function clFiltered(){
  const q=(UI.clq||'').trim().toLowerCase();
  return clList().filter(c=>(!UI.clb||c.building===UI.clb)&&(!UI.clf||c.floor===UI.clf)&&(!UI.clc||c.cat===UI.clc)&&(!UI.cla||c.against===UI.cla)&&(!UI.cls||c.status===UI.cls)&&(!q||[c.no,c.building,c.floor,c.area,c.cat,c.against,c.desc].join(' ').toLowerCase().includes(q)))
   .sort((a,b)=>(a.num||0)-(b.num||0));
}
const clGroupKey=(c,g)=>g==='cat'?(c.cat||'ไม่ระบุหมวด'):g==='against'?(c.against||'ไม่ระบุผู้ถูกเคลม'):g==='loc'?((c.building?'อาคาร '+c.building:'ไม่ระบุอาคาร')+(c.floor?' · ชั้น '+c.floor:'')):'';
function clGroups(list){
  const g=UI.clg||'loc';if(g==='none')return[{name:'',list}];
  const m=new Map();list.forEach(c=>{const k=clGroupKey(c,g);if(!m.has(k))m.set(k,[]);m.get(k).push(c)});
  return[...m.entries()].sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true})).map(([name,list])=>({name,list}));
}
const clOpts=(arr,cur,all)=>`<option value="">${all}</option>`+arr.map(v=>`<option ${v===cur?'selected':''}>${esc(v)}</option>`).join('');
function viewClaim(){
  const all=clList(),can=canCreate(),list=clFiltered(),v=UI.clv||'list';
  const cnt=k=>all.filter(c=>(c.status||'open')===k).length;
  let h=`<div class="row" style="margin-bottom:8px"><h1 style="font-size:22px;margin-right:auto">งานเคลม</h1>
   ${can?`<button class="btn pri" data-act="clnew">＋ เพิ่มรายการเคลม</button><label class="btn" for="clmulti">📷 เพิ่มหลายรูป (1 รูป = 1 รายการ)</label><input id="clmulti" type="file" accept="image/*" multiple hidden>`:''}
   <button class="btn" data-act="clpdf">PDF</button></div>
   <div class="accsum"><div class="a-in"><b>${cnt('open')}</b><span>รอเคลม</span></div><div class="a-wait"><b>${cnt('sent')}</b><span>ส่งเคลมแล้ว</span></div><div class="a-done"><b>${cnt('done')}</b><span>เคลมเสร็จ</span></div><div class="a-none"><b>${all.length}</b><span>ทั้งหมด</span></div></div>
   <div class="clbar"><input type="search" id="clq" placeholder="ค้นหา เลขที่ / พื้นที่ / รายละเอียด" value="${esc(UI.clq||'')}">
    <select id="clfb" aria-label="อาคาร">${clOpts(clUniq('building'),UI.clb,'ทุกอาคาร')}</select>
    <select id="clff" aria-label="ชั้น">${clOpts(clUniq('floor'),UI.clf,'ทุกชั้น')}</select>
    <select id="clfc" aria-label="หมวด">${clOpts(clUniq('cat'),UI.clc,'ทุกหมวด')}</select>
    <select id="clfa" aria-label="เคลมใคร">${clOpts(clUniq('against'),UI.cla,'เคลมทุกราย')}</select>
    <select id="clfs" aria-label="สถานะ"><option value="">ทุกสถานะ</option>${Object.entries(CL_ST).map(([k,x])=>`<option value="${k}" ${UI.cls===k?'selected':''}>${x[0]}</option>`).join('')}</select>
    <select id="clg" aria-label="จัดกลุ่ม">${[['loc','จัดกลุ่ม: อาคาร/ชั้น'],['cat','จัดกลุ่ม: หมวดเคลม'],['against','จัดกลุ่ม: เคลมใคร'],['none','ไม่จัดกลุ่ม']].map(x=>`<option value="${x[0]}" ${(UI.clg||'loc')===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select>
    <div class="seg"><button class="btn sm ${v==='list'?'pri':''}" data-act="clview" data-id="list">รายการ</button><button class="btn sm ${v==='table'?'pri':''}" data-act="clview" data-id="table">ตาราง</button></div></div>`;
  if(!list.length)return h+`<div class="empty">${all.length?'ไม่มีรายการตามตัวกรอง':'ยังไม่มีรายการเคลม — กด “เพิ่มรายการเคลม” หรือ “เพิ่มหลายรูป”'}</div>`;
  h+=`<div id="clbody">${clBody(list,v)}</div>`;return h;
}
function clBody(list,v){
  let h='';
  for(const g of clGroups(list)){
    if(g.name)h+=`<div class="ghead l1"><b>${esc(g.name)}</b><span class="small muted">${g.list.length} รายการ</span></div>`;
    if(v==='table')h+=`<div class="qtw"><table class="qtv clt"><thead><tr><th>ลำดับ</th><th>อาคาร / ชั้น / พื้นที่</th><th>รูป</th><th>รายละเอียด</th><th>หมวด</th><th>เคลมใคร</th><th>สถานะ</th><th>วันที่</th></tr></thead><tbody>
     ${g.list.map(c=>{const p=(c.photos||[])[0];return`<tr data-act="clopen" data-id="${c.id}"><td><b>${esc(c.no)}</b></td><td>${esc([c.building&&'อาคาร '+c.building,c.floor&&'ชั้น '+c.floor,c.area].filter(Boolean).join(' · '))}</td><td class="dph">${p?`<div class="dl-im">${qcThumb(p)}</div>${(c.photos.length>1)?`<div class="small muted">+${c.photos.length-1} รูป</div>`:''}`:'—'}</td><td>${esc(c.desc||'')}</td><td>${esc(c.cat||'-')}</td><td>${esc(c.against||'-')}</td><td>${chip(CL_ST[c.status||'open'][0],CL_ST[c.status||'open'][1])}</td><td class="mono small">${esc(c.date||'')}</td></tr>`}).join('')}</tbody></table></div>`;
    else h+=`<div class="accl">${g.list.map(c=>{const p=(c.photos||[])[0];return`<div class="acard" data-act="clopen" data-id="${c.id}"><div class="th">${p?qcThumb(p):'<i>ไม่มีรูป</i>'}</div><div class="bd"><div class="row" style="gap:6px"><b>${esc(c.no)}</b>${chip(CL_ST[c.status||'open'][0],CL_ST[c.status||'open'][1])}</div>
     <div class="small">${esc([c.building&&'อาคาร '+c.building,c.floor&&'ชั้น '+c.floor,c.area].filter(Boolean).join(' · ')||'-')}</div>
     <div class="small muted">${esc(c.cat||'ไม่ระบุหมวด')} → ${esc(c.against||'ไม่ระบุผู้ถูกเคลม')}</div>
     ${c.desc?`<div class="small">${esc(c.desc.slice(0,80))}</div>`:''}<div class="small muted mono">${esc(c.date||'')}${(c.photos||[]).length?` · ${c.photos.length} รูป`:''}</div></div></div>`}).join('')}</div>`;
  }
  return h;
}
function clRepaint(){if(UI.route==='claim')$('#main').innerHTML=viewClaim()}
function clEdit(c,isNew){
  const ro=MODE.ro||(!isNew&&!canEditKey('access',c.id));
  const o=overlay('<div class="box wide"></div>','modal');o.dataset.ro=ro?'1':'0';const box=$('.box',o);
  const dl=(id,arr)=>`<datalist id="${id}">${arr.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>`;
  const draw=()=>{
    box.innerHTML=`<div class="row" style="margin-bottom:10px"><h3 style="margin-right:auto">${isNew?'เพิ่มรายการเคลม':'รายการเคลม '+esc(c.no)}</h3><button class="btn pri" data-a="close">${isNew?'ยกเลิก':'เสร็จ'}</button></div>
     <div class="accphotos">${(c.photos||[]).map(p=>`<div class="qp"><div class="thumb" data-a="photo" data-id="${p.id}">${qcThumb(p)}</div>${ro?`<div class="small muted">${esc(p.caption||'')}</div>`:`<input type="text" data-pcap="${p.id}" value="${esc(p.caption||'')}" placeholder="คำอธิบายรูป"><button class="btn sm bad" data-a="delp" data-id="${p.id}">ลบรูป</button>`}</div>`).join('')}
      ${ro?'':`<div class="qp"><label class="btn" for="cl-cam">📷 ถ่ายรูป</label><input id="cl-cam" data-clph="1" type="file" accept="image/*" capture="environment" hidden><label class="btn" for="cl-up">🖼 เลือกรูป (หลายรูป)</label><input id="cl-up" data-clph="1" type="file" accept="image/*" multiple hidden></div>`}</div>
     <div class="grid" style="margin-top:10px">
      <label class="f">หมวดการเคลม<input type="text" list="cl-dc" data-cf="cat" value="${esc(c.cat||'')}" ${ro?'disabled':''} placeholder="เช่น งานสี"></label>
      <label class="f">เคลมใคร (ผู้รับเหมา / ซัพพลายเออร์)<input type="text" list="cl-da" data-cf="against" value="${esc(c.against||'')}" ${ro?'disabled':''}></label>
      <label class="f">อาคาร<input type="text" list="cl-db" data-cf="building" value="${esc(c.building||'')}" ${ro?'disabled':''}></label>
      <label class="f">ชั้น<input type="text" list="cl-df" data-cf="floor" value="${esc(c.floor||'')}" ${ro?'disabled':''}></label>
      <label class="f">พื้นที่ / ห้อง<input type="text" data-cf="area" value="${esc(c.area||'')}" ${ro?'disabled':''}></label>
      <label class="f">วันที่<input type="date" data-cf="date" value="${esc(c.date||'')}" ${ro?'disabled':''}></label>
      <label class="f">สถานะ<select data-cf="status" ${ro?'disabled':''}>${Object.entries(CL_ST).map(([k,x])=>`<option value="${k}" ${(c.status||'open')===k?'selected':''}>${x[0]}</option>`).join('')}</select></label>
     </div>
     <label class="f" style="margin-top:10px">รายละเอียดที่เคลม<textarea rows="3" data-cf="desc" ${ro?'disabled':''}>${esc(c.desc||'')}</textarea></label>
     ${dl('cl-dc',[...new Set([...CL_CATS,...clUniq('cat')])])}${dl('cl-da',clUniq('against'))}${dl('cl-db',clUniq('building'))}${dl('cl-df',clUniq('floor'))}
     ${ro?'':`<div class="row" style="margin-top:14px;justify-content:flex-end">${isNew?'':'<button class="btn bad" data-a="del">ลบ</button>'}<button class="btn pri" data-a="save">บันทึก</button></div>`}`;
  };
  draw();
  const finish=()=>{o.remove();clRepaint()};
  o.addEventListener('input',e=>{const t=e.target;if(ro)return;if(t.dataset.cf)c[t.dataset.cf]=t.value;if(t.dataset.pcap){const p=(c.photos||[]).find(x=>x.id===t.dataset.pcap);if(p)p.caption=t.value}});
  o.addEventListener('change',async e=>{const t=e.target;if(ro)return;
    if(t.dataset.clph){const fs=[...t.files];t.value='';if(fs.length){toast('กำลังเพิ่มรูป…',20000);await clAddPhotos(c,fs);draw();if(!isNew)clSave(c)}}});
  o.addEventListener('click',e=>{
    if(e.target===o){if(isNew)o.remove();else{if(!ro)clSave(c);finish()}return}
    const b=e.target.closest('[data-a]');if(!b)return;const k=b.dataset.a;
    if(k==='close'){if(isNew)o.remove();else{if(!ro)clSave(c);finish()}return}
    if(k==='photo'){const p=(c.photos||[]).find(x=>x.id===b.dataset.id);if(p)openBoard({kind:'photo',ro:true,title:'รูปเคลม '+c.no,imgUrl:imgSrc(p.imgId),w:p.w,h:p.h,shapes:[],onChange:()=>{},onClose:()=>{}});return}
    if(ro)return;
    if(k==='delp'){c.photos=c.photos.filter(x=>x.id!==b.dataset.id);draw();return}
    if(k==='save'){clSave(c);toast('บันทึกรายการเคลมแล้ว');finish();return}
    if(k==='del'){armBtn(b,'กดอีกครั้งเพื่อลบ',()=>{S.access=S.access.filter(x=>x.id!==c.id);save();finish()})}
  });
}
/* PDF: ตารางรายการเคลม (A4 แนวนอน) */
const CL_ROWS=5;
async function exportCL(){
  const list=clFiltered();if(!list.length){toast('ไม่มีรายการในมุมมองนี้');return}
  try{
    toast('กำลังสร้าง PDF…',4000);
    await ensureData(list.flatMap(c=>(c.photos||[]).slice(0,1).map(p=>p.imgId)));
    const P=S.project,pages=[];
    for(const g of clGroups(list)){
      const np=Math.max(1,Math.ceil(g.list.length/CL_ROWS));
      for(let k=0;k<np;k++){
        const rows=g.list.slice(k*CL_ROWS,(k+1)*CL_ROWS);
        pages.push(`<div style="padding:28px 32px;font-family:Sarabun,sans-serif;color:#111;width:1123px;height:794px;box-sizing:border-box;background:#fff"><div style="font:700 22px Sarabun,sans-serif">รายการงานเคลม</div>
         <div style="display:flex;gap:24px;font-size:13px;margin:6px 0 10px"><span><b>โครงการ</b> ${esc(P.name||'')}</span>${g.name?`<span><b>${esc(g.name)}</b></span>`:''}<span style="margin-left:auto">วันที่ ${esc(todayISO())} · หน้า ${k+1}/${np}</span></div>
         <table style="width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed"><colgroup><col style="width:70px"><col style="width:170px"><col style="width:190px"><col><col style="width:110px"><col style="width:130px"><col style="width:90px"></colgroup>
         <thead><tr>${['เลขที่','อาคาร/ชั้น/พื้นที่','รูป','รายละเอียด','หมวด','เคลมใคร','สถานะ'].map(x=>`<th style="border:1px solid #333;background:#eee;padding:5px">${x}</th>`).join('')}</tr></thead><tbody>
         ${rows.map(c=>{const p=(c.photos||[])[0];return`<tr style="height:118px"><td style="border:1px solid #333;padding:5px;text-align:center"><b>${esc(c.no)}</b><br><span style="font-size:10px">${esc(c.date||'')}</span></td><td style="border:1px solid #333;padding:5px">${esc([c.building&&'อาคาร '+c.building,c.floor&&'ชั้น '+c.floor,c.area].filter(Boolean).join(' · '))}</td><td style="border:1px solid #333;padding:3px;text-align:center">${p?`<div style="width:180px;height:108px;margin:auto">${qcThumb(p)}</div>${c.photos.length>1?`<div style="font-size:10px">+${c.photos.length-1} รูป</div>`:''}`:'—'}</td><td style="border:1px solid #333;padding:5px;vertical-align:top">${esc(c.desc||'')}</td><td style="border:1px solid #333;padding:5px">${esc(c.cat||'')}</td><td style="border:1px solid #333;padding:5px">${esc(c.against||'')}</td><td style="border:1px solid #333;padding:5px;text-align:center">${esc(CL_ST[c.status||'open'][0])}</td></tr>`}).join('')}</tbody></table></div>`);
      }
    }
    if(!window.html2canvas)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    if(!window.jspdf)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const host=document.createElement('div');host.style.cssText='position:fixed;left:-9999px;top:0;width:1123px;z-index:-1';
    host.innerHTML=pages.map(p=>`<div class="clsheet">${p}</div>`).join('');document.body.appendChild(host);
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;await sleep(200);
    const pdf=new jspdf.jsPDF({unit:'mm',format:'a4',orientation:'l',compress:true});const sh=$$('.clsheet',host);
    for(let i=0;i<sh.length;i++){if(i>0)pdf.addPage('a4','l');const cv=await html2canvas(sh[i],{scale:2,backgroundColor:'#ffffff',logging:false});pdf.addImage(cv.toDataURL('image/jpeg',.88),'JPEG',0,0,297,210,undefined,'FAST')}
    host.remove();await saveFile('Claims_'+todayISO()+'.pdf',pdf.output('blob'));
  }catch(e){toast('สร้าง PDF ไม่สำเร็จ: '+(e.message||e),5000)}
}
const CLACT={
  clnew(){if(!canCreate()){toast('ต้องเข้าสู่ระบบก่อนสร้างเอกสาร');return}clEdit(clNew(),true)},
  clopen(a,id){const c=(S.access||[]).find(x=>x.id===id);if(c)clEdit(c,false)},
  clview(a,id){UI.clv=id;clRepaint()},
  clpdf(){exportCL()},
};
function clInput(t){
  if(t.id==='clq'){UI.clq=t.value;const p=t.selectionStart;clRepaint();const q=$('#clq');if(q){q.focus();q.setSelectionRange(p,p)}return true}
  return false;
}
async function clChange(t){
  const m={clfb:'clb',clff:'clf',clfc:'clc',clfa:'cla',clfs:'cls',clg:'clg'}[t.id];
  if(m){UI[m]=t.value;clRepaint();return true}
  if(t.id==='clmulti'&&!MODE.ro){const fs=[...t.files];t.value='';if(!fs.length)return true;if(!canCreate()){toast('ต้องเข้าสู่ระบบก่อนสร้างเอกสาร');return true}
    toast('กำลังเพิ่ม '+fs.length+' รูป…',30000);let n=0;
    for(const f of fs){const c=clNew();if(await clAddPhotos(c,[f])){clSave(c);n++}}
    toast('เพิ่ม '+n+' รายการเคลมแล้ว — กดแต่ละรายการเพื่อใส่หมวด/เคลมใคร');clRepaint();return true}
  return false;
}
