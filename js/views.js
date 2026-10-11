/* ========= app state / routing ========= */
const UI={route:'list',reqId:null,tab:'info',q:'',dfilter:'open'};
const curReq=()=>reqById(UI.reqId);
const getPath=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
function setPath(o,p,v){const ks=p.split('.');let t=o;for(let i=0;i<ks.length-1;i++){if(t[ks[i]]==null)t[ks[i]]={};t=t[ks[i]]}t[ks[ks.length-1]]=v}
const nsObj=ns=>ns==='r'?curReq():ns==='p'?S.project:null;
function inp(label,b,type='text',extra=''){const[ns,path]=b.split(':');const v=getPath(nsObj(ns),path);return`<label class="f">${label}<input type="${type}" data-b="${b}" value="${esc(v)}" ${extra}></label>`}
function ta(label,b,rows=3){const[ns,path]=b.split(':');return`<label class="f">${label}<textarea data-b="${b}" rows="${rows}">${esc(getPath(nsObj(ns),path))}</textarea></label>`}
function go(route,id,tab){UI.route=route;if(id!==undefined)UI.reqId=id;if(tab)UI.tab=tab;render();window.scrollTo(0,0)}

function lockUI(){$$('#main input,#main select,#main textarea').forEach(el=>{if(!['q','dq','dfilter','grp','qf','qg','qq'].includes(el.id))el.disabled=true})}
function render(){
  document.body.classList.toggle('ro',MODE.ro);
  const modeChip=MODE.ro?'<span class="chip warn">ดูอย่างเดียว</span>':MODE.kind==='cloud'?'<span class="chip good">ผู้แก้ไข · ซิงก์ทุกคน</span>':'';
  $('#top').innerHTML=`<div class="brand"><b>Inspection Desk</b><span>${esc(S.project.name)}</span></div>
   <nav class="nav">${[['list','รายการส่งตรวจ'],['defects','DEFECT ตามใบตรวจ'],['qc','QC Before/After'],['site','แบบหน้างาน'],['settings',MODE.ro?'ข้อมูลโครงการ':'ตั้งค่า / สำรองข้อมูล']].map(n=>`<button data-go="${n[0]}" aria-current="${UI.route===n[0]||(n[0]==='list'&&UI.route==='req')}">${n[1]}</button>`).join('')}</nav>
   ${modeChip}${MODE.loginUi?(MODE.owner?`<button class="btn sm" data-act="logout" title="${esc(MODE.email)}">ออกจากระบบ</button>`:`<button class="btn sm pri" data-act="login">เข้าสู่ระบบผู้แก้ไข</button>`):''}<span class="small muted" id="savestate">${MODE.ro?'':memOnly?'ไม่มีพื้นที่เก็บถาวร':MODE.kind==='cloud'?'':'บันทึกในเครื่องแล้ว'}</span>`;
  const m=$('#main');
  if(UI.route==='list')m.innerHTML=viewList();
  else if(UI.route==='defects')m.innerHTML=viewDefects();
  else if(UI.route==='qc')m.innerHTML=viewQC();
  else if(UI.route==='site')m.innerHTML=viewSite();
  else if(UI.route==='settings'){m.innerHTML=viewSettings();showUsage()}
  else if(UI.route==='req'){if(!curReq()){UI.route='list';return render()}m.innerHTML=viewReq();afterReq()}
  if(MODE.ro)lockUI();
}
async function showUsage(){const el=$('#usage');if(!el||!MODE.assets)return;try{const l=await MODE.assets.list();const u=l.usage||{};el.textContent=`พื้นที่เก็บรูปที่ใช้แล้ว ${(u.bytes/1048576).toFixed(1)} MB${u.maxBytes?' จาก '+(u.maxBytes/1048576).toFixed(0)+' MB':''} (${u.count!=null?u.count:l.assets.length} ไฟล์)`}catch(e){}}

/* ========= list ========= */
function chip(t,c){return`<span class="chip ${c||''}">${esc(t)}</span>`}
function chainBlock(root,match){
  const reqs=chainReqs(root.id);if(!reqs.some(match))return'';
  const cs=chainState(root.id);const can=cs.open>0;
  let h=`<div class="chain"><div class="chainhead">${chip(cs.t,cs.k)}<span class="muted">${esc(root.workType)} · ${esc(root.location)}</span><span style="margin-left:auto" class="row">${can?`<button class="btn sm pri" data-act="newclose" data-id="${root.id}">＋ สร้างรอบ CLOSE (${cs.open} จุด)</button>`:''}<button class="btn sm" data-act="delchain" data-id="${root.id}">ลบชุดนี้</button></span></div>`;
  for(const r of reqs){
    const vis=visibleDefects(r).length;
    h+=`<div class="crow ${r.type==='CLOSE'?'sub':''}" data-act="openreq" data-id="${r.id}"><div><div class="no">${esc(r.no)}</div>${chip(r.type==='OPEN'?'CM OPEN':'CM CLOSE รอบ '+r.round,r.type==='OPEN'?'open':'close')}</div><div class="ttl"><div>${esc(r.workText||'—')}</div><div class="small muted">${fmtDate(r.date)} · ${esc(r.location)} · รูป ${r.photos.length} · ${r.type==='CLOSE'?`ตรวจซ้ำ ${(r.scope||[]).length} จุด`:`พบ DEFECT ${vis} จุด`}</div></div><div class="row">${r.sent?chip('ส่งแล้ว','warn'):chip('ร่าง')}${r.result==='approved'?chip('Approved','good'):r.result==='disapproved'?chip('Disapproved','bad'):r.result==='other'?chip('Other'):''}</div></div>`}
  return h+`</div>`;
}
function groupKeys(root,g){
  const b=root.building?('อาคาร '+root.building):(root.location||'ไม่ระบุอาคาร');const w=root.workType||'ไม่ระบุงาน';
  return g==='building'?[b]:g==='work'?[w]:g==='both'?[b,w]:[];
}
function viewList(){
  const roots=S.requests.filter(r=>r.type==='OPEN').sort((a,b)=>b.num-a.num);
  const q=UI.q.trim().toLowerCase();const g=UI.grp||'building';
  const match=r=>!q||[r.no,r.workText,r.workType,r.location,r.building].join(' ').toLowerCase().includes(q);
  const all=S.defects.filter(d=>!d.qc).map(defectStatus);
  const stats=`<div class="stats"><div><b>${roots.length}</b><span>ชุดงานส่งตรวจ</span></div><div><b style="color:var(--bad)">${all.filter(s=>s==='open').length}</b><span>DEFECT ต้องแก้</span></div><div><b style="color:var(--warn)">${all.filter(s=>s==='submitted').length}</b><span>ส่ง CLOSE แล้ว รอผล</span></div><div><b style="color:var(--good)">${all.filter(s=>s==='closed').length}</b><span>ปิดแล้ว</span></div></div>`;
  let h=`<div class="row" style="margin-bottom:6px"><h1 style="font-size:22px;margin-right:auto">รายการส่งตรวจ</h1><label class="row small muted" style="gap:6px">จัดกลุ่มตาม<select id="grp" style="width:auto;color:var(--fg)">${[['building','อาคาร'],['work','ชนิดงาน'],['both','อาคาร › ชนิดงาน'],['none','ไม่จัดกลุ่ม']].map(o=>`<option value="${o[0]}" ${o[0]===g?'selected':''}>${o[1]}</option>`).join('')}</select></label><input type="search" id="q" placeholder="ค้นหาเลขที่ / อาคาร / งาน" value="${esc(UI.q)}" style="width:220px"><button class="btn pri" data-act="newopen">＋ ส่งตรวจใหม่ (CM OPEN)</button></div>${stats}`;
  const vis=roots.filter(rt=>chainReqs(rt.id).some(match));
  if(!vis.length)return h+`<div class="empty">${S.requests.length?'ไม่มีรายการที่ตรงกับคำค้น':MODE.ro?'ยังไม่มีข้อมูลในระบบ':'ยังไม่มีรายการ กด “ส่งตรวจใหม่” เพื่อสร้างใบตรวจฉบับแรก'}</div>`;
  const tree=new Map();
  for(const rt of vis){const ks=groupKeys(rt,g);let node=tree;ks.forEach((k,i)=>{if(!node.has(k))node.set(k,{n:new Map(),items:[]});const e=node.get(k);if(i===ks.length-1)e.items.push(rt);node=e.n});if(!ks.length){if(!tree.has(''))tree.set('',{n:new Map(),items:[]});tree.get('').items.push(rt)}}
  const sum=n=>{let c=0,o=0;const walk=e=>{e.items.forEach(rt=>{c++;o+=chainState(rt.id).open});e.n.forEach(walk)};walk(n);return[c,o]};
  const out=(map,lvl)=>{let x='';[...map.keys()].sort((a,b)=>a.localeCompare(b,'th',{numeric:true})).forEach(k=>{const e=map.get(k);const[c,o]=sum(e);
    if(k!=='')x+=`<div class="ghead l${lvl}"><b>${esc(k)}</b><span class="small muted">${c} ชุดงาน</span>${o?`<span class="chip bad">ค้างแก้ ${o} จุด</span>`:`<span class="chip good">ไม่มี DEFECT ค้าง</span>`}</div>`;
    x+=e.items.map(rt=>chainBlock(rt,match)).join('')+out(e.n,lvl+1)});return x};
  return h+out(tree,1);
}

