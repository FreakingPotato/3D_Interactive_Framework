import assert from 'node:assert/strict';
import {fingerDigit,handSide,ComponentHold,componentDigits} from '../dist/hand-components.js';
function hand(n){const l=Array.from({length:21},()=>({x:.5,y:.65}));l[0]={x:.5,y:.9};for(let f=0;f<4;f++){for(let j=0;j<4;j++)l[5+f*4+j]={x:.38+f*.08,y:.65-j*.13};if(!(n===6?f===3:f<Math.min(n,4)))l[8+f*4].y=.8;}l[2]={x:.4,y:.65};l[4]=n>=5?{x:.2,y:.5}:{...l[5]};return l;}
for(let i=1;i<=6;i++)assert.equal(fingerDigit(hand(i)),i);
assert.equal(fingerDigit(hand(0)),null);
const h=new ComponentHold();assert.equal(h.update(3,0).select,undefined);for(let t=100;t<700;t+=100)assert.equal(h.update(3,t).select,undefined);assert.equal(h.update(3,700).select,'rna');assert.equal(h.update(3,800).select,undefined);assert.equal(h.update(2,900).select,undefined);assert.equal(h.update(2,1700).select,undefined);h.update(null,1800);assert.equal(h.digit,null);
assert.deepEqual(componentDigits,['membrane','dna','rna','ribosome','rnap','protein']);
const result={landmarks:[hand(1)],handedness:[[{categoryName:'Right',score:.95}]]};assert.equal(handSide(result,0),'left');result.handedness[0][0].categoryName='Left';assert.equal(handSide(result,0),'right');result.handedness[0][0].score=.5;assert.equal(handSide(result,0),'unknown');result.pose=Array.from({length:33},()=>({x:0,y:0,visibility:0}));result.pose[15]={...result.landmarks[0][0],visibility:1};result.poseAge=100;assert.equal(handSide(result,0),'left');result.poseAge=500;assert.equal(handSide(result,0),'unknown');console.log('PASS digits 1–6, mapping, hold/rearm/tracking gap, mirrored labels and fresh pose roles');

import {StableHandRoles} from '../dist/hand-components.js';
import {HandGestures} from '../dist/hand-gestures.js';
const roles=new StableHandRoles(),engine=new HandGestures();
const packet=(side='right',n=5)=>({landmarks:[hand(n)],handedness:[[{categoryName:side==='right'?'Left':'Right',score:.99}]]});
let action;
for(let t=0;t<=4200;t+=80){
 const result=packet(t<1000?'right':'left',t<1000?5:4);
 const sides=roles.update(result,t,{lockRight:!!engine.still||!!engine.timeMode});
 action=engine.update(sides[0]==='right'?result.landmarks:[],t);
 if(t>=240)assert.equal(sides[0],'right');
}
assert.equal(action.mode,'time','mislabelled left 4 must not cancel right-hand countdown');
assert.deepEqual(roles.update({landmarks:[]},4300,{lockRight:true}),[]);
for(let t=4400;t<=4720;t+=80)roles.update(packet('left',4),t);
assert.equal(roles.tracks[0].side,'left','real left hand after release can select 4');
roles.reset();for(let t=0;t<=240;t+=80)roles.update(packet(),t);
assert.equal(roles.update(packet('left'),320)[0],'right','single label flip ignored');
for(let t=400;t<=1120;t+=80)roles.update(packet('left'),t);
assert.equal(roles.tracks[0].side,'left','persistent evidence corrects a role outside time mode');
const moved=packet();moved.landmarks[0]=moved.landmarks[0].map(p=>({...p,x:p.x+.4}));assert.equal(roles.update(moved,1200,{lockRight:true})[0],'unknown');
roles.reset();const left=packet('left'),right=packet();right.landmarks[0]=right.landmarks[0].map(p=>({...p,x:p.x+.4}));
const pair={landmarks:[left.landmarks[0],right.landmarks[0]],handedness:[left.handedness[0],right.handedness[0]]};for(let t=0;t<=240;t+=80)roles.update(pair,t);
assert.deepEqual(roles.update({landmarks:[...pair.landmarks].reverse(),handedness:[...pair.handedness].reverse()},320),['right','left']);
console.log('PASS stable roles: left-4 mislabels throughout countdown, loss/re-entry, normal role correction, jumps and reordered detections');
