'use strict';
/* ========= utils ========= */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);
const pad2=n=>String(n).padStart(2,'0');
const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())};
const fmtDate=iso=>{if(!iso)return'';const p=iso.split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:iso};
const clone=o=>JSON.parse(JSON.stringify(o));
function toast(msg,ms=2600){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),ms)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* ========= defaults ========= */
const DEF_CHECK=[
 {id:'g1',label:'Survey',items:[['Marking','ตำแหน่ง'],['Levels','ระดับ'],['Verticality','แนวดิ่ง'],['Alignment','การจัดแนว']]},
 {id:'g2',label:'Architectural Works\nงานสถาปัตยกรรม',items:[['Texca Wall','แนวดิ่ง'],['Corner','ฉาก'],['Door& Windows Opening','ขนาดช่องเปิด'],['Toilets Water Proof','ผิวผนังก่อนทำกันซึม'],['Water Proof Plastering','ผิวผนังกันซึม'],['Cut off the leak (because of water).','ตรวจสอบรอยรั่ว(ขังน้ำ)'],['Topping Room','งานปรับระดับปูกระเบื้องห้องพัก'],['Tile patterns','งานรูปแบบกระเบื้อง'],['Topping Toilet','งานปรับระดับปูกระเบื้องห้องน้ำ'],['Skimcoat','ตรวจสอบผิวผนัง Skimcoat'],['Wall Tile','กระเบื้องผนังห้องน้ำ'],['Bathroom tile grout','ยาแนวกระเบื้องผนังห้องน้ำ'],['Floor Tile','กระเบื้องพื้นห้องน้ำ'],['SPC Tile','ปรับระดับ Self Leveling'],['SPC tile joints','รอยต่อแผ่นกระเบื้อง SPC'],['Framing Ceiling Work','ตรวจสอบโครงเคร่าฝ้าเพดาน'],['Level of the framework','ระดับโครงเคร่า'],['Drop curtain','ดรอปรางม่าน'],['Ceiling Work','รอยต่อแผ่นฝ้าเพดาน'],['Ceiling level','ระดับฝ้าเพดาน'],['Painting Work','สีรองพื้น'],['Actual color','สีจริง'],['Ceiling color','สีฝ้าเพดาน']]},
 {id:'g3',label:'M & E Works\n(Sanitary, Fire Protection, A/C, Ventilation & Electrical)\nงานระบบประปา, ระบบดับเพลิง, ระบบปรับอากาศ, ระบบระบายอากาศ และระบบไฟฟ้า\nMiscellaneous เบ็ดเตล็ด',items:[['Sleeves','ปลอกงานระบบ'],['Block out & Opennings','ช่องเปิดงานระบบ'],['Inserts & Anchor bolts','วัสดุฝัง/ น๊อตยึด'],['Soil, Waste, Vent Pipes','ท่อส้วม,ระบายน้ำ/อากาศ'],['Fire Protection Pipes','ท่อระบบป้องกันเพลิง'],['Floor Ducts','ท่อฝังพื้นคอนกรีต'],['Grounding','การต่อสายดิน'],['Electrical Boxes','แผงไฟฟ้า'],['Electrical & Conduits Floor / Wall','ท่อร้อยสายในพื้น/ ผนัง'],['Column Conduit','ท่อร้อยสายในเสา'],['Telephone System','ระบบสายโทรศัพท์'],['TV, MATV, CCTV Systems','ระบบโทรทัศน์'],['Security System','ระบบรักษาความปลอดภัย'],['อื่น ๆ ….........................................','']]}
].map(g=>({id:g.id,label:g.label,items:g.items.map((x,i)=>({id:g.id+'i'+i,en:x[0],th:x[1]}))}));
const DEF_TYPES=['กระเบื้องแตกร้าว','กระเบื้องบิ่น / มุมแตก','กระเบื้องโก่ง / ระดับไม่เรียบ (ลิ้น)','เสียงกลวง (ไม่เต็มกาว)','ยาแนวไม่เต็ม / เป็นรู','ยาแนวสีไม่สม่ำเสมอ','แนวร่องไม่ตรง / ร่องไม่เท่ากัน','ลายกระเบื้องผิดแนว','ผนังไม่ดิ่ง / ไม่ได้ฉาก','ความลาดเอียง / น้ำขัง','คราบ / รอยเปื้อนที่ผิวกระเบื้อง','ผิวผนังไม่เรียบ (Skimcoat)','รอยต่อฝ้า / สีไม่สม่ำเสมอ','อื่น ๆ'];
const DEF_FIX=['ซ่อมยาแนวเฉพาะจุด','ขุดร่องยาแนวเดิม แล้วยาแนวใหม่เฉพาะแนว','เปลี่ยนแผ่นเดียว (ตัดร่องรอบแผ่น ห้ามกระทบแผ่นข้างเคียง)','ฉีดน้ำยา / อีพ็อกซี่ประสานใต้แผ่น','เจียรลบคม / ขัดแต่งผิว','ซ่อมสี / touch-up เฉพาะจุด','ปรับระดับ / ปูใหม่เฉพาะแถว','อื่น ๆ'];
const SURFACES=['พื้น','ผนัง','ฝ้าเพดาน','ธรณี / ขอบ / มุม','อื่น ๆ'];
const COLORS=['#e03131','#f08c00','#f2c800','#2f9e44','#1971c2','#7048e8','#d6336c','#212529'];
const STRUCT=[['footing','Footing'],['beam','Beam'],['slab','Slab'],['wall','Wall'],['column','Column'],['stairs','Stairs'],['other','Other']];

function defaultProject(){return{
  name:'The title MODEVA',locate:'-',
  company:{name:'KMIT Construction Co., Ltd.',addr1:'188/49   Moo 4   Soi Khundon 1   T. Thepkrasattri   A. Thalang',addr2:'Phuket   83110   Tel: +66 76 313 048   Fax: +66 76 313 048'},
  logoId:'logo',prefix:'MOD-Inspection-AR-',nextNo:360,
  kinds:[{id:'CM OPEN',label:'CM OPEN',role:'open'},{id:'CM CLOSE',label:'CM CLOSE',role:'close'}],reqSigId:'',engSigId:'',
  workType:'กระเบื้อง',
  requestedName:'',requestedRole:'(M&E)',
  engName:'Mr.Krittanai Songkhai',engRole:'Site Engineer',
  ccName:'Mr. Jakrapat Sae-Teng',ccRole:'Project Engineer',sigId:'sig',
  cmName:'CM. The title modeva bangtao',
  owner:'RHOMBHO PROPERTY PUBLIC COMPANY LIMITED',contractor:'KMIT Construction Co., Ltd.',
  checklist:DEF_CHECK,defectTypes:DEF_TYPES,fixMethods:DEF_FIX
}}