/* ========= requests: create ========= */
function newOpen(){
  const p=S.project;const last=[...S.requests].sort((a,b)=>b.created-a.created)[0];
  const num=p.nextNo++;const id='rq'+uid();
  const r={id,rootId:id,type:'OPEN',round:0,num,no:p.prefix+num,date:todayISO(),planDate:todayISO(),planTime:'',bookNo:'',
    workText:last?last.workText:'',workType:last?last.workType:p.workType,location:last?last.location:'',building:last?last.building:'',floor:'',level:'',strength:'',slump:'',refDwg:'',
    structure:{other:true},checklist:{},plans:[],photos:[],scope:[],res:{},result:'',notes:'',sent:false,requestedName:p.requestedName,created:Date.now()};
  S.requests.push(r);save();return r;
}
function makeClose(rid){
  const reqs=chainReqs(rid);const base=reqs[0],prev=reqs[reqs.length-1];const p=S.project;
  const open=chainDefects(rid).filter(d=>defectStatus(d)!=='closed');
  const round=reqs.filter(x=>x.type==='CLOSE').length+1;const num=p.nextNo++;const id='rq'+uid();
  const items=new Set(open.map(d=>d.item).filter(Boolean));
  const cl=clone(prev.checklist||{});for(const k of Object.keys(cl))cl[k].sel=items.has(k);
  items.forEach(k=>{cl[k]=cl[k]||{};cl[k].sel=true});
  const r={id,rootId:rid,parentId:prev.id,type:'CLOSE',round,num,no:p.prefix+num,date:todayISO(),planDate:todayISO(),planTime:'',bookNo:'',
    workText:base.workText,workType:base.workType,location:base.location,building:base.building,floor:base.floor,level:base.level,strength:'',slump:'',refDwg:base.refDwg,
    structure:clone(base.structure||{}),checklist:cl,
    plans:(prev.plans||[]).map(pl=>({...clone(pl),id:'pl'+uid(),shapes:(pl.shapes||[]).map(s=>s.t==='poly'?{...clone(s),ref:true}:clone(s))})),
    photos:[],scope:open.map(d=>d.id),res:{},result:'',notes:'',sent:false,requestedName:base.requestedName,created:Date.now()};
  S.requests.push(r);save();return r;
}

/* ========= defects overview ========= */
function viewDefects(){
  const f=UI.dfilter;const q=(UI.dq||'').toLowerCase();
  let ds=S.defects.filter(d=>!d.qc).map(d=>({d,st:defectStatus(d)})).filter(x=>(f==='all'||(f==='open'?x.st!=='closed':f==='need'?x.st==='open':x.st===f))&&(!q||[x.d.code,x.d.area,x.d.type,x.d.desc].join(' ').toLowerCase().includes(q)));
  ds.sort((a,b)=>String(a.d.code).localeCompare(String(b.d.code),undefined,{numeric:true}));
  let h=`<div class="row" style="margin-bottom:12px"><h1 style="font-size:22px;margin-right:auto">DEFECT ตามใบตรวจ</h1>
   <select id="dfilter" style="width:auto">${[['open','ค้างแก้ / รอผล'],['need','ต้องแก้ไข'],['submitted','รอผลตรวจซ้ำ'],['closed','ปิดแล้ว'],['all','ทั้งหมด']].map(o=>`<option value="${o[0]}" ${o[0]===f?'selected':''}>${o[1]}</option>`).join('')}</select>
   <input type="search" id="dq" placeholder="ค้นหารหัส / ห้อง / ประเภท" value="${esc(UI.dq||'')}" style="width:220px"></div>`;
  if(!ds.length)return h+`<div class="empty">ไม่มี DEFECT ในมุมมองนี้</div>`;
  h+=`<div class="tw"><table class="t"><thead><tr><th>รหัส</th><th>สถานะ</th><th>ตำแหน่ง</th><th>ประเภท</th><th>ตำแหน่งกระเบื้อง</th><th>วิธีแก้เฉพาะจุด</th><th>พบใน</th></tr></thead><tbody>`;
  for(const x of ds){const d=x.d;const fr=reqById(d.foundIn);
    h+=`<tr style="cursor:pointer" data-act="editdef" data-id="${d.id}"><td class="mono"><b>${esc(d.code)}</b></td><td>${chip(STATUS_TXT[x.st],STATUS_CLS[x.st])}</td><td>${esc(d.area)} ${esc(d.surface||'')} ${esc(d.face||'')}</td><td>${esc(d.type)}</td><td class="small">${esc(gridText(d.grid))||'<span class="muted">—</span>'}</td><td class="small">${esc(d.fix)}</td><td class="small mono">${fr?esc(fr.no):''}</td></tr>`}
  return h+`</tbody></table></div>`;
}

