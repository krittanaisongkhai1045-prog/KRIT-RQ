/* ========= app state / routing ========= */
const UI={route:'list',reqId:null,tab:'info',q:'',dfilter:'open'};
const curReq=()=>reqById(UI.reqId);
const getPath=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
function setPath(o,p,v){const ks=p.split('.');let t=o;for(let i=0;i<ks.length-1;i++){if(t[ks[i]]==null)t[ks[i]]={};t=t[ks[i]]}t[ks[ks.length-1]]=v}
const nsObj=ns=>ns==='r'?curReq():ns==='p'?S.project:null;
function inp(label,b,type='text',extra=''){const[ns,path]=b.split(':');const v=getPath(nsObj(ns),path);return`<label class="f">${label}<input type="${type}" data-b="${b}" value="${esc(v)}" ${extra}></label>`}
function ta(label,b,rows=3){const[ns,path]=b.split(':');return`<label class="f">${label}<textarea data-b="${b}" rows="${rows}">${esc(getPath(nsObj(ns),path))}</textarea></label>`}
const DEF_KINDS=[{id:'CM OPEN',label:'CM OPEN',role:'open'},{id:'CM CLOSE',label:'CM CLOSE',role:'close'}];
const kindsOf=()=>(S.project.kinds&&S.project.kinds.length?S.project.kinds:DEF_KINDS);
const kindLabel=r=>r.kindLabel||(r.type==='OPEN'?'CM OPEN':'CM CLOSE');
function parseKinds(text){
  const out=[];text.split('\n').forEach(l=>{const[a,b]=l.split('|').map(x=>x.trim());if(!a)return;out.push({id:a,label:a,role:/close|ปิด|ซ้ำ/i.test(b||'')?'close':'open'})});
  if(!out.some(k=>k.role==='open'))out.unshift(DEF_KINDS[0]);if(!out.some(k=>k.role==='close'))out.push(DEF_KINDS[1]);return out;
}
function pickKind(role,cb){
  const ks=kindsOf().filter(k=>k.role===role);
  if(ks.length<=1)return cb(ks[0]||DEF_KINDS.find(k=>k.role===role));
  const o=overlay(`<div class="box"><h3 style="margin-bottom:10px">${role==='open'?'เลือกประเภทการส่งตรวจ':'เลือกประเภทการส่งซ้ำ'}</h3>${ks.map(k=>`<button class="pickrow" data-k="${esc(k.id)}"><b>${esc(k.label)}</b></button>`).join('')}<div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn" data-k="">ยกเลิก</button></div></div>`,'modal');
  o.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b&&e.target!==o)return;o.remove();if(b&&b.dataset.k)cb(ks.find(k=>k.id===b.dataset.k))});
}
function go(route,id,tab){if(route!==UI.route){UI.siteFile=null;UI.siteEdit=null}UI.route=route;if(id!==undefined)UI.reqId=id;if(tab)UI.tab=tab;render();window.scrollTo(0,0)}

function lockUI(){$$('#main input,#main select,#main textarea').forEach(el=>{if(!['q','dq','dfilter','dgroup','dview','grp','qf','qg','qq'].includes(el.id))el.disabled=true})}
const TABIC={
 list:'<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4.5h6M8.5 12.5l2.2 2.2 4.3-4.6"/></svg>',
 defects:'<svg viewBox="0 0 24 24"><path d="M12 3.5l9 16H3z"/><path d="M12 10v4.5M12 17.4v.1"/></svg>',
 claim:'<svg viewBox="0 0 24 24"><path d="M7 3.500h8l4 4v13H7z"/><path d="M15 3.500v4h4M10 12h6M10 16h6"/></svg>',
 access:'<svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="10" height="17" rx="1.5"/><path d="M15 6l4 1.500v11L15 20.500"/><circle cx="12" cy="12" r=".9"/></svg>',
 qc:'<svg viewBox="0 0 24 24"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.3-2h6l1.3 2h1.2A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.4"/></svg>',
 site:'<svg viewBox="0 0 24 24"><path d="M3.5 7.5L9 5l6 2.5L20.5 5v11.5L15 19l-6-2.5-5.500 2.500z"/><path d="M9 5v11.500M15 7.500V19"/></svg>',
 settings:'<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/></svg>'};
function render(){
  document.body.classList.toggle('ro',MODE.ro);
  const modeChip=MODE.kind!=='cloud'?'':!MODE.uid?'<span class="chip warn">ดูอย่างเดียว · ยังไม่ได้เข้าสู่ระบบ</span>':`<span class="chip good" title="${esc(MODE.email)}">${MODE.admin?'แอดมิน':'สมาชิก'} · ${esc(MODE.email)}</span>`;
  $('#top').innerHTML=`<div class="brand"><b>Inspection Desk</b><span>${esc(S.project.name)}</span></div>
   <nav class="nav">${[['list','รายการส่งตรวจ','ส่งตรวจ'],['defects','DEFECT ตามใบตรวจ','DEFECT'],['qc','QC Before/After','QC'],['access','ขอเข้าห้อง','ขอเข้าห้อง'],['claim','งานเคลม','เคลม'],['site','แบบหน้างาน','แบบ'],['settings',MODE.ro?'ข้อมูลโครงการ':'ตั้งค่า / สำรองข้อมูล','ตั้งค่า']].map(n=>`<button data-go="${n[0]}" aria-label="${n[1]}" aria-current="${UI.route===n[0]||(n[0]==='list'&&UI.route==='req')}"><i class="ic">${TABIC[n[0]]}</i><span class="lb l">${n[1]}</span><span class="lb s">${n[2]}</span></button>`).join('')}</nav>
   ${MODE.kind==='cloud'&&MODE.uid?`<button class="btn sm ${MODE.siteMode?'pri':''}" data-act="sitemode">${MODE.siteMode?'● โหมดหน้างาน':'เข้าหน้างาน'}</button>`:''}${modeChip}${MODE.loginUi?(MODE.uid?`<button class="btn sm" data-act="logout" title="${esc(MODE.email)}">ออกจากระบบ</button>`:`<button class="btn sm pri" data-act="login">เข้าสู่ระบบ</button>`):''}<span class="small muted" id="savestate">${MODE.kind==='cloud'&&!MODE.uid?'':memOnly?'ไม่มีพื้นที่เก็บถาวร':MODE.kind==='cloud'?'':'บันทึกในเครื่องแล้ว'}</span>`;
  const m=$('#main');
  if(UI.route==='list')m.innerHTML=viewList();
  else if(UI.route==='defects')m.innerHTML=viewDefects();
  else if(UI.route==='qc')m.innerHTML=viewQC();
  else if(UI.route==='access')m.innerHTML=viewAccess();
  else if(UI.route==='claim')m.innerHTML=viewClaim();
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
  let h=`<div class="chain"><div class="chainhead">${chip(cs.t,cs.k)}<span class="muted">${esc(root.workType)} · ${esc(root.location)}</span><span style="margin-left:auto" class="row">${can?`<button class="btn sm pri" data-act="newclose" data-id="${root.id}">＋ สร้างรอบส่งซ้ำ (${cs.open} จุด)</button>`:''}<button class="btn sm" data-act="delchain" data-id="${root.id}">ลบชุดนี้</button></span></div>`;
  for(const r of reqs){
    const vis=visibleDefects(r).length;
    h+=`<div class="crow ${r.type==='CLOSE'?'sub':''}" data-act="openreq" data-id="${r.id}"><div><div class="no">${esc(r.no)}</div>${chip(r.type==='OPEN'?kindLabel(r):kindLabel(r)+' รอบ '+r.round,r.type==='OPEN'?'open':'close')}</div><div class="ttl"><div>${esc(r.workText||'—')}</div><div class="small muted">${fmtDate(r.date)} · ${esc(r.location)} · รูป ${r.photos.length} · ${r.type==='CLOSE'?`ตรวจซ้ำ ${(r.scope||[]).length} จุด`:`พบ DEFECT ${vis} จุด`}</div></div><div class="row">${r.sent?chip('ส่งแล้ว','warn'):chip('ร่าง')}${r.result==='approved'?chip('Approved','good'):r.result==='disapproved'?chip('Disapproved','bad'):r.result==='other'?chip('Other'):''}</div></div>`}
  return h+`</div>`;
}
function groupKeys(root,g){
  const b=root.building?('อาคาร '+root.building):(root.location||'ไม่ระบุอาคาร');const w=root.workType||'ไม่ระบุงาน';
  return g==='building'?[b]:g==='work'?[w]:g==='both'?[b,w]:[];
}
/* หน้าแรกแบบแอปมือถือ (แสดงเฉพาะจอเล็ก): ทักทาย + การ์ดสรุป DEFECT + ทางลัด */
function mhome(roots,all){
  const total=all.length,open=all.filter(x=>x==='open').length,sub=all.filter(x=>x==='submitted').length,closed=all.filter(x=>x==='closed').length;
  const pct=total?Math.round(closed/total*100):0,C=2*Math.PI*34,off=C*(1-pct/100);
  const who=(MODE.email||'').split('@')[0]||'ผู้ใช้งาน';
  const qa=(ic,t,attr)=>`<button class="mh-qa" ${attr}><i class="ic">${ic}</i><span>${t}</span></button>`;
  return`<div class="mhome">
   <div class="mh-top"><div class="mh-av">${esc(who.charAt(0).toUpperCase())}</div><div class="mh-who"><small>โครงการ</small><b>${esc(S.project.name||'')}</b></div><button class="mh-bell" data-go="settings" aria-label="ตั้งค่า">${TABIC.settings}</button></div>
   <div class="mh-hero"><div class="mh-hl"><span>DEFECT ค้างแก้</span><b>${open}</b><small>จาก ${total} จุด · ${roots.length} ชุดงานส่งตรวจ${sub?` · รอผล ${sub}`:''}</small><button class="mh-cta" data-go="defects">ดูรายการ DEFECT</button></div>
    <svg class="mh-ring" viewBox="0 0 84 84"><circle cx="42" cy="42" r="34" class="bg"/><circle cx="42" cy="42" r="34" class="fg" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 42 42)"/><text x="42" y="40" text-anchor="middle" class="n">${pct}%</text><text x="42" y="55" text-anchor="middle" class="t">ปิดแล้ว</text></svg></div>
   <div class="mh-qas">${canCreate()?qa('<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>','ส่งตรวจใหม่','data-act="newopen"'):''}${qa(TABIC.qc,'ถ่าย QC','data-go="qc"')}${qa(TABIC.site,'แบบหน้างาน','data-go="site"')}${qa(TABIC.defects,'DEFECT','data-go="defects"')}</div>
   <h2 class="mh-sec">ชุดงานส่งตรวจ</h2></div>`}
