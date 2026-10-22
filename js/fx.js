/* ========= fx: เอฟเฟกต์ลื่นไหล (ripple, pill เมนู, มังกร, นับเลข, ป้ายกำกับตาราง) ========= */
(function(){
const TAP='button,.btn,[data-act],[data-go],.rc,.acard,.qcat,.mh-qa,.pk,.snp,label.btn';
/* ripple + มังกรกระโดดเมื่อกดปุ่มในการ์ดส้ม */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.btn[data-act],button[data-act]');if(b&&/pdf|png|html|export|xl|snap|save|backup/i.test(b.dataset.act)){b.classList.add('busy');setTimeout(()=>b.classList.remove('busy'),1600)}},true);
document.addEventListener('pointerdown',e=>{
  const t=e.target.closest&&e.target.closest(TAP);if(!t||t.disabled)return;
  const r=document.createElement('div');r.className='rip';r.style.left=e.clientX+'px';r.style.top=e.clientY+'px';document.body.appendChild(r);setTimeout(()=>r.remove(),800);
},{passive:true});
/* pill เมนูล่างสไลด์ไปหาแท็บที่เลือก */
let lastPill=null;
function nav(){
  const n=document.querySelector('.nav');if(!n)return;
  let p=n.querySelector('.pill');if(!p){p=document.createElement('div');p.className='pill';n.prepend(p)}
  const b=n.querySelector('button[aria-current="true"]');if(!b||!b.offsetWidth){p.style.opacity=0;return}
  p.style.opacity=1;const x=b.offsetLeft,w=b.offsetWidth;p.style.width=w+'px';
  if(lastPill!=null&&lastPill!==x){p.style.transition='none';p.style.transform=`translateX(${lastPill}px)`;void p.offsetWidth;p.style.transition=''}
  p.style.transform=`translateX(${x}px)`;lastPill=x;
}
/* นับเลขการ์ดหลัก + วาดวงแหวน */
let heroT=0;
function hero(){
  const h=document.querySelector('.mh-hero');if(!h)return;
  h.querySelectorAll('.dragon').forEach(x=>x.remove());
  if(h.dataset.fx||Date.now()-heroT<4000)return;h.dataset.fx='1';heroT=Date.now();
  const b=h.querySelector('.mh-hl b');if(b){const txt=b.textContent,m=txt.match(/[\d,]+(\.\d+)?/);if(m){const dec=(m[1]||'').length?m[1].length-1:0,to=parseFloat(m[0].replace(/,/g,''));const t0=performance.now();
    (function f(t){const k=Math.min(1,(t-t0)/1100),v=to*(1-Math.pow(1-k,3));b.textContent=v.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec});if(k<1)requestAnimationFrame(f)})(t0)}}
  const fg=h.querySelector('.mh-ring .fg');if(fg){const to=fg.getAttribute('stroke-dashoffset'),full=fg.getAttribute('stroke-dasharray');fg.style.transition='none';fg.setAttribute('stroke-dashoffset',full);void fg.getBoundingClientRect();fg.style.transition='';requestAnimationFrame(()=>fg.setAttribute('stroke-dashoffset',to))}
}
/* ป้ายกำกับช่องของตาราง (ใช้ตอนแสดงแบบการ์ดบนมือถือ) */
function tables(){
  document.querySelectorAll('table.qtv:not([data-lb])').forEach(t=>{t.dataset.lb='1';const hs=[...t.querySelectorAll('thead th')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
    t.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>td.setAttribute('data-l',hs[i]||'')))});
  document.querySelectorAll('table.qtv[data-lb]').forEach(t=>{const hs=[...t.querySelectorAll('thead th')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
    t.querySelectorAll('tbody tr').forEach(tr=>{if(tr.firstElementChild&&!tr.firstElementChild.hasAttribute('data-l'))[...tr.children].forEach((td,i)=>td.setAttribute('data-l',hs[i]||''))})});
}
let q=0;function run(){if(q)return;q=requestAnimationFrame(()=>{q=0;nav();hero();tables()})}
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
window.addEventListener('resize',()=>{lastPill=null;run()});
document.addEventListener('DOMContentLoaded',run);run();
})();