/* ========= defect editor (modal) ========= */
function editDefect(d,ctx){
  ctx=ctx||{};const P=S.project;
  const opt=(arr,v)=>arr.map(x=>`<option ${x===v?'selected':''}>${esc(x)}</option>`).join('');
  const items=P.checklist.flatMap(g=>g.items.map(i=>({id:i.id,t:i.en+(i.th?' · '+i.th:'')})));
  const o=overlay(`<div class="box wide">
   <div class="row" style="margin-bottom:12px"><h3 style="margin-right:auto">DEFECT <span class="mono">${esc(d.code)}</span> ${chip(STATUS_TXT[defectStatus(d)],STATUS_CLS[defectStatus(d)])}</h3><button class="btn pri" data-x="close">เสร็จ</button></div>
   <div class="grid g2">
     <label class="f">รหัส DEFECT<input type="text" data-b="code" value="${esc(d.code)}"></label>
     <label class="f" ${ctx.qc?'hidden':''}>หัวข้อใน Checklist<select data-b="item"><option value="">— ไม่ระบุ —</option>${items.map(i=>`<option value="${i.id}" ${i.id===d.item?'selected':''}>${esc(i.t)}</option>`).join('')}</select></label>
     <label class="f">ห้อง / พื้นที่ (เช่น ห้อง 101 ห้องน้ำ)<input type="text" data-b="area" value="${esc(d.area)}"></label>
     <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">พื้นผิว<select data-b="surface"><option value="">—</option>${opt(SURFACES,d.surface)}</select></label><label class="f">ด้าน / แนว (A,B,C,D)<input type="text" data-b="face" value="${esc(d.face||'')}"></label></div>
     <label class="f">ประเภท DEFECT<select data-b="type"><option value="">—</option>${opt(P.defectTypes,d.type)}</select></label>
     <label class="f">กำหนดแก้ไขเสร็จ<input type="date" data-b="due" value="${esc(d.due||'')}"></label>
   </div>
   <label class="f" style="margin-top:12px">รายละเอียด<textarea data-b="desc" rows="2">${esc(d.desc)}</textarea></label>
   <h3 style="margin:16px 0 4px;font-size:15px">ตำแหน่งกระเบื้องที่ต้องแก้ (ลดความเสียหายแผ่นข้างเคียง)</h3>
   <p class="hint">ใส่ขนาดพื้นผิวและกระเบื้อง แล้วแตะช่องที่เป็นจุดแก้ไข ผังนี้จะพิมพ์ในใบ DEFECT ให้ช่างเห็นว่าแตะเฉพาะแผ่นไหน</p>
   <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
     <label class="f">พื้นผิว กว้าง (ซม.)<input type="number" data-g="sw" min="1" value="${d.grid?.sw||''}"></label>
     <label class="f">สูง/ยาว (ซม.)<input type="number" data-g="sh" min="1" value="${d.grid?.sh||''}"></label>
     <label class="f">กระเบื้อง กว้าง (ซม.)<input type="number" data-g="tw" min="1" value="${d.grid?.tw||''}"></label>
     <label class="f">กระเบื้อง สูง/ยาว (ซม.)<input type="number" data-g="th" min="1" value="${d.grid?.th||''}"></label>
   </div>
   <div class="row" style="margin:10px 0"><button class="btn" data-x="mkgrid">สร้างผังกระเบื้อง</button><label class="f grow">จุดเริ่มนับ (คอลัมน์ 1 / แถว 1)<input type="text" data-g="origin" placeholder="เช่น มุมซ้ายล่างเมื่อยืนหน้าผนัง B / มุมประตูเข้าห้อง" value="${esc(d.grid?.origin||'')}"></label></div>
   <div id="gbox"></div>
   <div class="grid g2" style="margin-top:14px">
     <label class="f">วิธีแก้เฉพาะจุด<select data-b="fix"><option value="">—</option>${opt(P.fixMethods,d.fix)}</select></label>
     <label class="f">ข้อควรระวัง / แผ่นข้างเคียงที่ห้ามกระทบ<textarea data-b="protect" rows="2">${esc(d.protect||'')}</textarea></label>
   </div>
   <div class="row" style="margin-top:16px">
     ${ctx.req?`<button class="btn" data-x="pin">${d.loc?'ย้ายหมุดบนแบบ':'ปักหมุดบนแบบ'}</button>`:''}
     ${d.loc?`<span class="chip good">มีหมุดบนแบบแล้ว</span>`:`<span class="chip warn">ยังไม่ปักหมุด</span>`}
     ${ctx.canDelete?`<button class="btn bad" style="margin-left:auto" data-x="del">ลบ DEFECT</button>`:''}
   </div></div>`,'modal');
  if(MODE.ro){$$('input,select,textarea',o).forEach(x=>x.disabled=true);$$('[data-x=mkgrid],[data-x=pin],[data-x=del]',o).forEach(x=>x.remove())}
  const gbox=$('#gbox',o);
  function drawGrid(){const g=d.grid;if(!g||!g.cols){gbox.innerHTML='<div class="empty small">ยังไม่ได้สร้างผังกระเบื้อง (ข้ามได้ถ้าไม่จำเป็น)</div>';return}
    gbox.innerHTML=`<div class="gsvg-wrap">${gridSvg(g).replace('<svg','<svg class="gsvg" id="gsvg"')}</div><p class="small muted" style="margin:6px 0 0">${g.cols} คอลัมน์ × ${g.rows} แถว · เลือกอยู่ ${g.cells.length} แผ่น ${g.cells.length?'· '+esc(gridText(g)):''}</p>`}
  drawGrid();
  o.addEventListener('input',e=>{const t=e.target;
    if(t.dataset.b){d[t.dataset.b]=t.value;save();if(ctx.after)ctx.after()}
    if(t.dataset.g){d.grid=d.grid||{cells:[]};d.grid[t.dataset.g]=t.type==='number'?(+t.value||0):t.value;save()}});
  o.addEventListener('click',e=>{
    const svgEl=e.target.closest('#gsvg');
    if(svgEl){if(MODE.ro)return;const g=d.grid;const r=svgEl.getBoundingClientRect();const vb=svgEl.viewBox.baseVal;const x=(e.clientX-r.left)/r.width*vb.width,y=(e.clientY-r.top)/r.height*vb.height;
      const c=Math.floor(x/20)+1,row=g.rows-Math.floor(y/20);if(c<1||c>g.cols||row<1||row>g.rows)return;const k=c+','+row;const i=g.cells.indexOf(k);i>=0?g.cells.splice(i,1):g.cells.push(k);save();drawGrid();return}
    const b=e.target.closest('[data-x]');if(b){const x=b.dataset.x;
      if(x==='close'||e.target===o){o.remove();ctx.after&&ctx.after(true);return}
      if(x==='mkgrid'){const g=d.grid||(d.grid={cells:[]});if(!(g.sw&&g.sh&&g.tw&&g.th)){toast('กรอกขนาดพื้นผิวและกระเบื้องให้ครบ');return}
        const cols=Math.ceil(g.sw/g.tw-.001),rows=Math.ceil(g.sh/g.th-.001);if(cols>60||rows>60){toast('ผังใหญ่เกินไป (สูงสุด 60×60 แผ่น) ลองแบ่งเป็นผนังคนละด้าน');return}
        g.cols=cols;g.rows=rows;g.cells=(g.cells||[]).filter(k=>{const[c,r]=k.split(',').map(Number);return c<=cols&&r<=rows});save();drawGrid();return}
      if(x==='pin'){o.remove();ctx.after&&ctx.after(true);ctx.pin&&ctx.pin(d);return}
      if(x==='del'){armBtn(b,'กดอีกครั้งเพื่อลบ',()=>{S.defects=S.defects.filter(z=>z.id!==d.id);Object.values(S.requests).forEach(r=>{r.scope=(r.scope||[]).filter(i=>i!==d.id);delete(r.res||{})[d.id];(r.photos||[]).forEach(p=>{if(p.defectId===d.id)p.defectId=''})});save();o.remove();ctx.after&&ctx.after(true)});return}}
    if(e.target===o){o.remove();ctx.after&&ctx.after(true)}
  });
}
function newDefect(r,loc){
  const rid=rootId(r);const n=nextDefectCode(rid);
  const d={id:'df'+uid(),rootId:rid,foundIn:r.id,num:n.num,code:n.code,item:'',type:'',desc:'',area:'',surface:'',face:'',fix:'',protect:'',due:'',grid:null,loc:loc||null,created:Date.now()};
  const last=S.defects.filter(x=>x.rootId===rid).slice(-1)[0];if(last){d.area=last.area;d.surface=last.surface;d.item=last.item}
  S.defects.push(d);if(r.type==='CLOSE')r.scope=(r.scope||[]);save();return d;
}

