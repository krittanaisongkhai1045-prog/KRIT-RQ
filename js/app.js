/* ========= events ========= */
function pinDefectFlow(r,d){
  if(!r.plans.length){toast('เพิ่มแบบในใบตรวจก่อน แล้วค่อยปักหมุด');UI.tab='plans';render();return}
  if(r.plans.length===1)return openPlan(r,r.plans[0],d);
  const o=overlay(`<div class="box"><h3 style="margin-bottom:10px">ปักหมุด ${esc(pinLabel(d))} บนแบบไหน</h3>${plansSorted(r).map(p=>`<button class="pickrow" data-p="${p.id}">${esc(p.name)}</button>`).join('')}</div>`,'modal');
  o.addEventListener('click',e=>{const b=e.target.closest('[data-p]');if(!b&&e.target!==o)return;o.remove();if(b)openPlan(r,r.plans.find(p=>p.id===b.dataset.p),d)});
}
function autoResult(r){
  const vis=visibleDefects(r);const c2=r.type==='CLOSE';
  S.project.checklist.forEach(g=>g.items.forEach(it=>{const c=r.checklist[it.id];if(!c||!c.sel)return;
    const ds=vis.filter(d=>d.item===it.id);let v;
    if(c2){if(!ds.length)return;v=ds.every(d=>r.res&&r.res[d.id]&&r.res[d.id].r==='pass')?'P':'F'}else v=ds.length?'F':'P';
    const col=c2?'r2':'r1',dc=c2?'d2':'d1';c[col]=v;if(!c[dc])c[dc]=fmtDate(r.date)}));
  save();
}
function deleteChain(rid){
  const ids=new Set(chainReqs(rid).map(x=>x.id));
  S.requests=S.requests.filter(x=>!ids.has(x.id));S.defects=S.defects.filter(d=>d.rootId!==rid);save();
}
function onMainClick(e){
  const g=e.target.closest('[data-go]');if(g){go(g.dataset.go);return}
  const tb=e.target.closest('[data-tab]');if(tb){UI.tab=tb.dataset.tab;render();return}
  const a=e.target.closest('[data-act]');if(!a)return;
  const act=a.dataset.act,id=a.dataset.id;const r=UI.route==='req'?curReq():null;
  if(QCACT[act]){QCACT[act](a,id,e);return}
  if(ACCACT[act]){ACCACT[act](a,id,e);return}
  if(CLACT[act]){CLACT[act](a,id,e);return}
  if(MODE.ro&&!['openreq','openplan','openphoto','editdef','pdf','html'].includes(act))return;
  switch(act){
  case'newopen':{if(!canCreate()){toast('ต้องเข้าสู่ระบบก่อนสร้างเอกสาร');break}
    pickKind('open',k=>Promise.resolve(allocNo('req',S.project.nextNo)).then(v=>{const n=newOpen(v,k);go('req',n.id,'info')}).catch(x=>toast('ขอเลขที่ไม่สำเร็จ: '+((x&&x.message)||x),5000)));break}
  case'newclose':{if(!canEditReq(reqById(id))){toast('คุณไม่มีสิทธิ์แก้ไขเอกสารชุดนี้');break}
    pickKind('close',k=>Promise.resolve(allocNo('req',S.project.nextNo)).then(v=>{const n=makeClose(id,v,k);toast('สร้างรอบส่งซ้ำแล้ว ตรวจรายการ DEFECT และเพิ่มรูป “หลังแก้”');go('req',n.id,'defects')}).catch(x=>toast('ขอเลขที่ไม่สำเร็จ: '+((x&&x.message)||x),5000)));break}
  case'covopen':openCover(r);break;
  case'covpick':planPicker(r,l=>{setCover(r,l)});break;
  case'covdel':armBtn(a,'กดอีกครั้งเพื่อลบ',()=>{r.cover=null;save();refreshTab()});break;
  case'covfrom':{const useP=pl=>{r.cover={libId:pl.libId||'',name:pl.name,imgId:pl.imgId,w:pl.w,h:pl.h,shapes:clone((pl.shapes||[]).filter(s=>!s.ref))};save();refreshTab();toast('คัดลอกแบบมาเป็นแบบปกแล้ว แก้โซนแยกจากแบบแนบได้')};
    if(r.plans.length===1)useP(r.plans[0]);else{const o=overlay(`<div class="box"><h3 style="margin-bottom:10px">คัดลอกจากแบบไหน</h3>${r.plans.map(p=>`<button class="pickrow" data-p="${p.id}">${esc(p.name)}</button>`).join('')}</div>`,'modal');
      o.addEventListener('click',e=>{const b=e.target.closest('[data-p]');if(!b&&e.target!==o)return;o.remove();if(b)useP(r.plans.find(p=>p.id===b.dataset.p))})}break}
  case'openreq':go('req',id,'info');break;
  case'delchain':armBtn(a,'กดอีกครั้งเพื่อลบ',()=>{deleteChain(id);render()});e.stopPropagation();break;
  case'delreq':armBtn(a,'กดอีกครั้งเพื่อลบ',()=>{const q=reqById(id);if(q.type==='OPEN')deleteChain(rootId(q));else{S.requests=S.requests.filter(x=>x.id!==id);save()}go('list')});break;
  case'dfpdf':{const ds=S.defects.filter(d=>!d.qc).map(d=>({d,st:defectStatus(d)})).filter(x=>{const f=UI.dfilter,q=(UI.dq||'').toLowerCase();return(f==='all'||(f==='open'?x.st!=='closed':f==='need'?x.st==='open':x.st===f))&&(!q||[x.d.code,x.d.area,x.d.type,x.d.desc].join(' ').toLowerCase().includes(q))}).map(x=>x.d);
    exportQC('pdf',{list:dfTableList(ds).sort((a,b)=>String(a.code).localeCompare(String(b.code),undefined,{numeric:true})),table:true,name:'DefectsList_'+todayISO()});break}
  case'editdef':editDefect(defectById(id),{req:r,canDelete:true,after:(c)=>{if(c)render()},pin:d=>r&&pinDefectFlow(r,d)});break;
  case'cyc':{const c=cell(r,a.dataset.item);const col=a.dataset.col;const nx={'':'P',P:'F',F:'N',N:''}[c[col]||''];c[col]=nx;
    if(nx&&(col==='r1'||col==='r2')){const dc=col==='r1'?'d1':'d2';if(!c[dc])c[dc]=fmtDate(r.date)}save();refreshTab();break}
  case'autoresult':autoResult(r);refreshTab();toast('สรุปผลจาก DEFECT แล้ว');break;
  case'addplan':planPicker(r);break;
  case'plantog':{UI.planOpen=UI.planOpen||{};UI.planOpen[id]=!UI.planOpen[id];refreshTab();break}
  case'planall':{UI.planOpen=UI.planOpen||{};const on=id==='1';r.plans.forEach(p=>UI.planOpen[p.id]=on);refreshTab();break}
  case'openplan':openPlan(r,r.plans.find(p=>p.id===id));break;
  case'delplan':{const pl=r.plans.find(p=>p.id===id);if(!pl)break;
    const rid=rootId(r);const rest=r.plans.filter(p=>p.id!==id);
    const same=(p,q)=>p.key===q.key||(p.imgId&&p.imgId===q.imgId);                       // แบบเดียวกัน = key เดียวกัน หรือใช้ภาพแบบเดียวกัน
    const pinnedTo=(d,p)=>{if(!d.loc||!d.loc.planKey)return false;if(d.loc.planKey===p.key)return true;const o=planOfDefect(d);return !!(o&&same(o,p))};
    const stays=!!rest.find(p=>same(p,pl));
    const gone=(!stays&&r.type==='CLOSE')?S.defects.filter(d=>!d.qc&&d.rootId===rid&&pinnedTo(d,pl)):[];
    armBtn(a,gone.length?`กดอีกครั้งเพื่อลบแบบ + DEFECT ${gone.length} รายการ`:'กดอีกครั้งเพื่อลบ',()=>{
      r.plans=rest;
      if(!stays){
        if(gone.length){const ids=new Set(gone.map(d=>d.id));S.defects=S.defects.filter(d=>!ids.has(d.id));
          chainReqs(rid).forEach(q=>{if(q.scope)q.scope=q.scope.filter(x=>!ids.has(x));if(q.res)ids.forEach(k=>delete q.res[k]);q.photos=(q.photos||[]).filter(ph=>!ids.has(ph.defectId))});
          toast(`ลบ DEFECT ที่เชื่อมกับแบบนี้ ${ids.size} รายการแล้ว`)}
        S.defects.forEach(d=>{if(d.rootId===rid&&pinnedTo(d,pl))d.loc=null})}
      save();refreshTab()});break}
  case'openphoto':openPhoto(r,r.photos.find(p=>p.id===id));break;
  case'delphoto':armBtn(a,'กดอีกครั้งเพื่อลบ',()=>{r.photos=r.photos.filter(p=>p.id!==id);save();refreshTab()});break;
  case'mvphoto':{const i=r.photos.findIndex(p=>p.id===id),j=i+(+a.dataset.d);if(j>=0&&j<r.photos.length){const t=r.photos[i];r.photos[i]=r.photos[j];r.photos[j]=t;save();refreshTab()}break}
  case'adddef':{const d=newDefect(r);if(r.type==='CLOSE'){r.scope=r.scope||[];r.scope.push(d.id)}save();refreshTab();editDefect(d,{req:r,canDelete:true,after:c=>{refreshTab()},pin:dd=>pinDefectFlow(r,dd),next:defectNext(r)});break}
  case'copydef':{const src=defectById(id);if(!src||!canEditReq(r)){toast('คุณไม่มีสิทธิ์แก้ไขเอกสารชุดนี้');break}const nd=copyDefect(r,src);refreshTab();toast('คัดลอกแล้ว — แก้ห้อง/ตำแหน่ง แล้วปักหมุดหรือถ่ายรูป');editDefect(nd,{req:r,canDelete:true,after:()=>refreshTab(),pin:dd=>pinDefectFlow(r,dd),next:defectNext(r)});break}
  case'copyfrom':{if(!canEditReq(r)){toast('คุณไม่มีสิทธิ์แก้ไขเอกสารชุดนี้');break}pickDefectToCopy(r,src=>{const nd=copyDefect(r,src);refreshTab();editDefect(nd,{req:r,canDelete:true,after:()=>refreshTab(),pin:dd=>pinDefectFlow(r,dd),next:defectNext(r)})});break}
  case'pindef':pinDefectFlow(r,defectById(id));break;
  case'setres':{r.res=r.res||{};const x=r.res[id]||(r.res[id]={});x.r=a.dataset.v;
    const sc=(r.scope||[]).map(i=>r.res[i]&&r.res[i].r);if(sc.length&&sc.every(Boolean))r.result=sc.every(v=>v==='pass')?'approved':'disapproved';
    save();refreshTab();break}
  case'pdf':exportPDF();break;
  case'html':exportHTML();break;
  case'nosig':S.project[id||'sigId']='';save();render();break;
  case'dellib':armBtn(a,'กดอีกครั้งเพื่อลบ',()=>{S.library=S.library.filter(l=>l.id!==id);save();render()});break;
  case'backup':doBackup();break;
  case'wipe':armBtn(a,'กดอีกครั้งเพื่อยืนยันล้างทั้งหมด',async()=>{await wipeAll();render();toast('ล้างข้อมูลแล้ว')});break;
  }
}
function onMainInput(e){
  const t=e.target;
  if(qcInput(t))return;
  if(accInput(t))return;
  if(clInput(t))return;
  if(t.id==='grp'){UI.grp=t.value;try{localStorage.setItem('grp',t.value)}catch(x){}$('#main').innerHTML=viewList();return}
  if(MODE.ro&&!['q','dq','dfilter','dgroup','dview'].includes(t.id))return;
  if(t.id==='q'){UI.q=t.value;const p=t.selectionStart;$('#main').innerHTML=viewList();const q=$('#q');q.focus();q.setSelectionRange(p,p);return}
  if(t.id==='dq'){UI.dq=t.value;const p=t.selectionStart;$('#main').innerHTML=viewDefects();const q=$('#dq');q.focus();q.setSelectionRange(p,p);return}
  if(t.id==='dview'){UI.dview=t.value;$('#main').innerHTML=viewDefects();return}
  if(t.id==='dgroup'){UI.dgroup=t.value;$('#main').innerHTML=viewDefects();return}
  if(t.id==='dfilter'){UI.dfilter=t.value;$('#main').innerHTML=viewDefects();return}
  const r=UI.route==='req'?curReq():null;
  if(t.dataset.kinds){S.project.kinds=parseKinds(t.value);save();return}
  if(t.dataset.cover&&r&&r.cover){r.cover[t.dataset.cover]=t.value;save();return}
  if(t.dataset.reqstatus&&r){setReqStatus(r,t.value);save();render();return}
  if(t.dataset.b){const[ns,path]=t.dataset.b.split(':');const o=nsObj(ns);if(!o)return;
    if(t.type==='radio'){if(!t.checked)return;setPath(o,path,t.value)}
    else setPath(o,path,t.type==='checkbox'?t.checked:t.value);
    if(t.type==='number'&&ns==='p')o[path]=+t.value||0;
    if(ns==='p'&&path==='nextNo'&&MODE.kind==='cloud'&&MODE.admin)MODE.sb.rpc('set_counter',{p_k:'req',p_next:o[path]});
    save();if(ns==='p'&&path==='name')$('.brand span').textContent=t.value;
    if(t.dataset.re)render();return}
  if(t.dataset.item&&r){const c=cell(r,t.dataset.item);const k=t.dataset.k;c[k]=t.type==='checkbox'?t.checked:t.value;if(k==='sel')t.closest('tr').classList.toggle('sel',t.checked);save();return}
  if(t.dataset.plan&&r){r.plans.find(p=>p.id===t.dataset.plan)[t.dataset.k]=t.value;save();return}
  if(t.dataset.photo&&r){const p=r.photos.find(x=>x.id===t.dataset.photo);p[t.dataset.k]=t.value;save();return}
  if(t.dataset.res&&r){r.res=r.res||{};(r.res[t.dataset.res]=r.res[t.dataset.res]||{}).note=t.value;save();return}
  if(t.dataset.scope&&r){r.scope=r.scope||[];const i=r.scope.indexOf(t.dataset.scope);if(t.checked&&i<0)r.scope.push(t.dataset.scope);if(!t.checked&&i>=0)r.scope.splice(i,1);save();refreshTab();return}
  if(t.dataset.oex&&r){r.openExclude=r.openExclude||[];const i=r.openExclude.indexOf(t.dataset.oex);if(t.checked&&i>=0)r.openExclude.splice(i,1);if(!t.checked&&i<0)r.openExclude.push(t.dataset.oex);save();refreshTab();return}
  if(t.dataset.defview&&r){r.defView=t.value;save();refreshTab();return}
  if(t.dataset.defgroup&&r){r.defGroup=t.value;save();refreshTab();return}
  if(t.dataset.lib){S.library.find(l=>l.id===t.dataset.lib).name=t.value;save();return}
  if(t.dataset.cg){const g=S.project.checklist.find(x=>x.id===t.dataset.cg);if(t.dataset.k==='label')g.label=t.value;else g.items=parseGroup(g,t.value);save();return}
  if(t.dataset.list){S.project[t.dataset.list]=t.value.split('\n').map(x=>x.trim()).filter(Boolean);save();return}
}
async function onMainChange(e){
  const t=e.target;
  if(await qcChange(t))return;
  if(await accChange(t))return;
  if(await clChange(t))return;const r=UI.route==='req'?curReq():null;
  if(MODE.ro)return;
  if(t.dataset.dcard&&r){const fs=[...t.files];t.value='';if(fs.length&&canEditReq(r)){await addPhotoFiles(r,fs,t.dataset.dcard,t.dataset.stage)}return}
  if(t.id==='defcam'&&r){const fs=[...t.files];t.value='';await quickDefect(r,fs);return}
  if(t.id==='photofile'&&r){await addPhotoFiles(r,[...t.files]);t.value='';return}
  if((t.id==='logofile'||t.dataset.sigfor)&&t.files[0]){const im=await fileToImage(t.files[0],700,.9);const id=await putImage(im.url);S.project[t.id==='logofile'?'logoId':t.dataset.sigfor]=id;save();render();return}
  if(t.id==='restorefile'&&t.files[0]){await doRestore(t.files[0]);t.value='';return}
}
async function doBackup(){
  toast('กำลังรวบรวมรูปทั้งหมด…',3000);
  const ids=[...projectImageIds(),...qcImageIds()];S.requests.forEach(r=>ids.push(...reqImageIds(r)));
  if(MODE.kind!=='cloud')S.library.forEach(l=>l.srcId&&ids.push(l.srcId));   // ไฟล์ DWG (โหมดคลาวด์เก็บบน Storage อยู่แล้ว ไม่ใส่ในไฟล์สำรอง)
  await ensureData([...new Set(ids)]);
  const images={};[...new Set(ids)].forEach(id=>{const v=IMGDATA.get(id)||IMG.get(id);if(v&&String(v).startsWith('data:'))images[id]=v});
  const blob=new Blob([JSON.stringify({v:1,state:S,images})],{type:'application/json'});
  await saveFile(`inspection-backup-${todayISO()}.json`,blob);
}
async function wipeAll(){
  const keepL=S.project.logoId,keepS=S.project.sigId;
  if(MODE.kind==='cloud'){
    S={project:defaultProject(),requests:[],defects:[],library:[],access:[]};S.project.nextNo=1;S.project.logoId=keepL;S.project.sigId=keepS;await cloudFlush();
    try{const l=await MODE.sb.storage.from(BUCKET).list('',{limit:1000});const names=(l.data||[]).map(x=>x.name);if(names.length)await MODE.sb.storage.from(BUCKET).remove(names)}catch(e){}
    IMGDATA.clear();UI.route='list';return}
  if(IDBH){await new Promise(res=>{const tx=IDBH.transaction(['kv','img'],'readwrite');tx.objectStore('kv').clear();tx.objectStore('img').clear();tx.oncomplete=res;tx.onerror=res})}
  IMG.clear();IMGDATA.clear();
  S={project:defaultProject(),requests:[],defects:[],library:[],access:[]};S.project.nextNo=1;S.project.logoId=keepL;S.project.sigId=keepS;await saveNow();UI.route='list';
}
async function doRestore(file){
  try{const j=JSON.parse(await file.text());if(!j.state||!j.state.project)throw new Error('ไฟล์ไม่ถูกต้อง');
    toast('กำลังกู้ข้อมูล…',3000);
    if(MODE.kind!=='cloud'&&IDBH)await new Promise(res=>{const tx=IDBH.transaction('img','readwrite');tx.objectStore('img').clear();tx.oncomplete=res;tx.onerror=res});
    IMG.clear();IMGDATA.clear();
    for(const[k,v]of Object.entries(j.images||{})){if(k==='logo'||k==='sig'){IMGDATA.set(k,v);continue}await putImage(v,k)}
    S=j.state;S.library=S.library||[];S.defects=S.defects||[];S.requests=S.requests||[];S.access=S.access||[];
    await saveNow();UI.route='list';render();toast('กู้ข้อมูลแล้ว')}
  catch(e){toast('กู้ข้อมูลไม่สำเร็จ: '+(e.message||e),4500)}
}
document.addEventListener('paste',async e=>{
  if(UI.route!=='req'||$('.ov'))return;if(/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName))return;
  const files=[...(e.clipboardData?e.clipboardData.files:[])].filter(f=>f.type.startsWith('image/'));if(!files.length)return;
  const r=curReq();
  if(UI.tab==='photos'){await addPhotoFiles(r,files)}
  else if(UI.tab==='plans'){const libs=await importPlanFiles(files);libs.forEach(l=>attachPlan(r,l));refreshTab();toast('เพิ่มแบบแล้ว')}
  else toast('เปิดแท็บ “รูปตรวจ” หรือ “แบบ” ก่อนวางรูป');
});
document.addEventListener('click',e=>{const b=e.target.closest('[data-aclbtn]');if(b){const[c,...id]=b.dataset.aclbtn.split('/');aclDialog(c,id.join('/'))}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveNow()});
window.addEventListener('resize',()=>{if(UI.route==='req'&&UI.tab==='preview')drawPreview()});

/* ========= boot ========= */
(async function boot(){
  try{if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{})}catch(e){}
  {const _r=render;render=function(){_r();if(typeof updNetStatus==='function')updNetStatus()}}
  try{UI.grp=localStorage.getItem('grp')||'building'}catch(e){UI.grp='building'}
  const st=document.createElement('style');st.id='rcss';st.textContent=REPORT_CSS;document.head.appendChild(st);
  await initStorage();
  const m=$('#main');m.addEventListener('click',onMainClick);m.addEventListener('input',onMainInput);m.addEventListener('change',onMainChange);
  $('#top').addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g){go(g.dataset.go);return}const a=e.target.closest('[data-act]');if(a&&a.dataset.act==='login')loginDialog();if(a&&a.dataset.act==='sitemode')siteModeDialog();if(a&&a.dataset.act==='logout')logout()});
  if(memOnly)toast('เบราว์เซอร์นี้ไม่อนุญาตให้เก็บข้อมูลถาวร ข้อมูลจะหายเมื่อปิดหน้า ให้กดสำรองเป็นไฟล์ก่อนปิด',6000);
  gcImages();render();
})();
