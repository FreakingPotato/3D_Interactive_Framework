import assert from 'node:assert/strict';
import {HandGestures} from '../dist/hand-gestures.js';
function hand(kind='open',x=0){const a=Array.from({length:21},()=>({x:.5+x,y:.7}));a[0]={x:.5+x,y:.9};for(let f=0;f<4;f++){const base=5+f*4;for(let j=0;j<4;j++)a[base+j]={x:.38+f*.08+x,y:.65-j*.13};if(kind!=='open'&&f>0)a[base+3].y=.8;}a[4]={x:.2+x,y:.5};if(kind==='pinch')a[4]={...a[8],x:a[8].x+.015};return a;}
const e=new HandGestures();let t=0;const u=(h,dt=80)=>e.update(h,t+=dt);
assert.equal(u([hand()]).mode,'rotate');assert(u([hand('open',.03)]).rotate.x<0);
u([]);assert.equal(u([hand()]).rotate,undefined);
u([hand(),hand('open',.3)]);assert(u([hand('open',-.05),hand('open',.35)]).zoom>0);
u([]);assert.equal(u([hand('point')]).mode,'pointer');assert.equal(u([hand('pinch')]).click,undefined);assert.equal(u([hand('point')]).click,undefined);assert.equal(u([hand('point')]).click,undefined);
u([hand('pinch')]);assert.equal(u([hand('pinch',.1)]).mode,'opacity');assert.equal(u([hand('point',.1)]).click,undefined);
u([hand('pinch')]);u([]);assert.equal(u([hand('point')]).click,undefined);
u([hand('pinch')]);assert.equal(u([hand('point')],400).click,undefined);
console.log('PASS rotation, zoom, index cursor, pinch never clicks, opacity drag, lost tracking and stale frame cancellation');
u([]);u([hand('point')]);u([hand('pinch')]);assert.equal(u([hand('point',.4)]).click,undefined);
u([]);u([hand('pinch')]);u([hand(),hand('open',.3)]);assert.equal(u([hand('point')]).click,undefined);
console.log('PASS discontinuous hand position and two-hand transition cancel pending selection');

import {DwellSelection,timeFromTurn} from '../dist/hand-interactions.js';
const dwell=new DwellSelection(),p={x:100,y:100};
assert.equal(dwell.update('play',p,0).progress,0);
assert.equal(dwell.update('play',{x:104,y:105},999).click,undefined);
assert(dwell.update('play',p,1000).click);
assert.equal(dwell.update('play',p,6000).click,undefined);
dwell.update(null,p,6100);dwell.update('play',p,6200);assert(dwell.update('play',p,8200).click);
dwell.reset();dwell.update('play',p,0);assert.equal(dwell.update('play',{x:160,y:100},1900).progress,0);
assert.equal(timeFromTurn(-1,20,0,100),0);assert.equal(timeFromTurn(0,20,0,100),20);assert.equal(timeFromTurn(1,20,0,100),100);assert.equal(timeFromTurn(-.5,20,0,100),10);assert.equal(timeFromTurn(.5,20,0,100),60);
u([]);let mode;for(let i=0;i<45;i++)mode=u([hand()]);assert.equal(mode.mode,'time');
function turnHand(angle){const l=hand(),c=l[9];return l.map(p=>({x:c.x+(p.x-c.x)*Math.cos(angle)-(p.y-c.y)*Math.sin(angle),y:c.y+(p.x-c.x)*Math.sin(angle)+(p.y-c.y)*Math.cos(angle)}));}
assert.equal(u([turnHand(Math.PI/2)]).turn,-1);assert.equal(u([turnHand(-Math.PI/2)]).turn,1);
const fist=hand();for(const tip of [8,12,16,20])fist[tip]={x:.5,y:.8};assert.equal(u([fist]).mode,'time-exit');
u([]);for(let i=0;i<20;i++)u([hand()]);u([]);assert.notEqual(u([hand()]).mode,'time');
console.log('PASS dwell timing/rearm/jitter, asymmetric time endpoints, 3-second activation, ±90° turn, fist exit and lost-hand reset');
function L(x=0){const l=hand('point',x);l[2]={x:.4+x,y:.64};l[3]={x:.3+x,y:.64};l[4]={x:.2+x,y:.64};return l;}
u([]);let cut=u([L(-.15),L(.15)]);assert.equal(cut.mode,'cut');assert.equal(cut.cutOffset,0);assert(cut.cutStart);cut=u([L(-.2),L(.2)]);assert(cut.cutOffset>0);assert.equal(cut.zoom,undefined);assert.equal(cut.cursor,undefined);
u([L(-.15),L(.15)]);for(let i=0;i<8;i++)cut=u([L(-.1),L(.1)]);assert(cut.cutOffset<0);
u([]);cut=u([L(-.25),L(.25)]);assert.equal(cut.cutOffset,0);assert(cut.cutStart);
cut=u([L(-.4),L(.4)]);assert.equal(cut.cutOffset,0);assert(cut.cutStart);
assert.equal(u([L(),hand('open',.3)]).mode,'waiting');
const folded=L();folded[4]={...folded[2]};assert.equal(u([folded,L(.3)]).mode,'waiting');
u([hand(),hand('open',.3)]);assert.equal(u([hand('open',-.03),hand('open',.33)]).mode,'zoom');
console.log('PASS two L hands: baseline, apart/together, no zoom or cursor, loss/jump reset, mixed/folded-thumb rejection, open-palm zoom preserved');

u([]);for(let i=0;i<24;i++){const moving=u([hand('open',i*.01)]);assert.equal(moving.hold,0);assert.notEqual(moving.mode,'time');}u([]);for(let i=0;i<5;i++)assert.equal(u([hand()]).hold,0);console.log('PASS moving palm never starts countdown; settling delay before preview-only countdown');