/* ========= request editor ========= */
function viewReq(){
  const r=curReq();const cs=chainState(rootId(r));const tabs=[['info','ข้อมูลเอกสาร'],['plans','แบบ / ขอบเขต',r.plans.length],['photos','รูปตรวจ',r.photos.length,r.photos.length>=4?'good':'bad'],['defects','DEFECT',visibleDefects(r).length],['preview','เอกสารพร้อมส่ง']];
  return`<div class="row" style="margin-bottom:10px"><button class="btn sm" data-go="list">← รายการ</button><h1 style="font-size:20px" class="mono">${esc(r.no)}</h1>${chip(r.type==='OPEN'?'CM OPEN':'CM CLOSE รอบ '+r.round,r.type==='OPEN'?'open':'close')}${chip(cs.t,cs.k)}
   <span style="margin-left:auto" class="row"><label class="chk"><input type="checkbox" data-b="r:sent" ${r.sent?'checked':''} data-re="1"> ส่งตรวจแล้ว</label>${r.type==='OPEN'&&cs.open>0?`<button class="btn pri sm" data-act="newclose" data-id="${rootId(r)}">＋ สร้างรอบ CLOSE</button>`:r.type==='CLOSE'&&cs.open>0?`<button class="btn pri sm" data-act="newclose" data-id="${rootId(r)}">＋ รอบ CLOSE ถัดไป</button>`:''}</span></div>
   ${r.type==='CLOSE'?`<div class="banner info">รอบ CLOSE ที่ ${r.round} · ตรวจซ้ำเฉพาะ ${(r.scope||[]).length} จุดที่แก้ไข (อ้างอิงใบ CM OPEN ${esc(reqById(rootId(r)).no)}) · แบบจะแสดงเฉพาะหมุด DEFECT ของจุดที่แก้</div>`:''}
   <div class="tabs" role="tablist">${tabs.map(t=>`<button role="tab" data-tab="${t[0]}" aria-selected="${UI.tab===t[0]}">${t[1]}${t[2]!=null?`<span class="n ${t[3]||''}">${t[2]}${t[0]==='photos'?'/4':''}</span>`:''}</button>`).join('')}</div>
   <div id="tabbody">${UI.tab==='info'?tabInfo(r):UI.tab==='plans'?tabPlans(r):UI.tab==='photos'?tabPhotos(r):UI.tab==='defects'?tabDefects(r):tabPreview(r)}</div>`;
}
function afterReq(){if(UI.tab==='preview')drawPreview()}
function refreshTab(){const r=curReq();const el=$('#tabbody');if(!el)return;el.innerHTML=UI.tab==='info'?tabInfo(r):UI.tab==='plans'?tabPlans(r):UI.tab==='photos'?tabPhotos(r):UI.tab==='defects'?tabDefects(r):tabPreview(r);
  // refresh tab counters without full re-render
  $$('.tabs .n').forEach(n=>{const t=n.parentElement.dataset.tab;const v=t==='plans'?r.plans.length:t==='photos'?r.photos.length:t==='defects'?visibleDefects(r).length:null;if(v!=null){n.textContent=v+(t==='photos'?'/4':'');if(t==='photos')n.className='n '+(v>=4?'good':'bad')}});
  if(UI.tab==='preview')drawPreview();if(MODE.ro)lockUI()}

