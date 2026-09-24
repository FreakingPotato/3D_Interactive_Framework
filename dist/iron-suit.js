// A frozen in-memory camera frame; 3D resources load only after the secret trigger.
export function playIronSuit(video,pose,{onComplete}={}){
 const width=video.videoWidth||video.width,height=video.videoHeight||video.height;
 if(!width||!height)throw new Error('Camera frame unavailable');
 const wrap=video.closest('.hand-video-wrap'),oldAspect=wrap.style.aspectRatio,oldHeight=wrap.style.height;
 wrap.style.height=`${wrap.getBoundingClientRect().height}px`;wrap.style.aspectRatio=`${width}/${height}`;
 const el=document.createElement('div');el.id='iron-suit';el.dataset.phase='loading';
 el.innerHTML='<div class="iron-screen"><canvas class="iron-freeze"></canvas><div class="iron-armor"></div></div><button class="iron-dismiss" aria-label="关闭" title="关闭">×</button>';
 const canvas=el.querySelector('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.translate(width,0);ctx.scale(-1,1);ctx.drawImage(video,0,0,width,height);
 wrap.append(el);let done=false,view=null,frame=0,timer=0,start=0;
 function dispose(){cancelAnimationFrame(frame);clearTimeout(timer);view?.dispose();el.remove();wrap.style.aspectRatio=oldAspect;wrap.style.height=oldHeight;canvas.width=canvas.height=0;document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',hidden);}
 function finish(){if(done)return;done=true;dispose();onComplete?.();}
 function key(e){if(e.key==='Escape'){e.preventDefault();finish();}}
 function hidden(){if(document.hidden)finish();}
 el.querySelector('button').onclick=finish;document.addEventListener('keydown',key);document.addEventListener('visibilitychange',hidden);
 timer=setTimeout(finish,30000);
 import('./iron-suit-view.js').then(async({createArmorView})=>{
  if(done)return;const loaded=await createArmorView(el.querySelector('.iron-armor'),pose,width,height);
  if(done){loaded.dispose();return;}view=loaded;start=performance.now();clearTimeout(timer);timer=setTimeout(finish,11000);
  function tick(now){if(done)return;const t=(now-start)/1000;el.dataset.phase=t>=7?'crt':t>=4.9?'salute':t>=4.2?'assembled':'assembly';if(t>=7)el.classList.add('crt-off');view.render(Math.min(t,7));if(t>=8.1){finish();return;}frame=requestAnimationFrame(tick);}
  frame=requestAnimationFrame(tick);
 }).catch(error=>{console.error('Armor asset:',error);finish();});
 return {cancel(){if(done)return;done=true;dispose();},debug:()=>({phase:el.dataset.phase,frozen:true,width:canvas.width,height:canvas.height,...view?.debug()})};
}
