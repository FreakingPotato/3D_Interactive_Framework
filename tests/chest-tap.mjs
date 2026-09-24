import assert from 'node:assert/strict';
import {ChestTap} from '../dist/chest-tap.js';
export function sample({inside=false,left=false,open=false,fist=false,depth=null}={}){
 const pose=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:.99}));pose[0]={x:.5,y:.2,visibility:.99};pose[11]={x:.65,y:.4,z:0,visibility:.99};pose[12]={x:.35,y:.4,z:0,visibility:.99};pose[15]={x:.8,y:.65,z:0,visibility:.99};const wrist={x:inside?.5:.2,y:inside?.51:.6,z:0,visibility:.99};pose[left?15:16]=wrist;if(left)pose[16]={x:.2,y:.7,visibility:.99};
 const hand=Array.from({length:21},()=>({x:wrist.x,y:wrist.y-.035}));hand[0]={...wrist};for(let i=0;i<4;i++){const b=5+i*4;hand[b]={x:wrist.x+(i-1.5)*.015,y:wrist.y-.025};hand[b+1]={x:wrist.x+(i-1.5)*.015,y:wrist.y-.08};hand[b+2]={x:wrist.x+(i-1.5)*.015,y:wrist.y-.04};hand[b+3]={x:wrist.x+(i-1.5)*.015,y:wrist.y-(open?.15:!fist&&i<2?.115:.018)};}
 let poseWorld=null;if(depth!==null){poseWorld=pose.map(p=>({...p}));poseWorld[16].z=-depth*.3;}
 return {landmarks:[hand],pose,poseWorld,poseAge:0};
}
function run(steps){const detector=new ChestTap();let now=1000;return steps.map(([options,dt=100])=>detector.update(sample(options),now+=dt));}
assert.deepEqual(run([[{}],[{inside:true}],[{inside:true}],[{inside:true}],[{}],[{inside:true}],[{inside:true}]]),[false,false,false,false,false,false,true]);
assert(!run(Array.from({length:15},()=>[{inside:true}])).some(Boolean));
assert(!run([[{left:true}],[{left:true,inside:true}],[{left:true,inside:true}],[{left:true}],[{left:true,inside:true}],[{left:true,inside:true}]]).some(Boolean));
assert(!run([[{}],[{inside:true,open:true}],[{inside:true,open:true}],[{}],[{inside:true,open:true}]]).some(Boolean));
assert(!run([[{}],[{inside:true}],[{inside:true}],[{},900],[{inside:true}],[{inside:true}]]).some(Boolean));
const depthRun=run([[{inside:true,depth:.55}],[{inside:true,depth:.3}],[{inside:true,depth:.3}],[{inside:true,depth:.52}],[{inside:true,depth:.52}],[{inside:true,depth:.3}],[{inside:true,depth:.3}]]);assert.equal(depthRun.at(-1),true);assert.equal(depthRun.slice(0,-1).some(Boolean),false);
const lost=new ChestTap();lost.update(sample(),1000);const weak=sample({inside:true});weak.pose[12].visibility=.1;assert.equal(lost.update(weak,1100),false);assert.equal(lost.update(sample({inside:true}),1200),false);assert.equal(lost.update(sample({inside:true}),1300),false);
console.log('PASS right two-finger two distinct taps, depth-only taps, left hand/open hand/hold/loss/low confidence rejection');

// Absolute depth estimates can be offset. Spatial taps must still work.
assert.equal(run([[{depth:1.4}],[{inside:true,depth:1.4}],[{inside:true,depth:1.4}],[{depth:1.4}],[{inside:true,depth:1.4}],[{inside:true,depth:1.4}]]).at(-1),true);
const brief=new ChestTap();let ts=1000;for(const inside of [false,true,true])brief.update(sample({inside}),ts+=100);assert.equal(brief.debug().count,1);brief.update({...sample(),landmarks:[]},ts+=100);assert.equal(brief.debug().count,1);assert.equal(brief.debug().reason,'right');brief.update(sample(),ts+=100);brief.update(sample({inside:true}),ts+=100);assert.equal(brief.update(sample({inside:true}),ts+=100),true);
const empty=new ChestTap();empty.update({landmarks:[]},1000);assert.equal(empty.debug().reason,'body');const located=sample();located.pose[16].visibility=.42;empty.update(located,1100);assert(empty.debug().right);assert(empty.debug().fist);assert(empty.debug().chest);console.log('PASS absolute-depth offset, brief occlusion, moderate wrist confidence and actionable recognition feedback');

assert.equal(run([[{inside:true,depth:1.55}],[{inside:true,depth:1.3}],[{inside:true,depth:1.3}],[{inside:true,depth:1.52}],[{inside:true,depth:1.52}],[{inside:true,depth:1.3}],[{inside:true,depth:1.3}]]).at(-1),true);console.log('PASS relative depth tapping remains valid despite absolute depth bias');
function shifted(dx){const r=sample({inside:true,depth:.3});r.pose[16].x+=dx;r.landmarks[0].forEach(p=>p.x+=dx);return r;}
const small=new ChestTap();let smallTime=1000;for(const input of [sample(),sample({inside:true,depth:.3}),sample({inside:true,depth:.3})])small.update(input,smallTime+=100);assert.equal(small.debug().count,1);small.update(shifted(.04),smallTime+=100);assert.equal(small.debug().reason,'return');small.update(shifted(0),smallTime+=100);assert.equal(small.update(shifted(0),smallTime+=100),true);
assert.equal(run([[{inside:true,depth:.55}],[{inside:true,depth:.3}],[{inside:true,depth:.3}],[{inside:true,depth:.38}],[{inside:true,depth:.38}],[{inside:true,depth:.3}],[{inside:true,depth:.3}]]).at(-1),true);
assert(!run(Array.from({length:25},()=>[{inside:true,depth:.3}])).some(Boolean));console.log('PASS small in-zone retreat/return and small depth pulse count second tap; stationary fist never doubles');

assert(!run([[{fist:true}],[{inside:true,fist:true}],[{inside:true,fist:true}],[{fist:true}],[{inside:true,fist:true}],[{inside:true,fist:true}]]).some(Boolean));
console.log('PASS fist no longer triggers exit');