const RSYM={P:'✓',F:'✗',N:'N/A','':'·'};
function cell(r,id){return r.checklist[id]||(r.checklist[id]={})}
function tabInfo(r){
  const P=S.project;const isC=r.type==='CLOSE';
  let h=`<div class="panel"><h3>เลขที่และวันที่</h3><div class="grid">${inp('เลขที่ใบตรวจ (Request No.)','r:no')}${inp('หนังสือเล่มที่','r:bookNo')}${inp('วันที่ทำเอกสาร','r:date','date')}${inp('วันที่นัดตรวจ','r:planDate','date')}${inp('เวลานัดตรวจ','r:planTime','text','placeholder="10.30 AM."')}</div></div>
  <div class="panel"><h3>งานที่ส่งตรวจ <span class="chip ${isC?'close':'open'}">${isC?'CM CLOSE':'CM OPEN'}</span></h3><div class="grid g2">
   <label class="f">ชนิดงานที่ตรวจสอบ — ต่อท้าย “${isC?'CM CLOSE':'CM OPEN'}”<input type="text" data-b="r:workText" value="${esc(r.workText)}" placeholder="F8 BUILDING 1 FLOOR 01-11"></label>
   ${inp('งาน (ภาษาไทย)','r:workType')}${inp('Location / บริเวณที่ทำงาน','r:location','text','placeholder="BUILDING E"')}${inp('Reference Shop Drawing No.','r:refDwg')}</div>
   <div class="row" style="margin:12px 0 4px;gap:14px">${STRUCT.map(s=>`<label class="chk"><input type="checkbox" data-b="r:structure.${s[0]}" ${r.structure&&r.structure[s[0]]?'checked':''}> ${s[1]}</label>`).join('')}</div>
   <div class="grid" style="margin-top:10px">${inp('อาคาร','r:building')}${inp('ชั้น','r:floor')}${inp('ระดับ (Level)','r:level')}${inp('Concrete Strength','r:strength')}${inp('Slump','r:slump')}</div></div>`;
  h+=`<div class="panel"><h3>Checklist และผลการตรวจ <button class="btn sm" data-act="autoresult" style="margin-left:auto">สรุปผลจาก DEFECT</button></h3>
   <p class="hint">ติ๊กหัวข้อที่ส่งตรวจรอบนี้ (จะไฮไลต์ในใบ) แล้วแตะช่องผลเพื่อสลับ ✓ ผ่าน / ✗ ไม่ผ่าน / N/A. ${isC?'รอบ CLOSE ให้กรอกช่อง 2nd':'รอบ OPEN ให้กรอกช่อง 1st'}</p>
   <div class="tw"><table class="t"><thead><tr><th>ตรวจ</th><th>รายการ</th><th>1st</th><th>Date</th><th>2nd</th><th>Date</th><th>KMIT</th><th>Consult</th><th>หมายเหตุ</th></tr></thead><tbody>`;
  for(const g of P.checklist){
    h+=`<tr class="grp"><td colspan="9">${esc(g.label.split('\n')[0])}</td></tr>`;
    for(const it of g.items){const c=r.checklist[it.id]||{};
      const rb=(col)=>`<button class="rb ${c[col]==='P'?'p':c[col]==='F'?'f':'n'}" data-act="cyc" data-item="${it.id}" data-col="${col}">${RSYM[c[col]||'']}</button>`;
      h+=`<tr class="${c.sel?'sel':''}"><td><input type="checkbox" data-item="${it.id}" data-k="sel" ${c.sel?'checked':''} aria-label="ตรวจ"></td><td>${esc(it.en)}${it.th?`<div class="small muted">${esc(it.th)}</div>`:''}</td>
       <td>${rb('r1')}</td><td><input type="text" data-item="${it.id}" data-k="d1" value="${esc(c.d1||'')}" style="width:78px"></td>
       <td>${rb('r2')}</td><td><input type="text" data-item="${it.id}" data-k="d2" value="${esc(c.d2||'')}" style="width:78px"></td>
       <td>${rb('km')}</td><td>${rb('cs')}</td><td><input type="text" data-item="${it.id}" data-k="rm" value="${esc(c.rm||'')}" style="min-width:120px"></td></tr>`}}
  h+=`</tbody></table></div></div>
  <div class="panel"><h3>ผู้ลงนามและผลการตรวจ</h3><div class="grid">${inp('Requested by (ชื่อ)','r:requestedName')}<div class="grid" style="grid-template-columns:1fr">
   <span class="small muted">ผลการตรวจ (Inspected by)</span><div class="row">${[['approved','Approved'],['disapproved','Disapproved'],['other','Other'],['','ยังไม่ระบุ']].map(o=>`<label class="chk"><input type="radio" name="res" data-b="r:result" value="${o[0]}" ${r.result===o[0]?'checked':''}> ${o[1]}</label>`).join('')}</div></div>
   ${ta('Notes (หมายเหตุจาก CM)','r:notes',2)}</div></div>`;
  h+=`<div class="row"><button class="btn bad" data-act="delreq" data-id="${r.id}">${r.type==='OPEN'?'ลบใบนี้ (ลบทั้งชุดรวมรอบ CLOSE)':'ลบรอบ CLOSE นี้'}</button></div>`;
  return h;
}

