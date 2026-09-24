"""Export full recorded cycles; retain native spatial snapshots through binary fission."""
import sys,json,gzip,hashlib,argparse
import numpy as np
import h5py
from scipy.ndimage import label
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--source-root',type=Path,default=ROOT);args=parser.parse_args();SOURCE=args.source_root.resolve();sys.path.insert(0,str(SOURCE))
from server import minimal
# Importing this module only declares routes; no model process is launched.
from server.app import FIELDS,CONDITIONS
out=ROOT/'demo-data';out.mkdir(exist_ok=True);routes={};checks={}
for old in out.glob('*.json.gz'):old.unlink()
def save(route,name,data):
 raw=json.dumps(data,separators=(',',':'),ensure_ascii=False).encode();packed=gzip.compress(raw,compresslevel=6,mtime=0);(out/name).write_bytes(packed);routes[route]=name;checks[name]={'sha256':hashlib.sha256(packed).hexdigest(),'bytes':len(packed),'raw_bytes':len(raw)}
m=json.loads((SOURCE/'data/runs/baseline/manifest.json').read_text());rows=[json.loads(line) for line in (SOURCE/'data/runs/baseline/observations.jsonl').read_text().splitlines()];m['demo']=True
events=json.loads((SOURCE/'data/runs/baseline/events.json').read_text())
save('/api/capabilities','vecoli-capabilities.json.gz',{'conditions':CONDITIONS,'genes':json.loads((SOURCE/'data/gene_presets.json').read_text()),'factors':[.5,2],'fields':FIELDS,'mode':'precomputed-demo','model_commit':m['model_commit']})
save('/api/runs','vecoli-runs.json.gz',[m]);save('/api/runs/baseline','vecoli-manifest.json.gz',m);save('/api/runs/baseline/data','vecoli-data.json.gz',{'manifest':m,'rows':rows,'events':events,'fields':FIELDS})
meta=minimal.info('1');native_times=meta['times'];native_meta=minimal.metadata('1')
# Verify physical separation in the native occupancy grid, not DNA separation alone.
with h5py.File(minimal.trajectory('1'),'r') as f:
 sites=f['Simulations/0000001/Sites']
 def lobes(i):
  a=sites[native_meta['site_keys'][i]][:];labels,n=label(a!=0);sizes=np.bincount(labels.ravel())[1:];return int(np.count_nonzero(sizes>np.count_nonzero(a)*.1))
 coarse=list(range(0,len(meta['site_times']),30));coarse.append(len(meta['site_times'])-1)
 split=next(i for i in coarse if lobes(i)>=2)
 split=next(i for i in range(max(0,split-30),split+1) if lobes(i)>=2)
 assert lobes(split-1)==1 and lobes(split)==2 and lobes(len(meta['site_times'])-1)==2
 division_time=meta['site_times'][split]
selected=set(range(0,len(native_times),30));selected.add(len(native_times)-1)
selected.update(i for i,t in enumerate(native_times) if abs(t-division_time)<=120 and t%10==0)
selected.update(i for i,t in enumerate(native_times) if abs(t-division_time)<=2)
indices=sorted(selected);meta['times']=[native_times[i] for i in indices];meta['site_times']=meta['times'];meta['demo']=True
meta['demo_cycle']={'start':native_times[0],'end':native_times[-1],'default_speed':60,'division_time':division_time,'division_evidence':'Two disconnected large occupied regions in the authors native Sites grid; 6-neighbor connectivity.'}
save('/api/minimal/runs/1','minimal-meta.json.gz',meta);summary=minimal.summary('1');save('/api/minimal/runs/1/summary','minimal-summary.json.gz',summary)
save('/api/minimal/catalog','minimal-catalog.json.gz',{'ready':True,'system':'minimal','mode':'official-spatial-replay','source':minimal.DOI,'runs':[{'id':'1','name':'JCVI-syn3A · 1','start':native_times[0],'end':native_times[-1],'frames':len(meta['times']),'spacing_nm':meta['spacing_nm']}]})
save('/api/minimal/live/runs','minimal-live-runs.json.gz',[]);save('/api/minimal/live/capabilities','minimal-live-capabilities.json.gz',{'ready':False,'mode':'static-demo'})
for i,source_index in enumerate(indices):
 frame=dict(minimal.frame('1',source_index));frame['source_index']=source_index;frame['index']=i
 save('/api/minimal/runs/1/frames/'+str(i),f'minimal-frame-{i:03}.json.gz',frame)
 if i%10==0:print('Exported spatial frame',i,flush=True)
(out/'routes.json').write_text(json.dumps(routes,indent=2))
(out/'provenance.json').write_text(json.dumps({'duration_seconds':native_times[-1],'sampling_seconds':30,'default_speed':60,'minimal_division_time':division_time,'vecoli_duration_seconds':rows[-1]['time'],'vecoli_division_time':m['event_time'],'spatial_frames':len(meta['times']),'vecoli_rows':len(rows),'vecoli_commit':m['model_commit'],'minimal_source':minimal.DOI,'minimal_license':'CC-BY-4.0','minimal_authors':['Zane Thornburg','Andrew Maytin'],'changes':'Complete recorded cycles: vEcoli all observations and original division event; minimal 0–7200 s sampled every 30 s, every 10 s near physical separation, plus adjacent 1 s separation frames. All particles and native voxel coordinates retained per sampled frame; no interpolated positions. Default 60x playback. Precomputed, no live solver.','files':checks},indent=2))
print('TOTAL_COMPRESSED_BYTES',sum(c['bytes'] for c in checks.values()))
