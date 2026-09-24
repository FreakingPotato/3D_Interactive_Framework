import {CellSoundEngine,sampleSound,soundProfiles} from './cell-sound.js';
export function initCellSound(getApp){
 const style=document.createElement('link');style.rel='stylesheet';style.href='/cell-sound.css';document.head.append(style);
 const toggle=document.createElement('button');toggle.id='cell-sound-toggle';toggle.type='button';toggle.textContent='细胞声音';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','cell-sound-panel');document.querySelector('.header-right').append(toggle);
 const panel=document.createElement('section');panel.id='cell-sound-panel';panel.hidden=true;panel.innerHTML='<div class="sound-heading"><strong>细胞声场</strong><button type="button" id="cell-sound-close" aria-label="关闭">×</button></div><p>数量与活动状态的声音映射，并非真实录音。</p><button type="button" id="cell-sound-enable" aria-pressed="false">开启声音</button> <button type="button" id="cell-sound-preview" disabled>试听当前状态 · 6 秒</button><label class="sound-volume">音量 <input id="cell-sound-volume" type="range" min="0" max="100" value="28" aria-label="细胞声音音量"><output>28%</output></label><p id="cell-sound-status" role="status">声音已关闭</p><small>播放时发声，暂停时淡出。选中组件只听该群体；取消选择恢复整体声场。</small><details><summary>声音纹理</summary><div class="sound-textures"></div><p>群体数量影响密度；已有的活跃状态影响强弱。随机微声不代表逐个分子的反应事件，左右分布是听觉示意。</p></details>';
 document.body.append(panel);for(const p of Object.values(soundProfiles)){const row=document.createElement('p');row.textContent=p.name+' · '+p.texture;panel.querySelector('.sound-textures').append(row);}
 const enable=panel.querySelector('#cell-sound-enable'),preview=panel.querySelector('#cell-sound-preview'),volume=panel.querySelector('input'),status=panel.querySelector('#cell-sound-status');
 let ctx=null,engine=null,enabled=false,disposed=false,previewUntil=0,cached=null,frame=null,rows=null,time=null,species=null,selected=null,ready=null,token=0,suspendTimer=0;
 const show=value=>{panel.hidden=!value;toggle.setAttribute('aria-expanded',String(value));};toggle.onclick=()=>show(panel.hidden);panel.querySelector('#cell-sound-close').onclick=()=>show(false);
 function text(el,value){if(el.dataset.source!==value){el.dataset.source=value;el.textContent=value;}}
 function update(){
  if(!engine||disposed)return;const state=getApp()?.state;if(!state)return;
  if(!cached||frame!==state.frame||rows!==state.rows||time!==state.time||species!==state.species||selected!==state.selected||ready!==state.ready){cached=sampleSound(state);frame=state.frame;rows=state.rows;time=state.time;species=state.species;selected=state.selected;ready=state.ready;}
  const audible=enabled&&!document.hidden&&(state.playing||performance.now()<previewUntil);
  engine.update(cached,{audible,speed:state.speed,volume:Number(volume.value)/100});
  const group=cached.selected?soundProfiles[cached.selected]?.name:'全部组件';
  text(status,!enabled?'声音已关闭':!cached.ready?'等待细胞数据':ctx.state!=='running'?'请点击开启声音以允许播放':!audible?'已暂停 · 声音淡出':group+' · '+(performance.now()<previewUntil?'当前状态试听':'群体声场'));
 }
 async function setEnabled(value){
  const own=++token;clearTimeout(suspendTimer);enabled=value;previewUntil=0;enable.setAttribute('aria-pressed',String(value));text(enable,value?'关闭声音':'开启声音');preview.disabled=!value;toggle.classList.toggle('active',value);
  if(value){try{
   if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Web Audio unavailable');ctx=new Audio({latencyHint:'playback'});}
   // Resume inside the actual user activation before doing synthesis work.
   const resumed=ctx.resume();if(!engine)engine=new CellSoundEngine(ctx);
   await Promise.race([resumed,new Promise(resolve=>setTimeout(resolve,1200))]);
   if(own!==token||disposed)return;
   if(ctx.state!=='running'){setEnabled(false);text(status,'请用鼠标点击开启声音以允许播放');return;}
  }catch(error){console.warn('Cell sound:',error);if(own===token){enabled=false;enable.setAttribute('aria-pressed','false');text(enable,'开启声音');preview.disabled=true;toggle.classList.remove('active');text(status,'声音暂不可用，请重试');}return;}}
  update();if(!value)suspendTimer=setTimeout(()=>{if(!enabled&&!disposed)ctx?.suspend();},1400);
 }
 enable.onclick=()=>setEnabled(!enabled);preview.onclick=()=>{previewUntil=performance.now()+6000;update();};volume.oninput=()=>{panel.querySelector('output').textContent=volume.value+'%';update();};
 const interval=setInterval(update,100);
 function hidden(){previewUntil=0;if(document.hidden){ctx?.suspend();}else if(enabled){ctx?.resume().catch(()=>{});}update();}
 document.addEventListener('visibilitychange',hidden);
 function dispose(){if(disposed)return;disposed=true;token++;clearTimeout(suspendTimer);clearInterval(interval);document.removeEventListener('visibilitychange',hidden);engine?.dispose();ctx?.close();}
 window.addEventListener('pagehide',dispose,{once:true});
 window.cellSound={debug:()=>({enabled,preview:performance.now()<previewUntil,sample:cached,...engine?.debug()}),dispose};
 return window.cellSound;
}