/* --- plans --- */
function planPins(r,pl){return visibleDefects(r).filter(d=>d.loc&&d.loc.planKey===pl.key).map(d=>({id:d.id,label:pinLabel(d),x:d.loc.x,y:d.loc.y,st:pinStateFor(r,d)}))}
function tabPlans(r){
  let h=`<div class="row" style="margin-bottom:10px"><button class="btn pri" data-act="addplan">＋ เพิ่มแบบ (เลือกจากคลังหรืออัปโหลด)</button><span class="hint" style="margin:0">เปิดแบบเพื่อวาดโซนสีขอบเขตที่ส่งตรวจ และปักหมุดตำแหน่ง DEFECT</span></div>`;
  if(!r.plans.length)return h+`<div class="empty">ยังไม่มีแบบในใบนี้<br>อัปโหลดแบบผัง (รูปหรือ PDF) หรือวางรูป (Ctrl+V) ที่แคปมาจากแบบ แล้ววาดโซนสีบนแบบได้เลย</div>`;
  h+=`<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">`;
  for(const pl of r.plans){
    const legend=[...new Map((pl.shapes||[]).filter(s=>s.t==='poly'&&s.label).map(s=>[s.c+s.label,s])).values()];
    h+=`<div class="card"><div class="thumb" data-act="openplan" data-id="${pl.id}">${annotatedSvg(imgSrc(pl.imgId),pl.w,pl.h,pl.shapes,planPins(r,pl))}</div><div class="body">
     <input type="text" data-plan="${pl.id}" data-k="name" value="${esc(pl.name)}" aria-label="ชื่อแบบ">
     <div class="small muted">${legend.length?legend.map(s=>`<span class="dot" style="background:${s.c}"></span> ${esc(s.label)}`).join(' &nbsp; '):'ยังไม่มีโซนสี'}</div>
     <div class="row"><button class="btn pri sm" data-act="openplan" data-id="${pl.id}">ทำสี / ปักหมุด</button><button class="btn sm bad" data-act="delplan" data-id="${pl.id}">ลบ</button></div></div></div>`}
  return h+`</div>`;
}
async function importPlanFiles(files){
  const out=[];
  for(const f of files){try{
    if(f.type==='application/pdf'||/\.pdf$/i.test(f.name)){toast('กำลังอ่าน PDF…');const ims=await pdfToImages(f);ims.forEach(im=>out.push({...im,name:f.name.replace(/\.pdf$/i,'')+(im.pages>1?` (หน้า ${im.page})`:'')}))}
    else{const im=await fileToImage(f,2600,.88);out.push({...im,name:(f.name||'แบบ').replace(/\.[^.]+$/,'')})}
  }catch(e){toast('เปิดไฟล์ '+(f.name||'')+' ไม่ได้ — ถ้าเป็น PDF ลองแคปเป็นรูปแล้วอัปโหลด',4500)}}
  const libs=[];for(const im of out){const imgId=await putImage(im.url);const lib={id:'lb'+uid(),name:im.name,imgId,w:im.w,h:im.h};S.library.push(lib);libs.push(lib)}
  return libs;
}
function attachPlan(r,lib){const key='pk'+uid();r.plans.push({id:'pl'+uid(),key,libId:lib.id,name:lib.name,imgId:lib.imgId,w:lib.w,h:lib.h,shapes:[]});save()}
function planPicker(r){
  const o=overlay(`<div class="box wide"><div class="row" style="margin-bottom:10px"><h3 style="margin-right:auto">เพิ่มแบบเข้าใบตรวจ</h3><button class="btn" data-x="close">ปิด</button></div>
   <div class="row" style="margin-bottom:12px"><label class="btn pri" for="planfile">อัปโหลดแบบใหม่ (รูป / PDF)</label><input id="planfile" type="file" accept="image/*,application/pdf" multiple hidden><span class="hint" style="margin:0">แบบที่อัปโหลดจะเก็บไว้ในคลัง ใช้ซ้ำได้ทุกใบตรวจ</span></div>
   <div id="libgrid" class="cards"></div></div>`,'modal');
  const draw=()=>{$('#libgrid',o).innerHTML=S.library.length?S.library.map(l=>`<button class="pickrow" style="flex-direction:column;align-items:stretch" data-lib="${l.id}"><div style="aspect-ratio:4/3;background:var(--surface2);border-radius:6px;overflow:hidden">${annotatedSvg(imgSrc(l.imgId),l.w,l.h,[],[])}</div><b class="small">${esc(l.name)}</b></button>`).join(''):'<div class="empty">คลังแบบว่าง — อัปโหลดแบบแรกได้เลย</div>'};draw();
  o.addEventListener('click',e=>{if(e.target===o||e.target.closest('[data-x]')){o.remove();return}
    const b=e.target.closest('[data-lib]');if(b){const l=S.library.find(x=>x.id===b.dataset.lib);attachPlan(r,l);o.remove();refreshTab();toast('เพิ่มแบบแล้ว')}});
  o.addEventListener('change',async e=>{if(e.target.id==='planfile'){const libs=await importPlanFiles([...e.target.files]);if(libs.length){libs.forEach(l=>attachPlan(r,l));o.remove();refreshTab();save();toast('เพิ่มแบบ '+libs.length+' แผ่นแล้ว')}}});
}
function openPlan(r,pl,pinFor){
  const board=openBoard({kind:'plan',ro:MODE.ro,title:`${pl.name} · ${r.no}`,imgUrl:imgSrc(pl.imgId),w:pl.w,h:pl.h,shapes:pl.shapes,pinFor,
    onChange:save,pins:()=>planPins(r,pl),
    onPinMove:()=>save(),
    onPinClick:(id,redraw)=>{const d=defectById(id);if(d)editDefect(d,{req:r,canDelete:d.foundIn===r.id,after:(closed)=>{redraw();},pin:dd=>{board.close();openPlan(r,pl,dd)}})},
    onPinAdd:async(x,y,redraw)=>{
      if(pinFor){pinFor.loc={planKey:pl.key,x,y};save();pinFor=null;board.redraw();toast('ปักหมุดแล้ว');board.setTool('select');return}
      const un=visibleDefects(r).filter(d=>!d.loc);
      const o=overlay(`<div class="box"><h3 style="margin-bottom:10px">ปักหมุดที่จุดนี้</h3>${un.map(d=>`<button class="pickrow" data-d="${d.id}"><b class="mono">${esc(d.code)}</b><span class="small">${esc(d.area||'')} ${esc(d.type||'')}</span></button>`).join('')}<button class="pickrow" data-d="new" style="border-style:dashed"><b>＋ DEFECT ใหม่ที่จุดนี้</b></button><div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn" data-d="no">ยกเลิก</button></div></div>`,'modal');
      o.addEventListener('click',e=>{const b=e.target.closest('[data-d]');if(!b&&e.target!==o)return;o.remove();if(!b||b.dataset.d==='no')return;
        let d;if(b.dataset.d==='new'){d=newDefect(r,{planKey:pl.key,x,y})}else{d=defectById(b.dataset.d);d.loc={planKey:pl.key,x,y}}
        save();board.redraw();if(b.dataset.d==='new')editDefect(d,{req:r,canDelete:true,after:()=>board.redraw()})});
    },
    onClose:()=>{refreshTab()}});
  return board;
}

/* --- photos --- */
async function addPhotoFiles(r,files,defectId,stage){
  let n=0;for(const f of files){if(!f.type.startsWith('image/'))continue;try{const im=await fileToImage(f,1400,.8);const imgId=await putImage(im.url);r.photos.push({id:'ph'+uid(),imgId,w:im.w,h:im.h,caption:'',defectId:defectId||'',stage:stage||'',shapes:[]});n++}catch(e){toast('อ่านรูปไม่ได้: '+(f.name||''))}}
  if(n){save();refreshTab();toast(`เพิ่มรูป ${n} รูป`)}
}
function tabPhotos(r){
  const ds=visibleDefects(r);
  let h=`<div class="row" style="margin-bottom:10px"><label class="btn pri" for="photofile">＋ เพิ่มรูป / ถ่ายรูป</label><input id="photofile" type="file" accept="image/*" multiple hidden>
   <span class="chip ${r.photos.length>=4?'good':'bad'}">${r.photos.length>=4?`ครบ ${r.photos.length} รูป`:`ต้องมีอย่างน้อย 4 รูป (มี ${r.photos.length})`}</span><span class="hint" style="margin:0">วางรูปด้วย Ctrl+V ได้ · แตะรูปเพื่อวาดวงกลม ลูกศร หรือเขียนข้อความบนรูป${r.type==='CLOSE'?' · รอบ CLOSE: ถ่ายรูป “หลังแก้” ของแต่ละจุด':''}</span></div>`;
  if(!r.photos.length)return h+`<div class="empty">ยังไม่มีรูป เพิ่มรูปหน้างานเพื่อใช้แนบใบตรวจ</div>`;
  h+=`<div class="cards">`;
  r.photos.forEach((p,i)=>{
    h+=`<div class="card"><div class="thumb" data-act="openphoto" data-id="${p.id}">${annotatedSvg(imgSrc(p.imgId),p.w,p.h,p.shapes,[])}</div><div class="body">
     <div class="row"><b class="mono">รูปที่ ${i+1}</b><span style="margin-left:auto" class="row"><button class="btn sm" data-act="mvphoto" data-id="${p.id}" data-d="-1" ${i===0?'disabled':''} aria-label="เลื่อนขึ้น">←</button><button class="btn sm" data-act="mvphoto" data-id="${p.id}" data-d="1" ${i===r.photos.length-1?'disabled':''} aria-label="เลื่อนลง">→</button></span></div>
     <input type="text" data-photo="${p.id}" data-k="caption" value="${esc(p.caption)}" placeholder="คำอธิบาย / comment">
     <div class="grid" style="grid-template-columns:1fr 1fr;gap:6px"><select data-photo="${p.id}" data-k="defectId" aria-label="DEFECT"><option value="">ภาพรวม / ไม่ผูก DEFECT</option>${ds.map(d=>`<option value="${d.id}" ${d.id===p.defectId?'selected':''}>${esc(d.code)}</option>`).join('')}</select>
      <select data-photo="${p.id}" data-k="stage" aria-label="ช่วงเวลา"><option value="">ทั่วไป</option><option value="before" ${p.stage==='before'?'selected':''}>ก่อนแก้</option><option value="after" ${p.stage==='after'?'selected':''}>หลังแก้</option></select></div>
     <div class="row"><button class="btn pri sm" data-act="openphoto" data-id="${p.id}">เขียนบนรูป</button><button class="btn sm bad" data-act="delphoto" data-id="${p.id}">ลบ</button></div></div></div>`});
  return h+`</div>`;
}
function openPhoto(r,p){
  const i=r.photos.indexOf(p);
  openBoard({kind:'photo',ro:MODE.ro,title:`รูปที่ ${i+1}${p.caption?' · '+p.caption:''}`,imgUrl:imgSrc(p.imgId),w:p.w,h:p.h,shapes:p.shapes,onChange:save,onClose:()=>refreshTab()});
}