/* ========= image helpers ========= */
function loadImgEl(src){return new Promise((res,rej)=>{const i=new Image();if(/^https?:/.test(src))i.crossOrigin='anonymous';i.onload=()=>res(i);i.onerror=rej;i.src=src})}
async function fileToImage(file,max,q){
  let src,w,h;
  try{src=await createImageBitmap(file,{imageOrientation:'from-image'});w=src.width;h=src.height}
  catch(e){const u=URL.createObjectURL(file);src=await loadImgEl(u);w=src.naturalWidth;h=src.naturalHeight}
  const k=Math.min(1,max/Math.max(w,h));const cw=Math.round(w*k),ch=Math.round(h*k);
  const c=document.createElement('canvas');c.width=cw;c.height=ch;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,cw,ch);x.drawImage(src,0,0,cw,ch);
  return{url:c.toDataURL('image/jpeg',q||.85),w:cw,h:ch};
}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('โหลดไลบรารีไม่ได้'));document.head.appendChild(s)})}
async function pdfToImages(file,maxPages,cb){
  if(!window.pdfjsLib){await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'}
  const buf=await file.arrayBuffer();const pdf=await pdfjsLib.getDocument({data:buf}).promise;const out=[];const lim=Math.min(pdf.numPages,maxPages||6);const big=lim>12?2200:2800;
  for(let n=1;n<=lim;n++){if(cb)cb(n,lim);const pg=await pdf.getPage(n);const v0=pg.getViewport({scale:1});const sc=Math.min(3,big/Math.max(v0.width,v0.height));const vp=pg.getViewport({scale:sc});
    const c=document.createElement('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
    await pg.render({canvasContext:x,viewport:vp}).promise;out.push({url:c.toDataURL('image/jpeg',.9),w:c.width,h:c.height,page:n,pages:pdf.numPages})}
  return out;
}
async function saveFile(name,blob){
  let dl=null;try{if(window.claude&&claude.use)dl=await claude.use('downloads')}catch(e){}
  if(dl){try{await dl.save({filename:name,data:blob});toast('บันทึกไฟล์แล้ว');}catch(e){if(e&&e.code==='declined')return;toast('บันทึกไฟล์ไม่สำเร็จ: '+((e&&e.message)||e),4500)}return}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(a.href)},3000);
}

/* ========= domain helpers ========= */
const rootId=r=>r.rootId||r.id;
const reqById=id=>S.requests.find(r=>r.id===id);
const chainReqs=rid=>S.requests.filter(r=>rootId(r)===rid).sort((a,b)=>(a.round||0)-(b.round||0));
const chainDefects=rid=>S.defects.filter(d=>d.rootId===rid).sort((a,b)=>(a.num||0)-(b.num||0));
const defectById=id=>S.defects.find(d=>d.id===id);
function defectStatus(d){
  if(d.qc)return d.status==='closed'?'closed':d.status==='fixed'?'submitted':'open';
  const cl=chainReqs(d.rootId).filter(r=>r.type==='CLOSE').reverse();
  for(const r of cl){const x=r.res&&r.res[d.id];if(x&&x.r)return x.r==='pass'?'closed':'open'}
  for(const r of cl){if((r.scope||[]).includes(d.id)&&r.sent)return'submitted'}
  return'open';
}
const STATUS_TXT={open:'ต้องแก้ไข',submitted:'ส่งตรวจแล้ว รอผล',closed:'ปิดแล้ว'};
const STATUS_CLS={open:'bad',submitted:'warn',closed:'good'};
const pinLabel=d=>String(d.code).split('-').pop();
function visibleDefects(r){
  const rid=rootId(r);const all=chainDefects(rid);
  if(r.type==='CLOSE')return all.filter(d=>(r.scope||[]).includes(d.id)||d.foundIn===r.id);
  return all.filter(d=>d.foundIn===r.id);
}
function pinStateFor(r,d){return(r.res&&r.res[d.id]&&r.res[d.id].r==='pass')?'closed':'open'}
function chainState(rid){
  const ds=chainDefects(rid);const st=ds.map(defectStatus);const reqs=chainReqs(rid);const last=reqs[reqs.length-1];
  const open=st.filter(s=>s!=='closed').length;
  if(ds.length&&open===0)return{k:'good',t:'ปิด DEFECT ครบแล้ว',open,total:ds.length};
  if(!ds.length){return last&&last.result==='approved'?{k:'good',t:'ผ่านการตรวจ',open:0,total:0}:{k:'',t:last&&last.sent?'ส่งตรวจแล้ว รอผล':'ร่างเอกสาร',open:0,total:0}}
  return{k:'bad',t:`DEFECT ค้างแก้ ${open}/${ds.length}`,open,total:ds.length};
}
function nextDefectCode(rid){const root=reqById(rid);const n=chainDefects(rid).reduce((m,d)=>Math.max(m,d.num||0),0)+1;return{num:n,code:`${root.num}-D${pad2(n)}`}}
function gridText(g){
  if(!g||!g.cells||!g.cells.length)return'';
  const pts=g.cells.map(k=>k.split(',').map(Number));const n=pts.length;const org=g.origin?g.origin+' · ':'';
  if(n>6){const cs=pts.map(p=>p[0]),rs=pts.map(p=>p[1]);const c0=Math.min(...cs),c1=Math.max(...cs),r0=Math.min(...rs),r1=Math.max(...rs);
    const rng=`แถว ${r0}${r1>r0?'–'+r1:''} / คอลัมน์ ${c0}${c1>c0?'–'+c1:''}`;
    return`${org}นับจากซ้าย-ล่าง · ${n} แผ่น (${(c1-c0+1)*(r1-r0+1)===n?rng+' เต็มช่วง':'อยู่ในช่วง '+rng+' ดูผัง'})`}
  const cs=pts.map(p=>`แถว ${p[1]} / คอลัมน์ ${p[0]}`);
  return`${org}นับจากซ้าย-ล่าง · ${cs.join(', ')}`;
}
/* ---- ห้อง / DEFECT แบบโซน / เรียงชื่อตามธรรมชาติ (E101 < E102 < E1010) ---- */
const natCmp=(a,b)=>String(a==null?'':a).localeCompare(String(b==null?'':b),'th',{numeric:true,sensitivity:'base'});
const NOROOM='ไม่ระบุห้อง';
const roomOf=d=>(d.area||'').trim()||NOROOM;
const zoneCount=d=>d&&d.zone?(+d.count||(d.grid&&d.grid.cells?d.grid.cells.length:0)||0):0;
const NOITEM='ไม่ระบุหมวดงาน';
function itemOrder(){const m=new Map();let i=0;(S.project.checklist||[]).forEach(g=>g.items.forEach(it=>m.set(it.id,{i:i++,t:it.en+(it.th?' · '+it.th:'')})));return m}
/* จัดกลุ่ม DEFECT: mode 'room' = ตามห้อง/พื้นที่, 'item' = ตามหมวดงาน (หัวข้อ Checklist) แล้วเรียงตามชื่อ/รหัส DEFECT ในแต่ละกลุ่ม */
function groupRooms(ds,mode){
  const im=mode==='item'?itemOrder():null;const m=new Map();
  const keyOf=d=>mode==='item'?((im.get(d.item)||{}).t||NOITEM):roomOf(d);
  ds.forEach(d=>{const k=keyOf(d);if(!m.has(k))m.set(k,[]);m.get(k).push(d)});
  const none=mode==='item'?NOITEM:NOROOM;
  const ord=k=>mode==='item'?(([...im.values()].find(v=>v.t===k)||{}).i):0;
  return[...m.entries()].sort((a,b)=>a[0]===none?1:b[0]===none?-1:mode==='item'?(ord(a[0])-ord(b[0])):natCmp(a[0],b[0])).map(([room,list])=>({room,mode:mode||'room',list:list.sort((x,y)=>natCmp(x.code,y.code))}));
}
const defectsOn=r=>r.type==='CLOSE'||visibleDefects(r).length>0;   // ใบ OPEN ไม่มีรายการ DEFECT (ยกเว้นข้อมูลเก่าที่มีอยู่แล้ว)
const plansSorted=r=>[...(r.plans||[])].sort((a,b)=>natCmp(a.name,b.name));
function gridSvg(g,px){
  if(!g||!g.cols||!g.rows)return'';
  const cs=20,W=g.cols*cs,H=g.rows*cs;const set=new Set(g.cells||[]);let o='';
  for(let r=1;r<=g.rows;r++)for(let c=1;c<=g.cols;c++){const on=set.has(c+','+r);o+=`<rect data-k="${c},${r}" x="${(c-1)*cs}" y="${(g.rows-r)*cs}" width="${cs}" height="${cs}" fill="${on?'#e03131':'#fff'}" stroke="#8a948f" stroke-width="1"/>`}
  const lab=`<text x="2" y="${H+14}" font-size="11" fill="#555">ซ้าย-ล่าง (1,1)</text>`;
  return`<svg viewBox="0 0 ${W} ${H+18}" ${px?`style="width:${px}px;height:auto"`:''} xmlns="http://www.w3.org/2000/svg">${o}${lab}</svg>`;
}

