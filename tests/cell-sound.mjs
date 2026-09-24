import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {sampleSound} from '../dist/cell-sound.js';
const sample={system:'minimal',ready:true,time:0,selected:null,rows:[{time:0,active_ribosomes:7}],meta:{species:[{id:1,component:'protein'},{id:2,component:'protein'},{id:3,component:'ribosome'}]},frame:{counts:[200,300,10],volume:.3,dna_voxel_count:100}};
assert.equal(sampleSound(sample).counts.protein,500);assert.equal(sampleSound(sample).activity.ribosome,7);assert.equal(sampleSound({...sample,selected:'protein',species:2}).counts.protein,300);assert.equal(sampleSound({...sample,frame:null}).ready,false);
assert.equal(sampleSound({ready:true,time:4,rows:[{time:0,atp:2},{time:5,atp:8}]}).counts.metabolite,2);
const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/sound-test',r=>r.fulfill({contentType:'text/html',body:'<div class="header-right"></div><script type="module">import {initCellSound} from "/cell-sound-control.js";window.app={state:{}};initCellSound(()=>app);</script>'}));
 await page.goto((process.env.APP_URL||'http://127.0.0.1:8766')+'/sound-test');await page.waitForFunction(()=>window.cellSound);
 await page.evaluate(state=>app.state={...state,playing:true,speed:10},sample);
 assert.equal(await page.evaluate(()=>cellSound.debug().enabled),false);
 await page.locator('#cell-sound-toggle').click();await page.locator('#cell-sound-enable').click();await page.waitForTimeout(1300);
 let d=await page.evaluate(()=>cellSound.debug());assert.equal(d.context,'running');assert(d.rms>.0001);assert(d.peak<.81);assert.equal(d.voices,32);
 await page.evaluate(()=>{app.state.selected='protein';});await page.waitForTimeout(1000);d=await page.evaluate(()=>cellSound.debug());assert(d.targets.protein>0);assert(Object.entries(d.targets).every(([id,v])=>id==='protein'||v===0));assert(d.rms>0);
 await page.evaluate(()=>app.state.playing=false);await page.waitForTimeout(1700);d=await page.evaluate(()=>cellSound.debug());assert(d.rms<.00001);
 await page.locator('#cell-sound-preview').click();await page.waitForTimeout(500);assert((await page.evaluate(()=>cellSound.debug())).rms>.0001);
 await page.locator('#cell-sound-enable').click();await page.waitForTimeout(1700);assert((await page.evaluate(()=>cellSound.debug())).rms<.00001);
 const offline=await page.evaluate(async()=>{
  const {CellSoundEngine}=await import('/cell-sound.js');const results={};
  for(const id of ['all','membrane','rna','protein']){
   const ctx=new OfflineAudioContext(2,48000*3,48000),engine=new CellSoundEngine(ctx);
   engine.update({ready:true,counts:{membrane:1,dna:500,ribosome:1000,rnap:200,rna:1000,protein:60000,metabolite:1000000,state:1000},activity:{},selected:id==='all'?null:id},{volume:1});
   const rendered=await ctx.startRendering();let peak=0,sq=0,diff=0,cross=0;const a=rendered.getChannelData(0),b=rendered.getChannelData(1);for(let i=24000;i<a.length;i++){peak=Math.max(peak,Math.abs(a[i]),Math.abs(b[i]));sq+=a[i]*a[i];diff+=(a[i]-a[i-1])**2;cross+=(a[i]-b[i])**2;}results[id]={peak,rms:Math.sqrt(sq/(a.length-24000)),roughness:diff/sq,stereo:cross/sq};engine.dispose();
  }return results;
 });
 for(const x of Object.values(offline)){assert(x.peak<.81);assert(x.rms>.001);assert(x.stereo>.01);}assert(offline.rna.roughness>offline.membrane.roughness*5);assert(offline.protein.roughness>offline.membrane.roughness);
 console.log(offline);await page.evaluate(()=>cellSound.dispose());assert.deepEqual(errors,[]);
 console.log('PASS quantity/activity mapping, species isolation, click-to-start, bounded 32 voices, measured output, solo, pause/mute, preview, offline spectral differentiation, stereo and peak bound');
}finally{await browser.close();}