/* --- defects tab --- */
function tabDefects(r){
  const vis=visibleDefects(r);const isC=r.type==='CLOSE';const rid=rootId(r);
  let h='';
  if(isC){
    const cand=chainDefects(rid).filter(d=>{const st=defectStatus(d);return st!=='closed'||(r.scope||[]).includes(d.id)});
    h+=`<div class="panel"><h3>เลือกจุดที่ส่งตรวจรอบนี้ (${(r.scope||[]).length}/${cand.length})</h3><p class="hint">ใบรอบ CLOSE จะมีเฉพาะจุดที่เลือก ทั้งในแบบ รูป และตารางใบ DEFECT</p><div class="row" style="gap:14px">${cand.map(d=>`<label class="chk"><input type="checkbox" data-scope="${d.id}" ${(r.scope||[]).includes(d.id)?'checked':''}> <span class="mono">${esc(d.code)}</span> <span class="small muted">${esc(d.area||'')}</span></label>`).join('')||'<span class="muted">ไม่มี DEFECT ค้างแก้</span>'}</div></div>`}
  h+=`<div class="row" style="margin-bottom:10px"><button class="btn pri" data-act="adddef">＋ ${isC?'เพิ่ม DEFECT ใหม่ที่พบรอบนี้':'เพิ่ม DEFECT'}</button><span class="hint" style="margin:0">${isC?'บันทึกผลตรวจซ้ำของแต่ละจุดด้านล่าง':'ระบุเลขที่ DEFECT พร้อมตำแหน่งกระเบื้อง ใช้เป็นขอบเขตส่งรอบ CLOSE'}</span></div>`;
  if(!vis.length)return h+`<div class="empty">ยังไม่มี DEFECT ในใบนี้</div>`;
  for(const d of vis){
    const st=defectStatus(d);const res=(r.res&&r.res[d.id])||{};
    h+=`<div class="dcard"><div><div class="code">${esc(d.code)}</div>${chip(STATUS_TXT[st],STATUS_CLS[st])}</div>
      <div style="min-width:0"><div><b>${esc(d.area||'ยังไม่ระบุพื้นที่')}</b> <span class="muted">${esc(d.surface||'')} ${esc(d.face||'')}</span></div>
       <div>${esc(d.type||'ยังไม่ระบุประเภท')}${d.desc?` — ${esc(d.desc)}`:''}</div>
       <div class="small muted">${d.grid&&d.grid.cells&&d.grid.cells.length?esc(gridText(d.grid)):'ไม่มีผังกระเบื้อง'}</div>
       ${d.fix?`<div class="small">วิธีแก้: ${esc(d.fix)}</div>`:''}
       <div class="row" style="margin-top:6px">${d.loc?'<span class="chip good">มีหมุดบนแบบ</span>':`<button class="btn sm" data-act="pindef" data-id="${d.id}">ปักหมุดบนแบบ</button>`}<button class="btn sm" data-act="editdef" data-id="${d.id}">แก้ไข</button></div>
       ${isC&&(r.scope||[]).includes(d.id)?`<div class="row" style="margin-top:8px"><span class="small muted">ผลตรวจรอบนี้:</span>${[['pass','ผ่าน','good'],['fail','ไม่ผ่าน','bad'],['','ยังไม่ตรวจ','']].map(o=>`<button class="btn sm ${res.r===o[0]||(!res.r&&o[0]==='')?'pri':''}" data-act="setres" data-id="${d.id}" data-v="${o[0]}">${o[1]}</button>`).join('')}<input type="text" data-res="${d.id}" placeholder="หมายเหตุ" value="${esc(res.note||'')}" style="width:200px"></div>`:''}
      </div>
      <div>${d.grid&&d.grid.cols?`<div class="gsv">${gridSvg(d.grid)}</div>`:''}</div></div>`}
  return h;
}

