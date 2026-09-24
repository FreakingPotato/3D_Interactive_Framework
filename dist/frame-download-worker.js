import {rawFrame} from './frame-store.js';
let generation=0,controller=null,paused=false;
self.onmessage=async({data})=>{
 if(data.pause!==undefined){paused=data.pause;return;}
 controller?.abort();const own=++generation;if(data.stop)return;controller=new AbortController();const signal=controller.signal;
 let bytes=0,done=0;const maxBytes=data.maxBytes||512*1024*1024;
 try{for(const url of data.urls){if(own!==generation)return;while(paused){await new Promise(r=>setTimeout(r,250));if(own!==generation)return;}
  const result=await rawFrame(url,signal,{storeOnly:true});bytes+=result.bytes;done++;self.postMessage({done,total:data.urls.length,bytes,status:bytes>=maxBytes?'limited':'loading'});if(bytes>=maxBytes)break;
  await new Promise(r=>setTimeout(r,40));
 }if(own===generation)self.postMessage({done,total:data.urls.length,bytes,status:done===data.urls.length?'complete':'limited'});
 }catch(e){if(own===generation&&!signal.aborted)self.postMessage({done,total:data.urls.length,bytes,status:'error'});}
};
