import {runtime} from './runtime-config.js';
let routesPromise;
export async function dataFetch(input,options={}){
 if(!runtime.staticDemo)return fetch(input,options);
 if(options.method&&options.method!=='GET')return Response.json({detail:'This demo is read-only. Deploy locally to connect a live model.'},{status:405});
 const u=new URL(input,globalThis.location.href);
 const routes=await(routesPromise??=fetch(runtime.base+'/demo/routes.json').then(r=>{if(!r.ok)throw Error('Demo manifest missing');return r.json();}));
 const entry=routes[u.pathname];if(!entry)return Response.json({detail:'Not included in the 60-second demo'},{status:404});
 const r=await fetch(runtime.base+'/demo/'+entry,options);if(!r.ok)return r;
 const body=entry.endsWith('.gz')?await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text():await r.text();
 if(u.searchParams.has('after')){const data=JSON.parse(body);data.rows=data.rows.filter(row=>row.time>Number(u.searchParams.get('after')));return Response.json(data);}
 return new Response(body,{headers:{'Content-Type':'application/json'}});
}