/* --- preview tab --- */
function tabPreview(r){
  const warn=[];
  if(r.photos.length<4)warn.push(`รูปตรวจยังไม่ครบ 4 รูป (มี ${r.photos.length})`);
  if(!r.plans.length)warn.push('ยังไม่ได้แนบแบบที่ระบุสี/ขอบเขต');
  else if(!r.plans.some(p=>(p.shapes||[]).some(s=>s.t==='poly'&&!s.ref)))warn.push('ยังไม่ได้วาดโซนสีขอบเขตบนแบบ');
  const vis=visibleDefects(r);const nop=vis.filter(d=>!d.loc).length;if(nop)warn.push(`DEFECT ${nop} จุดยังไม่ปักหมุดบนแบบ`);
  if(r.type==='CLOSE'&&!(r.scope||[]).length)warn.push('ยังไม่ได้เลือก DEFECT ที่ส่งตรวจรอบนี้');
  if(r.type==='CLOSE'&&!r.photos.some(p=>p.stage==='after'))warn.push('ไม่มีรูป “หลังแก้” ของจุดที่แก้');
  return`${warn.length?`<div class="banner"><b>ตรวจก่อนส่ง:</b><ul style="margin:4px 0 0;padding-left:20px">${warn.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></div>`:`<div class="banner info">เอกสารครบตามเกณฑ์ พร้อมส่งตรวจ</div>`}
   <div class="row" style="margin-bottom:12px"><button class="btn pri" data-act="pdf">ดาวน์โหลด PDF (ส่งตรวจ)</button><button class="btn" data-act="html">ดาวน์โหลดไฟล์ HTML (พิมพ์ด้วยเบราว์เซอร์)</button><span class="hint" style="margin:0" id="pvinfo"></span></div>
   <div class="pv" id="pv"></div>`;
}
let pvReport=null;
function drawPreview(){
  const r=curReq();const pv=$('#pv');if(!pv)return;
  pvReport=buildReport(r);
  const avail=Math.max(260,pv.clientWidth-16);
  pv.innerHTML=pvReport.pages.map(p=>{const W=p.land?1123:794,H=p.land?794:1123;const sc=Math.min(avail,p.land?1040:794)/W;
    return`<div class="sbox" style="width:${W*sc}px;height:${H*sc}px"><div class="sheet ${p.land?'land':''}" style="transform:scale(${sc})">${p.html}</div></div>`}).join('');
  $('#pvinfo')&&($('#pvinfo').textContent=`${pvReport.pages.length} หน้า A4${pvReport.pages.some(p=>p.land)?' (แบบเป็นแนวนอน)':''}`);
}

/* ========= settings ========= */
function viewSettings(){
  const P=S.project;
  const cl=P.checklist.map(g=>`<div class="panel" style="margin:0 0 10px"><label class="f">หัวข้อกลุ่ม (ขึ้นบรรทัดใหม่ได้)<textarea data-cg="${g.id}" data-k="label" rows="2">${esc(g.label)}</textarea></label><label class="f" style="margin-top:8px">รายการ (บรรทัดละ 1 รายการ รูปแบบ  English | ไทย)<textarea data-cg="${g.id}" data-k="items" rows="8" style="font-family:var(--f-mono);font-size:13px">${esc(g.items.map(i=>i.en+(i.th?' | '+i.th:'')).join('\n'))}</textarea></label></div>`).join('');
  return`<h1 style="font-size:22px;margin-bottom:14px">ตั้งค่า / สำรองข้อมูล</h1>
  <div class="panel"><h3>โครงการและบริษัท (ขึ้นหัวเอกสารทุกใบ)</h3><div class="grid g2">${inp('ชื่อโครงการ (PROJECT)','p:name')}${inp('LOCATE','p:locate')}${inp('ชื่อบริษัท','p:company.name')}${inp('ที่อยู่ บรรทัด 1','p:company.addr1')}${inp('ที่อยู่ บรรทัด 2','p:company.addr2')}${inp('Owner','p:owner')}${inp('Contractor','p:contractor')}${inp('CM (ช่องผู้ตรวจ)','p:cmName')}</div></div>
  <div class="panel"><h3>เลขที่ใบตรวจ</h3><div class="grid">${inp('คำนำหน้า','p:prefix')}<label class="f">เลขถัดไป<input type="number" data-b="p:nextNo" value="${P.nextNo}"></label>${inp('งานเริ่มต้น','p:workType')}</div><p class="hint" style="margin-top:8px">ตัวอย่างเลขถัดไป: <b class="mono">${esc(P.prefix)}${P.nextNo}</b> ใบ CLOSE ใช้เลขใหม่ต่อจากเลขล่าสุด แก้เลขในใบแต่ละใบได้</p></div>
  <div class="panel"><h3>ผู้ลงนาม</h3><div class="grid">${inp('Requested by (ชื่อ)','p:requestedName')}${inp('ตำแหน่ง/แผนก','p:requestedRole')}${inp('Site Engineer','p:engName')}${inp('ตำแหน่ง','p:engRole')}${inp('CC (ชื่อ)','p:ccName')}${inp('ตำแหน่ง','p:ccRole')}</div>
   <div class="row" style="margin-top:14px;gap:22px"><div class="row"><div style="width:90px;height:60px;background:#fff;border:1px solid var(--line);border-radius:6px;display:flex;align-items:center;justify-content:center"><img src="${imgSrc(P.logoId)||''}" style="max-height:56px" alt=""></div><label class="btn" for="logofile">เปลี่ยนโลโก้</label><input id="logofile" type="file" accept="image/*" hidden></div>
   <div class="row"><div style="width:120px;height:60px;background:#fff;border:1px solid var(--line);border-radius:6px;display:flex;align-items:center;justify-content:center"><img src="${imgSrc(P.sigId)||''}" style="max-height:56px;max-width:116px" alt=""></div><label class="btn" for="sigfile">เปลี่ยนลายเซ็นของ CC</label><input id="sigfile" type="file" accept="image/*" hidden><button class="btn sm" data-act="nosig">ไม่ใช้ลายเซ็น</button></div></div></div>
  <div class="panel"><h3>รายการตรวจ (Checklist)</h3><p class="hint">แก้ชื่อ เพิ่ม หรือลบรายการได้ ผลที่กรอกไว้ในใบเดิมไม่หาย (ผูกกับรายการที่ชื่อ English ตรงกัน)</p>${cl}</div>
  <div class="panel"><h3>รายการเลือก DEFECT</h3><div class="grid g2"><label class="f">ประเภท DEFECT (บรรทัดละ 1)<textarea data-list="defectTypes" rows="10">${esc(P.defectTypes.join('\n'))}</textarea></label><label class="f">วิธีแก้เฉพาะจุด (บรรทัดละ 1)<textarea data-list="fixMethods" rows="10">${esc(P.fixMethods.join('\n'))}</textarea></label></div></div>
  <div class="panel"><h3>คลังแบบ (${S.library.length})</h3>${S.library.length?`<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${S.library.map(l=>`<div class="card"><div class="thumb" style="cursor:default">${annotatedSvg(imgSrc(l.imgId),l.w,l.h,[],[])}</div><div class="body"><input type="text" data-lib="${l.id}" value="${esc(l.name)}" aria-label="ชื่อแบบ"><button class="btn sm bad" data-act="dellib" data-id="${l.id}">ลบออกจากคลัง</button></div></div>`).join('')}</div>`:'<div class="empty small">ยังไม่มีแบบในคลัง เพิ่มจากหน้า “แบบ / ขอบเขต” ในใบตรวจ</div>'}</div>
  <div class="panel"><h3>สำรองและกู้ข้อมูล</h3><div class="hint" id="usage"></div><p class="hint">ข้อมูลทั้งหมดเก็บในเบราว์เซอร์เครื่องนี้ ควรกดสำรองเป็นไฟล์เป็นระยะ โดยเฉพาะก่อนล้างข้อมูลเบราว์เซอร์หรือเปลี่ยนเครื่อง</p>
   <div class="row"><button class="btn pri" data-act="backup">สำรองข้อมูลทั้งหมด (.json)</button><label class="btn" for="restorefile">กู้ข้อมูลจากไฟล์</label><input id="restorefile" type="file" accept=".json,application/json" hidden><button class="btn bad" data-act="wipe" style="margin-left:auto">ล้างข้อมูลทั้งหมด</button></div></div>`;
}
function parseGroup(g,text){
  const old=new Map(g.items.map(i=>[i.en,i]));
  return text.split('\n').map(l=>l.trim()).filter(Boolean).map((l,k)=>{const[en,th]=l.split('|').map(x=>x.trim());const o=old.get(en);return o?{id:o.id,en,th:th||''}:{id:g.id+'n'+uid(),en,th:th||''}});
}
