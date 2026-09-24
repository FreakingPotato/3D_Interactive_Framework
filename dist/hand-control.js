import {StableHandRoles,fingerDigit,ComponentHold,componentDigits} from './hand-components.js';
import {HandGestures} from './hand-gestures.js';
import {DwellSelection,timeFromTurn} from './hand-interactions.js';
import {createTimeAura} from './time-aura.js';
import {ChestTap} from './chest-tap.js';
import {playIronSuit} from './iron-suit.js';
export function initHandControl(getApp){
 const style=document.createElement('link');style.rel='stylesheet';style.href='/hand-control.css';document.head.append(style);const suitStyle=document.createElement('link');suitStyle.rel='stylesheet';suitStyle.href='/iron-suit.css';document.head.append(suitStyle);
 const toggle=document.createElement('button');toggle.id='hand-toggle';toggle.textContent='手势控制';toggle.setAttribute('aria-expanded','false');document.querySelector('.header-right').prepend(toggle);
 const panel=document.createElement('section');panel.id='hand-panel';panel.hidden=true;panel.innerHTML='<h3>摄像头手势</h3><p>识别在本机浏览器运行，画面不上传。首次加载需要片刻。</p><video muted playsinline autoplay hidden></video><p id="hand-status" role="status">摄像头已关闭</p><button id="hand-start">开启摄像头</button> <button id="hand-stop" disabled>关闭摄像头</button><details id="hand-instructions"><summary>手势操作说明</summary><p>右手张掌移动：360° 旋转<br>双手张开，分开或靠拢：缩放<br>双手拇指与食指成 L：拉开增加剖切深度，靠拢减小<br>右手只竖食指：移动光标<br>左手数字保持 0.7 秒：1 膜 · 2 DNA · 3 RNA · 4 核糖体 · 5 RNA 聚合酶 · 6 蛋白质<br>1–4 依次伸出食指至小指，5 张掌，6 拇指＋小指；左手不控制光标<br>悬停一秒：选中或点击按钮<br>空白区域悬停一秒：取消选中<br>选中组件后，捏住横拖：其他组件透明度<br>右手张掌静止三秒：时间宝石<br>左右转掌：回溯或前进 · 握拳退出，恢复原播放状态<br>手掌面向镜头，像拧旋钮一样左右各转 90°</p><p>请让手掌完整进入画面。关闭面板不会关闭摄像头；切到后台会自动关闭。</p></details>';document.body.append(panel);
 const markComponents=()=>componentDigits.forEach((id,i)=>{const button=document.querySelector(`[data-component="${id}"]`);if(button&&!button.querySelector('.hand-digit')){const badge=document.createElement('small');badge.className='hand-digit';badge.textContent=' '+(i+1);badge.title='左手 / Left hand';button.append(badge);}});
 const componentList=document.querySelector('#component-list');if(componentList)new MutationObserver(markComponents).observe(componentList,{childList:true});markComponents();
 const cursor=document.createElement('div');cursor.id='hand-cursor';cursor.hidden=true;document.body.append(cursor);
 const video=panel.querySelector('video'),status=panel.querySelector('#hand-status'),start=panel.querySelector('#hand-start'),stop=panel.querySelector('#hand-stop'),engine=new HandGestures(),dualEngine=new HandGestures(),dwell=new DwellSelection(),aura=createTimeAura(panel,video),chestTap=new ChestTap();
 let suitSequence=null,suiting=false,poseEnabled=false,lastPose=null;
 const componentHold=new ComponentHold(),handRoles=new StableHandRoles();
 let resumePlayback=null;
 let cutSession=null,timeSession=null,pendingSeek=null,seekBusy=false,seekTimer=0,lastSeek=0;
 const runKey=()=>getApp()?.state.rep||getApp()?.state.run;
 function restorePlayback(){if(!resumePlayback||seekBusy||pendingSeek||timeSession)return;const session=resumePlayback;resumePlayback=null;const app=getApp();if(session.key===runKey()&&session.wasPlaying&&!app.state.playing){if(app.setPlaying)app.setPlaying(true);else document.querySelector('#play')?.click();}}
 function finishTime(){if(!timeSession)return;resumePlayback=timeSession;timeSession=null;if(pendingSeek)flushSeek();else restorePlayback();}
 async function flushSeek(){if(seekBusy||!pendingSeek)return;const task=pendingSeek;pendingSeek=null;if(task.key!==runKey())return;seekBusy=true;lastSeek=performance.now();try{await getApp().setTime(task.time);}finally{seekBusy=false;if(pendingSeek)seekTimer=setTimeout(flushSeek,150);else restorePlayback();}}
 function resetInteraction(){finishTime();componentHold.reset();handRoles.reset();dualEngine.reset();cutSession=null;dwell.reset();aura.hide();cursor.style.setProperty("--dwell",0);}
 let worker=null,stream=null,generation=0,timer=0,watchdog=0,stale=0,busy=false,active=false,hoverUI=null,opacityStart=null,frames=0,lastMS=0;
 const bridge=()=>getApp()?.view?.gestures;
 const clear=()=>{cursor.hidden=true;hoverUI?.classList.remove('hand-ui-hover');hoverUI=null;bridge()?.clear();};
 function end(message='摄像头已关闭'){suitSequence?.cancel();suitSequence=null;suiting=false;lastPose=null;chestTap.reset();generation++;active=false;clearTimeout(timer);clearTimeout(watchdog);clearTimeout(stale);worker?.terminate();worker=null;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;video.hidden=true;engine.reset();resetInteraction();clear();busy=false;opacityStart=null;start.disabled=false;stop.disabled=true;toggle.classList.remove('active');status.textContent=message;}
 toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));};stop.onclick=()=>end();
 const target=(p)=>{const x=Math.max(0,Math.min(innerWidth-1,p.x*innerWidth)),y=Math.max(0,Math.min(innerHeight-1,p.y*innerHeight));const el=document.elementFromPoint(x,y);const modal=document.querySelector('dialog[open]');const ui=el?.closest('button, summary, input[type="checkbox"], input[type="radio"], input[type="range"], [role="button"]');return {x,y,el,ui:ui&&!ui.disabled&&ui.getAttribute('aria-disabled')!=='true'&&(!modal||modal.contains(ui))?ui:null,scene:!modal&&el?.tagName==='CANVAS'&&!!el.closest('#scene')};};
 function startSuit(pose){
  try{
   panel.hidden=false;toggle.setAttribute('aria-expanded','true');
   suitSequence=playIronSuit(video,pose,{onComplete:()=>{suitSequence=null;end('装甲彩蛋结束，已退出手势控制');panel.hidden=true;toggle.setAttribute('aria-expanded','false');}});
   suiting=true;generation++;clearTimeout(timer);clearTimeout(watchdog);clearTimeout(stale);worker?.terminate();worker=null;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;video.hidden=true;engine.reset();resetInteraction();clear();chestTap.reset();busy=false;status.textContent='装甲组装中';
  }catch(error){console.error('Suit animation:',error);end('装甲彩蛋无法启动，摄像头已关闭');}
 }
 function apply(result){
  if(suiting)return;
  if(result.pose&&[11,12].every(i=>(result.pose[i]?.visibility||0)>.35))lastPose=result.pose;
  if(!document.querySelector('dialog[open]')){const trigger=chestTap.update(result,performance.now());if(trigger){startSuit(result.pose);return;}}else{chestTap.reset();}
  const modal=document.querySelector('dialog[open]');const parent=modal||document.body;if(cursor.parentNode!==parent){parent.append(cursor);dwell.reset();}
  const now=performance.now(),sides=handRoles.update(result,now,{lockRight:!!engine.still||!!engine.timeMode});
  let action;
  if(result.landmarks.length===2){
   action=dualEngine.update(result.landmarks,now);
   if(!['zoom','cut'].includes(action.mode))action=null;else engine.reset();
  }
  if(result.landmarks.length!==2)dualEngine.reset();
  if(!action){
   const left=sides.indexOf('left'),right=sides.indexOf('right');
   const digit=left>=0&&!modal?fingerDigit(result.landmarks[left]):null;
   const choice=componentHold.update(digit,now);
   if(choice.select&&document.querySelector(`[data-component="${choice.select}"]`))getApp()?.select(choice.select);
   if(right>=0)action=engine.update([result.landmarks[right]],now);
   else{engine.reset();action={mode:digit?'component':'waiting'};}
   if(digit&&action.mode==='waiting')action.mode='component';
   action.digit=choice.digit;action.progress=choice.progress;
  }else componentHold.reset();
  const labels={component:'左手数字选组件',waiting:'等待手势',rotate:'单手旋转',zoom:'双手缩放',cut:'双手 L 形 · 剖切深度',pointer:'悬停一秒选中',pinch:'捏住横拖调透明度',opacity:'调节其他组件透明度',time:'时间宝石 · 左回溯 / 右前进', 'time-exit':'已退出时间宝石'};
  status.textContent=labels[action.mode];if(action.digit)status.textContent+=' · '+action.digit+' ('+Math.round(action.progress*100)+'%)';
  if(action.mode==='time'&&!modal){
   clear();dwell.reset();
   const app=getApp();
   if(!timeSession){const times=app.state.meta?.times||app.state.rows?.map(r=>r.time)||[];if(!times.length){engine.reset();return;}resumePlayback=null;timeSession={wasPlaying:app.state.playing,anchor:app.state.time,min:times[0],max:times.at(-1),key:runKey(),lastTarget:app.state.time};if(app.state.playing)document.querySelector('#play').click();if(app.state.local)app.state.follow=false;pendingSeek={time:timeSession.anchor,key:runKey()};flushSeek();}
   if(timeSession.key!==runKey()){engine.reset();resetInteraction();return;}
   if(action.turn!==undefined){const t=timeFromTurn(action.turn,timeSession.anchor,timeSession.min,timeSession.max);const times=app.state.meta?.times;let mapped=t;if(times){let lo=0,hi=times.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(times[mid]<=t)lo=mid;else hi=mid-1;}mapped=times[lo];}else mapped=Math.round(t*10)/10;
    if(mapped!==timeSession.lastTarget){timeSession.lastTarget=mapped;pendingSeek={time:mapped,key:runKey()};clearTimeout(seekTimer);seekTimer=setTimeout(flushSeek,Math.max(0,150-(performance.now()-lastSeek)));}
   }
   aura.show(action,Math.round(timeSession.lastTarget)+' s · ↶ / ↷');return;
  }
  if(timeSession)finishTime();
  if(modal&&action.mode==='time'){engine.reset();}
  if(!modal&&action.hold>0)aura.countdown(action);else aura.hide();
  if(!modal&&action.rotate)bridge()?.rotate(action.rotate.x,action.rotate.y);
  if(!modal&&action.zoom)bridge()?.zoom(action.zoom);
  if(!modal&&action.mode==='cut'){const slider=document.querySelector('#cutaway');if(slider){if(!cutSession||action.cutStart)cutSession={value:Number(slider.value),offset:action.cutOffset};const value=Math.round(Math.max(Number(slider.min||0),Math.min(Number(slider.max||100),cutSession.value+action.cutOffset-cutSession.offset)));if(Number(slider.value)!==value){slider.value=value;slider.dispatchEvent(new Event('input',{bubbles:true}));}status.textContent=labels.cut+' · '+slider.value+'%';}}else cutSession=null;
  if(action.cursor&&action.mode==='pointer'){
   const t=target(action.cursor);cursor.hidden=false;cursor.style.left=t.x+'px';cursor.style.top=t.y+'px';cursor.classList.remove('pinch');hoverUI?.classList.remove('hand-ui-hover');hoverUI=t.ui;hoverUI?.classList.add('hand-ui-hover');const locked=dwell.key==='scene'&&dwell.anchor&&Math.hypot(t.x-dwell.anchor.x,t.y-dwell.anchor.y)<=28?dwell.anchor:t;const hit=t.scene?bridge()?.hover(locked.x,locked.y):false;if(!t.scene)bridge()?.clear();cursor.classList.toggle('hit',!!hit||!!t.ui);
   const empty=t.scene&&hit===false&&!!getApp()?.state.selected;if(empty)status.textContent='空白区域悬停一秒：取消选中';const selection=dwell.update(t.ui||(hit?'scene':empty?'scene-empty':null),{x:t.x,y:t.y},performance.now());cursor.style.setProperty('--dwell',selection.progress);
   if(selection.click){const p=selection.click;if(t.ui){if(t.ui.matches('input[type="range"]')){const rect=t.ui.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(p.x-rect.left)/rect.width));t.ui.value=Number(t.ui.min||0)+ratio*(Number(t.ui.max||100)-Number(t.ui.min||0));t.ui.dispatchEvent(new Event('input',{bubbles:true}));t.ui.dispatchEvent(new Event('change',{bubbles:true}));}else t.ui.click();}else if(dwell.key==='scene-empty')getApp()?.select(null);else bridge()?.click(p.x,p.y);}
  }else{clear();dwell.reset();cursor.style.setProperty('--dwell',0);}
  if(!modal&&['pinch','opacity'].includes(action.mode)){const slider=document.querySelector('#context-opacity');if(opacityStart===null)opacityStart=Number(slider.value);if(action.opacity!==undefined){if(getApp()?.state.selected){slider.value=Math.round(Math.max(0,Math.min(100,opacityStart+action.opacity*200)));slider.dispatchEvent(new Event('input',{bubbles:true}));}else status.textContent='请先选中一个组件';}}else opacityStart=null;
 }
 async function capture(token){if(!active||token!==generation)return;if(!busy&&video.readyState>=2){busy=true;try{const bitmap=await createImageBitmap(video);if(token!==generation){bitmap.close();return;}worker.postMessage({type:'frame',bitmap,time:performance.now()},[bitmap]);watchdog=setTimeout(()=>end('识别超时，请重新开启'),15000);}catch{end('无法读取摄像头，请重新开启');return;}}timer=setTimeout(()=>capture(token),60);}
 start.onclick=async()=>{
  if(active)return;active=true;const token=++generation;start.disabled=true;stop.disabled=false;poseEnabled=false;status.textContent='正在请求摄像头权限';
  try{
   if(!isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('secure');
   const acquired=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:false});
   if(token!==generation){acquired.getTracks().forEach(t=>t.stop());return;}
   stream=acquired;stream.getVideoTracks()[0].addEventListener('ended',()=>{if(token===generation)end('摄像头已断开');});video.srcObject=stream;video.hidden=false;await video.play();if(token!==generation)return;
   fetch('/assets/armor/suit-up.glb',{cache:'force-cache'}).catch(()=>{});
   toggle.classList.add('active');status.textContent='正在加载本地手势模型';worker=new Worker('/hand-worker.js');watchdog=setTimeout(()=>end('模型加载超时，请重新开启'),60000);
   worker.onerror=()=>end('手势模型启动失败，请重新开启');
   worker.onmessage=({data})=>{if(token!==generation)return;if(data.type==='ready'){poseEnabled=!!data.poseEnabled;clearTimeout(watchdog);capture(token);}else if(data.type==='pose-warning'){poseEnabled=false;chestTap.reset();console.warn('Pose model:',data.message);}else if(data.type==='result'){clearTimeout(watchdog);busy=false;frames++;lastMS=data.ms;apply(data);if(token!==generation)return;clearTimeout(stale);stale=setTimeout(()=>{engine.reset();chestTap.suspend(performance.now());resetInteraction();opacityStart=null;clear();status.textContent='等待手势';},350);}else if(data.type==='error'){console.error('Hand model:',data.message);end('手势模型启动失败，请重新开启');}};
   worker.postMessage({type:'init'});
  }catch(error){if(token!==generation)return;end(error.name==='NotAllowedError'?'摄像头权限未开启，请在浏览器中允许摄像头':error.name==='NotFoundError'?'未找到摄像头':error.message==='secure'?'请通过 localhost 转发链接或 HTTPS 打开':'摄像头暂不可用，请检查系统权限或其他应用');}
 };
 document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!active||suiting)return;e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(video.readyState>=2){const fallback=Array.from({length:33},()=>({x:.5,y:.5}));fallback[0]={x:.5,y:.2};fallback[11]={x:.65,y:.4};fallback[12]={x:.35,y:.4};startSuit(lastPose||fallback);}else end();},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)end('页面进入后台，摄像头已关闭');});window.addEventListener('pagehide',()=>end());
 window.handControl={stop:()=>end(),debug:()=>({active,suiting,poseEnabled,suitPhase:suitSequence?.debug().phase,suit:suitSequence?.debug(),chest:chestTap.debug(),frames,inferenceMS:lastMS,tracks:stream?.getTracks().map(t=>t.readyState)||[],mode:status.textContent,timeMode:!!timeSession,dwell:dwell.fired})};
}