function viewList(){
  const roots=S.requests.filter(r=>r.type==='OPEN').sort((a,b)=>b.num-a.num);
  const q=UI.q.trim().toLowerCase();const g=UI.grp||'building';
  const match=r=>!q||[r.no,r.workText,r.workType,r.location,r.building].join(' ').toLowerCase().includes(q);
  const all=S.defects.filter(d=>!d.qc).map(defectStatus);
  const stats=`<div class="stats"><div><b>${roots.length}</b><span>ชุดงานส่งตรวจ</span></div><div><b style="color:var(--bad)">${all.filter(s=>s==='open').length}</b><span>DEFECT ต้องแก้</span></div><div><b style="color:var(--warn)">${all.filter(s=>s==='submitted').length}</b><span>ส่ง CLOSE แล้ว รอผล</span></div><div><b style="color:var(--good)">${all.filter(s=>s==='closed').length}</b><span>ปิดแล้ว</span></div></div>`;
  let h=mhome(roots,all)+`<div class="row" style="margin-bottom:6px"><h1 style="font-size:22px;margin-right:auto" class="mh-hide">รายการส่งตรวจ</h1><label class="row small muted" style="gap:6px">จัดกลุ่มตาม<select id="grp" style="width:auto;color:var(--fg)">${[['building','อาคาร'],['work','ชนิดงาน'],['both','อาคาร › ชนิดงาน'],['none','ไม่จัดกลุ่ม']].map(o=>`<option value="${o[0]}" ${o[0]===g?'selected':''}>${o[1]}</option>`).join('')}</select></label><input type="search" id="q" placeholder="ค้นหาเลขที่ / อาคาร / งาน" value="${esc(UI.q)}" style="width:220px">${canCreate()?'<button class="btn pri" data-act="newopen">＋ ส่งตรวจใหม่</button>':''}</div>${stats}`;
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
function newOpen(num0,kind){
  const p=S.project;const last=[...S.requests].sort((a,b)=>b.created-a.created)[0];
  const num=num0!=null?num0:p.nextNo++;const id='rq'+uid();
  const r={id,rootId:id,type:'OPEN',round:0,num,no:p.prefix+num,date:todayISO(),planDate:todayISO(),planTime:'',bookNo:'',
    workText:last?last.workText:'',workType:last?last.workType:p.workType,location:last?last.location:'',building:last?last.building:'',floor:'',level:'',strength:'',slump:'',refDwg:'',
    kindLabel:kind?kind.label:'CM OPEN',cover:null,structure:{other:true},checklist:{},plans:[],photos:[],scope:[],res:{},result:'',notes:'',sent:false,requestedName:p.requestedName,created:Date.now()};
  S.requests.push(r);save();return r;
}
function makeClose(rid,num0,kind){
  const reqs=chainReqs(rid);const base=reqs[0],prev=reqs[reqs.length-1];const p=S.project;
  const open=chainDefects(rid).filter(d=>defectStatus(d)!=='closed');
  const round=reqs.filter(x=>x.type==='CLOSE').length+1;const num=num0!=null?num0:p.nextNo++;const id='rq'+uid();
  const items=new Set(open.map(d=>d.item).filter(Boolean));
  const cl=clone(prev.checklist||{});if(open.length)for(const k of Object.keys(cl))cl[k].sel=items.has(k);
  items.forEach(k=>{cl[k]=cl[k]||{};cl[k].sel=true});
  const r={id,rootId:rid,parentId:prev.id,type:'CLOSE',round,num,no:p.prefix+num,date:todayISO(),planDate:todayISO(),planTime:'',bookNo:'',
    workText:base.workText,workType:base.workType,location:base.location,building:base.building,floor:base.floor,level:base.level,strength:'',slump:'',refDwg:base.refDwg,
    kindLabel:kind?kind.label:'CM CLOSE',cover:prev.cover?{...clone(prev.cover)}:null,structure:clone(base.structure||{}),checklist:cl,
    plans:(prev.plans||[]).map(pl=>({...clone(pl),id:'pl'+uid(),shapes:(pl.shapes||[]).map(s=>s.t==='poly'?{...clone(s),ref:true}:clone(s))})),
    photos:[],scope:open.map(d=>d.id),res:{},result:'',notes:'',sent:false,requestedName:base.requestedName,created:Date.now()};
  S.requests.push(r);save();return r;
}

/* ========= defects overview ========= */
function viewDefects(){
  const f=UI.dfilter;const q=(UI.dq||'').toLowerCase();
  let ds=S.defects.filter(d=>!d.qc).map(d=>({d,st:defectStatus(d)})).filter(x=>(f==='all'||(f==='open'?x.st!=='closed':f==='need'?x.st==='open':x.st===f))&&(!q||[x.d.code,x.d.area,x.d.type,x.d.desc].join(' ').toLowerCase().includes(q)));
  
  let h=`<div class="row" style="margin-bottom:12px"><h1 style="font-size:22px;margin-right:auto">DEFECT ตามใบตรวจ</h1>
   <select id="dfilter" style="width:auto">${[['open','ค้างแก้ / รอผล'],['need','ต้องแก้ไข'],['submitted','รอผลตรวจซ้ำ'],['closed','ปิดแล้ว'],['all','ทั้งหมด']].map(o=>`<option value="${o[0]}" ${o[0]===f?'selected':''}>${o[1]}</option>`).join('')}</select>
   <select id="dview" style="width:auto" aria-label="มุมมอง"><option value="list" ${UI.dview!=='table'?'selected':''}>มุมมอง: รายการ</option><option value="table" ${UI.dview==='table'?'selected':''}>มุมมอง: ตาราง DEFECTS LIST</option></select>${UI.dview==='table'?'<button class="btn" data-act="dfpdf">PDF ตาราง</button>':''}<select id="dgroup" style="width:auto" aria-label="จัดกลุ่ม">${[['room','จัดกลุ่ม: ห้อง / พื้นที่'],['item','จัดกลุ่ม: หมวดงาน']].map(o=>`<option value="${o[0]}" ${(UI.dgroup||'room')===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select><input type="search" id="dq" placeholder="ค้นหารหัส / ห้อง / ประเภท" value="${esc(UI.dq||'')}" style="width:220px"></div>`;
  if(!ds.length)return h+`<div class="empty">ไม่มี DEFECT ในมุมมองนี้</div>`;
  if(UI.dview==='table'){const list=dfTableList(ds.map(x=>x.d)).sort((a,b)=>String(a.code).localeCompare(String(b.code),undefined,{numeric:true}));return h+qcTableView(list,'editdef')}
  h+=`<div class="tw"><table class="t"><thead><tr><th>รหัส</th><th>สถานะ</th><th>ห้อง / ตำแหน่ง</th><th>ประเภท</th><th>ตำแหน่งกระเบื้อง</th><th>วิธีแก้เฉพาะจุด</th><th>พบใน</th></tr></thead><tbody>`;
  const stOf=new Map(ds.map(x=>[x.d.id,x.st]));const mode=UI.dgroup||'room';
  for(const gp of groupRooms(ds.map(x=>x.d),mode)){
    const tiles=gp.list.reduce((n,y)=>n+zoneCount(y),0);h+=`<tr class="rmtr"><td colspan="7"><b>${esc(gp.room)}</b> <span class="small muted">${gp.list.length} รายการ${tiles?` · โซนรวม ${tiles} แผ่น`:''}</span></td></tr>`;
  for(const d of gp.list){const x={d,st:stOf.get(d.id)};const fr=reqById(d.foundIn);
    h+=`<tr style="cursor:pointer" data-act="editdef" data-id="${d.id}"><td class="mono"><b>${esc(d.code)}</b>${d.zone?' <span class="chip warn">โซน</span>':''}</td><td>${chip(STATUS_TXT[x.st],STATUS_CLS[x.st])}</td><td>${esc(d.area)} ${esc(d.surface||'')} ${esc(d.face||'')}</td><td>${esc(d.type)}${d.zone?` · ${zoneCount(d)} แผ่น`:''}</td><td class="small">${esc(gridText(d.grid))||'<span class="muted">—</span>'}</td><td class="small">${esc(d.fix)}</td><td class="small mono">${fr?esc(fr.no):''}</td></tr>`}}
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
     <label class="f">ห้อง / พื้นที่ (ใช้จัดหมวดรายการ DEFECT)<input type="text" data-b="area" list="roomlist" placeholder="เช่น ห้อง 101 / ห้องน้ำ 102" value="${esc(d.area)}"></label><datalist id="roomlist">${[...new Set(S.defects.map(x=>(x.area||'').trim()).filter(Boolean))].sort(natCmp).map(a=>`<option value="${esc(a)}">`).join('')}</datalist>
     <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">พื้นผิว<select data-b="surface"><option value="">—</option>${opt(SURFACES,d.surface)}</select></label><label class="f">ด้าน / แนว (A,B,C,D)<input type="text" data-b="face" value="${esc(d.face||'')}"></label></div>
     <label class="f">ประเภท DEFECT<select data-b="type"><option value="">—</option>${opt(P.defectTypes,d.type)}</select></label>
     <label class="f">กำหนดแก้ไขเสร็จ<input type="date" data-b="due" value="${esc(d.due||'')}"></label>
     ${ctx.qc?'':pfSelect('data-b',d)}
   </div>
   <label class="chk" style="margin-top:12px"><input type="checkbox" data-bz="zone" ${d.zone?'checked':''}> <b>DEFECT แบบโซน</b> <span class="small muted">— รวมหลายแผ่นในพื้นที่เดียวกัน (เช่น กระเบื้องพื้นทั้งห้อง 50 แผ่น) เป็นรายการเดียว</span></label>
   <div id="zbox" class="grid g2" style="margin-top:8px" ${d.zone?'':'hidden'}><label class="f">จำนวนแผ่นที่ต้องแก้ (เว้นว่าง = นับจากช่องที่เลือกในผัง)<input type="number" min="0" data-b="count" value="${esc(d.count||'')}"></label>
     <label class="f">ขอบเขตโซน<input type="text" data-b="zoneNote" placeholder="เช่น พื้นทั้งห้อง ยกเว้นแถวชิดผนัง A" value="${esc(d.zoneNote||'')}"></label></div>
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
   <div id="gtools" class="row small" style="gap:6px;margin-bottom:6px" hidden><button class="btn sm" data-x="gall">เลือกทั้งผัง</button><button class="btn sm" data-x="gnone">ล้างที่เลือก</button><button class="btn sm" data-x="ginv">กลับค่า</button>
     <span class="muted">เลือกช่วง:</span>แถว<input type="number" min="1" id="gr0" style="width:54px">–<input type="number" min="1" id="gr1" style="width:54px"> คอลัมน์<input type="number" min="1" id="gc0" style="width:54px">–<input type="number" min="1" id="gc1" style="width:54px"><button class="btn sm" data-x="grange">เพิ่มช่วงนี้</button><span class="muted">· ลากนิ้ว/เมาส์บนผังเพื่อระบายหลายช่อง</span></div>
   <div id="gbox"></div>
   <div class="grid g2" style="margin-top:14px">
     <label class="f">วิธีแก้เฉพาะจุด<select data-b="fix"><option value="">—</option>${opt(P.fixMethods,d.fix)}</select></label>
     <label class="f">ข้อควรระวัง / แผ่นข้างเคียงที่ห้ามกระทบ<textarea data-b="protect" rows="2">${esc(d.protect||'')}</textarea></label>
   </div>
   <div id="dpsec"><h3 style="margin:16px 0 4px;font-size:15px">รูปของ DEFECT นี้ <span class="small muted" id="dpdoc" style="font-weight:400"></span></h3><div id="dpbox"></div></div>
   <div class="row" style="margin-top:16px">
     ${ctx.next?`<button class="btn pri" data-x="next">✓ บันทึก + ถ่าย DEFECT ถัดไป</button>`:''}
     ${ctx.req?`<button class="btn" data-x="copy">⧉ คัดลอก DEFECT นี้</button>`:''}
     ${ctx.req?`<button class="btn" data-x="pin">${d.loc?'ย้ายหมุดบนแบบ':'ปักหมุดบนแบบ'}</button>`:''}
     ${d.loc?`<span class="chip good">มีหมุดบนแบบแล้ว</span>`:`<span class="chip warn">ยังไม่ปักหมุด</span>`}
     ${ctx.canDelete?`<button class="btn bad" style="margin-left:auto" data-x="del">ลบ DEFECT</button>`:''}
   </div></div>`,'modal');
  const RO=MODE.ro||!canEditDefect(d);o.dataset.ro=RO?'1':'0';
  if(RO){$$('input,select,textarea',o).forEach(x=>x.disabled=true);$$('[data-x=mkgrid],[data-x=pin],[data-x=del],[data-x=next],[data-x=copy]',o).forEach(x=>x.remove())}
  const gbox=$('#gbox',o);
  /* ถ่าย/แนบรูป DEFECT ได้ทันทีตอนตรวจหน้างาน (ก่อนแก้ / หลังแก้) */
  const R=ctx.qc?null:(ctx.req||[...chainReqs(d.rootId)].reverse().find(q=>visibleDefects(q).some(x=>x.id===d.id))||reqById(d.foundIn));
  let dpStage=(R&&R.type==='CLOSE'&&R.photos.some(p=>p.defectId===d.id&&p.stage==='before'))?'after':'before';
  const dpPh=()=>R?R.photos.filter(p=>p.defectId===d.id):[];
  function drawDP(){
    if(!R){$('#dpsec',o).hidden=true;return}
    $('#dpdoc',o).textContent='· บันทึกในใบ '+R.no;const ps=dpPh();
    $('#dpbox',o).innerHTML=`${RO?'':`<div class="row" style="gap:6px;margin-bottom:8px;flex-wrap:wrap"><span class="row" style="gap:0"><button class="btn sm ${dpStage==='before'?'pri':''}" data-dp="stage" data-v="before">ก่อนแก้</button><button class="btn sm ${dpStage==='after'?'pri':''}" data-dp="stage" data-v="after">หลังแก้</button></span>
      <label class="btn pri" for="dpcam">📷 ถ่ายรูป (${dpStage==='before'?'ก่อนแก้':'หลังแก้'})</label><input id="dpcam" type="file" accept="image/*" capture="environment" hidden>
      <label class="btn" for="dpfile">🖼 เลือกรูปจากเครื่อง</label><input id="dpfile" type="file" accept="image/*" multiple hidden></div>`}
      ${ps.length?`<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">${ps.map(p=>`<div class="card"><div class="thumb" data-dp="open" data-id="${p.id}">${annotatedSvg(imgSrc(p.imgId),p.w,p.h,p.shapes,[])}</div><div class="body"><span class="chip ${p.stage==='after'?'good':p.stage==='before'?'warn':''}">${p.stage==='after'?'หลังแก้':p.stage==='before'?'ก่อนแก้':'ทั่วไป'}</span><input type="text" data-dpcap="${p.id}" value="${esc(p.caption||'')}" placeholder="คำอธิบาย" ${RO?'disabled':''}>${RO?'':`<button class="btn sm bad" data-dp="del" data-id="${p.id}">ลบ</button>`}</div></div>`).join('')}</div>`:'<div class="empty small">ยังไม่มีรูปของ DEFECT นี้ — กด “ถ่ายรูป” ได้ทันที</div>'}`;
  }
  function drawGrid(){const g=d.grid;if(!g||!g.cols){const pp=planOfDefect(d);gbox.innerHTML=pp?`<div style="height:170px;max-width:340px;border:1px solid var(--line);border-radius:6px;overflow:hidden">${locCropSvg(d,pp)}</div><p class="small muted" style="margin:6px 0 0">ยังไม่ได้สร้างผังกระเบื้อง · แสดงตำแหน่ง DEFECT บนแบบ “${esc(pp.name||'')}” แทน (ใบ DEFECT จะพิมพ์ภาพนี้)</p>`:'<div class="empty small">ยังไม่ได้สร้างผังกระเบื้อง (ข้ามได้ถ้าไม่จำเป็น)</div>';return}
    $('#gtools',o).hidden=RO;
    gbox.innerHTML=`<div class="gsvg-wrap">${gridSvg(g).replace('<svg','<svg class="gsvg" id="gsvg"')}</div><p class="small muted" style="margin:6px 0 0">${g.cols} คอลัมน์ × ${g.rows} แถว · เลือกอยู่ ${g.cells.length} แผ่น ${g.cells.length?'· '+esc(gridText(g)):''}</p>`}
  drawGrid();drawDP();
  /* ระบายหลายช่องด้วยการลาก */
  let paint=null;
  const cellAt=(sv,e)=>{const g=d.grid;const r=sv.getBoundingClientRect(),vb=sv.viewBox.baseVal;const x=(e.clientX-r.left)/r.width*vb.width,y=(e.clientY-r.top)/r.height*vb.height;const c=Math.floor(x/20)+1,row=g.rows-Math.floor(y/20);return(c<1||c>g.cols||row<1||row>g.rows)?null:c+','+row};
  const setCell=(sv,k,on)=>{const g=d.grid;const i=g.cells.indexOf(k);if(on&&i<0)g.cells.push(k);if(!on&&i>=0)g.cells.splice(i,1);const rc=sv.querySelector('[data-k="'+k+'"]');if(rc)rc.setAttribute('fill',on?'#e03131':'#fff')};
  o.addEventListener('pointerdown',e=>{const sv=e.target.closest&&e.target.closest('#gsvg');if(!sv||RO||!d.grid||!d.grid.cols)return;const k=cellAt(sv,e);if(!k)return;
    const on=!d.grid.cells.includes(k);paint={sv,on};try{sv.setPointerCapture(e.pointerId)}catch(x){}setCell(sv,k,on);e.preventDefault()});
  o.addEventListener('pointermove',e=>{if(!paint)return;const k=cellAt(paint.sv,e);if(k)setCell(paint.sv,k,paint.on)});
  const endPaint=()=>{if(paint){paint=null;save();drawGrid();if(ctx.after)ctx.after()}};o.addEventListener('pointerup',endPaint);o.addEventListener('pointercancel',endPaint);
  o.addEventListener('input',e=>{const t=e.target;
    if(t.dataset.dpcap){const p=R&&R.photos.find(x=>x.id===t.dataset.dpcap);if(p){p.caption=t.value;save()}return}
    if(t.dataset.bz){d[t.dataset.bz]=t.checked;$('#zbox',o).hidden=!t.checked;save();if(ctx.after)ctx.after();return}
    if(t.dataset.b){d[t.dataset.b]=t.value;save();if(ctx.after)ctx.after()}
    if(t.dataset.g){d.grid=d.grid||{cells:[]};d.grid[t.dataset.g]=t.type==='number'?(+t.value||0):t.value;save()}});
  o.addEventListener('change',async e=>{const t=e.target;if(!R||RO||(t.id!=='dpcam'&&t.id!=='dpfile'))return;const fs=[...t.files];t.value='';if(!fs.length)return;
    await addPhotoFiles(R,fs,d.id,dpStage);drawDP();if(ctx.after)ctx.after()});
  o.addEventListener('click',e=>{
    const dp=e.target.closest('[data-dp]');if(dp){const k=dp.dataset.dp;
      if(k==='stage'){dpStage=dp.dataset.v;drawDP();return}
      if(k==='open'){const p=R.photos.find(x=>x.id===dp.dataset.id);if(p)openBoard({kind:'photo',ro:RO,title:`${d.code} · ${p.stage==='after'?'หลังแก้':p.stage==='before'?'ก่อนแก้':'รูป'}`,imgUrl:imgSrc(p.imgId),w:p.w,h:p.h,shapes:p.shapes,onChange:save,onClose:drawDP});return}
      if(k==='del'){armBtn(dp,'กดอีกครั้งเพื่อลบ',()=>{R.photos=R.photos.filter(x=>x.id!==dp.dataset.id);save();drawDP();if(ctx.after)ctx.after()});return}}
    const b=e.target.closest('[data-x]');if(b){const x=b.dataset.x;
      if(x==='close'||e.target===o){o.remove();ctx.after&&ctx.after(true);return}
      if(x==='copy'){const rq=ctx.req;if(!rq)return;const nd=copyDefect(rq,d);o.remove();ctx.after&&ctx.after(true);toast('คัดลอกแล้ว — แก้ห้อง/ตำแหน่ง แล้วปักหมุดหรือถ่ายรูป');editDefect(nd,{req:rq,canDelete:true,after:()=>refreshTab(),pin:dd=>pinDefectFlow(rq,dd),next:defectNext(rq)});return}
      if(x==='next'){o.remove();ctx.after&&ctx.after(true);ctx.next&&ctx.next();return}
      if(x==='gall'||x==='gnone'||x==='ginv'||x==='grange'){const g=d.grid;if(!g||!g.cols){toast('สร้างผังกระเบื้องก่อน');return}
        const all=[];for(let c=1;c<=g.cols;c++)for(let r=1;r<=g.rows;r++)all.push(c+','+r);
        if(x==='gall')g.cells=all;else if(x==='gnone')g.cells=[];else if(x==='ginv'){const st=new Set(g.cells);g.cells=all.filter(k=>!st.has(k))}
        else{const v=i=>+$('#'+i,o).value||0;const r0=v('gr0')||1,r1=v('gr1')||r0,c0=v('gc0')||1,c1=v('gc1')||c0;const st=new Set(g.cells);
          for(let c=Math.max(1,Math.min(c0,c1));c<=Math.min(g.cols,Math.max(c0,c1));c++)for(let r=Math.max(1,Math.min(r0,r1));r<=Math.min(g.rows,Math.max(r0,r1));r++)st.add(c+','+r);g.cells=[...st]}
        save();drawGrid();return}
      if(x==='mkgrid'){const g=d.grid||(d.grid={cells:[]});if(!(g.sw&&g.sh&&g.tw&&g.th)){toast('กรอกขนาดพื้นผิวและกระเบื้องให้ครบ');return}
        const cols=Math.ceil(g.sw/g.tw-.001),rows=Math.ceil(g.sh/g.th-.001);if(cols>60||rows>60){toast('ผังใหญ่เกินไป (สูงสุด 60×60 แผ่น) ลองแบ่งเป็นผนังคนละด้าน');return}
        g.cols=cols;g.rows=rows;g.cells=(g.cells||[]).filter(k=>{const[c,r]=k.split(',').map(Number);return c<=cols&&r<=rows});save();drawGrid();return}
      if(x==='pin'){o.remove();ctx.after&&ctx.after(true);ctx.pin&&ctx.pin(d);return}
      if(x==='del'){armBtn(b,'กดอีกครั้งเพื่อลบ',()=>{S.defects=S.defects.filter(z=>z.id!==d.id);Object.values(S.requests).forEach(r=>{r.scope=(r.scope||[]).filter(i=>i!==d.id);delete(r.res||{})[d.id];(r.photos||[]).forEach(p=>{if(p.defectId===d.id)p.defectId=''})});save();o.remove();ctx.after&&ctx.after(true)});return}}
    if(e.target===o){o.remove();ctx.after&&ctx.after(true)}
  });
}
/* ปักหมุดแล้วเด้งให้ถ่ายรูป/อัปโหลดของจุดนั้นทันที */
function promptDefectPhoto(r,d,done){
  const stage=(r.type==='CLOSE'&&r.photos.some(p=>p.defectId===d.id&&p.stage==='before'))?'after':'before';
  if(MODE.ro||!canEditReq(r)||r.photos.some(p=>p.defectId===d.id&&p.stage===stage)){done&&done();return}
  const o=overlay(`<div class="box"><h3 style="margin-bottom:4px"><span class="mono">${esc(pinLabel(d))}</span> · ปักหมุดแล้ว</h3><p class="hint">เพิ่มรูป${stage==='after'?'หลังแก้':'ก่อนแก้'}ของจุดนี้เลย</p>
   <div class="row" style="gap:8px;flex-wrap:wrap"><label class="btn pri" for="pdcam">📷 ถ่ายรูป</label><input id="pdcam" type="file" accept="image/*" capture="environment" hidden><label class="btn" for="pdfile">🖼 อัปโหลด</label><input id="pdfile" type="file" accept="image/*" multiple hidden><button class="btn" data-x="skip" style="margin-left:auto">ข้าม</button></div></div>`,'modal');
  o.dataset.ro='0';
  const fin=()=>{o.remove();done&&done()};
  o.addEventListener('change',async e=>{const t=e.target;if(t.id!=='pdcam'&&t.id!=='pdfile')return;const fs=[...t.files];t.value='';if(!fs.length)return;await addPhotoFiles(r,fs,d.id,stage);fin()});
  o.addEventListener('click',e=>{if(e.target===o||e.target.closest('[data-x=skip]'))fin()});
}
/* คัดลอก DEFECT เดิม (ไม่เอารูป/หมุด/ช่องที่เลือกในผัง) เพื่อไม่ต้องกรอกใหม่ทั้งหมด */
function copyDefect(r,src,loc){
  const d=newDefect(r,loc||null);
  ['item','type','desc','area','surface','face','fix','protect','due','zone','count','zoneNote'].forEach(k=>{if(src[k]!==undefined)d[k]=src[k]});
  if(src.grid)d.grid={...clone(src.grid),cells:[]};
  if(r.type==='CLOSE'){r.scope=r.scope||[];if(!r.scope.includes(d.id))r.scope.push(d.id)}
  save();return d;
}
function pickDefectToCopy(r,cb){
  const rid=rootId(r);let q='';
  const all=S.defects.filter(d=>!d.qc).sort((a,b)=>((b.rootId===rid)-(a.rootId===rid))||(b.created||0)-(a.created||0));
  const o=overlay(`<div class="box wide"><div class="row" style="margin-bottom:8px"><h3 style="margin-right:auto">คัดลอกจาก DEFECT เดิม</h3><button class="btn" data-x="close">ปิด</button></div>
   <input type="search" id="cpq" placeholder="ค้นหารหัส / ห้อง / ประเภท / วิธีแก้" style="width:100%;margin-bottom:8px"><div id="cplist"></div></div>`,'modal');o.dataset.ro='0';
  const draw=()=>{const l=q.toLowerCase();const ls=all.filter(d=>!l||[d.code,d.area,d.type,d.desc,d.fix].join(' ').toLowerCase().includes(l)).slice(0,60);
    $('#cplist',o).innerHTML=ls.length?ls.map(d=>`<button class="pickrow" data-d="${d.id}"><b class="mono">${esc(d.code)}</b><span style="flex:1;min-width:0"><span>${esc(d.area||'—')} ${esc(d.surface||'')}</span><span class="small muted" style="display:block">${esc(d.type||'')}${d.fix?' → '+esc(d.fix):''}${d.zone?' · โซน '+zoneCount(d)+' แผ่น':''}</span></span>${d.rootId===rid?'<span class="chip">ชุดนี้</span>':''}</button>`).join(''):'<div class="empty small">ไม่พบ DEFECT</div>'};draw();
  o.addEventListener('input',e=>{if(e.target.id==='cpq'){q=e.target.value;draw()}});
  o.addEventListener('click',e=>{if(e.target===o||e.target.closest('[data-x=close]')){o.remove();return}
    const b=e.target.closest('[data-d]');if(b){const src=defectById(b.dataset.d);o.remove();if(src)cb(src)}});
}
/* ถ่ายรูปที่หน้างานแล้วสร้าง DEFECT ใหม่ให้ทันที (รูปเป็น “ก่อนแก้”) แล้วเปิดหน้ากรอกรายละเอียด */
function defectNext(r){return()=>{refreshTab();const c=$('#defcam');if(c)c.click()}}
async function quickDefect(r,files){
  if(!canEditReq(r)){toast('คุณไม่มีสิทธิ์แก้ไขเอกสารชุดนี้');return}
  if(!files.length)return;
  const d=newDefect(r);if(r.type==='CLOSE'){r.scope=r.scope||[];r.scope.push(d.id)}
  await addPhotoFiles(r,files,d.id,'before');save();refreshTab();
  editDefect(d,{req:r,canDelete:true,after:()=>refreshTab(),pin:dd=>pinDefectFlow(r,dd),next:defectNext(r)});
}
function newDefect(r,loc){
  const rid=rootId(r);const n=nextDefectCode(rid);
  const d={id:'df'+uid(),rootId:rid,foundIn:r.id,num:n.num,code:n.code,item:'',type:'',desc:'',area:'',surface:'',face:'',fix:'',protect:'',due:'',grid:null,loc:loc||null,created:Date.now()};
  const last=S.defects.filter(x=>x.rootId===rid).slice(-1)[0];if(last){d.area=last.area;d.surface=last.surface;d.item=last.item}
  S.defects.push(d);if(r.type==='CLOSE')r.scope=(r.scope||[]);save();return d;
}

/* ========= request editor ========= */
const REQ_ST=[['draft','ร่าง'],['sent','ส่งตรวจแล้ว · รอผล'],['approved','ผ่าน (Approved)'],['disapproved','ไม่ผ่าน (Disapproved)'],['cancelled','ยกเลิก']];
const reqStatus=r=>r.cancelled?'cancelled':r.result==='approved'?'approved':r.result==='disapproved'?'disapproved':r.sent?'sent':'draft';
function setReqStatus(r,v){r.cancelled=v==='cancelled';r.sent=v==='sent'||v==='approved'||v==='disapproved';r.result=v==='approved'?'approved':v==='disapproved'?'disapproved':''}
function viewReq(){
  const r=curReq();const cs=chainState(rootId(r));const tabs=[['info','ข้อมูลเอกสาร'],['plans','แบบ / ขอบเขต',r.plans.length],['photos',r.type==='OPEN'?'รูปก่อนตรวจ':'รูปตรวจเปิด/ปิด',photoTotal(r),photoTotal(r)>=4?'good':'bad'],...(defectsOn(r)?[['defects','รายการ DEFECT',visibleDefects(r).length,r.type==='CLOSE'&&!visibleDefects(r).length?'bad':'']]:[]),['preview','เอกสารพร้อมส่ง']];
  if(UI.tab==='defects'&&!defectsOn(r))UI.tab='info';
  return`<div class="row" style="margin-bottom:10px"><button class="btn sm" data-go="list">← รายการ</button><h1 style="font-size:20px" class="mono">${esc(r.no)}</h1>${chip(r.type==='OPEN'?kindLabel(r):kindLabel(r)+' รอบ '+r.round,r.type==='OPEN'?'open':'close')}${chip(cs.t,cs.k)}
   <span style="margin-left:auto" class="row"><label class="row small muted" style="gap:6px">สถานะเอกสาร<select data-reqstatus="1" style="width:auto;color:var(--fg)">${REQ_ST.map(o=>`<option value="${o[0]}" ${reqStatus(r)===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></label>${r.type==='OPEN'?`<button class="btn pri sm" data-act="newclose" data-id="${rootId(r)}">＋ สร้างใบส่งปิด (CLOSE)</button>`:r.type==='CLOSE'&&cs.open>0?`<button class="btn pri sm" data-act="newclose" data-id="${rootId(r)}">＋ รอบส่งซ้ำถัดไป</button>`:''}</span></div>
   ${MODE.kind==='cloud'?`<div class="row small" style="margin-bottom:10px;gap:6px">${aclSummary('requests',rootId(r))}</div>`:''}
   ${r.type==='CLOSE'?`<div class="banner info">รอบ ${esc(kindLabel(r))} ที่ ${r.round} · ตรวจซ้ำเฉพาะ ${(r.scope||[]).length} จุดที่แก้ไข (อ้างอิงใบ ${esc(kindLabel(reqById(rootId(r))))} ${esc(reqById(rootId(r)).no)}) · แบบจะแสดงเฉพาะหมุด DEFECT ของจุดที่แก้</div>`:''}
   <div class="tabs" role="tablist">${tabs.map(t=>`<button role="tab" data-tab="${t[0]}" aria-selected="${UI.tab===t[0]}">${t[1]}${t[2]!=null?`<span class="n ${t[3]||''}">${t[2]}${t[0]==='photos'?'/4':''}</span>`:''}</button>`).join('')}</div>
   <div id="tabbody">${UI.tab==='info'?tabInfo(r):UI.tab==='plans'?tabPlans(r):UI.tab==='photos'?tabPhotos(r):UI.tab==='defects'?tabDefects(r):tabPreview(r)}</div>`;
}
function afterReq(){if(UI.tab==='preview')drawPreview()}
function refreshTab(){const r=curReq();const el=$('#tabbody');if(!el)return;el.innerHTML=UI.tab==='info'?tabInfo(r):UI.tab==='plans'?tabPlans(r):UI.tab==='photos'?tabPhotos(r):UI.tab==='defects'?tabDefects(r):tabPreview(r);
  // refresh tab counters without full re-render
  $$('.tabs .n').forEach(n=>{const t=n.parentElement.dataset.tab;const v=t==='plans'?r.plans.length:t==='photos'?photoTotal(r):t==='defects'?visibleDefects(r).length:null;if(v!=null){n.textContent=v+(t==='photos'?'/4':'');if(t==='photos')n.className='n '+(v>=4?'good':'bad')}});
  if(UI.tab==='preview')drawPreview();if(MODE.ro)lockUI()}

const RSYM={P:'✓',F:'✗',N:'N/A','':'·'};
function cell(r,id){return r.checklist[id]||(r.checklist[id]={})}
function tabInfo(r){
  const P=S.project;const isC=r.type==='CLOSE';
  let h=`<div class="panel"><h3>เลขที่และวันที่</h3><div class="grid">${inp('เลขที่ใบตรวจ (Request No.)','r:no')}${inp('หนังสือเล่มที่','r:bookNo')}${inp('วันที่ทำเอกสาร','r:date','date')}${inp('วันที่นัดตรวจ','r:planDate','date')}${inp('เวลานัดตรวจ','r:planTime','text','placeholder="10.30 AM."')}</div></div>
  <div class="panel"><h3>งานที่ส่งตรวจ <span class="chip ${isC?'close':'open'}">${esc(kindLabel(r))}</span></h3><div class="grid g2">
   <label class="f">ประเภทการส่ง (พิมพ์เองได้ เช่น CM OPEN / CM CLOSE / Pre-Inspection)<input type="text" data-b="r:kindLabel" value="${esc(kindLabel(r))}" list="kindlist"><datalist id="kindlist">${kindsOf().filter(k=>k.role===(isC?'close':'open')).map(k=>`<option>${esc(k.label)}</option>`).join('')}</datalist></label>
   <label class="f">ชนิดงานที่ตรวจสอบ — ต่อท้าย “${esc(kindLabel(r))}”<input type="text" data-b="r:workText" value="${esc(r.workText)}" placeholder="F8 BUILDING 1 FLOOR 01-11"></label>
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
function coverSection(r){
  const c=r.cover;const legacy=c===undefined&&r.plans.length;
  let h=`<div class="panel" style="margin:0 0 14px"><h3>แบบสำหรับใบปะหน้า <span class="small muted" style="font-weight:400">แยกจากแบบที่แนบท้ายเอกสารด้านล่าง</span></h3>`;
  if(c){h+=`<div class="row" style="align-items:flex-start;gap:14px;flex-wrap:wrap"><div class="card" style="width:270px;flex:none"><div class="thumb" style="aspect-ratio:2/1" data-act="covopen">${annotatedSvg(imgSrc(c.imgId),c.w,c.h,c.shapes||[],[],{viewBox:focusBox(c,[]),labels:false,scale:c.sym})}</div></div>
    <div class="grow" style="display:flex;flex-direction:column;gap:8px;min-width:220px"><input type="text" data-cover="name" value="${esc(c.name||'')}" placeholder="ชื่อแบบ (แสดงใต้รูปในใบปะหน้า)" aria-label="ชื่อแบบปก">
     <div class="row"><button class="btn pri sm" data-act="covopen">ทำสี / ระบุขอบเขตบนแบบปก</button><button class="btn sm" data-act="covpick">เปลี่ยนแบบ</button><button class="btn sm bad" data-act="covdel">ลบแบบปก</button></div>
     <p class="hint" style="margin:0">รูปนี้อยู่เฉพาะในกรอบใบปะหน้า ไม่ถูกพิมพ์เป็นหน้าแบบ · ระบบซูมให้พอดีกับโซนสีที่วาด</p></div></div>`}
  else{h+=`<p class="hint">${legacy?'เอกสารนี้ยังใช้แบบแรกที่แนบเป็นแบบปกโดยอัตโนมัติ กดปุ่มด้านล่างเพื่อแยกเป็นแบบปกของตัวเอง':'ยังไม่ได้ตั้งแบบปก ใบปะหน้าจะเว้นกรอบนี้ไว้'}</p>
    <div class="row"><button class="btn pri sm" data-act="covpick">เลือกจากคลัง / อัปโหลดแบบปก</button>${r.plans.length?'<button class="btn sm" data-act="covfrom">คัดลอกจากแบบที่แนบ</button>':''}</div>`}
  return h+`</div>`;
}
function setCover(r,lib){const old=r.cover;r.cover={libId:lib.id,name:lib.name,imgId:lib.imgId,w:lib.w,h:lib.h,shapes:old&&old.w===lib.w&&old.h===lib.h?old.shapes:[]};save()}
function openCover(r){
  const c=r.cover;if(!c)return;
  openBoard({kind:'plan',ro:MODE.ro,title:`แบบใบปะหน้า · ${r.no}`,imgUrl:imgSrc(c.imgId),w:c.w,h:c.h,shapes:c.shapes,noPin:true,scale:()=>c.sym||1,onScale:v=>{c.sym=v;save()},onFlip:async ax=>{const id=await flippedImageId(c.imgId,ax);c.imgId=id;mirrorShapes(c.shapes,c.w,c.h,ax);save();return imgSrc(id)},onChange:save,onClose:()=>refreshTab()});
}
function tabPlans(r){
  let h=coverSection(r)+`<div class="row" style="margin-bottom:10px"><h3 style="font-size:15px;margin-right:12px">แบบที่แนบท้ายเอกสาร</h3><button class="btn pri" data-act="addplan">＋ เพิ่มแบบ (เลือกจากคลังหรืออัปโหลด)</button><span class="hint" style="margin:0">เรียงตามชื่อแบบอัตโนมัติ (E101, E102, …) · เปิดแบบเพื่อวาดโซนสีขอบเขตที่ส่งตรวจ${defectsOn(r)?' และปักหมุดตำแหน่ง DEFECT':''}</span></div>`;
  if(!r.plans.length)return h+`<div class="empty">ยังไม่มีแบบในใบนี้<br>อัปโหลดแบบผัง (รูปหรือ PDF) หรือวางรูป (Ctrl+V) ที่แคปมาจากแบบ แล้ววาดโซนสีบนแบบได้เลย</div>`;
  UI.planOpen=UI.planOpen||{};const list=plansSorted(r);const nOpen=list.filter(p=>UI.planOpen[p.id]).length;
  h+=`<div class="row" style="margin:0 0 8px"><span class="small muted" style="margin-right:auto">${list.length} แบบ · แตะชื่อแบบเพื่อย่อ/ขยาย</span><button class="btn sm" data-act="planall" data-id="${nOpen<list.length?'1':'0'}">${nOpen<list.length?'ขยายทั้งหมด':'ย่อทั้งหมด'}</button></div><div class="plxl">`;
  for(const pl of list){
    const open=!!UI.planOpen[pl.id];
    const legend=[...new Map((pl.shapes||[]).filter(s=>s.t==='poly'&&s.label).map(s=>[s.c+s.label,s])).values()];
    const pins=planPins(r,pl).length,zones=(pl.shapes||[]).filter(s=>s.t==='poly'&&!s.ref).length;
    h+=`<div class="plx ${open?'open':''}"><div class="plxh" data-act="plantog" data-id="${pl.id}" role="button" tabindex="0" aria-expanded="${open}"><span class="chev">▸</span><b class="plxn">${esc(pl.name)}</b><span class="plxb">${zones?`<span class="chip">โซน ${zones}</span>`:''}${pins?`<span class="chip bad">หมุด ${pins}</span>`:''}</span></div>`;
    if(open)h+=`<div class="plxbd"><div class="thumb" data-act="openplan" data-id="${pl.id}">${annotatedSvg(imgSrc(pl.imgId),pl.w,pl.h,pl.shapes,planPins(r,pl),{scale:pl.sym})}</div><div class="body">
     <input type="text" data-plan="${pl.id}" data-k="name" value="${esc(pl.name)}" aria-label="ชื่อแบบ">
     <div class="small muted">${legend.length?legend.map(s=>`<span class="dot" style="background:${s.c}"></span> ${esc(s.label)}`).join(' &nbsp; '):'ยังไม่มีโซนสี'}</div>
     <div class="row"><button class="btn pri sm" data-act="openplan" data-id="${pl.id}">${defectsOn(r)?'ทำสี / ปักหมุด':'ทำสี / ระบุขอบเขต'}</button><button class="btn sm bad" data-act="delplan" data-id="${pl.id}">ลบ</button></div></div></div>`;
    h+=`</div>`}
  return h+`</div>`;
}
/* นำเข้าไฟล์แบบ: 1 ไฟล์ = 1 fileId (PDF หลายหน้า = หลายรายการที่ fileId เดียวกัน)
   opts: {fileId, maxPages} */
async function importPlanFiles(files,opts){
  opts=opts||{};const out=[];
  for(const f of files){try{
    const isPdf=f.type==='application/pdf'||/\.pdf$/i.test(f.name);const base=(f.name||'แบบ').replace(/\.[^.]+$/,'');
    const fid=opts.fileId||('fl'+uid());
    if(isPdf){toast('กำลังอ่าน PDF…',3000);const ims=await pdfToImages(f,opts.maxPages||6,(n,t)=>{if(t>1)toast(`กำลังแปลงหน้า ${n}/${t}…`,1500)});
      if(ims.length&&ims[0].pages>ims.length)toast(`PDF มี ${ims[0].pages} หน้า แปลงให้ ${ims.length} หน้าแรก`,5000);
      ims.forEach(im=>out.push({...im,base,fid,ext:'pdf',name:base+(ims.length>1?` (หน้า ${im.page})`:''),pages:ims.length}))}
    else{const im=await fileToImage(f,2600,.88);out.push({...im,base,fid,ext:'img',name:base,page:1,pages:1})}
  }catch(e){toast('เปิดไฟล์ '+(f.name||'')+' ไม่ได้ — ถ้าเป็น PDF ลองแคปเป็นรูปแล้วอัปโหลด',4500)}}
  const libs=[];for(const im of out){const imgId=await putImage(im.url);const lib={id:'lb'+uid(),name:im.name,imgId,w:im.w,h:im.h,fileId:im.fid,fileName:im.base,page:im.page,pages:im.pages,ext:im.ext};S.library.push(lib);libs.push(lib)}
  return libs;
}
function attachPlan(r,lib){const key='pk'+uid();r.plans.push({id:'pl'+uid(),key,libId:lib.id,name:lib.name,imgId:lib.imgId,w:lib.w,h:lib.h,shapes:[]});save()}
/* เลือกแบบจากคลัง: ขั้นที่ 1 เลือกไฟล์ (จัดหมวดตามไฟล์ที่นำเข้า) → ขั้นที่ 2 เลือกหน้าที่จะแนบ */
function planPicker(r,cb){
  const o=overlay(`<div class="box wide"><div class="row" style="margin-bottom:10px"><button class="btn" id="ppback" data-x="back" hidden>‹ ไฟล์</button><h3 style="margin-right:auto" id="ppt"></h3><button class="btn" data-x="close">ปิด</button></div><div id="ppb"></div></div>`,'modal');
  const attached=new Set(((r&&r.plans)||[]).map(p=>p.libId).filter(Boolean));const sel=new Set();let q='';
  const files=()=>siteGroups().filter(g=>g.pages.length);
  const listHTML=()=>{const lq=q.toLowerCase();const gs=files().filter(g=>!lq||(g.name+' '+g.group+' '+g.rev).toLowerCase().includes(lq));
    if(!gs.length)return`<div class="empty">${files().length?'ไม่พบไฟล์ที่ค้นหา':'คลังแบบว่าง — อัปโหลดไฟล์แรกได้เลย'}</div>`;
    const hasG=gs.some(g=>g.group);let last=null,h='';
    for(const g of gs){if(hasG&&g.group!==last){h+=`<div class="ghead l1" style="margin-top:8px"><b>${esc(g.group||'ไม่ระบุกลุ่ม')}</b></div>`;last=g.group}
      const used=g.pages.filter(p=>attached.has(p.id)).length;
      h+=`<button class="pickrow" data-f="${g.fid}"><span style="flex:none;width:84px;height:60px;background:var(--surface2);border-radius:5px;overflow:hidden;display:block">${siteThumb(g.pages[0])}</span><span style="flex:1;min-width:0"><b>${esc(g.name)}</b><span class="small muted" style="display:block">${esc([g.rev,g.date&&fmtDate(g.date)].filter(Boolean).join(' · '))}</span></span><span class="chip">${g.pages.length>1?g.pages.length+' หน้า':'1 หน้า'}</span>${used?`<span class="chip good">แนบแล้ว ${used}</span>`:''}</button>`}
    return h};
  function showFiles(){
    $('#ppback',o).hidden=true;$('#ppt',o).textContent='เพิ่มแบบเข้าใบตรวจ · เลือกไฟล์';
    $('#ppb',o).innerHTML=`<div class="row" style="margin-bottom:10px"><label class="btn pri" for="planfile">อัปโหลดไฟล์ใหม่ (รูป / PDF)</label><input id="planfile" type="file" accept="image/*,application/pdf" multiple hidden><input type="search" id="ppq" placeholder="ค้นหาชื่อไฟล์ / กลุ่ม" value="${esc(q)}" style="flex:1;min-width:140px"></div><p class="hint" style="margin:0 0 8px">แบบที่เคยอัปโหลดหน้างานอยู่ที่นี่ จัดตามไฟล์ — เลือกไฟล์แล้วค่อยเลือกว่าจะแนบหน้าไหน</p><div id="pplist">${listHTML()}</div>`}
  function showPages(fid){
    const g=siteGroups().find(x=>x.fid===fid);if(!g||!g.pages.length){showFiles();return}
    sel.clear();$('#ppback',o).hidden=false;$('#ppt',o).textContent=g.name+(g.rev?' · '+g.rev:'');
    $('#ppb',o).innerHTML=`<p class="hint" style="margin:0 0 8px">${cb?'แตะหน้าที่ต้องการใช้':'แตะเลือกหน้าที่จะแนบ (เลือกได้หลายหน้า) แล้วกด “แนบที่เลือก”'}</p>
      <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${g.pages.map(l=>`<button class="pickrow pgsel" style="flex-direction:column;align-items:stretch;position:relative" data-pg="${l.id}"><span style="aspect-ratio:4/3;background:var(--surface2);border-radius:6px;overflow:hidden;display:block">${siteThumb(l)}</span><b class="small">${g.pages.length>1?'หน้า '+(l.page||1):esc(l.name)}</b>${attached.has(l.id)?'<span class="chip good" style="position:absolute;right:6px;top:6px">แนบแล้ว</span>':''}<span class="pgck" style="position:absolute;left:8px;top:8px"></span></button>`).join('')}</div>
      ${cb?'':`<div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn" data-x="all">เลือกทั้งหมด</button><button class="btn pri" id="ppgo" data-x="go" disabled>แนบที่เลือก (0)</button></div>`}`}
  const upd=()=>{$$('.pgsel',o).forEach(b=>{const on=sel.has(b.dataset.pg);b.classList.toggle('on',on);b.querySelector('.pgck').textContent=on?'☑':'☐'});const go=$('#ppgo',o);if(go){go.disabled=!sel.size;go.textContent=`แนบที่เลือก (${sel.size})`}};
  showFiles();
  o.addEventListener('input',e=>{if(e.target.id==='ppq'){q=e.target.value;$('#pplist',o).innerHTML=listHTML()}});
  o.addEventListener('click',e=>{
    if(e.target===o){o.remove();return}
    const x=e.target.closest('[data-x]');
    if(x){const k=x.dataset.x;
      if(k==='close'){o.remove();return}
      if(k==='back'){showFiles();return}
      if(k==='all'){const all=$$('.pgsel',o).map(b=>b.dataset.pg);const full=all.every(i=>sel.has(i));all.forEach(i=>full?sel.delete(i):sel.add(i));upd();return}
      if(k==='go'){const ls=[...sel].map(id=>S.library.find(l=>l.id===id)).filter(Boolean).sort((a,b)=>(a.page||1)-(b.page||1));ls.forEach(l=>attachPlan(r,l));o.remove();toast(`แนบแบบ ${ls.length} หน้าแล้ว (เรียงตามชื่อ)`);refreshTab();return}}
    const f=e.target.closest('[data-f]');if(f){showPages(f.dataset.f);return}
    const p=e.target.closest('[data-pg]');if(p){const id=p.dataset.pg;
      if(cb){const l=S.library.find(z=>z.id===id);o.remove();if(l)cb(l);refreshTab();return}
      sel.has(id)?sel.delete(id):sel.add(id);upd()}});
  o.addEventListener('change',async e=>{if(e.target.id==='planfile'){const libs=await importPlanFiles([...e.target.files],{maxPages:40});
    if(libs.length){libs.forEach(l=>{l.date=l.date||todayISO();l.shapes=l.shapes||[]});save();const fids=[...new Set(libs.map(l=>l.fileId))];toast('อัปโหลดแล้ว — เลือกหน้าที่จะแนบ');fids.length===1?showPages(fids[0]):showFiles()}}});
}
function openPlan(r,pl,pinFor){
  const board=openBoard({kind:'plan',ro:MODE.ro,noPin:!defectsOn(r),title:`${pl.name} · ${r.no}`,imgUrl:imgSrc(pl.imgId),w:pl.w,h:pl.h,shapes:pl.shapes,pinFor,scale:()=>pl.sym||1,onScale:v=>{pl.sym=v;save()},
    onFlip:async ax=>{const id=await flippedImageId(pl.imgId,ax);
      chainReqs(rootId(r)).forEach(q=>(q.plans||[]).forEach(p=>{if(p.key===pl.key){p.imgId=id;mirrorShapes(p.shapes,p.w,p.h,ax)}}));
      S.defects.forEach(d=>{if(d.loc&&d.loc.planKey===pl.key){if(ax==='x')d.loc.x=pl.w-d.loc.x;else d.loc.y=pl.h-d.loc.y}});
      save();return imgSrc(id)},
    onChange:save,pins:()=>planPins(r,pl),
    onPinMove:()=>save(),
    onPinClick:(id,redraw)=>{const d=defectById(id);if(d)editDefect(d,{req:r,canDelete:d.foundIn===r.id,after:(closed)=>{redraw();},pin:dd=>{board.close();openPlan(r,pl,dd)}})},
    onPinAdd:async(x,y,redraw)=>{
      if(pinFor){const pd=pinFor;pd.loc={planKey:pl.key,x,y};save();pinFor=null;board.redraw();toast('ปักหมุดแล้ว');board.setTool('select');promptDefectPhoto(r,pd,()=>board.redraw());return}
      const un=visibleDefects(r).filter(d=>!d.loc);
      const o=overlay(`<div class="box"><h3 style="margin-bottom:10px">ปักหมุดที่จุดนี้</h3>${un.map(d=>`<button class="pickrow" data-d="${d.id}"><b class="mono">${esc(d.code)}</b><span class="small">${esc(d.area||'')} ${esc(d.type||'')}</span></button>`).join('')}<button class="pickrow" data-d="new" style="border-style:dashed"><b>＋ DEFECT ใหม่ที่จุดนี้</b></button><button class="pickrow" data-d="copy" style="border-style:dashed"><b>⧉ คัดลอกจาก DEFECT เดิม แล้วปักที่จุดนี้</b></button><div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn" data-d="no">ยกเลิก</button></div></div>`,'modal');
      o.addEventListener('click',e=>{const b=e.target.closest('[data-d]');if(!b&&e.target!==o)return;o.remove();if(!b||b.dataset.d==='no')return;
        const finish=(d,isNew)=>{save();board.redraw();promptDefectPhoto(r,d,()=>{board.redraw();if(isNew)editDefect(d,{req:r,canDelete:true,after:()=>board.redraw(),pin:dd=>{board.close();openPlan(r,pl,dd)},next:defectNext(r)})})};
        if(b.dataset.d==='copy'){pickDefectToCopy(r,src=>finish(copyDefect(r,src,{planKey:pl.key,x,y}),true));return}
        if(b.dataset.d==='new'){finish(newDefect(r,{planKey:pl.key,x,y}),true);return}
        const d=defectById(b.dataset.d);d.loc={planKey:pl.key,x,y};finish(d,false)});
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
  const ds=visibleDefects(r);const isC=r.type==='CLOSE';const tot=photoTotal(r);const opn=isC?(reqById(rootId(r))||{photos:[]}):null;
  let h='';
  if(isC&&opn&&opn.id!==r.id){
    const cand=(opn.photos||[]).filter(p=>!p.defectId);
    h+=`<div class="panel"><h3>รูปตอนตรวจเปิด <span class="small muted" style="font-weight:400">จากใบ ${esc(opn.no)} · แนบเข้าใบส่งปิดนี้อัตโนมัติ</span></h3>${cand.length?`<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">${cand.map((p,i)=>`<label class="card" style="cursor:pointer"><div class="thumb" style="cursor:inherit">${annotatedSvg(imgSrc(p.imgId),p.w,p.h,p.shapes,[])}</div><div class="body"><span class="chk"><input type="checkbox" data-oex="${p.id}" ${(r.openExclude||[]).includes(p.id)?'':'checked'}> แนบรูปที่ ${(opn.photos.indexOf(p))+1}</span><span class="small muted">${esc(p.caption||'')}</span></div></label>`).join('')}</div>`:'<div class="empty small">ใบ OPEN ยังไม่มีรูป — เพิ่มรูปสภาพหน้างานที่ใบ OPEN</div>'}</div>`}
  h+=`<div class="row" style="margin-bottom:10px"><label class="btn pri" for="photofile">＋ ${isC?'เพิ่มรูปตอนตรวจปิด':'เพิ่มรูปสภาพหน้างานก่อนตรวจ'} / ถ่ายรูป</label><input id="photofile" type="file" accept="image/*" multiple hidden>
   <span class="chip ${tot>=4?'good':'bad'}">${tot>=4?`ครบ ${tot} รูป`:`ต้องมีอย่างน้อย 4 รูป (มี ${tot})`}</span><span class="hint" style="margin:0">${isC?'รูปในส่วนนี้คือรูปตอนตรวจปิด · ผูกรูปกับ DEFECT และเลือก “ก่อนแก้/หลังแก้” ให้แต่ละจุด':'รูปสภาพหน้างานก่อนตรวจ'} · วางรูปด้วย Ctrl+V ได้ · แตะรูปเพื่อเขียนบนรูป</span></div>
   ${isC?'<h3 style="font-size:15px;margin:4px 0 8px">รูปตอนตรวจปิด</h3>':''}`;
  if(!r.photos.length)return h+`<div class="empty">${isC?'ยังไม่มีรูปตอนตรวจปิด':'ยังไม่มีรูป เพิ่มรูปสภาพหน้างานก่อนตรวจเพื่อแนบใบตรวจ'}</div>`;
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
  h+=`<div class="row" style="margin-bottom:10px"><label class="btn pri" for="defcam">📷 ถ่าย DEFECT ใหม่ (หน้างาน)</label><input id="defcam" type="file" accept="image/*" capture="environment" hidden><button class="btn" data-act="adddef">＋ ${isC?'เพิ่ม DEFECT (ไม่มีรูป)':'เพิ่ม DEFECT'}</button><button class="btn" data-act="copyfrom">⧉ คัดลอกจาก DEFECT เดิม</button><select data-defview="1" style="width:auto" aria-label="มุมมอง"><option value="list" ${r.defView!=='table'?'selected':''}>มุมมอง: การ์ด</option><option value="table" ${r.defView==='table'?'selected':''}>มุมมอง: ตาราง DEFECTS LIST</option></select><select data-defgroup="1" style="width:auto" aria-label="จัดกลุ่ม">${[['room','จัดกลุ่ม: ห้อง / พื้นที่'],['item','จัดกลุ่ม: หมวดงาน']].map(o=>`<option value="${o[0]}" ${(r.defGroup||'room')===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select><span class="hint" style="margin:0">เรียงตามชื่อ DEFECT ในแต่ละกลุ่ม · กระเบื้องหลายแผ่นในห้องเดียวกันให้ติ๊ก “DEFECT แบบโซน” ในหน้าแก้ไข รวมเป็นรายการเดียว · บันทึกผลตรวจของแต่ละจุดด้านล่าง</span></div>`;
  if(!vis.length)return h+`<div class="empty">ยังไม่มี DEFECT ในใบนี้</div>`;
  if(r.defView==='table')return h+qcTableView(vis.slice().sort((a,b)=>(a.num||0)-(b.num||0)).map(d=>dfAsQC(d,r)),'editdef');
  for(const gp of groupRooms(vis,r.defGroup||'room')){
   const tiles=gp.list.reduce((n,x)=>n+zoneCount(x),0);
   h+=`<div class="rmhead"><b>${esc(gp.room)}</b><span class="chip">${gp.list.length} รายการ</span>${tiles?`<span class="chip warn">โซนรวม ${tiles} แผ่น</span>`:''}</div>`;
  for(const d of gp.list){
    const st=defectStatus(d);const res=(r.res&&r.res[d.id])||{};
    h+=`<div class="dcard"><div><div class="code">${esc(d.code)}</div>${chip(STATUS_TXT[st],STATUS_CLS[st])}${d.zone?`<div><span class="chip warn">โซน ${zoneCount(d)} แผ่น</span></div>`:''}</div>
      <div style="min-width:0"><div><b>${esc(d.area||'ยังไม่ระบุพื้นที่')}</b> <span class="muted">${esc(d.surface||'')} ${esc(d.face||'')}</span></div>
       <div>${esc(d.type||'ยังไม่ระบุประเภท')}${d.desc?` — ${esc(d.desc)}`:''}</div>
       ${d.zone&&d.zoneNote?`<div class="small">ขอบเขตโซน: ${esc(d.zoneNote)}</div>`:''}<div class="small muted">${d.grid&&d.grid.cells&&d.grid.cells.length?esc(gridText(d.grid)):'ไม่มีผังกระเบื้อง'}</div>
       ${d.fix?`<div class="small">วิธีแก้: ${esc(d.fix)}</div>`:''}
       <div class="row" style="margin-top:6px">${d.loc?'<span class="chip good">มีหมุดบนแบบ</span>':`<button class="btn sm" data-act="pindef" data-id="${d.id}">ปักหมุดบนแบบ</button>`}<button class="btn sm" data-act="editdef" data-id="${d.id}">แก้ไข</button>${MODE.ro?'':`<button class="btn sm" data-act="copydef" data-id="${d.id}">⧉ คัดลอก</button>`}</div>
       <div class="dphotos">${[['before','ก่อนแก้'],['after','หลังแก้']].map(([st,tx])=>{const ps=r.photos.filter(p=>p.defectId===d.id&&p.stage===st);
         return`<div class="dpg"><div class="row" style="gap:6px"><b class="small">${tx} (${ps.length})</b>${MODE.ro?'':`<label class="btn sm" for="dc-${d.id}-${st}-c">📷 ถ่าย</label><input id="dc-${d.id}-${st}-c" data-dcard="${d.id}" data-stage="${st}" type="file" accept="image/*" capture="environment" hidden><label class="btn sm" for="dc-${d.id}-${st}-f">🖼 อัปโหลด</label><input id="dc-${d.id}-${st}-f" data-dcard="${d.id}" data-stage="${st}" type="file" accept="image/*" multiple hidden>`}</div>
          ${ps.length?`<div class="row" style="gap:4px;margin-top:4px">${ps.map(p=>`<div class="dthumb" data-act="openphoto" data-id="${p.id}">${annotatedSvg(imgSrc(p.imgId),p.w,p.h,p.shapes,[])}</div>`).join('')}</div>`:''}</div>`}).join('')}</div>
       ${isC&&(r.scope||[]).includes(d.id)?`<div class="row" style="margin-top:8px"><span class="small muted">ผลตรวจรอบนี้:</span>${[['pass','ผ่าน','good'],['fail','ไม่ผ่าน','bad'],['','ยังไม่ตรวจ','']].map(o=>`<button class="btn sm ${res.r===o[0]||(!res.r&&o[0]==='')?'pri':''}" data-act="setres" data-id="${d.id}" data-v="${o[0]}">${o[1]}</button>`).join('')}<input type="text" data-res="${d.id}" placeholder="หมายเหตุ" value="${esc(res.note||'')}" style="width:200px"></div>`:''}
      </div>
      <div>${d.grid&&d.grid.cols?`<div class="gsv">${gridSvg(d.grid)}</div>`:''}</div></div>`}}
  return h;
}

/* --- preview tab --- */
function tabPreview(r){
  const warn=[];
  if(photoTotal(r)<4)warn.push(`รูปยังไม่ครบ 4 รูป (มี ${photoTotal(r)})`);
  if(r.type==='CLOSE'&&!r.photos.length)warn.push('ยังไม่มีรูปตอนตรวจปิด');
  if(r.type==='CLOSE'&&!openPhotosFor(r).length)warn.push('ไม่มีรูปตอนตรวจเปิดแนบมา (ใบ OPEN ไม่มีรูป หรือยกเว้นไว้ทั้งหมด)');
  if(!r.plans.length)warn.push('ยังไม่ได้แนบแบบที่ระบุสี/ขอบเขต');
  else if(!r.plans.some(p=>(p.shapes||[]).some(s=>s.t==='poly'&&!s.ref)))warn.push('ยังไม่ได้วาดโซนสีขอบเขตบนแบบ');
  const vis=visibleDefects(r);const nop=vis.filter(d=>!d.loc).length;if(nop&&defectsOn(r))warn.push(`DEFECT ${nop} จุดยังไม่ปักหมุดบนแบบ`);
  if(r.type==='CLOSE'&&!vis.length)warn.push('ใบส่งปิดต้องมีรายการ DEFECT — ยังไม่มีเลย');
  if(r.type==='CLOSE'&&vis.length&&!(r.scope||[]).length)warn.push('ยังไม่ได้เลือก DEFECT ที่ส่งตรวจรอบนี้');
  if(r.type==='CLOSE'){const nph=vis.filter(d=>{const x=defectPhotos(r,d);return !x.before&&!x.after}).length;if(nph)warn.push(`DEFECT ${nph} จุดยังไม่มีรูปประกอบ`)}
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
function sigCard(P,title,nameB,roleB,key){
  return`<div class="sigc"><b>${title}</b>${inp('ชื่อ',nameB)}${inp('ตำแหน่ง',roleB)}<div class="sigv">${P[key]?`<img src="${imgSrc(P[key])||''}" alt="ลายเซ็น">`:'<span class="small muted">ไม่มีลายเซ็น</span>'}</div>
   <div class="row"><label class="btn sm" for="sig-${key}">${P[key]?'เปลี่ยน':'อัปโหลด'}ลายเซ็น</label><input id="sig-${key}" data-sigfor="${key}" type="file" accept="image/*" hidden>${P[key]?`<button class="btn sm" data-act="nosig" data-id="${key}">ลบลายเซ็น</button>`:''}</div></div>`;
}
function viewSettings(){
  const P=S.project;
  const cl=P.checklist.map(g=>`<div class="panel" style="margin:0 0 10px"><label class="f">หัวข้อกลุ่ม (ขึ้นบรรทัดใหม่ได้)<textarea data-cg="${g.id}" data-k="label" rows="2">${esc(g.label)}</textarea></label><label class="f" style="margin-top:8px">รายการ (บรรทัดละ 1 รายการ รูปแบบ  English | ไทย)<textarea data-cg="${g.id}" data-k="items" rows="8" style="font-family:var(--f-mono);font-size:13px">${esc(g.items.map(i=>i.en+(i.th?' | '+i.th:'')).join('\n'))}</textarea></label></div>`).join('');
  return`<h1 style="font-size:22px;margin-bottom:14px">ตั้งค่า / สำรองข้อมูล</h1>
  <div class="panel"><h3>โครงการและบริษัท (ขึ้นหัวเอกสารทุกใบ)</h3><div class="grid g2">${inp('ชื่อโครงการ (PROJECT)','p:name')}${inp('LOCATE','p:locate')}${inp('ชื่อบริษัท','p:company.name')}${inp('ที่อยู่ บรรทัด 1','p:company.addr1')}${inp('ที่อยู่ บรรทัด 2','p:company.addr2')}${inp('Owner','p:owner')}${inp('Contractor','p:contractor')}${inp('CM (ช่องผู้ตรวจ)','p:cmName')}</div></div>
  <div class="panel"><h3>เลขที่ใบตรวจ</h3><div class="grid">${inp('คำนำหน้า','p:prefix')}<label class="f">เลขถัดไป<input type="number" data-b="p:nextNo" value="${P.nextNo}"></label>${inp('งานเริ่มต้น','p:workType')}</div><p class="hint" style="margin-top:8px">ตัวอย่างเลขถัดไป: <b class="mono">${esc(P.prefix)}${P.nextNo}</b> ใบ CLOSE ใช้เลขใหม่ต่อจากเลขล่าสุด แก้เลขในใบแต่ละใบได้</p></div>
  <div class="panel"><h3>ประเภทการส่งตรวจ</h3><p class="hint">กำหนดชื่อประเภทที่จะพิมพ์ในใบ (บรรทัดละ 1 ประเภท รูปแบบ <b class="mono">ชื่อ | open</b> หรือ <b class="mono">ชื่อ | close</b>)<br><b>open</b> = ส่งตรวจใหม่ (เริ่มชุดเอกสารใหม่) · <b>close</b> = ส่งตรวจซ้ำเพื่อปิด DEFECT (ตรวจเฉพาะจุดที่แก้) · ในแต่ละใบยังพิมพ์ชื่อประเภทเองได้อีก</p><textarea data-kinds="1" rows="4" style="font-family:var(--f-mono);font-size:13px">${esc(kindsOf().map(k=>k.label+' | '+k.role).join('\n'))}</textarea></div>
  <div class="panel"><h3>ผู้ลงนามและลายเซ็น</h3><p class="hint">ชื่อและตำแหน่งจะขึ้นใต้เส้นลงนามในใบปะหน้า ถ้าอัปโหลดลายเซ็น (พื้นขาวหรือโปร่งใสก็ได้) จะวางเหนือเส้นให้อัตโนมัติ เว้นว่างไว้ถ้าต้องการเซ็นด้วยมือบนกระดาษ</p>
   <div class="sigs">${sigCard(P,'Requested by (ผู้ขอตรวจ)','p:requestedName','p:requestedRole','reqSigId')}${sigCard(P,'Site Engineer','p:engName','p:engRole','engSigId')}${sigCard(P,'Reviewed by · CC','p:ccName','p:ccRole','sigId')}</div>
   <div class="row" style="margin-top:14px"><div style="width:90px;height:60px;background:#fff;border:1px solid var(--line);border-radius:6px;display:flex;align-items:center;justify-content:center"><img src="${imgSrc(P.logoId)||''}" style="max-height:56px" alt=""></div><label class="btn" for="logofile">เปลี่ยนโลโก้</label><input id="logofile" type="file" accept="image/*" hidden></div></div>
  <div class="panel"><h3>รายการตรวจ (Checklist)</h3><p class="hint">แก้ชื่อ เพิ่ม หรือลบรายการได้ ผลที่กรอกไว้ในใบเดิมไม่หาย (ผูกกับรายการที่ชื่อ English ตรงกัน)</p>${cl}</div>
  <div class="panel"><h3>รายการเลือก DEFECT</h3><div class="grid g2"><label class="f">ประเภท DEFECT (บรรทัดละ 1)<textarea data-list="defectTypes" rows="10">${esc(P.defectTypes.join('\n'))}</textarea></label><label class="f">วิธีแก้เฉพาะจุด (บรรทัดละ 1)<textarea data-list="fixMethods" rows="10">${esc(P.fixMethods.join('\n'))}</textarea></label></div></div>
  <div class="panel"><h3>คลังแบบ (${sitePages().length})</h3>${sitePages().length?`<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${sitePages().map(l=>`<div class="card"><div class="thumb" style="cursor:default">${annotatedSvg(imgSrc(l.imgId),l.w,l.h,[],[])}</div><div class="body"><input type="text" data-lib="${l.id}" value="${esc(l.name)}" aria-label="ชื่อแบบ"><button class="btn sm bad" data-act="dellib" data-id="${l.id}">ลบออกจากคลัง</button></div></div>`).join('')}</div>`:'<div class="empty small">ยังไม่มีแบบในคลัง เพิ่มจากหน้า “แบบ / ขอบเขต” ในใบตรวจ</div>'}</div>
  <div class="panel"><h3>สำรองและกู้ข้อมูล</h3><div class="hint" id="usage"></div><p class="hint">ข้อมูลทั้งหมดเก็บในเบราว์เซอร์เครื่องนี้ ควรกดสำรองเป็นไฟล์เป็นระยะ โดยเฉพาะก่อนล้างข้อมูลเบราว์เซอร์หรือเปลี่ยนเครื่อง</p>
   <div class="row"><button class="btn pri" data-act="backup">สำรองข้อมูลทั้งหมด (.json)</button><label class="btn" for="restorefile">กู้ข้อมูลจากไฟล์</label><input id="restorefile" type="file" accept=".json,application/json" hidden><button class="btn bad" data-act="wipe" style="margin-left:auto">ล้างข้อมูลทั้งหมด</button></div></div>
  <div class="credit"><b>Inspection Desk</b><span>พัฒนาโดย KRITTANAI</span></div>`;
}
function parseGroup(g,text){
  const old=new Map(g.items.map(i=>[i.en,i]));
  return text.split('\n').map(l=>l.trim()).filter(Boolean).map((l,k)=>{const[en,th]=l.split('|').map(x=>x.trim());const o=old.get(en);return o?{id:o.id,en,th:th||''}:{id:g.id+'n'+uid(),en,th:th||''}});
}
