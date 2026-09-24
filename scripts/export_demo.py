"""Export exactly 0..60 s of existing model results, without running a solver."""
import sys,json,gzip,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from server import minimal
# Importing this module only declares routes; no model process is launched.
from server.app import FIELDS,CONDITIONS
out=ROOT/'demo-data';out.mkdir(exist_ok=True);routes={};checks={}
def save(route,name,data):
 raw=json.dumps(data,separators=(',',':'),ensure_ascii=False).encode();packed=gzip.compress(raw,compresslevel=6,mtime=0);(out/name).write_bytes(packed);routes[route]=name;checks[name]={'sha256':hashlib.sha256(packed).hexdigest(),'bytes':len(packed),'raw_bytes':len(raw)}
m=json.loads((ROOT/'data/runs/baseline/manifest.json').read_text());rows=[json.loads(line) for line in (ROOT/'data/runs/baseline/observations.jsonl').read_text().splitlines()];rows=[r for r in rows if 0<=r['time']<=60];m.update(computed_until=60,samples=len(rows),divided=False,status='completed',event_time=None,demo=True);m['request']['duration']=60
save('/api/capabilities','vecoli-capabilities.json.gz',{'conditions':CONDITIONS,'genes':json.loads((ROOT/'data/gene_presets.json').read_text()),'factors':[.5,2],'fields':FIELDS,'mode':'precomputed-demo','model_commit':m['model_commit']})
save('/api/runs','vecoli-runs.json.gz',[m]);save('/api/runs/baseline','vecoli-manifest.json.gz',m);save('/api/runs/baseline/data','vecoli-data.json.gz',{'manifest':m,'rows':rows,'events':[],'fields':FIELDS})
meta=minimal.info('1');meta['times']=[t for t in meta['times'] if t<=60];meta['site_times']=[t for t in meta['site_times'] if t<=60];meta['demo']=True
save('/api/minimal/runs/1','minimal-meta.json.gz',meta);summary=minimal.summary('1');summary={**summary,'rows':[r for r in summary['rows'] if r['time']<=60]};save('/api/minimal/runs/1/summary','minimal-summary.json.gz',summary)
save('/api/minimal/catalog','minimal-catalog.json.gz',{'ready':True,'system':'minimal','mode':'official-spatial-replay','source':minimal.DOI,'runs':[{'id':'1','name':'JCVI-syn3A · 1','start':0,'end':60,'frames':len(meta['times']),'spacing_nm':meta['spacing_nm']}]})
save('/api/minimal/live/runs','minimal-live-runs.json.gz',[]);save('/api/minimal/live/capabilities','minimal-live-capabilities.json.gz',{'ready':False,'mode':'static-demo'})
for i,t in enumerate(meta['times']):
 save('/api/minimal/runs/1/frames/'+str(i),f'minimal-frame-{i:03}.json.gz',minimal.frame('1',i))
 if i%10==0:print('Exported spatial frame',i,flush=True)
(out/'routes.json').write_text(json.dumps(routes,indent=2))
(out/'provenance.json').write_text(json.dumps({'duration_seconds':60,'sampling_seconds':1,'spatial_frames':len(meta['times']),'vecoli_rows':len(rows),'vecoli_commit':m['model_commit'],'minimal_source':minimal.DOI,'minimal_license':'CC-BY-4.0','minimal_authors':['Zane Thornburg','Andrew Maytin'],'changes':'Selected 0–60 s, lossless JSON/gzip encoding; all particles and original voxel coordinates retained. Precomputed, no live solver.','files':checks},indent=2))
print('TOTAL_COMPRESSED_BYTES',sum(c['bytes'] for c in checks.values()))
