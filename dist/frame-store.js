// Compressed raw frames persist independently from the bounded decoded-frame LRU.
import {dataFetch} from './data-source.js';
import {runtime} from './runtime-config.js';
let opening;const memory=new Map();let memoryBytes=0;
function db(){return opening??=new Promise(resolve=>{if(!globalThis.indexedDB){resolve(null);return;}const request=indexedDB.open('interactive-frame-cache',2);request.onupgradeneeded=()=>{for(const name of ['frames','info'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'key'});};request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};request.onblocked=request.onerror=()=>resolve(null);});}
const keyFor=url=>runtime.dataVersion+':'+new URL(url,location.href).pathname;
async function read(key){const d=await db();if(!d)return null;return new Promise(resolve=>{const tx=d.transaction('frames'),r=tx.objectStore('frames').get(key);r.onsuccess=()=>resolve(r.result?.blob||null);r.onerror=()=>resolve(null);});}
async function save(key,blob){const d=await db();if(!d)return false;return new Promise(resolve=>{const tx=d.transaction(['frames','info'],'readwrite'),frames=tx.objectStore('frames'),info=tx.objectStore('info'),r=info.getAll();r.onsuccess=()=>{const entries=r.result.filter(e=>e.key!==key).sort((a,b)=>a.time-b.time);let bytes=entries.reduce((n,e)=>n+e.bytes,blob.size);for(const e of entries){if(bytes<=768*1024*1024)break;frames.delete(e.key);info.delete(e.key);bytes-=e.bytes;}frames.put({key,blob});info.put({key,bytes:blob.size,time:Date.now()});};tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false);});}
async function pack(response){const blob=await new Response(response.body.pipeThrough(new CompressionStream('gzip'))).blob();return blob;}
function remember(key,blob){if(memory.has(key))return;memory.set(key,blob);memoryBytes+=blob.size;while(memoryBytes>48*1024*1024){const [k,b]=memory.entries().next().value;memory.delete(k);memoryBytes-=b.size;}}
export async function rawFrame(url,signal,{storeOnly=false}={}){
 const key=keyFor(url);let blob=(storeOnly?null:memory.get(key))||await read(key),cached=!!blob;
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
 if(!blob){const r=await dataFetch(url,{signal});if(!r.ok)throw Error('Spatial frame '+r.status);blob=await pack(r);if(signal?.aborted)throw new DOMException('Cancelled','AbortError');const stored=await save(key,blob).catch(()=>false);if(storeOnly&&!stored)throw Error('Persistent cache unavailable');}
 if(storeOnly)return {bytes:blob.size,cached};remember(key,blob);
 const f=await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).json();return f;
}
