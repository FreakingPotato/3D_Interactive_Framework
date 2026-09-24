// Pure, camera-independent recognizer. Distances are normalized by palm width.
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class HandGestures{
 constructor(){this.reset();}
 reset(){this.previous=null;this.pinch=null;this.cursor=null;this.last=0;this.palm=null;this.still=null;this.timeMode=null;}
 update(hands,time){
  if(!hands?.length||hands.length>2||time-this.last>300){this.reset();}
  this.last=time;
  if(!hands?.length)return {mode:'waiting'};
  const info=hands.map(l=>{const width=Math.max(.025,dist(l[5],l[17]));const extended=[8,12,16,20].map((tip,i)=>dist(l[tip],l[0])>dist(l[tip-2],l[0])*1.18);const thumb={x:l[4].x-l[2].x,y:l[4].y-l[2].y},index={x:l[8].x-l[5].x,y:l[8].y-l[5].y};const thumbLength=Math.hypot(thumb.x,thumb.y),indexLength=Math.hypot(index.x,index.y),cosine=(thumb.x*index.x+thumb.y*index.y)/Math.max(.0001,thumbLength*indexLength);const lShape=extended[0]&&!extended[1]&&!extended[2]&&!extended[3]&&thumbLength>width*.55&&dist(l[4],l[5])>width*.6&&thumbLength/Math.max(.0001,dist(l[2],l[3])+dist(l[3],l[4]))>.8&&cosine>-.6&&cosine<.65;return {l,width,lShape,fist:extended.every(v=>!v),angle:Math.atan2(-(l[9].x-l[0].x),-(l[9].y-l[0].y)),open:extended.every(Boolean),point:extended[0]&&!extended[1]&&!extended[2]&&!extended[3],pinch:dist(l[4],l[8])/width,p:{x:1-(l[0].x+l[5].x+l[9].x+l[17].x)/4,y:(l[0].y+l[5].y+l[9].y+l[17].y)/4},cursor:{x:1-l[8].x,y:l[8].y}};});
  const out={mode:'waiting'};
  if(info.length===2){this.still=null;this.timeMode=null;this.palm=null;this.pinch=null;this.cursor=null;const distance=dist(info[0].p,info[1].p);if(info.every(h=>h.lShape)&&distance>.12){out.mode='cut';if(this.previous?.mode!=='cut'||Math.abs(distance-this.previous.raw)>.18){this.previous={mode:'cut',anchor:distance,distance,raw:distance};out.cutStart=true;}else{this.previous.distance=this.previous.distance*.6+distance*.4;this.previous.raw=distance;}const delta=this.previous.distance-this.previous.anchor;out.cutOffset=Math.abs(delta)<.008?0:delta*150;}else if(info.every(h=>h.open)&&distance>.12){out.mode='zoom';if(this.previous?.mode==='zoom')out.zoom=clamp(Math.log(distance/this.previous.distance),-.12,.12);this.previous={mode:'zoom',distance};}else this.previous=null;return out;}
  const h=info[0];
  const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  if(this.timeMode){
   if(h.fist){this.reset();this.last=time;return {mode:'time-exit'};}
   if(dist(this.timeMode.p,h.p)>.3){this.reset();this.last=time;return out;}
   if(h.open){const turn=clamp(angleDelta(h.angle,this.timeMode.angle)/(Math.PI/2),-1,1);this.timeMode.turn=this.timeMode.turn*.55+turn*.45;return {mode:'time',turn:Math.abs(turn)>.98?Math.sign(turn):Math.abs(this.timeMode.turn)<.025?0:this.timeMode.turn,palm:h.p,width:h.width};}
   return {mode:'time',palm:h.p,width:h.width};
  }
  if(h.open&&h.pinch>.43){
   if(!this.still||dist(this.still.p,h.p)>.025||Math.abs(angleDelta(h.angle,this.still.angle))>.12)this.still={p:h.p,angle:h.angle,start:time};
   out.hold=Math.max(0,Math.min(1,(time-this.still.start-450)/3000));out.palm=h.p;out.width=h.width;
   if(out.hold===1){this.timeMode={p:h.p,angle:h.angle,turn:0};this.pinch=null;this.previous=null;return {mode:'time',entered:true,turn:0,palm:h.p,width:h.width};}
  }else this.still=null;
  if(this.palm&&dist(this.palm,h.p)>.18){this.pinch=null;this.previous=null;this.cursor=null;this.palm=h.p;return out;}
  this.palm=h.p;
  if(h.pinch<.26||this.pinch&&h.pinch<.43){
   this.previous=null;
   if(!this.pinch)this.pinch={start:time,anchor:{...(this.cursor||h.cursor)},palm:h.p.x,drag:false};
   const p=this.pinch,delta=h.p.x-p.palm;
   if(Math.abs(delta)>.035)p.drag=true;
   out.mode=p.drag?'opacity':'pinch';out.cursor=p.anchor;
   if(p.drag)out.opacity=delta;
   return out;
  }
  if(this.pinch){this.pinch=null;this.previous=null;}
  if(h.point){out.mode='pointer';this.cursor=this.cursor?{x:this.cursor.x*.45+h.cursor.x*.55,y:this.cursor.y*.45+h.cursor.y*.55}:h.cursor;out.cursor=this.cursor;this.previous=null;}
  else if(h.open){out.mode='rotate';if(this.previous?.mode==='rotate'){const dx=h.p.x-this.previous.p.x,dy=h.p.y-this.previous.p.y;if(Math.hypot(dx,dy)<.18)out.rotate={x:dx*7,y:dy*7};}this.previous={mode:'rotate',p:h.p};this.cursor=null;}
  else{this.previous=null;this.cursor=null;}
  return out;
 }
}
