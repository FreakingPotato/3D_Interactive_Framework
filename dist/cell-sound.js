// Procedural sonification, not measured molecular acoustics. Fixed voice budget.
export const soundProfiles={
 membrane:{name:'细胞包膜',hz:95,q:.65,grain:.65,rate:5,ref:1,texture:'低频涌动'},
 dna:{name:'DNA',hz:175,q:.7,grain:.35,rate:8,ref:500,texture:'缓慢粗粝摩擦'},
 ribosome:{name:'核糖体',hz:430,q:.8,grain:.065,rate:26,ref:1000,texture:'细密短促震颤'},
 rnap:{name:'RNA 聚合酶',hz:680,q:.65,grain:.16,rate:13,ref:200,texture:'连续细磨'},
 rna:{name:'RNA',hz:1150,q:.6,grain:.09,rate:20,ref:1000,texture:'轻柔沙沙'},
 protein:{name:'蛋白质',hz:290,q:.6,grain:.12,rate:32,ref:60000,texture:'密集柔和摩擦'},
 metabolite:{name:'代谢物',hz:1550,q:.5,grain:.035,rate:48,ref:1000000,texture:'细微流沙'},
 state:{name:'其他模型状态',hz:800,q:.55,grain:.2,rate:10,ref:1000,texture:'低沉散粒'}
};
const finite=v=>Number.isFinite(v)?Math.max(0,v):0;
export function sampleSound(state){
 let lo=0,hi=(state.rows?.length||0)-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(state.rows[m].time<=state.time)lo=m;else hi=m-1;}const row=state.rows?.[lo]||{};
 const counts={},activity={};
 if(state.system==='minimal'){
  if(!state.frame||!state.meta)return {counts,activity,selected:state.selected,ready:false};
  for(const s of state.meta.species||[]){if(s.component in soundProfiles)counts[s.component]=(counts[s.component]||0)+finite(state.frame.counts?.[s.id-1]);}
  counts.membrane=finite(state.frame.volume);counts.dna=finite(state.frame.dna_voxel_count);
  // RB count is an activity proxy; no invented reaction rates for proteins or RNA.
  if(Number.isFinite(row.active_ribosomes))activity.ribosome=finite(row.active_ribosomes);
  if(state.species&&state.selected){counts[state.selected]=finite(state.frame.counts?.[state.species-1]);delete activity[state.selected];}
 }else{
  Object.assign(counts,{membrane:finite(row.volume),dna:finite(row.forks),ribosome:finite(row.ribosomes),rnap:finite(row.rnap),rna:finite(row.rna),protein:row.protein_types?Object.values(row.protein_types).reduce((a,v)=>a+finite(v),0):finite(row.protein_mass),metabolite:finite(row.atp)});
  activity.ribosome=counts.ribosome;activity.rnap=counts.rnap;
 }
 return {counts,activity,selected:state.selected,ready:!!state.ready,refProtein:state.system!=='minimal'&&!row.protein_types?200:null};
}
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function grainBuffer(ctx,p,seed){
 const random=rng(seed),length=Math.floor(ctx.sampleRate*7.31),buffer=ctx.createBuffer(1,length,ctx.sampleRate),out=buffer.getChannelData(0),env=new Float32Array(length);
 // Overlapping aperiodic noise grains, wrapped at the loop boundary; no pitched samples.
 for(let t=0;t<7.31;t+=-Math.log(Math.max(.00001,random()))/p.rate){const start=Math.floor(t*ctx.sampleRate),n=Math.floor(p.grain*(.45+random())*ctx.sampleRate),a=.35+random()*.65;for(let j=0;j<n;j++)env[(start+j)%length]+=a*Math.sin(Math.PI*j/n)**2;}
 for(let i=0;i<length;i++)out[i]=(random()*2-1)*Math.min(1,env[i]*.55+.025);
 // Taper tiny boundary discontinuities; different offsets keep loop edges asynchronous.
 for(let i=0;i<128;i++){out[i]*=i/128;out[length-1-i]*=i/128;}
 return buffer;
}
export class CellSoundEngine{
 constructor(ctx,{destination=ctx.destination,profiles=soundProfiles}={}){
  this.ctx=ctx;this.profiles=profiles;this.layers={};this.sources=[];this.volume=.28;this.disposed=false;this.targets={};
  this.master=ctx.createGain();this.master.gain.value=0;
  const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=45;
  const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1600;lp.Q.value=.5;
  this.compressor=ctx.createDynamicsCompressor();this.compressor.threshold.value=-22;this.compressor.knee.value=16;this.compressor.ratio.value=5;this.compressor.attack.value=.015;this.compressor.release.value=.28;
  this.guard=ctx.createWaveShaper();const curve=new Float32Array(4097);for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1;curve[i]=.8*Math.tanh(x/.8);}this.guard.curve=curve;
  this.analyser=ctx.createAnalyser();this.analyser.fftSize=1024;
  this.master.connect(hp).connect(lp).connect(this.compressor).connect(this.guard).connect(this.analyser).connect(destination);this.nodes=[this.master,hp,lp,this.compressor,this.guard,this.analyser];
  let seed=47;for(const [id,p]of Object.entries(this.profiles)){
   const gain=ctx.createGain();gain.gain.value=0;gain.connect(this.master);const voices=[];
   const buffer=grainBuffer(ctx,p,seed++);
   for(let i=0;i<4;i++){
    const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;source.playbackRate.value=.88+i*.087;
    const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=p.hz*(.8+i*.14);filter.Q.value=p.q;
    const level=ctx.createGain();level.gain.value=0;const pan=ctx.createStereoPanner();pan.pan.value=[-.7,.55,-.25,.85][i];
    source.connect(filter).connect(level).connect(pan).connect(gain);source.start(0,i*1.631);this.sources.push(source);this.nodes.push(filter,level,pan);voices.push(level);
   }this.layers[id]={gain,voices};this.nodes.push(gain);
  }
 }
 ramp(param,value,tau=.09){param.setTargetAtTime(value,this.ctx.currentTime,tau);}
 update(sample,{audible=true,speed=1,volume=this.volume}={}){
  if(this.disposed)return;this.volume=Math.max(0,Math.min(1,volume));const enabled=audible&&sample.ready;
  this.ramp(this.master.gain,enabled?this.volume*1.5:0);
  const present=Object.keys(this.layers).filter(id=>(sample.counts[id]||0)>0&&(!sample.selected||sample.selected===id));
  for(const [id,layer]of Object.entries(this.layers)){
   const n=sample.counts[id]||0,p=this.profiles[id],ref=id==='protein'&&sample.refProtein?sample.refProtein:p.ref;
   const density=Math.min(1,Math.log1p(n)/Math.log1p(Math.max(2,ref)));
   const activity=sample.activity[id];const working=activity==null?1:Math.min(1,Math.sqrt(activity/Math.max(1,n)));
   const gain=present.includes(id)?(.35+.65*density)*working/Math.sqrt(Math.max(1,present.length)):0;
   this.targets[id]=enabled?gain:0;this.ramp(layer.gain.gain,gain,.055);
   const fullness=Math.min(4,1+density*2.6+Math.log2(Math.max(1,speed))*.08);
   for(let i=0;i<4;i++)this.ramp(layer.voices[i].gain,Math.max(0,Math.min(1,fullness-i))/Math.sqrt(fullness)*Math.min(1.5,Math.sqrt(360/p.hz)),.18);
  }
 }
 debug(){const values=new Float32Array(this.analyser.fftSize);this.analyser.getFloatTimeDomainData(values);return {voices:this.sources.length,targets:{...this.targets},peak:Math.max(...values.map(Math.abs)),rms:Math.sqrt(values.reduce((s,x)=>s+x*x,0)/values.length),context:this.ctx.state};}
 dispose(){if(this.disposed)return;this.disposed=true;for(const s of this.sources){s.stop();s.disconnect();s.buffer=null;}for(const n of this.nodes)n.disconnect();}
}
