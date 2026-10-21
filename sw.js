/* Service worker: เก็บตัวแอปไว้ในเครื่อง เปิดได้แม้ไม่มีอินเทอร์เน็ต / สัญญาณอ่อน
   (ข้อมูลและรูปจาก Supabase ไม่ผ่านที่นี่ — แอปเก็บเองใน IndexedDB) */
const V='idesk-v20';
const SHELL=['./','index.html','css/app.css','config.js','js/core.js','js/storage.js','js/views.js','js/report.js','js/qc.js','js/access.js','js/claims.js','js/app.js','assets/logo.png','manifest.webmanifest','assets/icon-192.png','assets/apple-touch-icon.png','assets/signature.png',
 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(/supabase\.co$/.test(u.hostname))return;
  if(!(u.origin===location.origin||/(^|\.)(jsdelivr\.net|cloudflare\.com|googleapis\.com|gstatic\.com)$/.test(u.hostname)))return;
  e.respondWith((async()=>{
    const c=await caches.open(V);const nav=r.mode==='navigate';
    const hit=await c.match(r,{ignoreSearch:nav})||(nav?await c.match('index.html'):null);
    // แสดงจากเครื่องทันที แล้วอัปเดตเงียบๆ เบื้องหลัง (ได้ฉบับใหม่ในการเปิดครั้งถัดไป)
    const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone());return res}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit}
    return (await net)||new Response('',{status:504});
  })());
});