/* ========= SVG shape rendering (shared by editor + report) ========= */
function polyCentroid(p){let x=0,y=0;p.forEach(a=>{x+=a[0];y+=a[1]});return[x/p.length,y/p.length]}
function shapeSvg(s,i,U,inter,nolabel){
  const da=inter?` data-i="${i}"`:'';const hl=`paint-order="stroke" stroke="#fff" stroke-width="${3*U}" stroke-linejoin="round"`;
  switch(s.t){
  case'poly':{const pts=s.pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
    let o=`<polygon${da} points="${pts}" fill="${s.ref?'none':s.c}" fill-opacity="${s.ref?0:.3}" stroke="${s.c}" stroke-width="${(s.ref?2:3.4)*U}" ${s.ref?`stroke-dasharray="${9*U} ${6*U}" stroke-opacity=".75"`:''} stroke-linejoin="round" ${s.ref?'pointer-events="stroke"':''}/>`;
    if(s.label&&!nolabel){const c=polyCentroid(s.pts);o+=`<text x="${c[0]}" y="${c[1]}" font-size="${(s.fs||13)*U}" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="#111" ${hl} pointer-events="none">${esc(s.label)}</text>`}
    return o}
  case'text':return`<text${da} x="${s.x}" y="${s.y}" font-size="${(s.fs||16)*U}" font-weight="700" fill="${s.c}" ${hl} style="white-space:pre">${esc(s.s)}</text>`;
  case'arrow':{const a=Math.atan2(s.y2-s.y1,s.x2-s.x1),L=(10+s.sw*2.2)*U*1.4,sw=s.sw*U;const hx=s.x2-Math.cos(a)*L*.5,hy=s.y2-Math.sin(a)*L*.5;
    const p1=[s.x2-L*Math.cos(a-.42),s.y2-L*Math.sin(a-.42)],p2=[s.x2-L*Math.cos(a+.42),s.y2-L*Math.sin(a+.42)];
    return`<g${da}><line x1="${s.x1}" y1="${s.y1}" x2="${hx}" y2="${hy}" stroke="${s.c}" stroke-width="${sw}" stroke-linecap="round"/><polygon points="${s.x2},${s.y2} ${p1.join(',')} ${p2.join(',')}" fill="${s.c}"/>${inter?`<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="transparent" stroke-width="${Math.max(sw,14*U)}"/>`:''}</g>`}
  case'rect':return`<g${da}><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="none" stroke="${s.c}" stroke-width="${s.sw*U}" rx="${U}"/>${inter?`<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="none" stroke="transparent" stroke-width="${Math.max(s.sw*U,14*U)}"/>`:''}</g>`;
  case'ell':return`<g${da}><ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" fill="none" stroke="${s.c}" stroke-width="${s.sw*U}"/>${inter?`<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" fill="none" stroke="transparent" stroke-width="${Math.max(s.sw*U,14*U)}"/>`:''}</g>`;
  case'pen':{const pts=s.pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');return`<g${da}><polyline points="${pts}" fill="none" stroke="${s.c}" stroke-width="${s.sw*U}" stroke-linecap="round" stroke-linejoin="round"/>${inter?`<polyline points="${pts}" fill="none" stroke="transparent" stroke-width="${Math.max(s.sw*U,14*U)}"/>`:''}</g>`}
  }
  return'';
}
function pinSvg(p,U,inter){
  U=U*.65;   // ค่าเริ่มต้นหมุดเล็กลงให้พอดีกับแผ่นกระเบื้อง ปรับเพิ่มเติมได้ด้วยแถบ “ขนาดสัญลักษณ์”
  const col=p.st==='closed'?'#2f9e44':p.st==='fixed'?'#f08c00':'#e03131';
  return`<g ${inter?`data-pin="${p.id}" style="cursor:pointer"`:''}><circle cx="${p.x}" cy="${p.y}" r="${27*U}" fill="${col}" fill-opacity=".12" stroke="${col}" stroke-width="${2*U}" stroke-dasharray="${6*U} ${4*U}"/><circle cx="${p.x}" cy="${p.y}" r="${15*U}" fill="${col}" stroke="#fff" stroke-width="${2.5*U}"/><text x="${p.x}" y="${p.y}" font-size="${10.5*U}" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="central" pointer-events="none">${esc(p.label)}</text></g>`;
}
const unitOf=(w,h)=>Math.max(w,h)/1000;
/* กลับด้านแบบ (mirror): axis 'x' = ซ้าย↔ขวา, 'y' = บน↔ล่าง — คืนค่าพิกัดใหม่ของโซน */
function mirrorShapes(shapes,W,H,axis){
  const fx=x=>axis==='x'?W-x:x,fy=y=>axis==='y'?H-y:y;
  (shapes||[]).forEach(s=>{
    if(s.pts)s.pts=s.pts.map(p=>[fx(p[0]),fy(p[1])]);
    else if(s.t==='arrow'){s.x1=fx(s.x1);s.x2=fx(s.x2);s.y1=fy(s.y1);s.y2=fy(s.y2)}
    else if(s.t==='rect'){if(axis==='x')s.x=W-s.x-s.w;else s.y=H-s.y-s.h}
    else if(s.t==='ell'){s.cx=fx(s.cx);s.cy=fy(s.cy)}
    else if(s.t==='text'){s.x=fx(s.x);s.y=fy(s.y)}
  });
}
/* สร้างรูปแบบที่กลับด้านแล้ว คืน id รูปใหม่ */
async function flippedImageId(imgId,axis){
  await ensureData([imgId]);
  const src=IMGDATA.get(imgId)||imgSrc(imgId);const im=await loadImgEl(src);
  const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext('2d');
  x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
  if(axis==='x'){x.translate(c.width,0);x.scale(-1,1)}else{x.translate(0,c.height);x.scale(1,-1)}
  x.drawImage(im,0,0);
  return putImage(c.toDataURL('image/jpeg',.92));
}
/* static image + annotations, as an <svg> string */
function annotatedSvg(imgUrl,w,h,shapes,pins,opts={}){
  const U=unitOf(w,h)*(opts.scale||1);const vb=opts.viewBox||[0,0,w,h];
  return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" preserveAspectRatio="xMidYMid meet" ${opts.style?`style="${opts.style}"`:'style="width:100%;height:100%;display:block"'}><image href="${imgUrl}" x="0" y="0" width="${w}" height="${h}"/>${(shapes||[]).map((s,i)=>shapeSvg(s,i,U,false,opts.labels===false)).join('')}${(pins||[]).map(p=>pinSvg(p,U,false)).join('')}</svg>`;
}

/* ========= overlays / dialogs ========= */
function overlay(html,cls){const ro=MODE.ro;const o=document.createElement('div');o.className='ov '+(cls||'');o.dataset.ro=ro?'1':'0';o.innerHTML=html;document.body.appendChild(o);return o}
function ask(title,fields,okText='ตกลง'){
  return new Promise(res=>{
    const o=overlay(`<div class="box"><h3 style="margin-bottom:12px">${esc(title)}</h3>${fields}<div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn" data-x="no">ยกเลิก</button><button class="btn pri" data-x="ok">${esc(okText)}</button></div></div>`,'modal');
    const done=v=>{o.remove();res(v)};
    o.addEventListener('click',e=>{const x=e.target.closest('[data-x]');if(x)done(x.dataset.x==='ok'?o:null);else if(e.target===o)done(null)});
    const f=$('input,select,textarea',o);f&&f.focus();
  });
}
/* two-step confirm button: first click arms it */
function armBtn(btn,label,run){
  if(btn.dataset.arm){clearTimeout(+btn.dataset.arm);delete btn.dataset.arm;btn.classList.remove('arm');btn.textContent=btn.dataset.orig;run();return}
  btn.dataset.orig=btn.textContent;btn.textContent=label;btn.classList.add('arm');
  btn.dataset.arm=setTimeout(()=>{delete btn.dataset.arm;btn.classList.remove('arm');btn.textContent=btn.dataset.orig},3000);
}

/* ========= Board: pan/zoom SVG editor for plans and photos ========= */
function openBoard(cfg){
  const {w,h}=cfg;const H=unitOf(w,h);let SC=cfg.scale?cfg.scale():1;let U=H*SC;
  const photo=cfg.kind==='photo';const ro=!!cfg.ro;
  const tools=ro?[['pan','เลื่อน / ซูม']]:photo?[['select','เลือก/ย้าย'],['pen','ปากกา'],['arrow','ลูกศร'],['rect','กรอบ'],['ell','วงรี'],['text','ข้อความ'],['pan','เลื่อนภาพ']]
    :[['select','เลือก/ย้าย'],['zone','วาดโซน'],['rect','โซนสี่เหลี่ยม'],['text','ข้อความ'],['pin','ปักหมุด DEFECT'],['pan','เลื่อนแบบ']];
  if(cfg.noPin&&!photo&&!ro){const i=tools.findIndex(t=>t[0]==='pin');if(i>=0)tools.splice(i,1)}
  let tool=ro?'pan':(cfg.tool||'select'),color=photo?'#e03131':COLORS[0],sw=photo?3:3,sel=-1,vtx=null;
  let view={x:0,y:0,w:w,h:h};let draft=null;let undo=[];let drag=null;const ptrs=new Map();let pinch=null;let lastPen=0;const palm=new Set();
  const shapes=cfg.shapes;
  const o=overlay(`
   <div class="obar"><h2>${esc(cfg.title)}</h2>${cfg.header||''}<span class="small muted" id="bhint"></span>${ro?'':'<button class="btn" data-a="undo">↶ ย้อนกลับ</button>'}<button class="btn pri" data-a="close">เสร็จ</button></div>
   <div class="obar" id="btools">${tools.map(t=>`<button class="tool" data-tool="${t[0]}" aria-pressed="false">${t[1]}</button>`).join('')}
     <span style="width:1px;height:22px;background:var(--line);margin:0 4px"></span>
     ${ro?'':COLORS.map(c=>`<button class="sw" data-color="${c}" style="background:${c}" aria-pressed="false" aria-label="สี ${c}"></button>`).join('')}
     ${photo&&!ro?`<label class="small muted row" style="gap:4px">หนา<input type="range" min="1" max="10" value="${sw}" id="bsw" style="width:90px"></label>`:''}
     ${!photo&&!ro&&cfg.onScale?`<label class="small muted row" style="gap:4px" title="ปรับขนาดหมุด ตัวอักษร และเส้นในแบบนี้">ขนาดสัญลักษณ์<input type="range" min="8" max="250" value="${Math.round(SC*100)}" id="bsym" style="width:110px"><b class="mono" id="bsymv">${Math.round(SC*100)}%</b></label>`:''}
     ${!photo&&!ro&&cfg.onFlip?'<button class="tool" data-a="flipx" title="กลับด้านแบบซ้าย↔ขวา (mirror)">⇋ กลับซ้าย-ขวา</button><button class="tool" data-a="flipy" title="กลับด้านแบบบน↔ล่าง">⇅ กลับบน-ล่าง</button>':''}
     <span style="margin-left:auto" class="row"><button class="tool" data-a="zout">−</button><button class="tool" data-a="zin">＋</button><button class="tool" data-a="fit">พอดีจอ</button></span></div>
   <div class="bmain" id="bmain"><svg id="bsvg" xmlns="http://www.w3.org/2000/svg"><image href="${cfg.imgUrl}" x="0" y="0" width="${w}" height="${h}"/><g id="gx" style="pointer-events:none"></g><g id="gs"></g><g id="gp"></g><g id="gu"></g></svg></div>
   <div class="binsp" id="binsp"></div>${!photo&&cfg.pins?'<div class="pdock" id="pdock"></div>':''}`,'board');if(cfg.stampRO!==undefined)o.dataset.ro=cfg.stampRO?'1':'0';
  const gx=$('#gx',o),svg=$('#bsvg',o),gs=$('#gs',o),gp=$('#gp',o),gu=$('#gu',o),insp=$('#binsp',o),bmain=$('#bmain',o);
  const hint=t=>{$('#bhint',o).textContent=t||''};
  function applyView(){svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`)}
  function fit(){const r=bmain.getBoundingClientRect();const ar=r.width/Math.max(r.height,1);let vw=w,vh=h;if(w/h>ar){vh=w/ar}else{vw=h*ar}view={x:(w-vw)/2,y:(h-vh)/2,w:vw,h:vh};applyView()}
  function zoomAt(f,cx,cy){const nw=Math.min(w*8,Math.max(w/20,view.w*f)),k=nw/view.w;const nx=cx-(cx-view.x)*k,ny=cy-(cy-view.y)*k;view={x:nx,y:ny,w:nw,h:view.h*k};applyView()}
  const toPt=e=>{const r=svg.getBoundingClientRect();const sc=Math.max(view.w/r.width,view.h/r.height);// preserveAspectRatio meet
    const ox=(r.width-view.w/sc)/2,oy=(r.height-view.h/sc)/2;return[view.x+(e.clientX-r.left-ox)*sc,view.y+(e.clientY-r.top-oy)*sc]};
  const scr=()=>{const r=svg.getBoundingClientRect();return Math.max(view.w/r.width,view.h/r.height)};
  function pushUndo(){undo.push(JSON.stringify(shapes));if(undo.length>60)undo.shift()}
  function changed(){cfg.onChange&&cfg.onChange()}
  function redraw(){
    gx.innerHTML=cfg.under?cfg.under():'';
    gs.innerHTML=shapes.map((s,i)=>shapeSvg(s,i,U,true)).join('');
    gp.innerHTML=(cfg.pins?cfg.pins():[]).map(p=>pinSvg(p,U,true)).join('');
    renderDock();
    let u='';
    if(sel>=0&&shapes[sel]){const s=shapes[sel];const hs=7*H;const hnd=(x,y,k)=>`<circle data-v="${k}" cx="${x}" cy="${y}" r="${hs}" fill="#fff" stroke="#1971c2" stroke-width="${2*H}" style="cursor:grab"/>`;
      if(s.t==='poly')u+=s.pts.map((p,k)=>hnd(p[0],p[1],k)).join('');
      else if(s.t==='arrow')u+=hnd(s.x1,s.y1,0)+hnd(s.x2,s.y2,1);
      else{const b=bbox(s);u+=`<rect x="${b[0]-4*H}" y="${b[1]-4*H}" width="${b[2]-b[0]+8*H}" height="${b[3]-b[1]+8*H}" fill="none" stroke="#1971c2" stroke-width="${1.5*H}" stroke-dasharray="${5*H} ${4*H}" pointer-events="none"/>`}
      if(s.t==='poly'){const b=bbox(s);u+=`<rect x="${b[0]}" y="${b[1]}" width="${b[2]-b[0]}" height="${b[3]-b[1]}" fill="none" stroke="#1971c2" stroke-width="${1.2*H}" stroke-dasharray="${5*H} ${4*H}" pointer-events="none"/>`}}
    if(draft){u+=draftSvg()}
    gu.innerHTML=u;
  }
  /* แถบรายการหมุดด้านล่าง: แตะเพื่อซูมไปที่หมุดและเปิดรายละเอียด (ใช้งานบนมือถือ) */
  function renderDock(){
    const d=$('#pdock',o);if(!d)return;const ps=cfg.pins?cfg.pins():[];
    d.innerHTML=(ps.length?ps.map(p=>`<button class="pchip ${p.st||'open'}" data-chip="${esc(p.id)}">${esc(p.label)}</button>`).join(''):'<span class="small muted">ยังไม่มีหมุด</span>')+(!ro&&!cfg.noPin&&!photo?'<button class="pchip add" data-tool="pin">＋ ปักหมุด DEFECT</button>':'');
  }
  function focusPin(id){const p=(cfg.pins?cfg.pins():[]).find(x=>String(x.id)===String(id));if(!p)return;
    const nw=Math.min(view.w,Math.max(w/12,Math.min(w,h)/4));const k=nw/view.w;view={x:p.x-nw/2,y:p.y-view.h*k/2,w:nw,h:view.h*k};applyView();}
  /* หมุดที่ใกล้จุดที่แตะที่สุด (รัศมีตามขนาดนิ้ว ไม่ขึ้นกับขนาดหมุดหรือการซูม) */
  function hitPin(pt){let best=null,bd=1e18;const R=Math.max(30*scr(),20*U*.65);
    (cfg.pins?cfg.pins():[]).forEach(p=>{const d=Math.hypot(p.x-pt[0],p.y-pt[1]);if(d<R&&d<bd){bd=d;best=p.id}});return best}
  function bbox(s){let xs=[],ys=[];
    if(s.t==='poly'||s.t==='pen'){s.pts.forEach(p=>{xs.push(p[0]);ys.push(p[1])})}
    else if(s.t==='arrow'){xs=[s.x1,s.x2];ys=[s.y1,s.y2]}
    else if(s.t==='rect'){xs=[s.x,s.x+s.w];ys=[s.y,s.y+s.h]}
    else if(s.t==='ell'){xs=[s.cx-s.rx,s.cx+s.rx];ys=[s.cy-s.ry,s.cy+s.ry]}
    else if(s.t==='text'){const fs=(s.fs||16)*U;xs=[s.x,s.x+fs*.62*Math.max(...s.s.split('\n').map(l=>l.length))];ys=[s.y-fs,s.y+fs*(s.s.split('\n').length-1)+fs*.3]}
    return[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];}
  function draftSvg(){
    if(draft.t==='poly'){const pts=draft.pts.concat(draft.cur?[draft.cur]:[]);return`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="${color}" fill-opacity=".15" stroke="${color}" stroke-width="${3*U}" stroke-dasharray="${8*U} ${5*U}"/>`+draft.pts.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="${(i===0?8:5)*U}" fill="${i===0?'#fff':color}" stroke="${color}" stroke-width="${2*U}"/>`).join('')}
    return'';
  }
  function updateTools(){
    $$('[data-tool]',o).forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===tool));
    $$('[data-color]',o).forEach(b=>b.setAttribute('aria-pressed',b.dataset.color===color));
    const hints={select:'แตะรูปร่างเพื่อเลือก ลากเพื่อย้าย',zone:'แตะเพื่อวางจุดมุม แตะจุดแรกหรือกด “จบโซน” เพื่อปิดรูป',rect:'ลากเพื่อวาดกรอบ',pen:'ลากนิ้ว/เมาส์เพื่อเขียน',arrow:'ลากจากหางไปหัวลูกศร',ell:'ลากเพื่อวาดวงรี',text:'แตะตำแหน่งที่ต้องการวางข้อความ',pin:cfg.pinFor?`แตะตำแหน่งเพื่อปักหมุด ${pinLabel(cfg.pinFor)}`:'แตะตำแหน่งที่พบ DEFECT',pan:'ลากเพื่อเลื่อน / ล้อเมาส์หรือ 2 นิ้วเพื่อซูม'};
    hint(hints[tool]);renderInsp();
  }
  function renderInsp(){
    const s=shapes[sel];let h='';
    if(draft&&draft.t==='poly'){h=`<button class="btn pri" data-a="finish">จบโซน (${draft.pts.length} จุด)</button><button class="btn" data-a="cancel">ยกเลิก</button>`}
    else if(s){
      h+=`<span class="small muted">เลือกอยู่:</span>`;
      if(s.t==='poly'){h+=`<input type="text" id="ilabel" placeholder="ชื่อโซน เช่น ห้อง 101 / พื้นห้องน้ำ" value="${esc(s.label||'')}"><label class="chk"><input type="checkbox" id="iref" ${s.ref?'checked':''}> โซนอ้างอิง (เส้นประ)</label>`}
      if(s.t==='text'){h+=`<input type="text" id="itext" value="${esc(s.s)}"><label class="small muted row" style="gap:4px">ขนาด<input type="range" min="8" max="60" value="${s.fs||16}" id="ifs" style="width:90px"></label>`}
      if(['pen','arrow','rect','ell'].includes(s.t))h+=`<label class="small muted row" style="gap:4px">หนา<input type="range" min="1" max="12" value="${s.sw}" id="isw" style="width:90px"></label>`;
      h+=`<span class="row" style="gap:3px">${COLORS.map(c=>`<button class="sw" data-scolor="${c}" style="background:${c}" aria-pressed="${s.c===c}"></button>`).join('')}</span><button class="btn bad sm" data-a="del">ลบ</button>`;
    }else if(ro)h=`<span class="small muted">ดูอย่างเดียว · ลากเพื่อเลื่อน ใช้ล้อเมาส์หรือ 2 นิ้วเพื่อซูม แตะหมุดเพื่อดูรายละเอียด DEFECT</span>`;else h=`<span class="small muted">${photo?'เขียนบนรูปเพื่อระบุจุด DEFECT: ลูกศร กรอบ และข้อความ':'วาดโซนสีบนแบบเพื่อระบุขอบเขตที่ส่งตรวจ แล้วปักหมุดตำแหน่ง DEFECT'}</span>`;
    insp.innerHTML=h;
  }
  function select(i){sel=i;redraw();renderInsp()}
  function addShape(s){pushUndo();shapes.push(s);changed();select(shapes.length-1)}
  function finishPoly(){if(draft&&draft.t==='poly'){if(draft.pts.length>=3){pushUndo();shapes.push({t:'poly',pts:draft.pts,c:color,label:'',ref:false});changed();draft=null;select(shapes.length-1);setTimeout(()=>{const l=$('#ilabel',o);l&&l.focus()},50);return}draft=null;redraw();renderInsp()}}
  /* pointer handling */
  svg.addEventListener('wheel',e=>{e.preventDefault();const p=toPt(e);zoomAt(e.deltaY>0?1.15:1/1.15,p[0],p[1])},{passive:false});
  svg.addEventListener('pointerdown',e=>{
    if(e.pointerType==='pen')lastPen=Date.now();
    /* กันฝ่ามือ: ขณะใช้ปากกา (Apple Pencil) การสัมผัสด้วยนิ้ว/ฝ่ามือไม่นับ ไม่งั้นเส้น/ลูกศรที่กำลังวาดจะหายหรือเพี้ยน */
    if(e.pointerType==='touch'&&!ro&&Date.now()-lastPen<1500){palm.add(e.pointerId);return}
    try{svg.setPointerCapture(e.pointerId)}catch(x){}
    if(e.isPrimary)for(const[k,v]of[...ptrs])if(v.t===e.pointerType)ptrs.delete(k);   // กันตัวชี้ค้างของชนิดเดียวกัน
    ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,t:e.pointerType});
    if(ptrs.size===2){if(drag){if(drag.m==='pin'&&drag.moved&&drag.orig){const d0=defectById(drag.id);if(d0&&d0.loc){d0.loc.x=drag.orig.x;d0.loc.y=drag.orig.y}}else if((drag.m==='move'||drag.m==='vtx')&&undo.length){shapes.splice(0,shapes.length,...JSON.parse(undo.pop()))}redraw()}
      const a=[...ptrs.values()];pinch={d:Math.hypot(a[0].x-a[1].x,a[1].y-a[0].y),view:{...view},mx:(a[0].x+a[1].x)/2,my:(a[0].y+a[1].y)/2};drag=null;if(draft&&draft.t!=='poly')draft=null;return}
    const p=toPt(e);const t=e.target;const vi=t.closest&&t.closest('[data-v]');const si=t.closest&&t.closest('[data-i]');let pi=t.closest&&t.closest('[data-pin]');
    if(!pi&&(ro||tool==='select'||tool==='pan')){const hp=hitPin(p);if(hp!=null)pi={dataset:{pin:hp},far:true}}
    if(ro){drag={m:'pan',sx:e.clientX,sy:e.clientY,v:{...view},pinId:pi?pi.dataset.pin:null};return}
    if(e.button===1||tool==='pan'){drag={m:'pan',sx:e.clientX,sy:e.clientY,v:{...view},pinId:pi?pi.dataset.pin:null};return}
    if(tool==='select'){
      if(vi&&sel>=0){pushUndo();drag={m:'vtx',k:+vi.dataset.v};return}
      if(pi&&pi.far){drag={m:'pan',sx:e.clientX,sy:e.clientY,v:{...view},pinId:pi.dataset.pin};return}
      if(pi&&(typeof cfg.pinLock==='function'?cfg.pinLock(pi.dataset.pin):cfg.pinLock)){cfg.onPinClick&&cfg.onPinClick(pi.dataset.pin,redraw);return}
      if(pi){const d=(cfg.pinObj||defectById)(pi.dataset.pin);drag={m:'pin',id:pi.dataset.pin,sx:p[0],sy:p[1],moved:false,orig:d&&d.loc?{x:d.loc.x,y:d.loc.y}:null};return}
      if(si){const i=+si.dataset.i;select(i);pushUndo();drag={m:'move',sx:p[0],sy:p[1],orig:clone(shapes[i]),moved:false};return}
      if(sel>=0){sel=-1;redraw();renderInsp()}
      drag={m:'pan',sx:e.clientX,sy:e.clientY,v:{...view}};return}
    if(tool==='zone'){
      if(!draft)draft={t:'poly',pts:[]};
      const first=draft.pts[0];
      if(first&&draft.pts.length>=3&&Math.hypot(first[0]-p[0],first[1]-p[1])<14*scr()){finishPoly();return}
      draft.pts.push(p);draft.cur=null;redraw();renderInsp();return}
    if(tool==='rect'||tool==='ell'||tool==='arrow'||tool==='pen'){
      draft={t:tool,x0:p[0],y0:p[1],pts:[p]};
      if(photo||tool==='rect'||tool==='ell'||tool==='arrow')drag={m:'draw'};
      sel=-1;return}
    if(tool==='text'){const s={t:'text',x:p[0],y:p[1],s:'ข้อความ',c:color,fs:photo?18:14};addShape(s);setTimeout(()=>{const l=$('#itext',o);l&&(l.focus(),l.select())},50);return}
    if(tool==='pin'){cfg.onPinAdd&&cfg.onPinAdd(p[0],p[1],redraw);return}
  });
  svg.addEventListener('pointermove',e=>{
    if(e.pointerType==='pen')lastPen=Date.now();
    if(palm.has(e.pointerId))return;
    if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,t:e.pointerType});
    if(pinch&&ptrs.size>=2){const a=[...ptrs.values()];const d=Math.hypot(a[0].x-a[1].x,a[1].y-a[0].y);const k=pinch.d/Math.max(d,1);
      const r=svg.getBoundingClientRect();const mx=(a[0].x+a[1].x)/2,my=(a[0].y+a[1].y)/2;
      const pv=pinch.view;const sc0=Math.max(pv.w/r.width,pv.h/r.height);const ox0=(r.width-pv.w/sc0)/2,oy0=(r.height-pv.h/sc0)/2;
      const cx=pv.x+(pinch.mx-r.left-ox0)*sc0,cy=pv.y+(pinch.my-r.top-oy0)*sc0;
      const nw=Math.min(w*8,Math.max(w/20,pv.w*k));const nv={w:nw,h:pv.h*nw/pv.w};
      const sc=Math.max(nv.w/r.width,nv.h/r.height);const ox=(r.width-nv.w/sc)/2,oy=(r.height-nv.h/sc)/2;
      nv.x=cx-(mx-r.left-ox)*sc;nv.y=cy-(my-r.top-oy)*sc;view=nv;applyView();return}
    const p=toPt(e);
    if(draft&&draft.t==='poly'){draft.cur=p;gu.innerHTML=draftSvg();return}
    if(!drag){return}
    if(drag.m==='pan'){const r=svg.getBoundingClientRect();const sc=Math.max(drag.v.w/r.width,drag.v.h/r.height);view={...drag.v,x:drag.v.x-(e.clientX-drag.sx)*sc,y:drag.v.y-(e.clientY-drag.sy)*sc};applyView();return}
    if(drag.m==='draw'&&draft){
      if(draft.t==='pen'){draft.pts.push(p);gu.innerHTML=`<polyline points="${draft.pts.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' ')}" fill="none" stroke="${color}" stroke-width="${sw*U}" stroke-linecap="round" stroke-linejoin="round"/>`}
      else{draft.x1=p[0];draft.y1=p[1];gu.innerHTML=shapeSvg(mk(draft),-1,U,false)}
      return}
    if(drag.m==='vtx'){const s=shapes[sel];if(s.t==='poly')s.pts[drag.k]=p;else if(s.t==='arrow'){if(drag.k===0){s.x1=p[0];s.y1=p[1]}else{s.x2=p[0];s.y2=p[1]}}redraw();return}
    if(drag.m==='move'){const dx=p[0]-drag.sx,dy=p[1]-drag.sy;if(Math.hypot(dx,dy)<2*scr()&&!drag.moved)return;drag.moved=true;const s=shapes[sel],o0=drag.orig;
      if(s.t==='poly'||s.t==='pen')s.pts=o0.pts.map(q=>[q[0]+dx,q[1]+dy]);else if(s.t==='arrow'){s.x1=o0.x1+dx;s.y1=o0.y1+dy;s.x2=o0.x2+dx;s.y2=o0.y2+dy}
      else if(s.t==='ell'){s.cx=o0.cx+dx;s.cy=o0.cy+dy}else{s.x=o0.x+dx;s.y=o0.y+dy}
      redraw();return}
    if(drag.m==='pin'){const d=defectById(drag.id);if(d&&d.loc){const dx=p[0]-drag.sx,dy=p[1]-drag.sy;if(Math.hypot(dx,dy)>(e.pointerType==='touch'?14:5)*scr()||drag.moved){drag.moved=true;d.loc.x=drag.orig.x+dx;d.loc.y=drag.orig.y+dy;redraw()}}return}
  });
  function mk(d){
    if(d.t==='rect'||(d.t==='zonerect')){const x=Math.min(d.x0,d.x1),y=Math.min(d.y0,d.y1);const ww=Math.abs(d.x1-d.x0),hh=Math.abs(d.y1-d.y0);
      if(photo)return{t:'rect',x,y,w:ww,h:hh,c:color,sw};
      return{t:'poly',pts:[[x,y],[x+ww,y],[x+ww,y+hh],[x,y+hh]],c:color,label:'',ref:false}}
    if(d.t==='ell')return{t:'ell',cx:(d.x0+d.x1)/2,cy:(d.y0+d.y1)/2,rx:Math.abs(d.x1-d.x0)/2,ry:Math.abs(d.y1-d.y0)/2,c:color,sw};
    if(d.t==='arrow')return{t:'arrow',x1:d.x0,y1:d.y0,x2:d.x1,y2:d.y1,c:color,sw};
  }
  function up(e){
    if(e.pointerType==='pen')lastPen=Date.now();
    if(palm.delete(e.pointerId))return;
    ptrs.delete(e.pointerId);
    if(pinch&&ptrs.size<2){pinch=null;if(ptrs.size===1){const q=[...ptrs.values()][0];drag={m:'pan',sx:q.x,sy:q.y,v:{...view},pinId:null,moved:true}}return}
    if(!drag){return}
    const dm=drag;drag=null;
    if(dm.m==='draw'&&draft){const d=draft;draft=null;
      if(d.t==='pen'){if(d.pts.length>2){pushUndo();shapes.push({t:'pen',pts:d.pts,c:color,sw});changed();redraw()}else redraw()}
      else if(d.x1!=null&&Math.hypot(d.x1-d.x0,d.y1-d.y0)>6*U){const s=mk(d);addShape(s);if(s.t==='poly'){setTimeout(()=>{const l=$('#ilabel',o);l&&l.focus()},50)}}
      else redraw();
      return}
    if(dm.m==='move'||dm.m==='vtx'){if(dm.m==='move'&&!dm.moved)undo.pop();changed();redraw();return}
    if(dm.m==='pan'&&dm.pinId!=null&&Math.hypot(e.clientX-dm.sx,e.clientY-dm.sy)<10){cfg.onPinClick&&cfg.onPinClick(dm.pinId,redraw);return}
    if(dm.m==='pin'){if(dm.moved){changed();cfg.onPinMove&&cfg.onPinMove(dm.id)}else cfg.onPinClick&&cfg.onPinClick(dm.id,redraw);return}
  }
  svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);
  svg.addEventListener('dblclick',()=>{if(tool==='zone')finishPoly()});
  /* UI events */
  o.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.chip){focusPin(b.dataset.chip);cfg.onPinClick&&cfg.onPinClick(b.dataset.chip,redraw);return}
    if(b.dataset.tool){tool=b.dataset.tool;if(tool!=='zone')draft=null;updateTools();redraw();return}
    if(b.dataset.color){color=b.dataset.color;updateTools();return}
    if(b.dataset.scolor&&shapes[sel]){pushUndo();shapes[sel].c=b.dataset.scolor;changed();redraw();renderInsp();return}
    const a=b.dataset.a;if(!a)return;
    if(a==='close'){finishPoly();close()}
    else if(a==='undo'){if(undo.length){const prev=JSON.parse(undo.pop());shapes.length=0;prev.forEach(s=>shapes.push(s));sel=-1;changed();redraw();renderInsp()}}
    else if(a==='zin'){zoomAt(1/1.3,view.x+view.w/2,view.y+view.h/2)}
    else if(a==='zout'){zoomAt(1.3,view.x+view.w/2,view.y+view.h/2)}
    else if(a==='fit')fit();
    else if(a==='flipx'||a==='flipy'){const ax=a==='flipx'?'x':'y';toast('กำลังกลับด้านแบบ…',1500);Promise.resolve(cfg.onFlip(ax)).then(url=>{if(url){const im=$('#bsvg > image',o);im.setAttribute('href',url)}sel=-1;redraw();renderInsp();toast('กลับด้านแล้ว โซนและหมุดกลับตาม (กดซ้ำเพื่อย้อนกลับ)',3500)}).catch(e=>toast('กลับด้านไม่สำเร็จ: '+((e&&e.message)||e),4500))}
    else if(a==='finish')finishPoly();
    else if(a==='cancel'){draft=null;redraw();renderInsp()}
    else if(a==='del'&&sel>=0){pushUndo();shapes.splice(sel,1);sel=-1;changed();redraw();renderInsp()}
    else if(cfg.onAction)cfg.onAction(a,o,redraw);
  });
  o.addEventListener('input',e=>{const t=e.target,s=shapes[sel];
    if(t.id==='bsw'){sw=+t.value;return}
    if(t.id==='bsym'){SC=+t.value/100;U=H*SC;$('#bsymv',o).textContent=t.value+'%';cfg.onScale&&cfg.onScale(SC);redraw();return}
    if(!s)return;
    if(t.id==='ilabel'){s.label=t.value;redraw()}
    else if(t.id==='iref'){s.ref=t.checked;redraw()}
    else if(t.id==='itext'){s.s=t.value||' ';redraw()}
    else if(t.id==='ifs'){s.fs=+t.value;redraw()}
    else if(t.id==='isw'){s.sw=+t.value;redraw()}
    changed();
  });
  o.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'&&e.target.type==='text'){e.target.blur()}else if(e.key==='Delete'&&e.target===document.body&&sel>=0){shapes.splice(sel,1);sel=-1;changed();redraw();renderInsp()}else if(e.key==='Escape'){draft=null;redraw();renderInsp()}});
  function close(){window.removeEventListener('resize',fit);o.remove();cfg.onClose&&cfg.onClose()}
  window.addEventListener('resize',fit);
  updateTools();setTimeout(()=>{fit();redraw()},0);
  if(cfg.pinFor)tool='pin',updateTools();
  return{el:o,redraw,close,setTool:t=>{tool=t;updateTools()}};
}
// rect tool in plan mode makes a poly zone (handled in mk via photo flag)

/* รูปตอนตรวจเปิด ที่ใบส่งปิดดึงมาแนบ (ไม่รวมรูปผูก DEFECT ซึ่งไปอยู่ในแถว DEFECT แล้ว; ยกเว้นได้ด้วย r.openExclude) */
function openPhotosFor(r){
  if(r.type!=='CLOSE')return[];const root=reqById(rootId(r));if(!root||root.id===r.id)return[];
  return(root.photos||[]).filter(p=>!p.defectId&&!(r.openExclude||[]).includes(p.id));
}
const photoTotal=r=>(r.photos||[]).length+openPhotosFor(r).length;
