const current=new URLSearchParams(location.search).get('system')==='minimal'?'minimal':'vecoli';
const brand=document.querySelector('.brand');brand.removeAttribute('href');brand.setAttribute('role','button');brand.setAttribute('tabindex','0');brand.setAttribute('aria-haspopup','menu');brand.setAttribute('aria-expanded','false');brand.setAttribute('aria-label','切换 WCM 系统');
if(current==='minimal'){brand.querySelector('strong').innerHTML='Minimal Cell <em>Observatory</em>';brand.querySelector('.brand-mark').textContent='m.';}
brand.insertAdjacentHTML('beforeend','<span class="system-chevron">⌄</span>');
const menu=document.createElement('div');menu.className='system-menu';menu.id='system-menu';menu.hidden=true;menu.setAttribute('role','menu');
for(const [id,name,description]of [['vecoli','E. coli · vEcoli','全细胞数量模型 · 三维示意'],['minimal','JCVI-syn3A · 4D minimal cell','官方空间轨迹 · 10 nm 网格']]){const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitemradio');b.setAttribute('aria-checked',String(current===id));b.innerHTML=`<strong>${name}</strong><small>${description}</small>`;b.onclick=()=>{if(id===current){toggle(false);return;}const u=new URL(location.href);u.searchParams.set('system',id);location.assign(u);};menu.append(b);}document.querySelector('.topbar').append(menu);
function toggle(value){menu.hidden=!value;brand.setAttribute('aria-expanded',String(value));if(value)menu.querySelector('button').focus();}
brand.onclick=()=>toggle(menu.hidden);brand.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();toggle(menu.hidden);}};document.addEventListener('click',e=>{if(!brand.contains(e.target)&&!menu.contains(e.target))toggle(false);});document.addEventListener('keydown',e=>{if(e.key==='Escape')toggle(false);});
await import(current==='minimal'?'./minimal-app.js':'./app.js');
const {initHandControl}=await import('./hand-control.js');
initHandControl(()=>current==='minimal'?window.minimalObservatory:window.observatory);
const {initCellSound}=await import('./cell-sound-control.js');
initCellSound(()=>current==='minimal'?window.minimalObservatory:window.observatory);
const {initDemo}=await import('./demo-controls.js');
initDemo(current==='minimal'?window.minimalObservatory:window.observatory);
