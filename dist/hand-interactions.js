export class DwellSelection{
 constructor(){this.reset();}
 reset(){this.key=null;this.start=0;this.anchor=null;this.fired=false;}
 update(key,p,time){
  if(!key){this.reset();return {progress:0};}
  if(key!==this.key){this.key=key;this.start=time;this.anchor={...p};this.fired=false;}
  if(this.fired)return {progress:1};
  if(Math.hypot(p.x-this.anchor.x,p.y-this.anchor.y)>28){this.start=time;this.anchor={...p};}
  const progress=Math.min(1,(time-this.start)/1000);
  if(progress===1){this.fired=true;return {progress,click:{...this.anchor}};}
  return {progress};
 }
}
export function timeFromTurn(turn,anchor,min,max){const v=Math.max(-1,Math.min(1,turn));return v<0?anchor+(anchor-min)*v:anchor+(max-anchor)*v;}
