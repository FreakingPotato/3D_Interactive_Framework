// Anatomical roles: raw camera frames are unmirrored; MediaPipe Hands labels
// assume mirrored input. Prefer a fresh, visible Pose wrist when available.
export const componentDigits=['membrane','dna','rna','ribosome','rnap','protein'];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function handSide(result,i){
 const wrist=result.landmarks[i][0],pose=result.pose;
 if(pose&&(result.poseAge??Infinity)<400){
  const candidates=[[15,'left'],[16,'right']].filter(([n])=>(pose[n]?.visibility||0)>.65).map(([n,side])=>({side,d:distance(wrist,pose[n])})).sort((a,b)=>a.d-b.d);
  if(candidates[0]?.d<.12&&(!candidates[1]||candidates[1].d-candidates[0].d>.05))return candidates[0].side;
 }
 const label=result.handedness?.[i]?.[0];
 if(!label||label.score<.7)return 'unknown';
 return label.categoryName==='Right'?'left':label.categoryName==='Left'?'right':'unknown';
}
export function fingerDigit(l){
 const width=Math.max(.025,distance(l[5],l[17]));
 const f=[8,12,16,20].map(t=>distance(l[t],l[0])>distance(l[t-2],l[0])*1.18);
 const thumb=distance(l[4],l[5])>width*.6&&distance(l[4],l[2])>width*.55;
 if(f.every(Boolean))return thumb?5:4;
 if(!f[0]&&!f[1]&&!f[2]&&f[3]&&thumb)return 6;
 if(f[0]&&f[1]&&f[2]&&!f[3])return 3;
 if(f[0]&&f[1]&&!f[2]&&!f[3])return thumb?3:2;
 if(f[0]&&!f[1]&&!f[2]&&!f[3]&&!thumb)return 1;
 return null;
}
export class ComponentHold{
 reset(){this.digit=null;this.start=0;this.last=0;this.fired=false;}
 constructor(){this.reset();}
 update(digit,time){
  if(!digit){this.reset();return {};}
  if(digit!==this.digit||time-this.last>350){this.digit=digit;this.start=time;this.fired=false;}
  this.last=time;const progress=Math.min(1,(time-this.start)/700);
  if(progress===1&&!this.fired){this.fired=true;return {digit,progress,select:componentDigits[digit-1]};}
  return {digit,progress};
 }
}
