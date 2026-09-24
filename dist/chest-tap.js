// Visual approach/release only. Monocular depth is a relative cue, never a contact gate.
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function isClosedFist(l){
 if(l?.length!==21)return false;
 const folded=[8,12,16,20].map(t=>{const a=l[t-3],b=l[t-2],c=l[t];const ux=b.x-a.x,uy=b.y-a.y,vx=c.x-b.x,vy=c.y-b.y;const bend=(ux*vx+uy*vy)/Math.max(.00001,Math.hypot(ux,uy)*Math.hypot(vx,vy));return d(c,l[0])<d(b,l[0])*1.12||bend<.15;});
 return folded[0]&&folded.filter(Boolean).length>=3;
}
// Two extended fingers, with ring and little fingers folded. Thumb is unrestricted.
export function isTwoFingerTap(l){
 if(l?.length!==21)return false;
 const extended=t=>d(l[t],l[0])>d(l[t-2],l[0])*1.12;
 return extended(8)&&extended(12)&&!extended(16)&&!extended(20);
}
export class ChestTap{
 constructor(){this.reset();}
 reset(){this.last=0;this.valid=0;this.count=0;this.first=0;this.armed=false;this.insideSince=null;this.latched=false;this.depthHigh=null;this.contactDepth=null;this.lastDepth=null;this.contactPoint=null;this.returnGate=null;this.feedback={body:false,right:false,fist:false,count:0,reason:'body'};}
 suspend(now,reason='tracking'){
  const feedback=this.feedback;if(now-this.valid>700)this.reset();
  this.armed=false;this.insideSince=null;this.depthHigh=null;this.lastDepth=null;
  if(this.count){this.latched=true;this.returnGate=null;}this.feedback={...feedback,count:this.count,reason};return false;
 }
 debug(){return {...this.feedback,count:this.count};}
 update(result,now){
  if(now-this.last>700)this.reset();this.last=now;
  const p=result.pose,w=result.poseWorld;
  this.feedback={body:false,right:false,fist:false,count:this.count,reason:'body'};
  if(!p||result.poseAge>450||![11,12].every(i=>p[i]&&(p[i].visibility??0)>.45))return this.suspend(now,'body');
  const width=d(p[11],p[12]);if(width<.08)return this.suspend(now,'distance');
  const mid={x:(p[11].x+p[12].x)/2,y:(p[11].y+p[12].y)/2};
  const down={x:-(p[11].y-p[12].y)/width,y:(p[11].x-p[12].x)/width};if(down.y<0){down.x*=-1;down.y*=-1;}
  const chest={x:mid.x+down.x*width*.32,y:mid.y+down.y*width*.32};
  this.feedback={...this.feedback,body:true,chest,zoneRadius:width*.4};
  if(!p[16]||(p[16].visibility??0)<.35)return this.suspend(now,'right');
  const hand=(result.landmarks||[]).filter(l=>d(l[0],p[16])<width*.65&&(!(p[15]?.visibility>.45)||d(l[0],p[16])<d(l[0],p[15])*.95)).sort((a,b)=>d(a[0],p[16])-d(b[0],p[16]))[0];
  if(!hand)return this.suspend(now,'right');
  const fist={x:(hand[8].x+hand[12].x)/2,y:(hand[8].y+hand[12].y)/2};
  this.feedback={...this.feedback,right:true,handCenter:fist};
  if(!isTwoFingerTap(hand))return this.suspend(now,'fist');
  this.valid=now;this.feedback.fist=true;
  if(this.count&&now-this.first>4000){this.count=0;this.first=0;}
  const radius=d(fist,chest)/width;
  let depth=null;if(w?.[16]&&w[11]&&w[12]){const span=Math.hypot(w[11].x-w[12].x,w[11].y-w[12].y,w[11].z-w[12].z);if(span>.1)depth=Math.abs(w[16].z-(w[11].z+w[12].z)/2)/span;}
  if(!Number.isFinite(depth))depth=null;
  if(this.count&&this.contactPoint){
   const excursion=d(fist,this.contactPoint)/width;
   if(this.latched&&excursion>.10){this.latched=false;this.armed=false;this.returnGate='image';this.insideSince=null;}
   if(this.returnGate==='image'&&excursion<.055){this.armed=true;this.returnGate=null;}
  }
  if(depth!==null&&radius<.55){
   if(this.lastDepth!==null&&Math.abs(depth-this.lastDepth)>.8){this.depthHigh=depth;this.insideSince=null;}else{
    this.depthHigh=Math.max(this.depthHigh??depth,depth);
    if(this.latched&&this.contactDepth!==null&&depth-this.contactDepth>(this.count ? .06 : .12)){this.latched=false;this.armed=false;this.insideSince=null;this.depthHigh=depth;this.returnGate='depth';}
    if(!this.latched&&this.returnGate!=='image'&&this.depthHigh-depth>(this.count ? .06 : .12)){this.armed=true;this.returnGate=null;}
   }
   this.lastDepth=depth;
  }
  const inside=radius<.4,outside=radius>.6;
  this.feedback={...this.feedback,radius,depth,count:this.count,reason:this.latched?'away':this.returnGate?'return':this.armed?'approach':'away'};
  if(outside){this.returnGate=null;this.armed=true;this.latched=false;this.insideSince=null;this.feedback.reason='approach';return false;}
  if(!inside){this.insideSince=null;return false;}
  if(!this.armed||this.latched)return false;
  this.feedback.reason='hold';
  if(this.insideSince===null){this.insideSince=now;return false;}
  if(now-this.insideSince<45)return false;
  this.latched=true;this.armed=false;this.insideSince=null;this.contactDepth=depth;this.depthHigh=depth;this.contactPoint={...fist};this.returnGate=null;
  if(!this.count){this.count=1;this.first=now;this.feedback={...this.feedback,count:1,reason:'second'};return false;}
  if(now-this.first<180)return false;
  this.reset();return true;
 }
}
