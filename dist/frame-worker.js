import {rawFrame} from './frame-store.js';
import {MeshBasicMaterial} from '/vendor/three.module.js';
import {MarchingCubes} from '/vendor/addons/objects/MarchingCubes.worker.js';
const requests=new Map();
self.onmessage=async({data})=>{
 if(data.cancel){requests.get(data.id)?.abort();return;}
 const controller=new AbortController();requests.set(data.id,controller);const timeout=setTimeout(()=>controller.abort(),30000);
 try{const start=performance.now(),f=await rawFrame(data.url,controller.signal),fetchMS=performance.now()-start,begin=performance.now(),flat=f.dna_voxels;
  const transfer=[];
  if(flat?.length){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<flat.length;i++){const a=i%3;lo[a]=Math.min(lo[a],flat[i]);hi[a]=Math.max(hi[a],flat[i]);}const n=Math.max(...hi.map((v,i)=>v-lo[i]+1))+6,m=new MeshBasicMaterial(),mc=new MarchingCubes(n,m,false,false,Math.max(1000,flat.length*8));mc.isolation=.5;for(let i=0;i<flat.length;i+=3){const x=flat[i]-lo[0]+2,y=flat[i+1]-lo[1]+2,z=flat[i+2]-lo[2]+2;mc.field[x+y*n+z*n*n]=1;}mc.update();const positions=mc.geometry.attributes.position.array.slice(0,mc.count*3),normals=mc.geometry.attributes.normal.array.slice(0,mc.count*3);f.dna_surface={positions,normals,scale:n/2*f.spacing_nm/100,position:lo.map((v,i)=>(n/2+v-1.5-f.dimensions[i]/2)*f.spacing_nm/100)};transfer.push(positions.buffer,normals.buffer);mc.geometry.dispose();m.dispose();}
  f.preparation={fetchMS,prepareMS:performance.now()-begin};self.postMessage({id:data.id,frame:f},transfer);
 }catch(error){self.postMessage({id:data.id,error:String(error),aborted:controller.signal.aborted});}finally{clearTimeout(timeout);requests.delete(data.id);}
};
